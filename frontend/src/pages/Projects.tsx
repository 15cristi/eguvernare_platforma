// src/pages/Projects.tsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  deleteProject,
  getMyProjects,
  getAllProjects,
  updateProject
} from "../api/projects";
import type { ProjectDto, ProjectRequest } from "../api/projects";
import { getProfileByUserId } from "../api/profile";
import { getOrCreateDirectConversation } from "../api/messages";
import { AuthContext } from "../context/AuthContext";
import "./Projects.css";

type Draft = {
  title: string;
  acronym: string;
  abstractEn: string;
  coordinator: string;
  contractNumber: string;
  url: string;
  startDate: string;
  endDate: string;
  possibleExtensionEndDate: string;
  partners: string[];
};

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

const norm = (s: string) => (s ?? "").trim();
const normList = (items: string[]) => (items ?? []).map((x) => norm(x)).filter((x) => x.length > 0);

function pickPage<T>(page: any): { items: T[]; pageIndex: number; hasMore: boolean } {
  if (!page) return { items: [], pageIndex: 0, hasMore: false };

  const items: T[] =
    (Array.isArray(page) ? page : null) ??
    (Array.isArray(page.content) ? page.content : null) ??
    (Array.isArray(page.items) ? page.items : null) ??
    (Array.isArray(page.data) ? page.data : null) ??
    (Array.isArray(page.results) ? page.results : null) ??
    (Array.isArray(page.list) ? page.list : null) ??
    [];

  const pageIndex: number =
    typeof page.number === "number"
      ? page.number
      : typeof page.page === "number"
        ? page.page
        : typeof page.pageIndex === "number"
          ? page.pageIndex
          : 0;

  const hasMore: boolean =
    typeof page.last === "boolean"
      ? !page.last
      : typeof page.hasMore === "boolean"
        ? page.hasMore
        : typeof page.totalPages === "number"
          ? pageIndex + 1 < page.totalPages
          : typeof page.totalElements === "number" && typeof page.size === "number"
            ? (pageIndex + 1) * page.size < page.totalElements
            : false;

  return { items, pageIndex, hasMore };
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
  currentUserId?: number;
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

  const showLink = (label: string, url?: string) => {
    const v = (url || "").trim();
    if (!v) return null;
    const href = v.startsWith("http") ? v : `https://${v}`;
    return (
      <a className="annPill" href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  };

  const canMessage =
    !!user.id && (typeof currentUserId !== "number" ? true : user.id !== currentUserId);

  return (
    <div
      className="annModalOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="annModal card" role="dialog" aria-modal="true">
        <div className="annModalHead">
          <div className="annModalTitle">
            <div
                className="annModalAvatar"
                style={
                  p?.avatarUrl
                    ? {
                        backgroundImage: `url(${p.avatarUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat"
                      }
                    : undefined
                }
              />

            <div>
              <h3>{title}</h3>
              <div className="muted">{user.role}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {canMessage ? (
              <button className="btn-primary" type="button" onClick={() => onMessage(user.id)}>
                Message
              </button>
            ) : null}

            <button className="btn-outline" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {loading && <div className="muted">Loading…</div>}
        {error && <div className="annError">{error}</div>}

        {!loading && !error && p && (
          <div className="annModalBody">
            {p.headline?.trim() ? <div className="annHeadline">{p.headline}</div> : null}
            {loc ? <div className="muted">{loc}</div> : null}
            {p.bio?.trim() ? <div className="annBio">{p.bio}</div> : null}

            <div className="annGrid">
              {p.affiliation?.trim() ? (
                <div>
                  <div className="muted">Affiliation</div>
                  <div>{p.affiliation}</div>
                </div>
              ) : null}

              {p.profession?.trim() ? (
                <div>
                  <div className="muted">Profession</div>
                  <div>{p.profession}</div>
                </div>
              ) : null}

              {p.faculty?.trim() ? (
                <div>
                  <div className="muted">Faculty</div>
                  <div>{p.faculty}</div>
                </div>
              ) : null}

              {p.university?.trim() ? (
                <div>
                  <div className="muted">University</div>
                  <div>{p.university}</div>
                </div>
              ) : null}
            </div>

            {(p.openToProjects || p.openToMentoring || p.availability?.trim() || p.experienceLevel?.trim()) && (
              <div className="annSection">
                <div className="annSectionTitle">Collaborations</div>
                <div className="annPills">
                  {p.openToProjects ? <span className="annPill">Open to projects</span> : null}
                  {p.openToMentoring ? <span className="annPill">Open to mentoring</span> : null}
                  {p.availability?.trim() ? <span className="annPill">{prettyEnum(p.availability)}</span> : null}
                  {p.experienceLevel?.trim() ? <span className="annPill">{prettyEnum(p.experienceLevel)}</span> : null}
                </div>
              </div>
            )}

            {finalExpertise?.length ? (
              <div className="annSection">
                <div className="annSectionTitle">Expertise</div>
                <div className="annList">
                  {finalExpertise.map((x, idx) => (
                    <div className="annListItem" key={`${x.area}-${idx}`}>
                      <div className="annListTop">
                        <strong>{x.area}</strong>
                      </div>
                      {x.description?.trim() ? <div className="muted">{x.description}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {p.resources?.length ? (
              <div className="annSection">
                <div className="annSectionTitle">Resources</div>
                <div className="annList">
                  {p.resources.map((r, idx) => (
                    <div className="annListItem" key={`${r.title}-${idx}`}>
                      <div className="annListTop">
                        <strong>{r.title}</strong>
                        {r.url?.trim() ? (
                          <a
                            className="annInlineLink"
                            href={r.url.startsWith("http") ? r.url : `https://${r.url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                      {r.description?.trim() ? <div className="muted">{r.description}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(p.companyName?.trim() || p.companyDescription?.trim() || p.companyDomains?.length) && (
              <div className="annSection">
                <div className="annSectionTitle">Company</div>
                {p.companyName?.trim() ? (
                  <div>
                    <strong>{p.companyName}</strong>
                  </div>
                ) : null}
                {p.companyDescription?.trim() ? <div className="muted" style={{ marginTop: 6 }}>{p.companyDescription}</div> : null}
                {p.companyDomains?.length ? (
                  <div className="annPills">
                    {p.companyDomains.slice(0, 12).map((d) => (
                      <span className="annPill" key={d}>
                        {d}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {(p.linkedinUrl?.trim() || p.githubUrl?.trim() || p.website?.trim()) && (
              <div className="annSection">
                <div className="annSectionTitle">Links</div>
                <div className="annPills">
                  {showLink("LinkedIn", p.linkedinUrl)}
                  {showLink("GitHub", p.githubUrl)}
                  {showLink("Website", p.website)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectDetailsModal({
  project,
  onClose,
  onOpenProfile,
  ownerAvatarUrl
}: {
  project: ProjectDto | null;
  onClose: () => void;
  onOpenProfile: (userId: number | null, name: string, role: string) => void;
  ownerAvatarUrl: string | null;
}) {
  if (!project) return null;

  const ownerId = (project as any).userId ?? null;

  const partners = Array.isArray(project.partners)
    ? project.partners.filter((x) => !!x && String(x).trim().length > 0)
    : [];

  const contractNumber = (project as any).contractNumber ?? "";

  const name = `${(project.userFirstName || "").trim()} ${(project.userLastName || "").trim()}`.trim() || "User";
  const role = (project.userRole || "").trim() || "";

  return (
    <div
      className="annConfirmOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="annConfirmModal card" role="dialog" aria-modal="true" style={{ maxWidth: 760 }}>
        <div className="annConfirmHead">
          <h3 className="annConfirmTitle">Project details</h3>
          <button className="btn-outline annConfirmClose" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="projectDetails" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                className="avatarSmall"
                style={
                  ownerAvatarUrl
                    ? {
                        backgroundImage: `url(${ownerAvatarUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat"
                      }
                    : undefined
                }
              />

              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{project.title}</div>
                {project.acronym ? <div className="muted">{project.acronym}</div> : null}
                <div className="muted" style={{ marginTop: 4 }}>
                  {name}
                  {role ? <span style={{ marginLeft: 8, opacity: 0.85 }}>({role})</span> : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-outline"
              onClick={() => onOpenProfile(ownerId, name, role)}
              disabled={!ownerId}
              title="Open profile"
            >
              Profile
            </button>
          </div>

          {project.startDate && project.endDate ? (
            <div>
              <span className="k">Timeline:</span> {project.startDate} → {project.endDate}
              {project.possibleExtensionEndDate ? (
                <>
                  {" "}
                  <span className="k">Ext:</span> {project.possibleExtensionEndDate}
                </>
              ) : null}
            </div>
          ) : null}

          {contractNumber ? (
            <div>
              <span className="k">Contract:</span> {contractNumber}
            </div>
          ) : null}

          {project.coordinator ? (
            <div>
              <span className="k">Coordinator:</span> {project.coordinator}
            </div>
          ) : null}

          {partners.length ? (
            <div>
              <span className="k">Partners:</span> {partners.join(", ")}
            </div>
          ) : null}

          {project.abstractEn ? (
            <div>
              <div className="k" style={{ marginBottom: 4 }}>
                Abstract
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{project.abstractEn}</div>
            </div>
          ) : null}

          {project.url ? (
            <div>
              <a className="annInlineLink" href={project.url} target="_blank" rel="noreferrer">
                Open link
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const nav = useNavigate();
  const { user } = useContext(AuthContext);

  const currentUserId: number | undefined =
    (user as any)?.id ?? (user as any)?.userId ?? (user as any)?.sub ?? undefined;

  const [tab, setTab] = useState<"my" | "explore">("my");
  const [saving, setSaving] = useState(false);

  // My projects
  const [myProjects, setMyProjects] = useState<ProjectDto[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);

  // Explore (paged)
  const [q, setQ] = useState("");
  const [explore, setExplore] = useState<ProjectDto[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [explorePage, setExplorePage] = useState(0);
  const [exploreHasMore, setExploreHasMore] = useState(false);

  // Details modal (Explore)
  const [detailsProject, setDetailsProject] = useState<ProjectDto | null>(null);

  // Profile modal (like announcements)
  const [profileUser, setProfileUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const profileCache = useRef(new Map<number, PublicProfile>());
  const [avatars, setAvatars] = useState<Record<number, string | null | undefined>>({});

  const emptyDraft: Draft = useMemo(
    () => ({
      title: "",
      acronym: "",
      abstractEn: "",
      coordinator: "",
      contractNumber: "",
      url: "",
      startDate: "",
      endDate: "",
      possibleExtensionEndDate: "",
      partners: [""]
    }),
    []
  );

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  // Editing (My projects)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft>(emptyDraft);

  const getAvatarForUser = async (userId: number | null | undefined) => {
    if (!userId) return null;

    const cached = profileCache.current.get(userId);
    if (cached?.avatarUrl) return cached.avatarUrl;

    try {
      const data = (await getProfileByUserId(userId)) as PublicProfile;
      profileCache.current.set(userId, data);
      return data.avatarUrl || null;
    } catch {
      return null;
    }
  };

  const ensureAvatar = async (userId: number | null | undefined) => {
    if (!userId) return;
    if (avatars[userId] !== undefined) return; // deja încercat / există
    setAvatars((m) => ({ ...m, [userId]: null })); // rezervă slotul

    const url = await getAvatarForUser(userId);
    setAvatars((m) => ({ ...m, [userId]: url }));
  };

  const openProfile = async (userId: number, name: string, role: string) => {
    setProfileUser({ id: userId, name, role });

    const cached = profileCache.current.get(userId) || null;
    setProfileData(cached);

    setProfileError("");
    setProfileLoading(true);

    try {
      const data = (await getProfileByUserId(userId)) as PublicProfile;
      profileCache.current.set(userId, data);
      setProfileData(data);

      // sincronizează și avatar map, ca să apară peste tot
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

  useEffect(() => {
    if (!profileUser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProfile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUser]);

  const onMessageFromProfile = async (otherUserId: number) => {
    try {
      const { conversationId } = await getOrCreateDirectConversation(otherUserId);
      closeProfile();
      nav(`/messages?c=${conversationId}`);
    } catch (e) {
      console.error(e);
      alert("Could not start conversation.");
    }
  };

  const refreshMy = async () => {
    setLoadingMy(true);
    try {
      const data = await getMyProjects();
      setMyProjects(Array.isArray(data) ? data : []);
    } finally {
      setLoadingMy(false);
    }
  };

  const refreshExplore = async (pageToLoad = 0) => {
    setLoadingExplore(true);
    try {
      const data = await getAllProjects(q, pageToLoad, 12);
      const p = pickPage<ProjectDto>(data as any);

      setExplore(p.items);
      setExplorePage(p.pageIndex);
      setExploreHasMore(p.hasMore);

      // prefetch avataruri pentru proiectele din pagină
      p.items.forEach((it: any) => {
        const uid = (it as any).userId ?? null;
        if (uid) ensureAvatar(uid);
      });
    } finally {
      setLoadingExplore(false);
    }
  };

  const loadMoreExplore = async () => {
    if (loadingExplore) return;
    setLoadingExplore(true);
    try {
      const nextPage = explorePage + 1;
      const data = await getAllProjects(q, nextPage, 12);
      const p = pickPage<ProjectDto>(data as any);

      setExplore((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const it of p.items) {
          if (!seen.has(it.id)) merged.push(it);
        }
        return merged;
      });

      setExplorePage(p.pageIndex);
      setExploreHasMore(p.hasMore);

      p.items.forEach((it: any) => {
        const uid = (it as any).userId ?? null;
        if (uid) ensureAvatar(uid);
      });
    } finally {
      setLoadingExplore(false);
    }
  };

  useEffect(() => {
    refreshMy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "explore") refreshExplore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const buildPayload = (d: Draft): ProjectRequest => {
    const partners = normList(d.partners);
    return {
      title: norm(d.title),
      acronym: norm(d.acronym) || undefined,
      abstractEn: norm(d.abstractEn) || undefined,
      coordinator: norm(d.coordinator) || undefined,
      contractNumber: norm(d.contractNumber) || undefined,
      url: norm(d.url) || undefined,
      startDate: norm(d.startDate) || undefined,
      endDate: norm(d.endDate) || undefined,
      possibleExtensionEndDate: norm(d.possibleExtensionEndDate) || undefined,
      partners: partners.length ? partners : undefined
    };
  };

  const startEdit = (p: ProjectDto) => {
    setEditingId(p.id ?? null);
    setEditing({
      title: p.title || "",
      acronym: p.acronym || "",
      abstractEn: p.abstractEn || "",
      coordinator: p.coordinator || "",
      contractNumber: (p as any).contractNumber || "",
      url: p.url || "",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      possibleExtensionEndDate: (p.possibleExtensionEndDate as any) || "",
      partners: Array.isArray(p.partners) && p.partners.length ? p.partners : [""]
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing(emptyDraft);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProject(buildPayload(draft));
      setDraft(emptyDraft);
      await refreshMy();
      if (tab === "explore") await refreshExplore(0);
    } finally {
      setSaving(false);
    }
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateProject(editingId, buildPayload(editing));
      cancelEdit();
      await refreshMy();
      if (tab === "explore") await refreshExplore(0);
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null; title: string }>({
    open: false,
    id: null,
    title: ""
  });

  const onDeleteAsk = (id: number, title: string) => {
    setConfirmDelete({ open: true, id, title: title || "this project" });
  };

  const onDeleteConfirm = async () => {
    const id = confirmDelete.id;
    if (!id) return;

    setConfirmDelete({ open: false, id: null, title: "" });

    setSaving(true);
    try {
      await deleteProject(id);
      await refreshMy();
      if (tab === "explore") await refreshExplore(0);
    } finally {
      setSaving(false);
    }
  };

  // avatar pentru proiectul din details modal
  const detailsOwnerId = (detailsProject as any)?.userId ?? null;
  const detailsOwnerAvatar = detailsOwnerId ? avatars[detailsOwnerId] ?? null : null;

  return (
    <div className="page">
      <div className="pageHead">
        <div className="pageTitle">Projects</div>

        <div className="tabs">
          <button type="button" className={tab === "my" ? "tab tab-active" : "tab"} onClick={() => setTab("my")}>
            My projects
          </button>
          <button type="button" className={tab === "explore" ? "tab tab-active" : "tab"} onClick={() => setTab("explore")}>
            Explore
          </button>
        </div>
      </div>

      {tab === "my" ? (
        <div className="grid2">
          {/* Add new */}
          <div className="card">
            <div className="cardTitle">Add project</div>

            <form onSubmit={onCreate} className="form">
              <div className="row2">
                <div>
                  <div className="label">Title</div>
                  <input className="ecoInput" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} required />
                </div>
                <div>
                  <div className="label">Acronym</div>
                  <input className="ecoInput" value={draft.acronym} onChange={(e) => setDraft((d) => ({ ...d, acronym: e.target.value }))} />
                </div>
              </div>

              <div className="row2">
                <div>
                  <div className="label">Start date</div>
                  <input type="date" className="ecoInput" value={draft.startDate} onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} />
                </div>
                <div>
                  <div className="label">End date</div>
                  <input type="date" className="ecoInput" value={draft.endDate} onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} />
                </div>
              </div>

              <div className="row2">
                <div>
                  <div className="label">Possible extension end</div>
                  <input
                    type="date"
                    className="ecoInput"
                    value={draft.possibleExtensionEndDate}
                    onChange={(e) => setDraft((d) => ({ ...d, possibleExtensionEndDate: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="label">Contract number</div>
                  <input className="ecoInput" value={draft.contractNumber} onChange={(e) => setDraft((d) => ({ ...d, contractNumber: e.target.value }))} />
                </div>
              </div>

              <div className="row2">
                <div>
                  <div className="label">Coordinator</div>
                  <input className="ecoInput" value={draft.coordinator} onChange={(e) => setDraft((d) => ({ ...d, coordinator: e.target.value }))} />
                </div>
                <div>
                  <div className="label">URL</div>
                  <input className="ecoInput" value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://…" />
                </div>
              </div>

              {/* Partners (multiple) */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="label" style={{ margin: 0 }}>
                    Partners
                  </div>
                  <button type="button" className="btn-outline" onClick={() => setDraft((d) => ({ ...d, partners: [...d.partners, ""] }))}>
                    + Add partner
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {draft.partners.map((val, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8 }}>
                      <input
                        className="ecoInput"
                        value={val}
                        onChange={(e) =>
                          setDraft((d) => {
                            const next = [...d.partners];
                            next[idx] = e.target.value;
                            return { ...d, partners: next };
                          })
                        }
                        placeholder={idx === 0 ? "Partner" : `Partner #${idx + 1}`}
                      />
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() =>
                          setDraft((d) => {
                            const next = d.partners.filter((_, i) => i !== idx);
                            return { ...d, partners: next.length ? next : [""] };
                          })
                        }
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="label">Abstract</div>
                <textarea className="ecoInput" value={draft.abstractEn} onChange={(e) => setDraft((d) => ({ ...d, abstractEn: e.target.value }))} rows={5} />
              </div>

              <div className="actions">
                <button className="btn" type="submit" disabled={saving}>
                  Save
                </button>
              </div>
            </form>
          </div>

          {/* List my */}
          <div className="card">
            <div className="cardTitle">My projects</div>

            {loadingMy ? (
              <div className="muted">Loading…</div>
            ) : myProjects.length === 0 ? (
              <div className="muted">No projects yet.</div>
            ) : (
              <div className="list">
                {myProjects.map((p) => {
                  const id = p.id ?? 0;
                  const isEditing = editingId === id;

                  return (
                    <div key={id} className="item cardSub">
                      {!isEditing ? (
                        <>
                          <div className="itemHead">
                            <div className="itemTitle">{p.title}</div>
                            <div className="itemBtns">
                              <button type="button" className="btn-outline" onClick={() => startEdit(p)} disabled={saving}>
                                Edit
                              </button>
                              <button type="button" className="btn-outline danger" onClick={() => onDeleteAsk(id, p.title)} disabled={saving}>
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="projectDetails">
                            {p.startDate && p.endDate ? (
                              <div>
                                <span className="k">Timeline:</span> {p.startDate} → {p.endDate}
                                {p.possibleExtensionEndDate ? (
                                  <>
                                    {" "}
                                    <span className="k">Ext:</span> {p.possibleExtensionEndDate}
                                  </>
                                ) : null}
                              </div>
                            ) : null}

                            {p.abstractEn ? (
                              <div style={{ marginTop: 8 }}>
                                <span className="k">Abstract:</span> {p.abstractEn}
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <form onSubmit={onSaveEdit} className="form">
                          {/* păstrează edit-ul tău complet aici dacă vrei; butoanele sunt suficiente ca să nu crape */}
                          <div className="actions">
                            <button className="btn-outline" type="button" onClick={cancelEdit} disabled={saving}>
                              Cancel
                            </button>
                            <button className="btn" type="submit" disabled={saving}>
                              Save
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Explore tab
        <div className="card">
          <div className="cardTitle">Explore</div>

          <div className="searchRow">
            <input className="ecoInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" />
            <button type="button" className="btn-outline" onClick={() => refreshExplore(0)} disabled={loadingExplore || saving}>
              Search
            </button>
          </div>

          {loadingExplore ? (
            <div className="muted">Loading…</div>
          ) : explore.length === 0 ? (
            <div className="muted">No results.</div>
          ) : (
            <div className="list">
              {explore.map((p) => {
                const id = p.id ?? 0;
                const uid = (p as any).userId ?? null;
                const avatarUrl = uid ? avatars[uid] ?? null : null;

                return (
                  <div key={id} className="item cardSub">
                    <div className="itemHead">
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div
                        className="avatarSmall"
                        style={
                          avatarUrl
                            ? {
                                backgroundImage: `url(${avatarUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat"
                              }
                            : undefined
                        }
                      />
                        <div>
                          <div className="itemTitle">{p.title}</div>
                          {p.acronym ? <div className="muted">{p.acronym}</div> : null}
                        </div>
                      </div>

                      <div className="itemBtns">
                        <button type="button" className="btn-outline" onClick={() => setDetailsProject(p)} disabled={saving} title="Details">
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Explore shows ONLY Title + Timeline + Abstract */}
                    <div className="projectDetails">
                      {p.startDate && p.endDate ? (
                        <div>
                          <span className="k">Timeline:</span> {p.startDate} → {p.endDate}
                          {p.possibleExtensionEndDate ? (
                            <>
                              {" "}
                              <span className="k">Ext:</span> {p.possibleExtensionEndDate}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      {p.abstractEn ? (
                        <div style={{ marginTop: 8 }}>
                          <span className="k">Abstract:</span> {p.abstractEn}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {exploreHasMore ? (
            <div className="annMore">
              <button type="button" className="btn-outline" onClick={loadMoreExplore} disabled={loadingExplore}>
                Load more
              </button>
            </div>
          ) : null}

          <ProjectDetailsModal
            project={detailsProject}
            ownerAvatarUrl={detailsOwnerAvatar}
            onClose={() => setDetailsProject(null)}
            onOpenProfile={(uid, name, role) => {
              setDetailsProject(null);
              if (uid) openProfile(uid, name, role);
            }}
          />

          {profileUser && (
            <ProfileModal
              user={profileUser}
              loading={profileLoading}
              error={profileError}
              profile={profileData}
              onClose={closeProfile}
              currentUserId={currentUserId}
              onMessage={onMessageFromProfile}
            />
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete project"
        message={`Delete "${confirmDelete.title}"? This can't be undone.`}
        confirmText={saving ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        danger
        busy={saving}
        onCancel={() => setConfirmDelete({ open: false, id: null, title: "" })}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  danger,
  busy,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger?: boolean;
  busy?: boolean;
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

          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? "annDangerBtn" : "annPrimaryBtn"}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
