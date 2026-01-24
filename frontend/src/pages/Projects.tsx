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
import { openCv } from "../api/profile";

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

const norm = (s: string) => (s ?? "").trim();
const normList = (items: string[]) => (items ?? []).map((x) => norm(x)).filter((x) => x.length > 0);
const toUrl = (raw: string) => {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
};

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

function AvatarBubble({
  name,
  avatarUrl,
  size = 44
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div
      className="annModalAvatar"
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        flex: "0 0 auto",
        background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        color: "rgba(232,247,241,0.9)"
      }}
      aria-label={name}
      title={name}
    >
      {!avatarUrl ? initials : null}
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
  currentUserId: number | null;
  onMessage: (otherUserId: number) => void;
}) {
  if (!user) return null;

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
            <AvatarBubble name={user.name} avatarUrl={profile?.avatarUrl ?? null} />
            <div>
              <div className="annModalTitle">{user.name}</div>
              <div className="annModalSub">
                {user.role}
                {profile?.faculty ? ` · ${profile.faculty}` : ""}
              </div>
            </div>
          </div>

          <button className="annIconBtn" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="annModalBody">
          {loading ? <div className="hint">Loading…</div> : null}
          {!loading && error ? <div className="error">{error}</div> : null}

          {!loading && !error && profile ? (
            <>
              <div className="annModalSection">
                <div className="annRow2">
                  <div className="annInfoBox">
                    <div className="annInfoLabel">Profession</div>
                    <div className="annInfoValue">{profile.profession || "-"}</div>
                  </div>
                  <div className="annInfoBox">
                    <div className="annInfoLabel">Faculty</div>
                    <div className="annInfoValue">{profile.faculty || "-"}</div>
                  </div>
                </div>

                <div className="annInfoBox" style={{ marginTop: 12 }}>
                  <div className="annInfoLabel">University</div>
                  <div className="annInfoValue">{profile.university || profile.affiliation || "-"}</div>
                </div>

                {profile.bio ? (
                  <div className="annInfoBox" style={{ marginTop: 12 }}>
                    <div className="annInfoLabel">Bio</div>
                    <div className="annInfoValue">{profile.bio}</div>
                  </div>
                ) : null}
              </div>

              <div className="annModalSection">
                <div className="annInfoBox">
                  <div className="annInfoLabel">Collaborations</div>
                  <div className="annInfoValue">
                    <div className="annChips">
                      {profile.openToProjects ? <span className="annChip">Open to projects</span> : null}
                      {profile.openToMentoring ? <span className="annChip">Open to mentoring</span> : null}
                      {profile.availability ? <span className="annChip">{profile.availability}</span> : null}
                      {profile.experienceLevel ? <span className="annChip">{profile.experienceLevel}</span> : null}
                    </div>
                  </div>
                </div>

                {profile.expertise?.length ? (
                  <div className="annInfoBox" style={{ marginTop: 12 }}>
                    <div className="annInfoLabel">Expertise</div>
                    <div className="annInfoValue">
                      <div className="annList">
                        {profile.expertise.map((x, idx) => (
                          <div key={`${x.area}-${idx}`} className="annListRow">
                            <div className="annListTitle">{x.area}</div>
                            <div className="annListSub">{x.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : profile.expertAreas?.length ? (
                  <div className="annInfoBox" style={{ marginTop: 12 }}>
                    <div className="annInfoLabel">Expertise</div>
                    <div className="annInfoValue">{profile.expertAreas.join(", ")}</div>
                  </div>
                ) : null}

                {profile.resources?.length ? (
                  <div className="annInfoBox" style={{ marginTop: 12 }}>
                    <div className="annInfoLabel">Resources</div>
                    <div className="annInfoValue">
                      <div className="annList">
                        {profile.resources.map((r, idx) => (
                          <div key={`${r.title}-${idx}`} className="annResourceRow">
                            <div style={{ minWidth: 0 }}>
                              <div className="annListTitle">{r.title}</div>
                              {r.description ? <div className="annListSub">{r.description}</div> : null}
                            </div>
                            <button type="button" className="annLinkBtn" onClick={() => openCv(r.url)}>
                              Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {profile.companyName ? (
                  <div className="annInfoBox" style={{ marginTop: 12 }}>
                    <div className="annInfoLabel">Company</div>
                    <div className="annInfoValue">
                      <div className="annListTitle">{profile.companyName}</div>
                      {profile.companyDescription ? <div className="annListSub">{profile.companyDescription}</div> : null}
                      {profile.companyDomains?.length ? (
                        <div className="annChips" style={{ marginTop: 8 }}>
                          {profile.companyDomains.map((d, i) => (
                            <span key={`${d}-${i}`} className="annChip">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>


              {profile.cvUrl ? (
                <div className="annInfoBox" style={{ marginTop: 12 }}>
                  <div className="annInfoLabel">CV</div>
                  <div className="annInfoValue">
                    <button
                      type="button"
                      className="annLinkBtn"
                      onClick={() => openCv(profile.cvUrl!)}
                    >
                      Open CV
                    </button>
                  </div>
                </div>
              ) : null}



            </>
          ) : null}
          


          
        </div>
          


        <div className="annModalFoot">
          <button className="btn-outline" type="button" onClick={onClose}>
            Close
          </button>

          {currentUserId && user.id !== currentUserId ? (
            <button className="btn" type="button" onClick={() => onMessage(user.id)} disabled={loading}>
              Message
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsModal({
  project,
  ownerAvatarUrl,
  onClose,
  onOpenProfile
}: {
  project: ProjectDto | null;
  ownerAvatarUrl?: string | null;
  onClose: () => void;
  onOpenProfile: (uid: number | null, name: string, role: string) => void;
}) {
  if (!project) return null;

  const uid = (project as any)?.userId ?? null;
  const name = `${(project as any)?.userFirstName ?? ""} ${(project as any)?.userLastName ?? ""}`.trim() || "User";
  const role = (project as any)?.userRole ?? "User";

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
            <AvatarBubble name={name} avatarUrl={ownerAvatarUrl ?? null} />
            <div>
              <div className="annModalTitle">{project.title}</div>
              <div className="annModalSub">
                {project.acronym ? `${project.acronym} · ` : ""}
                {name}
              </div>
            </div>
          </div>

          <button className="annIconBtn" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="annModalBody">
          {project.abstractEn ? (
            <div className="annInfoBox">
              <div className="annInfoLabel">Abstract</div>
              <div className="annInfoValue">{project.abstractEn}</div>
            </div>
          ) : null}

          <div className="annRow2" style={{ marginTop: 12 }}>
            <div className="annInfoBox">
              <div className="annInfoLabel">Coordinator</div>
              <div className="annInfoValue">{project.coordinator || "-"}</div>
            </div>
            <div className="annInfoBox">
              <div className="annInfoLabel">Contract number</div>
              <div className="annInfoValue">{project.contractNumber || "-"}</div>
            </div>
          </div>

          <div className="annRow2" style={{ marginTop: 12 }}>
            <div className="annInfoBox">
              <div className="annInfoLabel">Start</div>
              <div className="annInfoValue">{project.startDate || "-"}</div>
            </div>
            <div className="annInfoBox">
              <div className="annInfoLabel">End</div>
              <div className="annInfoValue">{project.endDate || "-"}</div>
            </div>
          </div>

          {project.possibleExtensionEndDate ? (
            <div className="annInfoBox" style={{ marginTop: 12 }}>
              <div className="annInfoLabel">Possible extension end</div>
              <div className="annInfoValue">{project.possibleExtensionEndDate}</div>
            </div>
          ) : null}

          {project.url ? (
            <div className="annInfoBox" style={{ marginTop: 12 }}>
              <div className="annInfoLabel">URL</div>
              <div className="annInfoValue">
                <a className="annLink" href={toUrl(project.url)} target="_blank" rel="noreferrer">
                  {project.url}
                </a>
              </div>
            </div>
          ) : null}

          {project.partners?.length ? (
            <div className="annInfoBox" style={{ marginTop: 12 }}>
              <div className="annInfoLabel">Partners</div>
              <div className="annInfoValue">{project.partners.join(", ")}</div>
            </div>
          ) : null}
        </div>

        <div className="annModalFoot">
          <button className="btn-outline" type="button" onClick={onClose}>
            Close
          </button>
          <button className="btn" type="button" onClick={() => onOpenProfile(uid, name, role)}>
            View profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const nav = useNavigate();
  const { user } = useContext(AuthContext);

  const currentUserId: number | null = user?.id ?? null;

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

  const [tab, setTab] = useState<"my" | "explore">("my");

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const [myProjects, setMyProjects] = useState<ProjectDto[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);

  const [explore, setExplore] = useState<ProjectDto[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [explorePage, setExplorePage] = useState(0);
  const [exploreHasMore, setExploreHasMore] = useState(false);
  const [q, setQ] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft>(emptyDraft);

  const [detailsProject, setDetailsProject] = useState<ProjectDto | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number; title: string }>({
    open: false,
    id: 0,
    title: ""
  });

  const [profileUser, setProfileUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);

  const avatarsRef = useRef<Record<number, string | null>>({});
  const [avatars, setAvatars] = useState<Record<number, string | null>>({});

  const fetchAvatar = async (userId: number) => {
    if (!userId) return;
    if (userId in avatarsRef.current) return;

    avatarsRef.current[userId] = null;
    try {
      const p = await getProfileByUserId(userId);
      const url = (p as any)?.avatarUrl ?? null;
      avatarsRef.current[userId] = url;
      setAvatars({ ...avatarsRef.current });
    } catch {
      avatarsRef.current[userId] = null;
      setAvatars({ ...avatarsRef.current });
    }
  };

  const refreshMy = async () => {
    setLoadingMy(true);
    try {
      const data = await getMyProjects();
      setMyProjects(data || []);
      (data || []).forEach((p) => fetchAvatar((p as any)?.userId));
    } finally {
      setLoadingMy(false);
    }
  };

  const refreshExplore = async (pageToLoad: number) => {
    setLoadingExplore(true);
    try {
      const data = await getAllProjects(q, pageToLoad, 12);
      const { items, pageIndex, hasMore } = pickPage<ProjectDto>(data);

      setExplore(items);
      setExplorePage(pageIndex);
      setExploreHasMore(hasMore);

      items.forEach((p) => fetchAvatar((p as any)?.userId));
    } finally {
      setLoadingExplore(false);
    }
  };

  useEffect(() => {
    refreshMy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    if (tab === "explore") refreshExplore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const buildPayload = (d: Draft): ProjectRequest => {
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
      partners: normList(d.partners)
    };
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload(draft);
      await createProject(payload);
      setDraft(emptyDraft);
      await refreshMy();
      if (tab === "explore") await refreshExplore(0);
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
      coordinator: p.coordinator || "",
      contractNumber: p.contractNumber || "",
      url: p.url || "",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      possibleExtensionEndDate: (p.possibleExtensionEndDate as any) || "",
      partners: p.partners?.length ? [...p.partners] : [""]
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing(emptyDraft);
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setSaving(true);
    try {
      const payload = buildPayload(editing);
      await updateProject(editingId, payload);
      setEditingId(null);
      setEditing(emptyDraft);
      await refreshMy();
      if (tab === "explore") await refreshExplore(0);
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAsk = (id: number, title: string) => {
    setConfirmDelete({ open: true, id, title });
  };

  const onDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ open: false, id: 0, title: "" });

    setSaving(true);
    try {
      await deleteProject(id);
      await refreshMy();
      if (tab === "explore") await refreshExplore(0);
    } finally {
      setSaving(false);
    }
  };

  const openProfile = async (uid: number, name: string, role: string) => {
    setProfileUser({ id: uid, name, role });
    setProfileLoading(true);
    setProfileError("");
    setProfileData(null);

    try {
      const p = await getProfileByUserId(uid);
      setProfileData((p as any) ?? null);
    } catch {
      setProfileError("Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setProfileUser(null);
    setProfileData(null);
    setProfileError("");
  };

  const onMessageFromProfile = async (otherUserId: number) => {
    try {
      const { conversationId } = await getOrCreateDirectConversation(otherUserId);
      closeProfile();
      nav(`/messages?c=${conversationId}`);
    } catch {
      closeProfile();
      nav("/messages");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailsProject) setDetailsProject(null);
        else if (profileUser) closeProfile();
        else if (confirmDelete.open) setConfirmDelete({ open: false, id: 0, title: "" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsProject, profileUser, confirmDelete.open]);

  const detailsOwnerId = (detailsProject as any)?.userId ?? null;
  const detailsOwnerAvatar = detailsOwnerId ? avatars[detailsOwnerId] ?? null : null;

  return (
    <>
      <div className="page">
        <div className="pageHead">
          <div className="pageTitle">Projects</div>

          <div className="tabs">
            <button type="button" className={tab === "my" ? "tab tab-active" : "tab"} onClick={() => setTab("my")}>
              My projects
            </button>
            <button
              type="button"
              className={tab === "explore" ? "tab tab-active" : "tab"}
              onClick={() => setTab("explore")}
            >
              Explore
            </button>
          </div>
        </div>

        {tab === "my" ? (
          <div className="grid2">
            <div className="card">
              <div className="cardTitle">Add project</div>

              <form onSubmit={onCreate} className="form">
                <div className="row2">
                  <div>
                    <div className="label">Title</div>
                    <input
                      className="ecoInput"
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <div className="label">Acronym</div>
                    <input
                      className="ecoInput"
                      value={draft.acronym}
                      onChange={(e) => setDraft((d) => ({ ...d, acronym: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="row2">
                  <div>
                    <div className="label">Start date</div>
                    <input
                      type="date"
                      className="ecoInput"
                      value={draft.startDate}
                      onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <div className="label">End date</div>
                    <input
                      type="date"
                      className="ecoInput"
                      value={draft.endDate}
                      onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                    />
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
                    <input
                      className="ecoInput"
                      value={draft.contractNumber}
                      onChange={(e) => setDraft((d) => ({ ...d, contractNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="row2">
                  <div>
                    <div className="label">Coordinator</div>
                    <input
                      className="ecoInput"
                      value={draft.coordinator}
                      onChange={(e) => setDraft((d) => ({ ...d, coordinator: e.target.value }))}
                    />
                  </div>
                  <div>
                    <div className="label">URL</div>
                    <input
                      className="ecoInput"
                      value={draft.url}
                      onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <div className="label">Partners</div>
                  <div className="partners">
                    {draft.partners.map((val, idx) => (
                      <div key={idx} className="partnerRow">
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
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setDraft((d) => ({ ...d, partners: [...d.partners, ""] }))}
                      disabled={saving}
                    >
                      Add partner
                    </button>
                  </div>
                </div>

                <div>
                  <div className="label">Abstract</div>
                  <textarea
                    className="ecoInput"
                    value={draft.abstractEn}
                    onChange={(e) => setDraft((d) => ({ ...d, abstractEn: e.target.value }))}
                    rows={5}
                  />
                </div>

                <div className="actions">
                  <button className="btn" type="submit" disabled={saving}>
                    Create
                  </button>
                  <button className="btn-outline" type="button" onClick={() => setDraft(emptyDraft)} disabled={saving}>
                    Reset
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <div className="cardTitle">My projects</div>

              {loadingMy ? <div className="hint">Loading…</div> : null}
              {!loadingMy && !myProjects.length ? <div className="hint">No projects yet.</div> : null}

              {!loadingMy && myProjects.length ? (
                <div className="list">
                  {myProjects.map((p) => {
                    const isEditing = editingId === p.id;
                    const uid = (p as any)?.userId ?? null;
                    const avatarUrl = uid ? avatars[uid] ?? null : null;

                    return (
                      <div key={p.id} className="item cardSub">
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
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => setDetailsProject(p)}
                              disabled={saving}
                            >
                              Details
                            </button>

                            {!isEditing ? (
                              <>
                                <button type="button" className="btn-outline" onClick={() => startEdit(p)} disabled={saving}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-outline danger"
                                  onClick={() => onDeleteAsk(p.id, p.title)}
                                  disabled={saving}
                                >
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {!isEditing ? (
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
                        ) : (
                          <form onSubmit={onSaveEdit} className="form" style={{ marginTop: 10 }}>
                            <div className="row2">
                              <div>
                                <div className="label">Title</div>
                                <input
                                  className="ecoInput"
                                  value={editing.title}
                                  onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <div className="label">Acronym</div>
                                <input
                                  className="ecoInput"
                                  value={editing.acronym}
                                  onChange={(e) => setEditing((d) => ({ ...d, acronym: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="row2">
                              <div>
                                <div className="label">Start date</div>
                                <input
                                  type="date"
                                  className="ecoInput"
                                  value={editing.startDate}
                                  onChange={(e) => setEditing((d) => ({ ...d, startDate: e.target.value }))}
                                />
                              </div>
                              <div>
                                <div className="label">End date</div>
                                <input
                                  type="date"
                                  className="ecoInput"
                                  value={editing.endDate}
                                  onChange={(e) => setEditing((d) => ({ ...d, endDate: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="row2">
                              <div>
                                <div className="label">Possible extension end</div>
                                <input
                                  type="date"
                                  className="ecoInput"
                                  value={editing.possibleExtensionEndDate}
                                  onChange={(e) => setEditing((d) => ({ ...d, possibleExtensionEndDate: e.target.value }))}
                                />
                              </div>
                              <div>
                                <div className="label">Contract number</div>
                                <input
                                  className="ecoInput"
                                  value={editing.contractNumber}
                                  onChange={(e) => setEditing((d) => ({ ...d, contractNumber: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="row2">
                              <div>
                                <div className="label">Coordinator</div>
                                <input
                                  className="ecoInput"
                                  value={editing.coordinator}
                                  onChange={(e) => setEditing((d) => ({ ...d, coordinator: e.target.value }))}
                                />
                              </div>
                              <div>
                                <div className="label">URL</div>
                                <input
                                  className="ecoInput"
                                  value={editing.url}
                                  onChange={(e) => setEditing((d) => ({ ...d, url: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="label">Partners</div>
                              <div className="partners">
                                {editing.partners.map((val, idx) => (
                                  <div key={idx} className="partnerRow">
                                    <input
                                      className="ecoInput"
                                      value={val}
                                      onChange={(e) =>
                                        setEditing((d) => {
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
                                        setEditing((d) => {
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
                              <textarea
                                className="ecoInput"
                                value={editing.abstractEn}
                                onChange={(e) => setEditing((d) => ({ ...d, abstractEn: e.target.value }))}
                                rows={5}
                              />
                            </div>

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
              ) : null}
            </div>
          </div>
        ) : (
  <div className="grid2 exploreGrid">
    
    <div className="card exploreCard">
      <div className="cardTitle">Explore projects</div>

      <div className="row2" style={{ marginBottom: 12 }}>
        <div>
          <div className="label">Search</div>
          <input className="ecoInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <button className="btn-outline" type="button" onClick={() => refreshExplore(0)} disabled={loadingExplore}>
            Search
          </button>
        </div>
      </div>

      {loadingExplore ? <div className="hint">Loading…</div> : null}
      {!loadingExplore && !explore.length ? <div className="hint">No projects.</div> : null}

      {!loadingExplore && explore.length ? (
        <div className="list exploreList">
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
                    <button type="button" className="btn-outline" onClick={() => setDetailsProject(p)} disabled={saving}>
                      Details
                    </button>

                    <button type="button" className="btn-outline danger" onClick={() => onDeleteAsk(p.id, p.title)}>
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
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="pager">
        <button
          type="button"
          className="btn-outline"
          onClick={() => refreshExplore(Math.max(0, explorePage - 1))}
          disabled={loadingExplore || saving || explorePage <= 0}
        >
          Prev
        </button>

        <button
          type="button"
          className="btn-outline"
          onClick={() => refreshExplore(explorePage + 1)}
          disabled={loadingExplore || saving || !exploreHasMore}
        >
          Next
        </button>
      </div>
    </div>
  </div>
)

        
        
        
        }
      </div>

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

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete project"
        message={`Delete "${confirmDelete.title}"? This can't be undone.`}
        confirmText={saving ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        danger
        busy={saving}
        onCancel={() => setConfirmDelete({ open: false, id: 0, title: "" })}
        onConfirm={onDeleteConfirm}
      />
    </>
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

        <div className="annConfirmFoot">
          <button type="button" onClick={onCancel} disabled={busy} className="annSecondaryBtn">
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
