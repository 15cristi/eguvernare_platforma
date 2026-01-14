import { useEffect, useMemo, useState, useRef } from "react";
import "./ExploreLists.css";
import {
  getMyProjects,
  createProject,
  updateProject,
  deleteProject,
  deleteProjectAdmin,
  getAllProjects,
  type ProjectDto,
  type ProjectRequest
} from "../api/projects";
import type { PageResponse } from "../api/types";

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

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
  // common: token
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    "";

  const payload = token ? decodeJwtPayload(token) : null;

  // role candidates
  const roleFromPayload =
    payload?.role ||
    payload?.userRole ||
    (Array.isArray(payload?.roles) ? payload.roles[0] : null) ||
    (Array.isArray(payload?.authorities)
      ? String(payload.authorities[0]?.authority || payload.authorities[0])
      : null) ||
    null;

  // userId candidates
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

  // fallbacks: some apps store a "user"/"me" object
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

  return {
    role: role ? String(role) : null,
    userId: userId != null ? Number(userId) : null
  };
};

type Draft = {
  title: string;
  acronym: string;
  abstractEn: string;
  partners: string;
  coordinator: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  hasExtension: boolean;
  possibleExtensionEndDate: string;
};

const emptyDraft: Draft = {
  title: "",
  acronym: "",
  abstractEn: "",
  partners: "",
  coordinator: "",
  contractNumber: "",
  startDate: "",
  endDate: "",
  hasExtension: false,
  possibleExtensionEndDate: ""
};

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

export default function ProjectsPage() {
  const [tab, setTab] = useState<Tab>("MINE");

  const [items, setItems] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft>(emptyDraft);

  // Explore state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(12);
  const [explore, setExplore] = useState<PageResponse<ProjectDto> | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [openExploreId, setOpenExploreId] = useState<number | null>(null);

  const auth = useMemo(() => readAuthInfo(), []);
  const isAdmin = auth.role === "ADMIN";

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(1);
  const pushToast = (type: Toast["type"], message: string) => {
    const id = toastSeq.current++;
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };

  // Confirm state
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

  const buildPayload = (d: Draft): ProjectRequest => ({
    title: norm(d.title),
    acronym: norm(d.acronym),
    abstractEn: norm(d.abstractEn) || undefined,
    partners: norm(d.partners) || undefined,
    coordinator: norm(d.coordinator) || undefined,
    contractNumber: norm(d.contractNumber),
    startDate: d.startDate,
    endDate: d.endDate,
    possibleExtensionEndDate: d.hasExtension ? (d.possibleExtensionEndDate || null) : null
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProjects();
        setItems(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshMine = async () => {
    const data = await getMyProjects();
    setItems(data || []);
  };

  const loadExplore = async (nextPage: number) => {
    setExploreLoading(true);
    try {
      const res = await getAllProjects(q.trim(), nextPage, size);
      setExplore(res);
      setPage(nextPage);
      setOpenExploreId(null);
    } catch (e) {
      console.error(e);
      setExplore({ items: [], page: 0, size, totalElements: 0, totalPages: 0 });
      setPage(0);
      setOpenExploreId(null);
      pushToast("error", "Could not load projects.");
    } finally {
      setExploreLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "EXPLORE") return;
    loadExplore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const addDisabled = useMemo(() => {
    if (!draft.title.trim()) return true;
    if (!draft.acronym.trim()) return true;
    if (!draft.contractNumber.trim()) return true;
    if (!draft.startDate) return true;
    if (!draft.endDate) return true;
    if (draft.endDate < draft.startDate) return true;
    if (draft.hasExtension && draft.possibleExtensionEndDate && draft.possibleExtensionEndDate < draft.endDate) return true;
    return false;
  }, [draft]);

  const editDisabled = useMemo(() => {
    if (!editing.title.trim()) return true;
    if (!editing.acronym.trim()) return true;
    if (!editing.contractNumber.trim()) return true;
    if (!editing.startDate) return true;
    if (!editing.endDate) return true;
    if (editing.endDate < editing.startDate) return true;
    if (editing.hasExtension && editing.possibleExtensionEndDate && editing.possibleExtensionEndDate < editing.endDate)
      return true;
    return false;
  }, [editing]);

  const onAdd = async () => {
    if (addDisabled) return;
    setSaving(true);
    try {
      await createProject(buildPayload(draft));
      setDraft(emptyDraft);
      setShowAdd(false);
      await refreshMine();
      pushToast("success", "Project saved.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not save the project.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: ProjectDto) => {
    setEditingId(p.id);
    setEditing({
      title: p.title || "",
      acronym: p.acronym || "",
      abstractEn: p.abstractEn || "",
      partners: p.partners || "",
      coordinator: p.coordinator || "",
      contractNumber: (p as any).contractNumber || "",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      hasExtension: !!p.possibleExtensionEndDate,
      possibleExtensionEndDate: (p.possibleExtensionEndDate as string) || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing(emptyDraft);
  };

  const onSaveEdit = async () => {
    if (editingId == null || editDisabled) return;
    setSaving(true);
    try {
      await updateProject(editingId, buildPayload(editing));
      cancelEdit();
      await refreshMine();
      pushToast("success", "Project updated.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not update the project.");
    } finally {
      setSaving(false);
    }
  };

  // NEW: request delete (mine)
  const requestDeleteMine = (p: ProjectDto) => {
    const label = `${(p.title || "").trim()}`.slice(0, 60) || "this project";
    setConfirm({ open: true, mode: "MINE", id: p.id, label });
  };

  // NEW: request delete (admin explore)
  const requestDeleteExploreAdmin = (p: ProjectDto) => {
    if (!isAdmin) return;
    const label = `${(p.title || "").trim()}`.slice(0, 60) || "this project";
    setConfirm({ open: true, mode: "EXPLORE_ADMIN", id: p.id, label });
  };

  // NEW: confirm delete
  const confirmDeleteNow = async () => {
    if (!confirm.id) return;

    const id = confirm.id;
    const mode = confirm.mode;

    setConfirm({ open: false, mode: "MINE", id: null, label: "" });
    setSaving(true);

    try {
      if (mode === "MINE") {
        await deleteProject(id);
        if (editingId === id) cancelEdit();
        await refreshMine();
        pushToast("success", "Project deleted.");
      } else {
        await deleteProjectAdmin(id);
        await loadExplore(page);
        await refreshMine();
        if (openExploreId === id) setOpenExploreId(null);
        pushToast("success", "Project deleted.");
      }
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not delete the project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="annShell">
      <ToastStack toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Projects</h2>
            <span className="annSub">Add your projects and explore projects published by others.</span>
          </div>

          <div className="projectsTabs">
            <button
              type="button"
              className="btn-outline"
              aria-pressed={tab === "MINE"}
              onClick={() => setTab("MINE")}
              disabled={saving}
            >
              My projects
            </button>

            <button
              type="button"
              className="btn-outline"
              aria-pressed={tab === "EXPLORE"}
              onClick={() => {
                setTab("EXPLORE");
                setShowAdd(false);
                cancelEdit();
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
                {showAdd ? "Close" : "+ New project"}
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
                          Title (EN)*
                          <input
                            className="ecoInput"
                            value={draft.title}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                            placeholder="Project title"
                          />
                        </label>

                        <label>
                          Acronym*
                          <input
                            className="ecoInput"
                            value={draft.acronym}
                            onChange={(e) => setDraft((d) => ({ ...d, acronym: e.target.value }))}
                            placeholder="Project acronym"
                          />
                        </label>
                      </div>

                      <label>
                        Abstract (EN)
                        <textarea
                          className="ecoTextarea"
                          value={draft.abstractEn}
                          onChange={(e) => setDraft((d) => ({ ...d, abstractEn: e.target.value }))}
                          placeholder="Short abstract"
                          style={{ minHeight: 140 }}
                        />
                      </label>

                      <div className="projGrid2">
                        <label>
                          Partners
                          <input
                            className="ecoInput"
                            value={draft.partners}
                            onChange={(e) => setDraft((d) => ({ ...d, partners: e.target.value }))}
                            placeholder="Partners"
                          />
                        </label>

                        <label>
                          Coordinator
                          <input
                            className="ecoInput"
                            value={draft.coordinator}
                            onChange={(e) => setDraft((d) => ({ ...d, coordinator: e.target.value }))}
                            placeholder="Coordinator"
                          />
                        </label>
                      </div>

                      <label>
                        Contract number*
                        <input
                          className="ecoInput"
                          value={draft.contractNumber}
                          onChange={(e) => setDraft((d) => ({ ...d, contractNumber: e.target.value }))}
                          placeholder="Contract number"
                        />
                      </label>

                      <div className="projGrid2">
                        <label>
                          Start date*
                          <input
                            className="ecoInput"
                            type="date"
                            value={draft.startDate}
                            onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                          />
                        </label>

                        <label>
                          End date*
                          <input
                            className="ecoInput"
                            type="date"
                            value={draft.endDate}
                            onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                            min={draft.startDate || undefined}
                          />
                        </label>
                      </div>

                      <label className="projCheck">
                        <input
                          type="checkbox"
                          checked={draft.hasExtension}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              hasExtension: e.target.checked,
                              possibleExtensionEndDate: e.target.checked ? d.possibleExtensionEndDate : ""
                            }))
                          }
                        />
                        Possible extension
                      </label>

                      {draft.hasExtension && (
                        <label>
                          Extension end date
                          <input
                            className="ecoInput"
                            type="date"
                            value={draft.possibleExtensionEndDate}
                            onChange={(e) => setDraft((d) => ({ ...d, possibleExtensionEndDate: e.target.value }))}
                            min={draft.endDate || undefined}
                          />
                        </label>
                      )}

                      <button type="button" className="btn-primary" onClick={onAdd} disabled={saving || addDisabled}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="card" style={{ padding: 16, marginTop: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>My projects</h2>

                  {items.length === 0 ? (
                    <div className="muted" style={{ marginTop: 10 }}>
                      No projects yet.
                    </div>
                  ) : (
                    <div className="annList" style={{ marginTop: 12 }}>
                      {items.map((p) => {
                        const isEditing = editingId === p.id;

                        return (
                          <div key={p.id} className="projectItem">
                            <div className="projectTop">
                              <div className="projectTitle">
                                <strong>{p.title}</strong>
                                <span className="projectMeta">{p.acronym}</span>
                              </div>

                              <div className="projectActions">
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
                              <div className="projectDetails">
                                {(p as any).contractNumber && (
                                  <div>
                                    <span className="k">Contract:</span> {(p as any).contractNumber}
                                  </div>
                                )}

                                {p.startDate && p.endDate && (
                                  <div>
                                    <span className="k">Timeline:</span> {p.startDate} → {p.endDate}
                                    {p.possibleExtensionEndDate ? (
                                      <>
                                        {" "}
                                        <span className="k">Ext:</span> {p.possibleExtensionEndDate}
                                      </>
                                    ) : null}
                                  </div>
                                )}

                                {p.coordinator && (
                                  <div>
                                    <span className="k">Coordinator:</span> {p.coordinator}
                                  </div>
                                )}

                                {p.partners && (
                                  <div>
                                    <span className="k">Partners:</span> {p.partners}
                                  </div>
                                )}

                                {p.abstractEn && (
                                  <div style={{ marginTop: 8 }}>
                                    <span className="k">Abstract:</span> {p.abstractEn}
                                  </div>
                                )}

                                {p.url && (
                                  <div style={{ marginTop: 8 }}>
                                    <a className="annInlineLink" href={p.url} target="_blank" rel="noreferrer">
                                      Open link
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="projForm" style={{ marginTop: 12 }}>
                                <div className="projGrid2">
                                  <label>
                                    Title (EN)*
                                    <input
                                      className="ecoInput"
                                      value={editing.title}
                                      onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))}
                                    />
                                  </label>

                                  <label>
                                    Acronym*
                                    <input
                                      className="ecoInput"
                                      value={editing.acronym}
                                      onChange={(e) => setEditing((d) => ({ ...d, acronym: e.target.value }))}
                                    />
                                  </label>
                                </div>

                                <label>
                                  Abstract (EN)
                                  <textarea
                                    className="ecoTextarea"
                                    value={editing.abstractEn}
                                    onChange={(e) => setEditing((d) => ({ ...d, abstractEn: e.target.value }))}
                                    style={{ minHeight: 120 }}
                                  />
                                </label>

                                <div className="projGrid2">
                                  <label>
                                    Partners
                                    <input
                                      className="ecoInput"
                                      value={editing.partners}
                                      onChange={(e) => setEditing((d) => ({ ...d, partners: e.target.value }))}
                                    />
                                  </label>

                                  <label>
                                    Coordinator
                                    <input
                                      className="ecoInput"
                                      value={editing.coordinator}
                                      onChange={(e) => setEditing((d) => ({ ...d, coordinator: e.target.value }))}
                                    />
                                  </label>
                                </div>

                                <label>
                                  Contract number*
                                  <input
                                    className="ecoInput"
                                    value={editing.contractNumber}
                                    onChange={(e) => setEditing((d) => ({ ...d, contractNumber: e.target.value }))}
                                  />
                                </label>

                                <div className="projGrid2">
                                  <label>
                                    Start date*
                                    <input
                                      className="ecoInput"
                                      type="date"
                                      value={editing.startDate}
                                      onChange={(e) => setEditing((d) => ({ ...d, startDate: e.target.value }))}
                                    />
                                  </label>

                                  <label>
                                    End date*
                                    <input
                                      className="ecoInput"
                                      type="date"
                                      value={editing.endDate}
                                      onChange={(e) => setEditing((d) => ({ ...d, endDate: e.target.value }))}
                                      min={editing.startDate || undefined}
                                    />
                                  </label>
                                </div>

                                <label className="projCheck">
                                  <input
                                    type="checkbox"
                                    checked={editing.hasExtension}
                                    onChange={(e) =>
                                      setEditing((d) => ({
                                        ...d,
                                        hasExtension: e.target.checked,
                                        possibleExtensionEndDate: e.target.checked ? d.possibleExtensionEndDate : ""
                                      }))
                                    }
                                  />
                                  Possible extension
                                </label>

                                {editing.hasExtension && (
                                  <label>
                                    Extension end date
                                    <input
                                      className="ecoInput"
                                      type="date"
                                      value={editing.possibleExtensionEndDate}
                                      onChange={(e) => setEditing((d) => ({ ...d, possibleExtensionEndDate: e.target.value }))}
                                      min={editing.endDate || undefined}
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {tab === "EXPLORE" && (
          <div className="card" style={{ padding: 16 }}>
            <div className="twoCol">
              <div>
                <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  Search projects
                  <input
                    className="ecoInput"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by title, acronym, description, user…"
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
                              <strong>{p.title}</strong>
                              <span className="projectMeta">{p.acronym}</span>
                            </div>

                            <div className="muted" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span>
                                {(p.userFirstName || "")} {(p.userLastName || "")}
                                <span style={{ marginLeft: 10, opacity: 0.8 }}>{isOpen ? "▲" : "▼"}</span>
                              </span>

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

                          <div className="projectDetails">
                            {p.startDate && p.endDate && (
                              <div>
                                <span className="k">Timeline:</span> {p.startDate} → {p.endDate}
                                {p.possibleExtensionEndDate ? (
                                  <>
                                    {" "}
                                    <span className="k">Ext:</span> {p.possibleExtensionEndDate}
                                  </>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {isOpen && (
                            <div className="projectDetails" style={{ marginTop: 10 }}>
                              {(p as any).contractNumber && (
                                <div>
                                  <span className="k">Contract:</span> {(p as any).contractNumber}
                                </div>
                              )}

                              {(p as any).coordinator && (
                                <div>
                                  <span className="k">Coordinator:</span> {(p as any).coordinator}
                                </div>
                              )}

                              {(p as any).partners && (
                                <div>
                                  <span className="k">Partners:</span> {(p as any).partners}
                                </div>
                              )}

                              {p.abstractEn && (
                                <div style={{ marginTop: 8 }}>
                                  <span className="k">Abstract:</span> {p.abstractEn}
                                </div>
                              )}

                              {p.url && (
                                <div style={{ marginTop: 8 }}>
                                  <a
                                    className="annInlineLink"
                                    href={p.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Open link
                                  </a>
                                </div>
                              )}
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
                      disabled={exploreLoading || (explore && page >= explore.totalPages - 1)}
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
        title="Delete project"
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
