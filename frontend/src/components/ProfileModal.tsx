import { openCv } from "../api/profile";
import { createPortal } from "react-dom";

type CompanyDto = {
  name?: string;
  description?: string;
  domains?: string[];
};

export type PublicProfile = {
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
  companies?: CompanyDto[];

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

export function AvatarBubble({
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

function getCompaniesForDisplay(p: {
  companies?: CompanyDto[];
  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];
}): CompanyDto[] {
  const fromNew: CompanyDto[] = (p.companies || [])
    .map((c) => ({
      name: (c?.name || "").trim(),
      description: (c?.description || "").trim(),
      domains: c?.domains || []
    }))
    .filter((c) => !!(c.name || c.description || (c.domains && c.domains.length > 0)));

  if (fromNew.length > 0) return fromNew;

  const legacyOk =
    (p.companyName && p.companyName.trim().length > 0) ||
    (p.companyDescription && p.companyDescription.trim().length > 0) ||
    (p.companyDomains && p.companyDomains.length > 0);

  return legacyOk
    ? [
        {
          name: p.companyName || "",
          description: p.companyDescription || "",
          domains: p.companyDomains || []
        }
      ]
    : [];
}

export default function ProfileModal({
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

  const toUrl = (raw?: string | null) => {
    const v = (raw || "").trim();
    if (!v) return "";
    return v.startsWith("http") ? v : `https://${v}`;
  };

  const modal = (
    <div
      className="annModalOverlay"
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

              {(() => {
                const companies = getCompaniesForDisplay(profile);
                if (companies.length === 0) return null;

                return (
                  <div className="annInfoBox" style={{ marginTop: 12 }}>
                    <div className="annInfoLabel">Companies</div>
                    <div className="annInfoValue">
                      <div className="annList">
                        {companies.map((c, idx) => (
                          <div key={`${c.name || "company"}-${idx}`} className="annResourceRow">
                            <div style={{ minWidth: 0 }}>
                              {c.name ? <div className="annListTitle">{c.name}</div> : null}
                              {c.description ? <div className="annListSub">{c.description}</div> : null}

                              {c.domains?.length ? (
                                <div className="annChips" style={{ marginTop: 8 }}>
                                  {c.domains.map((d, i) => (
                                    <span key={`${d}-${i}`} className="annChip">
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

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

              {(p.linkedinUrl?.trim() || p.githubUrl?.trim() || p.website?.trim()) ? (
                <div className="annInfoBox" style={{ marginTop: 12 }}>
                  <div className="annInfoLabel">Links</div>
                  <div className="annInfoValue">
                    <div className="annChips">
                      {p.linkedinUrl?.trim() ? (
                        <a className="annChip" href={toUrl(p.linkedinUrl)} target="_blank" rel="noreferrer">
                          LinkedIn
                        </a>
                      ) : null}

                      {p.githubUrl?.trim() ? (
                        <a className="annChip" href={toUrl(p.githubUrl)} target="_blank" rel="noreferrer">
                          GitHub
                        </a>
                      ) : null}

                      {p.website?.trim() ? (
                        <a className="annChip" href={toUrl(p.website)} target="_blank" rel="noreferrer">
                          Website
                        </a>
                      ) : null}
                    </div>
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

  return createPortal(modal, document.body);
}
