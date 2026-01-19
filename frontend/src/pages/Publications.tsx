/* src/pages/Publications.tsx */
import { useEffect, useMemo, useRef, useState } from "react";
import "./ExploreLists.css";

import api from "../api/axios";
import {
  getMyPublications,
  createPublication,
  updatePublication,
  deletePublication,
  deletePublicationAdmin,
  getAllPublications,
  uploadPublicationPdf,
  type PublicationDto,
  type PublicationType
} from "../api/publications";
import type { PageResponse } from "../api/types";
import { useNavigate } from "react-router-dom";
import { getOrCreateDirectConversation } from "../api/messages";

const norm = (s?: string | null) => (s || "").trim().replace(/\s+/g, " ");

const parseYear = (raw: string) => {
  const y = raw.trim();
  if (!y) return undefined;
  const n = Number(y);
  if (!Number.isFinite(n) || n < 1900 || n > 2100) return null;
  return n;
};

const toUrl = (raw?: string | null) => {
  const v = norm(raw);
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
};

const joinName = (first?: string | null, last?: string | null) => `${first || ""} ${last || ""}`.trim();

const typeOptions: { label: string; value: PublicationType }[] = [
  { label: "Journal Article", value: "ARTICOL_JURNAL" },
  { label: "Conference Paper", value: "LUCRARE_CONFERINTA" },
  { label: "Book", value: "CARTE" },
  { label: "Book Chapter", value: "CAPITOL_CARTE" }
];

const prettyType = (t?: string | null) => {
  if (!t) return "";
  switch (t) {
    case "ARTICOL_JURNAL":
      return "Journal Article";
    case "LUCRARE_CONFERINTA":
      return "Conference Paper";
    case "CARTE":
      return "Book";
    case "CAPITOL_CARTE":
      return "Book Chapter";
    default:
      return String(t);
  }
};

// Your backend returns pdfPath like "/files/publications/xyz.pdf"
const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:8080";
const toPdfUrl = (p: any) => {
  const v = norm(p?.pdfPath || p?.pdfUrl);
  if (!v) return "";
  if (v.startsWith("http")) return v;
  return `${API_BASE}${v.startsWith("/") ? "" : "/"}${v}`;
};

/** ===== Auth helpers (role + userId) ===== */
type AuthInfo = { userId: number | null; role: string | null };

const safeJson = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token: string) => {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const readAuthInfo = (): AuthInfo => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    "";

  const payload = token ? decodeJwtPayload(token) : null;

  const roleFromPayload =
    payload?.role ||
    payload?.userRole ||
    (Array.isArray(payload?.roles) ? payload.roles[0] : null) ||
    (Array.isArray(payload?.authorities)
      ? String(payload.authorities[0]?.authority || payload.authorities[0])
      : null) ||
    null;

  const idFromPayload =
    payload?.userId ??
    payload?.id ??
    payload?.uid ??
    (typeof payload?.sub === "number" ? payload.sub : null) ??
    null;

  if (roleFromPayload || idFromPayload) {
    return {
      role: roleFromPayload ? String(roleFromPayload) : null,
      userId: idFromPayload != null ? Number(idFromPayload) : null
    };
  }

  const maybeUser =
    safeJson(localStorage.getItem("me")) ||
    safeJson(localStorage.getItem("user")) ||
    safeJson(localStorage.getItem("auth")) ||
    safeJson(localStorage.getItem("profile"));

  const role =
    maybeUser?.role ||
    maybeUser?.userRole ||
    (typeof maybeUser?.authorities?.[0] === "string"
      ? maybeUser.authorities[0]
      : maybeUser?.authorities?.[0]?.authority) ||
    null;

  const userId = maybeUser?.id ?? maybeUser?.userId ?? null;

  return { role: role ? String(role) : null, userId: userId != null ? Number(userId) : null };
};

type Draft = {
  type: PublicationType;
  title: string;
  publisher: string;
  authors: string;
  externalLink: string;
  publishedDate: string; // YYYY-MM-DD
  keywords: string;

  journalTitle: string;
  volumeIssue: string;
  pages: string;
  doi: string;

  year: string;
  pdfFile: File | null;
};

const emptyDraft = (): Draft => ({
  type: "ARTICOL_JURNAL",
  title: "",
  publisher: "",
  authors: "",
  externalLink: "",
  publishedDate: "",
  keywords: "",
  journalTitle: "",
  volumeIssue: "",
  pages: "",
  doi: "",
  year: "",
  pdfFile: null
});

type Tab = "MINE" | "EXPLORE";

/* ===== UI helpers: toast + confirm ===== */
type Toast = { id: number; type: "success" | "error" | "info"; message: string };

function ToastStack({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  if (!toasts.length) return null;

  return (
    <div className="annToastStack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`annToast annToast-${t.type}`} role="status">
          <div className="annToastMsg">{t.message}</div>
          <button className="annToastClose" type="button" onClick={() => onClose(t.id)} aria-label="Close">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  busy,
  danger,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="annConfirmOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="annConfirmModal card" role="dialog" aria-modal="true">
        <div className="annConfirmHead">
          <h3 className="annConfirmTitle">{title}</h3>
          <button className="btn-outline annConfirmClose" type="button" onClick={onCancel} disabled={busy}>
            ×
          </button>
        </div>

        <div className="annConfirmMsg">{message}</div>

        <div className="annConfirmActions">
          <button className="btn-outline" type="button" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={danger ? "annDangerBtn" : "annPrimaryBtn"}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublicationsPage() {
   const nav = useNavigate();

  const onMessageUser = async (otherUserId?: number | null) => {
    if (!otherUserId) {
      pushToast("error", "User id missing for this publication.");
      return;
    }

    if (auth.userId && otherUserId === auth.userId) {
      pushToast("info", "You can’t send a message to yourself.");
      return;
    }

    try {
      const { conversationId } = await getOrCreateDirectConversation(otherUserId);
      nav(`/messages?c=${conversationId}`);
    } catch (e: any) {
      const backendMsg = String(e?.response?.data?.message || "");
      if (backendMsg.toLowerCase().includes("yourself")) {
        pushToast("info", "You can’t send a message to yourself.");
      } else {
        pushToast("error", "You can’t send a message to yourself.");
      }
    }
  };
  const [tab, setTab] = useState<Tab>("MINE");

  const [items, setItems] = useState<PublicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft>(emptyDraft());

  // Details panel like your screenshot (optional, only for MINE)
  const [openMineId, setOpenMineId] = useState<number | null>(null);

  // Explore state like Projects
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(12);
  const [explore, setExplore] = useState<PageResponse<PublicationDto> | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [openExploreId, setOpenExploreId] = useState<number | null>(null);

  const auth = useMemo(() => readAuthInfo(), []);
  const isAdmin = auth.role === "ADMIN";

  const isJournalOrConfDraft = draft.type === "ARTICOL_JURNAL" || draft.type === "LUCRARE_CONFERINTA";
  const isBookOrChapterDraft = draft.type === "CARTE" || draft.type === "CAPITOL_CARTE";
  const isJournalOrConfEdit = editing.type === "ARTICOL_JURNAL" || editing.type === "LUCRARE_CONFERINTA";
  const isBookOrChapterEdit = editing.type === "CARTE" || editing.type === "CAPITOL_CARTE";

  const selectedMine = useMemo(() => items.find((x) => x.id === openMineId) || null, [items, openMineId]);

  /* ===== toast state ===== */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(1);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = toastSeq.current++;
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };

  /* ===== confirm state ===== */
  const [confirm, setConfirm] = useState<{
    open: boolean;
    mode: "MINE" | "EXPLORE_ADMIN";
    id: number | null;
    label: string;
  }>({ open: false, mode: "MINE", id: null, label: "" });

  useEffect(() => {
    if (!confirm.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirm({ open: false, mode: "MINE", id: null, label: "" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm.open]);

  const validate = (d: Draft) => {
    if (!norm(d.title)) return "Title is required.";
    const yearNum = parseYear(d.year || "");
    if (yearNum === null) return "Year must be between 1900 and 2100.";
    if (!norm(d.publishedDate)) return "Publication date is required.";

    const isBook = d.type === "CARTE" || d.type === "CAPITOL_CARTE";
    const isJc = d.type === "ARTICOL_JURNAL" || d.type === "LUCRARE_CONFERINTA";

    if (isBook && !norm(d.publisher)) return "Publisher is required for books/chapters.";
    if (isJc && !norm(d.journalTitle)) return "Journal / Conference title is required.";

    if (d.pdfFile && d.pdfFile.size > 10 * 1024 * 1024) return "PDF must be max 10 MB.";
    if (d.pdfFile && d.pdfFile.type !== "application/pdf") return "Only PDF files are allowed.";

    return null;
  };

  const buildPayload = (d: Draft) => {
    const yearNum = parseYear(d.year || "");
    return {
      type: d.type,
      title: norm(d.title),
      authors: norm(d.authors) || undefined,
      externalLink: norm(d.externalLink) || undefined,
      publishedDate: norm(d.publishedDate) || undefined,
      keywords: norm(d.keywords) || undefined,

      publisher: norm(d.publisher) || undefined,
      journalTitle: norm(d.journalTitle) || undefined,
      volumeIssue: norm(d.volumeIssue) || undefined,
      pages: norm(d.pages) || undefined,
      doi: norm(d.doi) || undefined,

      year: yearNum === undefined ? undefined : yearNum,

      // fallback if older backend still uses url
      url: norm(d.externalLink) || undefined
    } as any;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyPublications();
        setItems(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshMine = async () => {
    const data = await getMyPublications();
    setItems(data || []);
  };

  const loadExplore = async (nextPage: number) => {
    setExploreLoading(true);
    try {
      const res = await getAllPublications(q.trim(), nextPage, size);
      setExplore(res);
      setPage(nextPage);
      setOpenExploreId(null);
    } catch (e) {
      console.error(e);
      setExplore({ items: [], page: 0, size, totalElements: 0, totalPages: 0 } as any);
      setPage(0);
      setOpenExploreId(null);
      pushToast("error", "Could not load publications.");
    } finally {
      setExploreLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "EXPLORE") return;
    loadExplore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const addDisabled = useMemo(() => !!validate(draft), [draft]);
  const editDisabled = useMemo(() => !!validate(editing), [editing]);

  const onAdd = async () => {
    const err = validate(draft);
    if (err) {
      pushToast("error", err);
      return;
    }

    setSaving(true);
    try {
      let created = await createPublication(buildPayload(draft));
      if (draft.pdfFile) created = await uploadPublicationPdf(created.id, draft.pdfFile);

      setDraft(emptyDraft());
      setShowAdd(false);
      setOpenMineId(created.id);
      await refreshMine();
      if (tab === "EXPLORE") await loadExplore(0);

      pushToast("success", "Publication saved.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not save the publication.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: PublicationDto) => {
    setEditingId(p.id);
    setShowAdd(false);

    setEditing({
      type: ((p as any).type || "ARTICOL_JURNAL") as PublicationType,
      title: (p as any).title || "",
      publisher: (p as any).publisher || "",
      authors: (p as any).authors || "",
      externalLink: (p as any).externalLink || (p as any).url || "",
      publishedDate: (p as any).publishedDate || "",
      keywords: (p as any).keywords || "",
      journalTitle: (p as any).journalTitle || "",
      volumeIssue: (p as any).volumeIssue || "",
      pages: (p as any).pages || "",
      doi: (p as any).doi || "",
      year: (p as any).year ? String((p as any).year) : "",
      pdfFile: null
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing(emptyDraft());
  };

  const onSaveEdit = async () => {
    if (editingId == null) return;

    const err = validate(editing);
    if (err) {
      pushToast("error", err);
      return;
    }

    setSaving(true);
    try {
      let updated = await updatePublication(editingId, buildPayload(editing));
      if (editing.pdfFile) updated = await uploadPublicationPdf(updated.id, editing.pdfFile);

      cancelEdit();
      await refreshMine();
      setOpenMineId(updated.id);
      if (tab === "EXPLORE") await loadExplore(page);

      pushToast("success", "Publication updated.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not update the publication.");
    } finally {
      setSaving(false);
    }
  };

  /* ===== delete flow via confirm modal ===== */

  const requestDeleteMine = (p: PublicationDto) => {
    const label = norm((p as any).title || "").slice(0, 60) || "this publication";
    setConfirm({ open: true, mode: "MINE", id: p.id, label });
  };

  const requestDeleteExploreAdmin = (p: PublicationDto) => {
    if (!isAdmin) return;
    const label = norm((p as any).title || "").slice(0, 60) || "this publication";
    setConfirm({ open: true, mode: "EXPLORE_ADMIN", id: p.id, label });
  };

  const confirmDeleteNow = async () => {
    if (!confirm.id) return;

    const id = confirm.id;
    const mode = confirm.mode;

    setConfirm({ open: false, mode: "MINE", id: null, label: "" });
    setSaving(true);

    try {
      if (mode === "MINE") {
        await deletePublication(id);
        if (editingId === id) cancelEdit();
        if (openMineId === id) setOpenMineId(null);
        await refreshMine();
        if (tab === "EXPLORE") await loadExplore(page);
      } else {
        await deletePublicationAdmin(id);
        if (openExploreId === id) setOpenExploreId(null);
        await loadExplore(page);
        await refreshMine();
      }

      pushToast("success", "Publication deleted.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not delete the publication.");
    } finally {
      setSaving(false);
    }
  };

  const openPdfWithAuth = async (p: any) => {
    const url = toPdfUrl(p);
    if (!url) return;

    try {
      const relative = url.startsWith(API_BASE) ? url.slice(API_BASE.length) : url;

      const res = await api.get(relative, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not open PDF.");
    }
  };

  const renderChips = (p: any) => (
    <div className="itemMetaRow" style={{ marginTop: 10 }}>
      {p.type ? <span className="chip">{prettyType(p.type)}</span> : null}
      {p.journalTitle ? <span className="chip">{String(p.journalTitle)}</span> : null}
      {p.publisher ? <span className="chip">{String(p.publisher)}</span> : null}
      {p.volumeIssue ? <span className="chip">{String(p.volumeIssue)}</span> : null}
      {p.pages ? <span className="chip">{String(p.pages)}</span> : null}
      {p.doi ? <span className="chip">{`DOI: ${String(p.doi)}`}</span> : null}
      {p.year ? <span className="chip">{String(p.year)}</span> : null}
      {p.publishedDate ? <span className="chip">{String(p.publishedDate)}</span> : null}
    </div>
  );

  return (
    <div className="annShell">
      <ToastStack toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Publications</h2>
            <span className="annSub">Add your publications and explore publications published by others.</span>
          </div>

          <div className="projectsTabs">
            <button
              type="button"
              className="btn-outline"
              aria-pressed={tab === "MINE"}
              onClick={() => setTab("MINE")}
              disabled={saving}
            >
              My publications
            </button>

            <button
              type="button"
              className="btn-outline"
              aria-pressed={tab === "EXPLORE"}
              onClick={() => {
                setTab("EXPLORE");
                setShowAdd(false);
                cancelEdit();
                setOpenMineId(null);
              }}
              disabled={saving}
            >
              Explore
            </button>

            {tab === "MINE" && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowAdd((v) => !v);
                  cancelEdit();
                }}
                disabled={saving}
              >
                {showAdd ? "Close" : "+ New publication"}
              </button>
            )}
          </div>
        </div>

        {tab === "MINE" && (
          <>
            {loading ? (
              <div className="muted">Loading…</div>
            ) : (
              <>
                {showAdd && (
                  <div className="card" style={{ padding: 16 }}>
                    <div className="projForm">
                      <div className="projGrid2">
                        <label>
                          Type*
                          <select
                            className="ecoInput"
                            value={draft.type}
                            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as PublicationType }))}
                          >
                            {typeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Title*
                          <input
                            className="ecoInput"
                            value={draft.title}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                            placeholder="Publication title"
                          />
                        </label>
                      </div>

                      <div className="projGrid2">
                        <label>
                          Authors
                          <input
                            className="ecoInput"
                            value={draft.authors}
                            onChange={(e) => setDraft((d) => ({ ...d, authors: e.target.value }))}
                            placeholder="Authors"
                          />
                        </label>

                        <label>
                          External link
                          <input
                            className="ecoInput"
                            value={draft.externalLink}
                            onChange={(e) => setDraft((d) => ({ ...d, externalLink: e.target.value }))}
                            placeholder="https://..."
                          />
                        </label>
                      </div>

                      <div className="projGrid2">
                        <label>
                          Publication date*
                          <input
                            className="ecoInput"
                            type="date"
                            value={draft.publishedDate}
                            onChange={(e) => setDraft((d) => ({ ...d, publishedDate: e.target.value }))}
                          />
                        </label>

                        <label>
                          Year
                          <input
                            className="ecoInput"
                            value={draft.year}
                            onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
                            placeholder="2009"
                          />
                        </label>
                      </div>

                      <label>
                        Keywords
                        <input
                          className="ecoInput"
                          value={draft.keywords}
                          onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
                          placeholder="keywords"
                        />
                      </label>

                      {isJournalOrConfDraft ? (
                        <>
                          <div className="projGrid2">
                            <label>
                              Journal / Conference title*
                              <input
                                className="ecoInput"
                                value={draft.journalTitle}
                                onChange={(e) => setDraft((d) => ({ ...d, journalTitle: e.target.value }))}
                                placeholder="Journal or conference"
                              />
                            </label>

                            <label>
                              Volume / issue
                              <input
                                className="ecoInput"
                                value={draft.volumeIssue}
                                onChange={(e) => setDraft((d) => ({ ...d, volumeIssue: e.target.value }))}
                                placeholder="Vol/Issue"
                              />
                            </label>
                          </div>

                          <div className="projGrid2">
                            <label>
                              Pages
                              <input
                                className="ecoInput"
                                value={draft.pages}
                                onChange={(e) => setDraft((d) => ({ ...d, pages: e.target.value }))}
                                placeholder="1-10"
                              />
                            </label>

                            <label>
                              DOI
                              <input
                                className="ecoInput"
                                value={draft.doi}
                                onChange={(e) => setDraft((d) => ({ ...d, doi: e.target.value }))}
                                placeholder="10.1080/..."
                              />
                            </label>
                          </div>
                        </>
                      ) : null}

                      {isBookOrChapterDraft ? (
                        <label>
                          Publisher*
                          <input
                            className="ecoInput"
                            value={draft.publisher}
                            onChange={(e) => setDraft((d) => ({ ...d, publisher: e.target.value }))}
                            placeholder="Publisher"
                          />
                        </label>
                      ) : null}

                      <label>
                        PDF (max 10 MB)
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setDraft((d) => ({ ...d, pdfFile: e.target.files?.[0] || null }))}
                        />
                        {draft.pdfFile ? (
                          <div className="muted" style={{ marginTop: 6 }}>
                            {draft.pdfFile.name}
                          </div>
                        ) : null}
                      </label>

                      <button type="button" className="btn-primary" onClick={onAdd} disabled={saving || addDisabled}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="card" style={{ padding: 16, marginTop: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>My publications</h2>

                  {items.length === 0 ? (
                    <div className="muted" style={{ marginTop: 10 }}>
                      No publications yet.
                    </div>
                  ) : (
                    <div className="annList" style={{ marginTop: 12 }}>
                      {items.map((p) => {
                        const isEditing = editingId === p.id;
                        const isOpen = openMineId === p.id;

                        return (
                          <div
                            key={p.id}
                            className="projectItem"
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpenMineId((cur) => (cur === p.id ? null : p.id))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOpenMineId((cur) => (cur === p.id ? null : p.id));
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="projectTop">
                              <div className="projectTitle">
                                <strong>{(p as any).title}</strong>
                                <span className="projectMeta">{prettyType((p as any).type)}</span>
                              </div>

                              <div className="projectActions" onClick={(e) => e.stopPropagation()}>
                                {!isEditing ? (
                                  <>
                                    <button type="button" className="btn-outline" onClick={() => startEdit(p)} disabled={saving}>
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-outline"
                                      onClick={() => requestDeleteMine(p)}
                                      disabled={saving}
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" className="btn-outline" onClick={cancelEdit} disabled={saving}>
                                      Cancel
                                    </button>
                                    <button type="button" className="btn-primary" onClick={onSaveEdit} disabled={saving || editDisabled}>
                                      Save
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {!isEditing ? (
                              <>
                                <div className="projectDetails">{renderChips(p as any)}</div>

                                {isOpen && (
                                  <div className="projectDetails" style={{ marginTop: 10 }}>
                                    {(p as any).authors ? (
                                      <div>
                                        <span className="k">Authors:</span> {(p as any).authors}
                                      </div>
                                    ) : null}

                                    {(p as any).keywords ? (
                                      <div>
                                        <span className="k">Keywords:</span> {(p as any).keywords}
                                      </div>
                                    ) : null}

                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                                      {(p as any).externalLink ? (
                                        <a
                                          className="annPill"
                                          href={toUrl((p as any).externalLink)}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          External link
                                        </a>
                                      ) : null}

                                      {(p as any).pdfPath ? (
                                        <button
                                          type="button"
                                          className="btn-outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openPdfWithAuth(p as any);
                                          }}
                                        >
                                          Open PDF
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="projForm" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                                <div className="projGrid2">
                                  <label>
                                    Type*
                                    <select
                                      className="ecoInput"
                                      value={editing.type}
                                      onChange={(e) => setEditing((d) => ({ ...d, type: e.target.value as PublicationType }))}
                                    >
                                      {typeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Title*
                                    <input
                                      className="ecoInput"
                                      value={editing.title}
                                      onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))}
                                    />
                                  </label>
                                </div>

                                <div className="projGrid2">
                                  <label>
                                    Authors
                                    <input
                                      className="ecoInput"
                                      value={editing.authors}
                                      onChange={(e) => setEditing((d) => ({ ...d, authors: e.target.value }))}
                                    />
                                  </label>

                                  <label>
                                    External link
                                    <input
                                      className="ecoInput"
                                      value={editing.externalLink}
                                      onChange={(e) => setEditing((d) => ({ ...d, externalLink: e.target.value }))}
                                    />
                                  </label>
                                </div>

                                <div className="projGrid2">
                                  <label>
                                    Publication date*
                                    <input
                                      className="ecoInput"
                                      type="date"
                                      value={editing.publishedDate}
                                      onChange={(e) => setEditing((d) => ({ ...d, publishedDate: e.target.value }))}
                                    />
                                  </label>

                                  <label>
                                    Year
                                    <input
                                      className="ecoInput"
                                      value={editing.year}
                                      onChange={(e) => setEditing((d) => ({ ...d, year: e.target.value }))}
                                    />
                                  </label>
                                </div>

                                <label>
                                  Keywords
                                  <input
                                    className="ecoInput"
                                    value={editing.keywords}
                                    onChange={(e) => setEditing((d) => ({ ...d, keywords: e.target.value }))}
                                  />
                                </label>

                                {isJournalOrConfEdit ? (
                                  <>
                                    <div className="projGrid2">
                                      <label>
                                        Journal / Conference title*
                                        <input
                                          className="ecoInput"
                                          value={editing.journalTitle}
                                          onChange={(e) => setEditing((d) => ({ ...d, journalTitle: e.target.value }))}
                                        />
                                      </label>

                                      <label>
                                        Volume / issue
                                        <input
                                          className="ecoInput"
                                          value={editing.volumeIssue}
                                          onChange={(e) => setEditing((d) => ({ ...d, volumeIssue: e.target.value }))}
                                        />
                                      </label>
                                    </div>

                                    <div className="projGrid2">
                                      <label>
                                        Pages
                                        <input
                                          className="ecoInput"
                                          value={editing.pages}
                                          onChange={(e) => setEditing((d) => ({ ...d, pages: e.target.value }))}
                                        />
                                      </label>

                                      <label>
                                        DOI
                                        <input
                                          className="ecoInput"
                                          value={editing.doi}
                                          onChange={(e) => setEditing((d) => ({ ...d, doi: e.target.value }))}
                                        />
                                      </label>
                                    </div>
                                  </>
                                ) : null}

                                {isBookOrChapterEdit ? (
                                  <label>
                                    Publisher*
                                    <input
                                      className="ecoInput"
                                      value={editing.publisher}
                                      onChange={(e) => setEditing((d) => ({ ...d, publisher: e.target.value }))}
                                    />
                                  </label>
                                ) : null}

                                <label>
                                  Replace PDF (max 10 MB)
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setEditing((d) => ({ ...d, pdfFile: e.target.files?.[0] || null }))}
                                  />
                                  {(p as any).pdfPath ? (
                                    <div style={{ marginTop: 8 }}>
                                      <button type="button" className="btn-outline" onClick={() => openPdfWithAuth(p as any)}>
                                        Open current PDF
                                      </button>
                                    </div>
                                  ) : null}
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedMine && openMineId != null && editingId == null ? (
                  <div className="card" style={{ padding: 16, marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <strong>Publication details</strong>
                      <button type="button" className="btn-outline" onClick={() => setOpenMineId(null)}>
                        Close
                      </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ marginBottom: 6 }}>
                        Title
                      </div>
                      <div>
                        <strong>{(selectedMine as any).title || "-"}</strong>
                      </div>

                      {renderChips(selectedMine as any)}

                      {(selectedMine as any).authors ? (
                        <div style={{ marginTop: 10 }}>
                          <span className="k">Authors:</span> {(selectedMine as any).authors}
                        </div>
                      ) : null}

                      {(selectedMine as any).keywords ? (
                        <div style={{ marginTop: 6 }}>
                          <span className="k">Keywords:</span> {(selectedMine as any).keywords}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                        {(selectedMine as any).externalLink ? (
                          <a className="annPill" href={toUrl((selectedMine as any).externalLink)} target="_blank" rel="noreferrer">
                            External link
                          </a>
                        ) : null}

                        {(selectedMine as any).pdfPath ? (
                          <button type="button" className="btn-outline" onClick={() => openPdfWithAuth(selectedMine as any)}>
                            Open PDF
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {tab === "EXPLORE" && (
          <div className="card" style={{ padding: 16 }}>
            <div className="twoCol">
              <div>
                <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  Search publications
                  <input
                    className="ecoInput"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by title, authors, journal, DOI, user…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadExplore(0);
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setQ("");
                    loadExplore(0);
                  }}
                  disabled={exploreLoading}
                >
                  Reset
                </button>

                <button type="button" className="btn-primary" onClick={() => loadExplore(0)} disabled={exploreLoading}>
                  {exploreLoading ? "Searching…" : "Search"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {exploreLoading && !explore ? (
                <div className="muted">Loading…</div>
              ) : !explore || explore.items.length === 0 ? (
                <div className="muted">No results.</div>
              ) : (
                <>
                  <div className="annList">
                    {explore.items.map((p) => {
                      const isOpen = openExploreId === p.id;
                      const owner = joinName((p as any).userFirstName, (p as any).userLastName) || "Unknown user";

                       const ownerId =
                        (p as any).userId ||
                        (p as any).ownerId ||
                        (p as any).createdById;

                      const canMessage = !!ownerId && ownerId !== auth.userId;


                      return (
                        <div
                          key={p.id}
                          className="projectItem"
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpenExploreId((cur) => (cur === p.id ? null : p.id))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenExploreId((cur) => (cur === p.id ? null : p.id));
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="projectTop">
                            <div className="projectTitle">
                              <strong>{(p as any).title}</strong>
                              <span className="projectMeta">{prettyType((p as any).type)}</span>
                            </div>

                            <div className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span>
                                {owner}
                                <span style={{ marginLeft: 10, opacity: 0.8 }}>{isOpen ? "▲" : "▼"}</span>
                              </span>
                              {canMessage && (
                              <button
                                type="button"
                                className="btn-outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMessageUser(ownerId);
                                }}
                                disabled={saving}
                                title="Message author"
                              >
                                Message
                              </button>
                            )}

                              {isAdmin ? (
                                <button
                                  type="button"
                                  className="btn-outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestDeleteExploreAdmin(p);
                                  }}
                                  disabled={saving}
                                  title="Admin delete"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="projectDetails">{renderChips(p as any)}</div>

                          {isOpen && (
                            <div className="projectDetails" style={{ marginTop: 10 }}>
                              {(p as any).authors ? (
                                <div>
                                  <span className="k">Authors:</span> {(p as any).authors}
                                </div>
                              ) : null}

                              {(p as any).externalLink ? (
                                <div style={{ marginTop: 8 }}>
                                  <a
                                    className="annInlineLink"
                                    href={toUrl((p as any).externalLink)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Open link
                                  </a>
                                </div>
                              ) : null}

                              {(p as any).pdfPath ? (
                                <div style={{ marginTop: 8 }}>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPdfWithAuth(p as any);
                                    }}
                                  >
                                    Open PDF
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="annMore">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => loadExplore(Math.max(0, page - 1))}
                      disabled={exploreLoading || page <= 0}
                    >
                      Prev
                    </button>

                    <div style={{ width: 10 }} />

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => loadExplore(page + 1)}
                      disabled={exploreLoading || (explore && page >= (explore.totalPages || 1) - 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirm.open}
        title={confirm.mode === "EXPLORE_ADMIN" ? "Delete publication (admin)" : "Delete publication"}
        message={`Delete "${confirm.label}"? This can't be undone.`}
        confirmText={saving ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        danger
        busy={saving}
        onCancel={() => setConfirm({ open: false, mode: "MINE", id: null, label: "" })}
        onConfirm={confirmDeleteNow}
      />
    </div>
  );
}
