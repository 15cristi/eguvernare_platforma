/* src/pages/Publications.tsx */
import { useEffect, useMemo, useRef, useState } from "react";
import "./Publications.css";

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
import { openCv } from "../api/profile";

import { getProfileByUserId } from "../api/profile";
import { getOrCreateDirectConversation } from "../api/messages";

type PublicProfile = {
  headline?: string;
  bio?: string;
  country?: string;
  city?: string;

  affiliation?: string;
  profession?: string;
  university?: string;
  faculty?: string;

  expertAreas?: string[];
  expertise?: { area: string; description: string }[];
  resources?: { title: string; description: string; url: string }[];
  cvUrl?: string;

  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];

  openToProjects?: boolean;
  openToMentoring?: boolean;
  availability?: string;
  experienceLevel?: string;

  linkedinUrl?: string;
  githubUrl?: string;
  website?: string;
  avatarUrl?: string;
};

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

const openExternal = (raw?: string | null) => {
  const href = toUrl(raw);
  if (!href) return;
  window.open(href, "_blank", "noopener,noreferrer");
};

const joinName = (first?: string | null, last?: string | null) => `${first || ""} ${last || ""}`.trim();

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (a + b).toUpperCase();
};

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

// Backend base
const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:8080";

// Backend returns pdfPath like "/files/publications/xyz.pdf"
const toPdfUrl = (p: any) => {
  const v = norm(p?.pdfPath || p?.pdfUrl);
  if (!v) return "";
  if (v.startsWith("http")) return v;
  return `${API_BASE}${v.startsWith("/") ? "" : "/"}${v}`;
};

const toAssetUrl = (raw?: string | null) => {
  const v = norm(raw);
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

const compactLine = (label: string, value?: any) => {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return (
    <div className="muted" style={{ lineHeight: 1.35 }}>
      <span className="k">{label}</span> {v}
    </div>
  );
};

function AvatarBubble({
  name,
  avatarUrl,
  size = 34
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    setOk(true);
  }, [avatarUrl, name, size]);

  const src = avatarUrl ? toAssetUrl(avatarUrl) : "";
  const initials = initialsFromName(name || "?");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        overflow: "hidden",
        flex: `0 0 ${size}px`,
        display: "grid",
        placeItems: "center",
        background: "rgba(22, 163, 74, 0.20)",
        border: "1px solid rgba(22, 163, 74, 0.18)"
      }}
      aria-label="Avatar"
    >
      {src && ok ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "cover", display: "block" }}
          onError={() => setOk(false)}
        />
      ) : (
        <span style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>{initials || "?"}</span>
      )}
    </div>
  );
}

function ProfileModal({
  user,
  loading,
  error,
  profile,
  onClose,
  currentUserId,
  onMessage
}: {
  user: { id: number; name: string; role: string } | null;
  loading: boolean;
  error: string;
  profile: PublicProfile | null;
  onClose: () => void;
  currentUserId?: number | null;
  onMessage: (otherUserId: number) => void;
}) {
  if (!user) return null;

  const p = profile;
  const title = user.name || "Profile";
  const loc = [p?.city, p?.country].filter(Boolean).join(", ");

  const expertise = p?.expertise?.length ? p.expertise : null;
  const fallbackAreas =
    !expertise && p?.expertAreas?.length ? p.expertAreas.map((a) => ({ area: a, description: "" })) : [];
  const finalExpertise = expertise || fallbackAreas;

  const prettyEnum = (v?: string) => {
    const s = (v || "").trim();
    if (!s) return "";
    return s
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (t) => t.toUpperCase());
  };



  const canMessage = !!user.id && (typeof currentUserId !== "number" ? true : user.id !== currentUserId);

  return (
    <div className="annModalOverlay"
  onMouseDown={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
  <div className="annModal card" role="dialog" aria-modal="true">
    <div className="annModalHead">
      <div className="annModalTitle">
        <AvatarBubble name={title} avatarUrl={p?.avatarUrl} size={44} />
        <div>
          <div className="annModalName">{title}</div>
          {user.role ? <div className="muted">{user.role}</div> : null}
          {loc ? <div className="muted">{loc}</div> : null}
        </div>
      </div>

      <div className="annModalActions">
        {canMessage ? (
          <button type="button" className="btn-primary" onClick={() => onMessage(user.id)}>
            Message
          </button>
        ) : null}

        <button className="btn-outline" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>

    <div className="annModalBody">
  {loading ? <div className="muted">Loading…</div> : null}
  {!loading && error ? <div className="muted">{error}</div> : null}

  {!loading && !error && p ? (
    <>
      <div className="annRow2">
        <div className="annInfoBox">
          <div className="annInfoLabel">Profession</div>
          <div className="annInfoValue">{p.profession || "-"}</div>
        </div>

        <div className="annInfoBox">
          <div className="annInfoLabel">Faculty</div>
          <div className="annInfoValue">{p.faculty || "-"}</div>
        </div>
      </div>

      <div className="annInfoBox" style={{ marginTop: 12 }}>
        <div className="annInfoLabel">University</div>
        <div className="annInfoValue">{p.university || p.affiliation || "-"}</div>
      </div>

      {p.bio ? (
        <div className="annInfoBox" style={{ marginTop: 12 }}>
          <div className="annInfoLabel">Bio</div>
          <div className="annInfoValue">{p.bio}</div>
        </div>
      ) : null}

      <div className="annInfoBox" style={{ marginTop: 12 }}>
        <div className="annInfoLabel">Collaborations</div>
        <div className="annInfoValue">
          <div className="annChips">
            {p.openToProjects ? <span className="annChip">Open to projects</span> : null}
            {p.openToMentoring ? <span className="annChip">Open to mentoring</span> : null}
            {p.availability ? <span className="annChip">{prettyEnum(p.availability)}</span> : null}
            {p.experienceLevel ? <span className="annChip">{prettyEnum(p.experienceLevel)}</span> : null}
          </div>
        </div>
      </div>

      {finalExpertise?.length ? (
        <div className="annInfoBox" style={{ marginTop: 12 }}>
          <div className="annInfoLabel">Expertise</div>
          <div className="annInfoValue">
            <div className="annList">
              {finalExpertise.map((x, idx) => (
                <div key={`${x.area}-${idx}`} className="annListRow">
                  <div className="annListTitle">{x.area}</div>
                  {x.description ? <div className="annListSub">{x.description}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {p.resources?.length ? (
        <div className="annInfoBox" style={{ marginTop: 12 }}>
          <div className="annInfoLabel">Resources</div>
          <div className="annInfoValue">
            <div className="annList">
              {p.resources.map((r, idx) => (
                <div key={`${r.title}-${idx}`} className="annResourceRow">
                  <div style={{ minWidth: 0 }}>
                    <div className="annListTitle">{r.title}</div>
                    {r.description ? <div className="annListSub">{r.description}</div> : null}
                  </div>
                  {r.url ? (
                    <button type="button" className="annLinkBtn" onClick={() => openCv(r.url)}>
                      Open
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {p.companyName ? (
        <div className="annInfoBox" style={{ marginTop: 12 }}>
          <div className="annInfoLabel">Company</div>
          <div className="annInfoValue">
            <div className="annListTitle">{p.companyName}</div>
            {p.companyDescription ? <div className="annListSub">{p.companyDescription}</div> : null}
            {p.companyDomains?.length ? (
              <div className="annChips" style={{ marginTop: 8 }}>
                {p.companyDomains.map((d, i) => (
                  <span key={`${d}-${i}`} className="annChip">
                    {d}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {p.cvUrl ? (
        <div className="annInfoBox" style={{ marginTop: 12 }}>
          <div className="annInfoLabel">CV</div>
          <div className="annInfoValue">
            <button type="button" className="annLinkBtn" onClick={() => openCv(p.cvUrl!)}>
              Open CV
            </button>
          </div>
        </div>
      ) : null}



        




    </>
  ) : null}
</div>

<div className="annModalFoot">
  {canMessage ? (
    <button type="button" className="btn-primary" onClick={() => onMessage(user.id)} disabled={loading}>
      Message
    </button>
  ) : null}
  <button className="btn-outline" type="button" onClick={onClose}>
    Close
  </button>
</div>

  </div>
</div>

  );
}

function PublicationDetailsModal({
  publication,
  onClose,
  onOpenPdf,
  onOpenProfile,
  ownerAvatarUrl
}: {
  publication: PublicationDto | null;
  onClose: () => void;
  onOpenPdf: (p: PublicationDto) => void;
  onOpenProfile: (userId: number | null, name: string, role: string) => void;
  ownerAvatarUrl?: string | null;
}) {
  if (!publication) return null;

  const ownerId =
    (publication as any).userId ?? (publication as any).ownerId ?? (publication as any).createdById ?? null;

  const name = joinName((publication as any).userFirstName, (publication as any).userLastName) || "User";
  const role = ((publication as any).userRole || "").trim() || "";

  

  return (
  <div
    className="annModalOverlay"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div className="annModal card" role="dialog" aria-modal="true">
      <div className="annModalHead">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AvatarBubble name={name} avatarUrl={ownerAvatarUrl ?? null} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="annModalName" style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.15 }}>
              {(publication as any).title}
            </div>
            <div className="muted" style={{ marginTop: 2 }}>
              {prettyType((publication as any).type)}
              {name ? ` · ${name}` : ""}
            </div>
          </div>
        </div>

        <button className="btn-outline annConfirmClose" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="annModalBody">
        <div className="annRow2">
          <div className="annInfoBox">
            <div className="annInfoLabel">Authors</div>
            <div className="annInfoValue">{(publication as any).authors || "-"}</div>
          </div>
          <div className="annInfoBox">
            <div className="annInfoLabel">Keywords</div>
            <div className="annInfoValue">{(publication as any).keywords || "-"}</div>
          </div>
        </div>

        <div className="annRow2" style={{ marginTop: 12 }}>
          <div className="annInfoBox">
            <div className="annInfoLabel">Journal / Conference</div>
            <div className="annInfoValue">{(publication as any).journalTitle || "-"}</div>
          </div>
          <div className="annInfoBox">
            <div className="annInfoLabel">Publisher</div>
            <div className="annInfoValue">{(publication as any).publisher || "-"}</div>
          </div>
        </div>

        <div className="annRow2" style={{ marginTop: 12 }}>
          <div className="annInfoBox">
            <div className="annInfoLabel">Volume / Issue</div>
            <div className="annInfoValue">{(publication as any).volumeIssue || "-"}</div>
          </div>
          <div className="annInfoBox">
            <div className="annInfoLabel">Pages</div>
            <div className="annInfoValue">{(publication as any).pages || "-"}</div>
          </div>
        </div>

        <div className="annRow2" style={{ marginTop: 12 }}>
          <div className="annInfoBox">
            <div className="annInfoLabel">DOI</div>
            <div className="annInfoValue">{(publication as any).doi || "-"}</div>
          </div>
          <div className="annInfoBox">
            <div className="annInfoLabel">Year</div>
            <div className="annInfoValue">{(publication as any).year || "-"}</div>
          </div>
        </div>

        <div className="annInfoBox" style={{ marginTop: 12 }}>
          <div className="annInfoLabel">Published</div>
          <div className="annInfoValue">{(publication as any).publishedDate || "-"}</div>
        </div>


        {((publication as any).pdfPath || (publication as any).externalLink) ? (
          <div className="annInfoBox" style={{ marginTop: 12 }}>
            <div className="annInfoLabel">Resources</div>
            <div className="annInfoValue">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(publication as any).pdfPath ? (
                  <button
                    type="button"
                    className="annLinkBtn"
                    onClick={() => onOpenPdf(publication)}
                  >
                    PDF
                  </button>
                ) : null}

                {(publication as any).externalLink ? (
                  <button
                    type="button"
                    className="annLinkBtn"
                    onClick={() => openExternal((publication as any).externalLink)}
                  >
                    Link
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="annModalFoot">
        <button
          type="button"
          className="btn-outline"
          onClick={() => onOpenProfile(ownerId, name, role)}
          disabled={!ownerId}
        >
          Profile
        </button>

        



        <button className="btn-outline" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
);

}

export default function PublicationsPage() {
  const nav = useNavigate();

  const [tab, setTab] = useState<Tab>("MINE");

  const [items, setItems] = useState<PublicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft>(emptyDraft());

  const [detailsPub, setDetailsPub] = useState<PublicationDto | null>(null);

  // Explore
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(12);
  const [explore, setExplore] = useState<PageResponse<PublicationDto> | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);

  const auth = useMemo(() => readAuthInfo(), []);
  const isAdmin = auth.role === "ADMIN";

  const isJournalOrConfDraft = draft.type === "ARTICOL_JURNAL" || draft.type === "LUCRARE_CONFERINTA";
  const isBookOrChapterDraft = draft.type === "CARTE" || draft.type === "CAPITOL_CARTE";
  const isJournalOrConfEdit = editing.type === "ARTICOL_JURNAL" || editing.type === "LUCRARE_CONFERINTA";
  const isBookOrChapterEdit = editing.type === "CARTE" || editing.type === "CAPITOL_CARTE";

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

  // Profile modal state
  const [profileUser, setProfileUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const profileCache = useRef<Map<number, PublicProfile>>(new Map());

  // Avatars cache for lists (like Projects)
  const [avatars, setAvatars] = useState<Record<number, string | null | undefined>>({});

  const getAvatarForUser = async (userId: number) => {
    if (!userId) return;
    if (avatars[userId] !== undefined) return; // already tried
    setAvatars((m) => ({ ...m, [userId]: null })); // mark as tried (optimistic)

    try {
      const cached = profileCache.current.get(userId);
      if (cached?.avatarUrl) {
        setAvatars((m) => ({ ...m, [userId]: cached.avatarUrl || null }));
        return;
      }

      const data = (await getProfileByUserId(userId)) as PublicProfile;
      profileCache.current.set(userId, data);
      setAvatars((m) => ({ ...m, [userId]: data.avatarUrl || null }));
    } catch {
      setAvatars((m) => ({ ...m, [userId]: null }));
    }
  };

  const prefetchAvatars = async (pubs: PublicationDto[]) => {
    const ids = Array.from(
      new Set(
        (pubs || [])
          .map((p) => (p as any).userId ?? (p as any).ownerId ?? (p as any).createdById ?? null)
          .filter((x: any) => typeof x === "number" && x > 0)
      )
    ) as number[];

    // fire and forget, but still deterministic enough
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await getAvatarForUser(id);
    }
  };

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
      url: norm(d.externalLink) || undefined
    } as any;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyPublications();
        setItems(data || []);
        prefetchAvatars(data || []);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshMine = async () => {
    const data = await getMyPublications();
    setItems(data || []);
    prefetchAvatars(data || []);
  };

  const loadExplore = async (nextPage: number) => {
    setExploreLoading(true);
    try {
      const res = await getAllPublications(q.trim(), nextPage, size);
      setExplore(res);
      setPage(nextPage);

      if (res?.items?.length) prefetchAvatars(res.items);
    } catch (e) {
      console.error(e);
      setExplore({ items: [], page: 0, size, totalElements: 0, totalPages: 0 } as any);
      setPage(0);
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
      if (tab === "EXPLORE") await loadExplore(page);

      pushToast("success", "Publication updated.");
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not update the publication.");
    } finally {
      setSaving(false);
    }
  };

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
        await refreshMine();
        if (tab === "EXPLORE") await loadExplore(page);
      } else {
        await deletePublicationAdmin(id);
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

  const openProfile = async (userId: number | null, name: string, role: string) => {
    if (!userId) return;

    setProfileUser({ id: userId, name, role });
    setProfileError("");
    setProfileLoading(true);

    const cached = profileCache.current.get(userId);
    if (cached) {
      setProfileData(cached);
      setProfileLoading(false);
      if (cached.avatarUrl) setAvatars((m) => ({ ...m, [userId]: cached.avatarUrl || null }));
      return;
    }

    try {
      const data = (await getProfileByUserId(userId)) as PublicProfile;
      profileCache.current.set(userId, data);
      setProfileData(data);
      setAvatars((m) => ({ ...m, [userId]: data.avatarUrl || null }));
    } catch (e) {
      console.error(e);
      setProfileData(null);
      setProfileError("Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setProfileUser(null);
    setProfileData(null);
    setProfileLoading(false);
    setProfileError("");
  };

  const onMessageFromProfile = async (otherUserId: number) => {
    try {
      const { conversationId } = await getOrCreateDirectConversation(otherUserId);
      closeProfile();
      nav(`/messages?c=${conversationId}`);
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not start conversation.");
    }
  };

  const ownerIdForPub = (p: any) => (p?.userId ?? p?.ownerId ?? p?.createdById ?? null) as number | null;

  const currentDetailsOwnerId = detailsPub ? ownerIdForPub(detailsPub as any) : null;
  const currentDetailsOwnerAvatar =
    currentDetailsOwnerId ? (avatars[currentDetailsOwnerId] ?? null) : null;

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

                        const owner = joinName((p as any).userFirstName, (p as any).userLastName) || "Unknown user";
                        const ownerId = ownerIdForPub(p as any);
                        const avatarUrl = ownerId ? (avatars[ownerId] ?? null) : null;

                        return (
                          <div key={p.id} className="projectItem" style={{ cursor: "default" }}>
                           <div className="projectTop">
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <AvatarBubble name={owner} avatarUrl={avatarUrl} size={40} />

                                <div className="projectTitle">
                                  <strong>{(p as any).title}</strong>
                                  <div className="muted" style={{ marginTop: 2 }}>{owner}</div>
                                </div>
                              </div>

                              <div className="projectActions">
                                {!isEditing ? (
                                  <>
                                    <button type="button" className="btn-outline" onClick={() => startEdit(p)} disabled={saving}>
                                      Edit
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => requestDeleteMine(p)} disabled={saving}>
                                      Delete
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setDetailsPub(p)} disabled={saving}>
                                      Details
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
                              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                                {compactLine("Type:", prettyType((p as any).type))}
                                {compactLine("Authors:", (p as any).authors)}
                                {compactLine("Keywords:", (p as any).keywords)}
                                {compactLine("Journal / Conference:", (p as any).journalTitle)}

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                                  {(p as any).pdfPath ? (
                                    <button type="button" className="btn-outline" onClick={() => openPdfWithAuth(p as any)}>
                                      PDF
                                    </button>
                                  ) : null}

                                  {(p as any).externalLink ? (
                                    <button type="button" className="btn-outline" onClick={() => openExternal((p as any).externalLink)}>
                                      Link
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <div className="projForm" style={{ marginTop: 12 }}>
                                <div className="projGrid2">
                                  <label>
                                    Type*
                                    <select className="ecoInput" value={editing.type} onChange={(e) => setEditing((d) => ({ ...d, type: e.target.value as PublicationType }))}>
                                      {typeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Title*
                                    <input className="ecoInput" value={editing.title} onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))} />
                                  </label>
                                </div>

                                <div className="projGrid2">
                                  <label>
                                    Authors
                                    <input className="ecoInput" value={editing.authors} onChange={(e) => setEditing((d) => ({ ...d, authors: e.target.value }))} />
                                  </label>

                                  <label>
                                    External link
                                    <input className="ecoInput" value={editing.externalLink} onChange={(e) => setEditing((d) => ({ ...d, externalLink: e.target.value }))} />
                                  </label>
                                </div>

                                <div className="projGrid2">
                                  <label>
                                    Publication date*
                                    <input className="ecoInput" type="date" value={editing.publishedDate} onChange={(e) => setEditing((d) => ({ ...d, publishedDate: e.target.value }))} />
                                  </label>

                                  <label>
                                    Year
                                    <input className="ecoInput" value={editing.year} onChange={(e) => setEditing((d) => ({ ...d, year: e.target.value }))} />
                                  </label>
                                </div>

                                <label>
                                  Keywords
                                  <input className="ecoInput" value={editing.keywords} onChange={(e) => setEditing((d) => ({ ...d, keywords: e.target.value }))} />
                                </label>

                                {isJournalOrConfEdit ? (
                                  <>
                                    <div className="projGrid2">
                                      <label>
                                        Journal / Conference title*
                                        <input className="ecoInput" value={editing.journalTitle} onChange={(e) => setEditing((d) => ({ ...d, journalTitle: e.target.value }))} />
                                      </label>

                                      <label>
                                        Volume / issue
                                        <input className="ecoInput" value={editing.volumeIssue} onChange={(e) => setEditing((d) => ({ ...d, volumeIssue: e.target.value }))} />
                                      </label>
                                    </div>

                                    <div className="projGrid2">
                                      <label>
                                        Pages
                                        <input className="ecoInput" value={editing.pages} onChange={(e) => setEditing((d) => ({ ...d, pages: e.target.value }))} />
                                      </label>

                                      <label>
                                        DOI
                                        <input className="ecoInput" value={editing.doi} onChange={(e) => setEditing((d) => ({ ...d, doi: e.target.value }))} />
                                      </label>
                                    </div>
                                  </>
                                ) : null}

                                {isBookOrChapterEdit ? (
                                  <label>
                                    Publisher*
                                    <input className="ecoInput" value={editing.publisher} onChange={(e) => setEditing((d) => ({ ...d, publisher: e.target.value }))} />
                                  </label>
                                ) : null}

                                <label>
                                  Replace PDF (max 10 MB)
                                  <input type="file" accept="application/pdf" onChange={(e) => setEditing((d) => ({ ...d, pdfFile: e.target.files?.[0] || null }))} />
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
                      const owner = joinName((p as any).userFirstName, (p as any).userLastName) || "Unknown user";
                      const ownerId = ownerIdForPub(p as any);
                      const avatarUrl = ownerId ? (avatars[ownerId] ?? null) : null;

                      return (
                        <div key={p.id} className="projectItem" style={{ cursor: "default" }}>
                          <div className="projectTop">
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                  <AvatarBubble name={owner} avatarUrl={avatarUrl} size={40} />

                                  <div className="projectTitle">
                                    <strong>{(p as any).title}</strong>
                                    <div className="muted" style={{ marginTop: 2 }}>{owner}</div>
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => setDetailsPub(p)}
                                    disabled={saving}
                                  >
                                    Details
                                  </button>

                                  {isAdmin ? (
                                    <button
                                      type="button"
                                      className="btn-outline"
                                      onClick={() => requestDeleteExploreAdmin(p)}
                                      disabled={saving}
                                    >
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                            {compactLine("Type:", prettyType((p as any).type))}
                            {compactLine("Authors:", (p as any).authors)}
                            {compactLine("Keywords:", (p as any).keywords)}
                            {compactLine("Journal / Conference:", (p as any).journalTitle)}

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                              {(p as any).pdfPath ? (
                                <button type="button" className="btn-outline" onClick={() => openPdfWithAuth(p as any)}>
                                  PDF
                                </button>
                              ) : null}

                              {(p as any).externalLink ? (
                                <button type="button" className="btn-outline" onClick={() => openExternal((p as any).externalLink)}>
                                  Link
                                </button>
                              ) : null}
                            </div>
                          </div>
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

      <PublicationDetailsModal
        publication={detailsPub}
        ownerAvatarUrl={currentDetailsOwnerAvatar}
        onClose={() => setDetailsPub(null)}
        onOpenPdf={openPdfWithAuth}
        onOpenProfile={(uid, name, role) => {
          setDetailsPub(null);
          if (uid) openProfile(uid, name, role);
        }}
      />

      {profileUser ? (
        <ProfileModal
          user={profileUser}
          loading={profileLoading}
          error={profileError}
          profile={profileData}
          onClose={closeProfile}
          currentUserId={auth.userId}
          onMessage={onMessageFromProfile}
        />
      ) : null}

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
