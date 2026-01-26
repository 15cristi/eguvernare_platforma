import "./Announcements.css";
import "./Matching.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { getMatchingProfiles, type MatchingProfileDto, type MatchingSort } from "../api/matching";
import { getProfileByUserId } from "../api/profile";
import { getOrCreateDirectConversation } from "../api/messages";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProfileModal, { AvatarBubble, type PublicProfile } from "../components/ProfileModal";
import { sendConnectionRequest } from "../api/connections";
import { createPortal } from "react-dom";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

const joinName = (p: { firstName?: string; lastName?: string }) =>
  `${p.firstName || ""} ${p.lastName || ""}`.trim();

const prettyEnum = (v?: string | null) => {
  const s = (v || "").trim();
  if (!s) return "";
  return s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase());
};

export default function Matching() {
  const { user } = useContext(AuthContext);
  const nav = useNavigate();

  const [page, setPage] = useState(0);
  const [size] = useState(18);

  const [q, setQ] = useState("");
  const [expertiseArea, setExpertiseArea] = useState("");
  const [availability, setAvailability] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [openToProjects, setOpenToProjects] = useState<boolean | null>(null);
  const [openToMentoring, setOpenToMentoring] = useState<boolean | null>(null);

  const [sort, setSort] = useState<MatchingSort>("NAME");
  const [dir, setDir] = useState<"ASC" | "DESC">("ASC");

  const [data, setData] = useState<{
    items: MatchingProfileDto[];
    totalPages: number;
    totalElements: number;
    page?: number;
    size?: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // pentru butonul Connect
  const [connectingId, setConnectingId] = useState<number | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(1);
  const pushToast = (type: Toast["type"], message: string) => {
    const id = toastSeq.current++;
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };

  // Profile modal state
  const [profileUser, setProfileUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const profileCache = useRef<Map<number, PublicProfile>>(new Map());

  const load = async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await getMatchingProfiles({
        page: nextPage,
        size,
        q,
        expertiseArea,
        availability,
        experienceLevel,
        openToProjects,
        openToMentoring,
        sort,
        dir
      });

      setData({
        items: res.items || [],
        totalPages: res.totalPages || 1,
        totalElements: res.totalElements || 0,
        page: res.page,
        size: res.size
      });

      setPage(res.page ?? nextPage);
    } catch (e) {
      console.error(e);
      pushToast("error", "Could not load profiles.");
    } finally {
      setLoading(false);
    }
  };

  const queryKey = useMemo(
    () =>
      [
        q.trim(),
        expertiseArea.trim(),
        availability.trim(),
        experienceLevel.trim(),
        String(openToProjects),
        String(openToMentoring),
        sort,
        dir
      ].join("|"),
    [q, expertiseArea, availability, experienceLevel, openToProjects, openToMentoring, sort, dir]
  );

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const openProfile = async (userId: number, name: string, role: string) => {
    setProfileUser({ id: userId, name, role });
    setProfileError("");
    setProfileLoading(true);

    const cached = profileCache.current.get(userId);
    if (cached) {
      setProfileData(cached);
      setProfileLoading(false);
      return;
    }

    try {
      const p = (await getProfileByUserId(userId)) as PublicProfile;
      profileCache.current.set(userId, p);
      setProfileData(p);
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

  const itemsRaw = data?.items || [];
  const items = user?.id ? itemsRaw.filter((x) => x.userId !== user.id) : itemsRaw;

  const totalPages = data?.totalPages || 1;
  const totalElements = data?.totalElements || 0;

  const resetFilters = () => {
    setQ("");
    setExpertiseArea("");
    setAvailability("");
    setExperienceLevel("");
    setOpenToProjects(null);
    setOpenToMentoring(null);
    setSort("NAME");
    setDir("ASC");
  };

  return (
    <div className="annShell">
      <ToastStack toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      <div className="annPage">
        <div className="annHeader">
          <div>
            <h2>Matching</h2>
            <span className="annSub">Browse profiles and filter by expertise and availability.</span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select className="annSelect" value={sort} onChange={(e) => setSort(e.target.value as MatchingSort)}>
              <option value="NAME">Sort: Name</option>
              <option value="EXPERTISE_AREA">Sort: Expertise area</option>
              <option value="AVAILABILITY">Sort: Availability</option>
              <option value="OPEN_TO_PROJECTS">Sort: Open to projects</option>
              <option value="OPEN_TO_MENTORING">Sort: Open to mentoring</option>
              <option value="EXPERIENCE_LEVEL">Sort: Experience level</option>
            </select>

            <button
              type="button"
              className="btn-outline"
              onClick={() => setDir((d) => (d === "ASC" ? "DESC" : "ASC"))}
            >
              {dir === "ASC" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="matchFilterBar card">
          <div className="matchFilterGrid">
            <div className="matchFilterItem">
              <div className="matchFilterLabel">Name</div>
              <input className="annInput" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="matchFilterItem">
              <div className="matchFilterLabel">Expertise area</div>
              <input
                className="annInput"
                placeholder="Expertise area"
                value={expertiseArea}
                onChange={(e) => setExpertiseArea(e.target.value)}
              />
            </div>

            <div className="matchFilterItem">
              <div className="matchFilterLabel">Availability</div>
              <SimpleSelect
                value={availability}
                placeholder="Any"
                options={[
                  { value: "", label: "Any" },
                  { value: "FULL_TIME", label: "Full time" },
                  { value: "PART_TIME", label: "Part time" },
                  { value: "WEEKENDS", label: "Weekends" }
                ]}
                onChange={setAvailability}
              />
            </div>

            <div className="matchFilterItem">
              <div className="matchFilterLabel">Experience</div>
              <SimpleSelect
                value={experienceLevel}
                placeholder="Any"
                options={[
                  { value: "", label: "Any" },
                  { value: "JUNIOR", label: "Junior" },
                  { value: "MID", label: "Mid" },
                  { value: "SENIOR", label: "Senior" }
                ]}
                onChange={setExperienceLevel}
              />
            </div>

            <div className="matchFilterItem">
              <div className="matchFilterLabel">Open to projects</div>
              <SimpleSelect
                value={openToProjects === null ? "" : openToProjects ? "true" : "false"}
                placeholder="Any"
                options={[
                  { value: "", label: "Any" },
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" }
                ]}
                onChange={(v) => setOpenToProjects(v === "" ? null : v === "true")}
              />
            </div>

            <div className="matchFilterItem">
              <div className="matchFilterLabel">Open to mentoring</div>
              <SimpleSelect
                value={openToMentoring === null ? "" : openToMentoring ? "true" : "false"}
                placeholder="Any"
                options={[
                  { value: "", label: "Any" },
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" }
                ]}
                onChange={(v) => setOpenToMentoring(v === "" ? null : v === "true")}
              />
            </div>

            <div className="matchFilterActions">
              <button type="button" className="btn-outline" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="annFeed">
          {loading ? <div className="muted">Loading…</div> : null}

          {!loading && items.length === 0 ? <div className="matchEmptyState muted">No matching profiles.</div> : null}

          {!loading && items.length > 0 ? (
            <div className="matchGrid">
              {items.map((p) => {
                const name = joinName(p) || "User";
                const loc = [p.city, p.country].filter(Boolean).join(", ");
                const role = (p.role || "").trim();
                const firstAreas = (p.expertAreas || []).slice(0, 4);

                return (
                  <div key={p.userId} className="card matchCard">
                    <div className="matchHeader">
                      <button
                        type="button"
                        className="matchNameBtn"
                        onClick={() => openProfile(p.userId, name, role)}
                        title="Open profile"
                        style={{ flex: 1 }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                          <AvatarBubble name={name} avatarUrl={p.avatarUrl || null} size={44} />
                          <div style={{ minWidth: 0 }}>
                            <div className="matchName">{name}</div>
                            <div className="muted matchSub">
                              {role || " "}
                              {loc ? ` · ${loc}` : ""}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="matchHeadline">{p.headline?.trim() ? p.headline : " "}</div>

                    <div className="matchChips">
                      {p.openToProjects ? <span className="annChip">Open to projects</span> : null}
                      {p.openToMentoring ? <span className="annChip">Open to mentoring</span> : null}
                      {p.availability ? <span className="annChip">{prettyEnum(p.availability)}</span> : null}
                      {p.experienceLevel ? <span className="annChip">{prettyEnum(p.experienceLevel)}</span> : null}

                      {firstAreas.map((a, idx) => (
                        <span key={`${a}-${idx}`} className="annChip">
                          {a}
                        </span>
                      ))}
                      {(p.expertAreas || []).length > firstAreas.length ? (
                        <span className="muted" style={{ paddingLeft: 4 }}>
                          +{(p.expertAreas || []).length - firstAreas.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="matchFooter" style={{ display: "flex", gap: 10 }}>
                      <button type="button" className="btn-primary" onClick={() => openProfile(p.userId, name, role)}>
                        View profile
                      </button>

                      {p.connectionStatus === "CONNECTED" ? (
                        <button type="button" className="btn-outline" disabled>
                          Connected
                        </button>
                      ) : p.connectionStatus === "OUTGOING_PENDING" ? (
                        <button type="button" className="btn-outline" disabled>
                          Requested
                        </button>
                      ) : p.connectionStatus === "INCOMING_PENDING" ? (
                        <button type="button" className="btn-outline" onClick={() => nav("/connections/requests")}>
                          Review request
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-outline"
                          disabled={connectingId === p.userId}
                          onClick={async () => {
                            try {
                              setConnectingId(p.userId);
                              await sendConnectionRequest(p.userId);

                              // update local: NU mai dăm load(page)
                              setData((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  items: prev.items.map((x) =>
                                    x.userId === p.userId ? { ...x, connectionStatus: "OUTGOING_PENDING" } : x
                                  )
                                };
                              });

                              pushToast("success", "Request sent.");
                            } catch (e) {
                              console.error(e);
                              pushToast("error", "Could not send request.");
                            } finally {
                              setConnectingId(null);
                            }
                          }}
                        >
                          {connectingId === p.userId ? "Sending..." : "Connect"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="annMore">
            <button
              type="button"
              className="btn-outline"
              onClick={() => load(Math.max(0, page - 1))}
              disabled={loading || page <= 0}
            >
              Prev
            </button>

            <div className="muted" style={{ padding: "0 10px" }}>
              Page {page + 1} / {Math.max(1, totalPages)} · {totalElements} profiles
            </div>

            <button
              type="button"
              className="btn-outline"
              onClick={() => load(page + 1)}
              disabled={loading || page >= Math.max(1, totalPages) - 1}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {profileUser ? (
        <ProfileModal
          user={profileUser}
          loading={profileLoading}
          error={profileError}
          profile={profileData}
          onClose={closeProfile}
          currentUserId={user?.id ?? null}
          onMessage={onMessageFromProfile}
        />
      ) : null}
    </div>
  );
}

function ToastStack({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  if (!toasts.length) return null;

  const node = (
    <div className="annToasts" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`annToast ${t.type}`}>
          <div className="annToastMsg">{t.message}</div>
          <button type="button" className="annToastX" onClick={() => onClose(t.id)} aria-label="Close">
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return createPortal(node, document.body);
}

function SimpleSelect({
  value,
  options,
  placeholder,
  onChange
}: {
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = options.find((o) => o.value === value)?.label || placeholder || "Select";

  return (
    <div className="ssWrap" ref={ref}>
      <button type="button" className="ssBtn" onClick={() => setOpen((v) => !v)}>
        <span>{current}</span>
        <span className="ssArrow" />
      </button>

      {open && (
        <div className="ssMenu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`ssItem ${o.value === value ? "active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
