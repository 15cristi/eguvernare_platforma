import { useEffect, useMemo, useState } from "react";
import "./Profile.css";

import { getMyProfile, updateMyProfile } from "../api/profile";
import type { ProfileUpdatePayload } from "../api/profile";

import { suggestLookup, upsertLookup } from "../api/lookups";
import type { LookupCategory } from "../api/lookups";

/* ===== Enums / Types ===== */

type Availability = "FULL_TIME" | "PART_TIME" | "WEEKENDS";
type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";
type Role = "USER" | "ENTREPRENEUR" | "COMPANY";

interface Profile {
  headline: string;
  bio: string;
  country: string;
  city: string;
  faculty?: string;

  expertAreas?: string[];

  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];

  availability: Availability;
  experienceLevel: ExperienceLevel;
  openToProjects: boolean;
  openToMentoring: boolean;

  linkedinUrl: string;
  githubUrl: string;
  website: string;

  avatarUrl?: string;
  role?: Role;
}

/* ===== Small UI: TagPicker (chips + typeahead + add new) ===== */

type TagPickerProps = {
  label: string;
  category: LookupCategory;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

const TagPicker = ({
  label,
  category,
  values,
  onChange,
  placeholder
}: TagPickerProps) => {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await suggestLookup(category, q).catch(() => []);
      if (!alive) return;
      const filtered = s.filter(x => !values.includes(x));
      setSuggestions(filtered);
    })();
    return () => {
      alive = false;
    };
  }, [category, q, values]);

  const addValue = async (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) return;

    await upsertLookup(category, v).catch(() => {});
    onChange([...values, v]);

    setQ("");
    setSuggestions([]);
  };

  const removeValue = (v: string) => {
    onChange(values.filter(x => x !== v));
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue(q);
    }
    if (e.key === "Backspace" && !q && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  return (
    <label style={{ position: "relative" }}>
      {label}

      <div
        style={{
          background: "#0c3b31",
          borderRadius: 12,
          padding: "10px 12px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          minHeight: 48,
          alignItems: "center"
        }}
      >
        {values.map(v => (
          <span
            key={v}
            style={{
              background: "#062e25",
              border: "1px solid #164e41",
              borderRadius: 999,
              padding: "6px 10px",
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              color: "white",
              fontSize: 14
            }}
          >
            {v}
            <button
              type="button"
              onClick={() => removeValue(v)}
              style={{
                background: "transparent",
                border: "none",
                color: "#8ebeb0",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1
              }}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || "Type and press Enter"}
          style={{
            flex: 1,
            minWidth: 180,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "white",
            fontSize: 15
          }}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.slice(0, 10).map(s => (
            <div
              key={s}
              className="suggestion"
              onMouseDown={() => addValue(s)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </label>
  );
};

/* ===== Page ===== */

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [facultySuggestions, setFacultySuggestions] = useState<string[]>([]);

  useEffect(() => {
    getMyProfile()
      .then(p => setProfile(p))
      .finally(() => setLoading(false));
  }, []);

  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const isCompany =
    profile?.role === "ENTREPRENEUR" || profile?.role === "COMPANY";

  const strength = useMemo(() => {
    if (!profile) return { percent: 0, label: "0%" };
    const checks: Array<boolean> = [
      !!profile.headline?.trim(),
      !!profile.bio?.trim(),
      !!profile.country?.trim(),
      !!profile.city?.trim(),
      !!profile.faculty?.trim(),
      isCompany
        ? (profile.companyDomains?.length || 0) > 0
        : (profile.expertAreas?.length || 0) > 0,
      !!profile.linkedinUrl?.trim() ||
        !!profile.githubUrl?.trim() ||
        !!profile.website?.trim()
    ];
    const done = checks.filter(Boolean).length;
    const total = checks.length;
    const percent = Math.round((done / total) * 100);
    return { percent, label: `${percent}%` };
  }, [profile, isCompany]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // payload curat (NU trimitem user/authorities etc.)
      const payload: ProfileUpdatePayload = {
        headline: profile.headline,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        faculty: profile.faculty,

        expertAreas: profile.expertAreas,

        companyName: profile.companyName,
        companyDescription: profile.companyDescription,
        companyDomains: profile.companyDomains,

        availability: profile.availability,
        experienceLevel: profile.experienceLevel,
        openToProjects: profile.openToProjects,
        openToMentoring: profile.openToMentoring,

        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        website: profile.website
      };

      const updated = await updateMyProfile(payload);
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleLookupChange = async (category: LookupCategory, value: string) => {
    if (category === "CITY") {
      updateField("city", value);
      const s = await suggestLookup("CITY", value).catch(() => []);
      setCitySuggestions(s);
    } else {
      updateField("faculty", value);
      const s = await suggestLookup("FACULTY", value).catch(() => []);
      setFacultySuggestions(s);
    }
  };

  const handleLookupBlur = (category: LookupCategory, value?: string) => {
    const v = (value || "").trim();
    if (v) upsertLookup(category, v).catch(() => {});
    setTimeout(() => {
      if (category === "CITY") setCitySuggestions([]);
      else setFacultySuggestions([]);
    }, 100);
  };

  if (loading) {
    return <div className="profile-page profile-loading">Loading…</div>;
  }

  if (!profile) {
    return <div className="profile-page profile-loading">No profile found</div>;
  }

  return (
    <div className="profile-page">
      {/* HEADER */}
      <div className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p>Editează-ți datele și salvează când ai terminat.</p>
        </div>

        <button onClick={saveProfile} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* GRID */}
      <div className="profile-grid">
        {/* SIDEBAR */}
        <aside className="profile-sidebar">
          <div className="sidebar-card">
            <div
              className="profile-avatar"
              style={{
                backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : "none"
              }}
              title={profile.avatarUrl ? "Avatar" : "No avatar"}
            >
              <div className="avatar-overlay">✎</div>
            </div>

            <div className="headline-preview">
              {profile.headline?.trim()
                ? profile.headline
                : "Adaugă un headline scurt și clar."}
            </div>

            <div className="profile-strength">
              <div className="strength-header">
                <span>Profile strength</span>
                <span>{strength.label}</span>
              </div>
              <div className="strength-bar">
                <div style={{ width: `${strength.percent}%` }} />
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="profile-content">
          {/* ABOUT */}
          <section className="card">
            <div className="card-header">
              <h2>About</h2>
            </div>

            <label>
              Headline
              <input
                value={profile.headline || ""}
                onChange={e => updateField("headline", e.target.value)}
                placeholder="Ex: Full-stack dev, AI enthusiast"
              />
            </label>

            <label>
              Bio
              <textarea
                value={profile.bio || ""}
                onChange={e => updateField("bio", e.target.value)}
                placeholder="2-5 propoziții, clar și concret."
              />
            </label>

            <div className="row">
              <label>
                Country
                <input
                  value={profile.country || ""}
                  onChange={e => updateField("country", e.target.value)}
                  placeholder="Romania"
                />
              </label>

              {/* City autocomplete */}
              <label style={{ position: "relative" }}>
                City
                <input
                  value={profile.city || ""}
                  onChange={e => handleLookupChange("CITY", e.target.value)}
                  onBlur={() => handleLookupBlur("CITY", profile.city)}
                  placeholder="București"
                />
                {citySuggestions.length > 0 && (
                  <div className="suggestions">
                    {citySuggestions.map(s => (
                      <div
                        key={s}
                        className="suggestion"
                        onMouseDown={() => {
                          updateField("city", s);
                          setCitySuggestions([]);
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </label>
            </div>

            {/* Faculty autocomplete */}
            <label style={{ position: "relative" }}>
              Faculty
              <input
                value={profile.faculty || ""}
                onChange={e => handleLookupChange("FACULTY", e.target.value)}
                onBlur={() => handleLookupBlur("FACULTY", profile.faculty)}
                placeholder="Ex: UPB, ASE, UBB..."
              />
              {facultySuggestions.length > 0 && (
                <div className="suggestions">
                  {facultySuggestions.map(s => (
                    <div
                      key={s}
                      className="suggestion"
                      onMouseDown={() => {
                        updateField("faculty", s);
                        setFacultySuggestions([]);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </label>
          </section>

          {/* EXPERTISE / COMPANY */}
          <section className="card">
            <div className="card-header">
              <h2>{isCompany ? "Company" : "Expertise"}</h2>
            </div>

            {!isCompany && (
              <TagPicker
                label="Expert Areas"
                category="EXPERT_AREA"
                values={profile.expertAreas || []}
                onChange={vals => updateField("expertAreas", vals)}
                placeholder="Search or add an expert area"
              />
            )}

            {isCompany && (
              <>
                <label>
                  Company Name
                  <input
                    value={profile.companyName || ""}
                    onChange={e => updateField("companyName", e.target.value)}
                    placeholder="Numele companiei"
                  />
                </label>

                <label>
                  Company Description
                  <textarea
                    value={profile.companyDescription || ""}
                    onChange={e => updateField("companyDescription", e.target.value)}
                    placeholder="Ce face compania, pe scurt."
                  />
                </label>

                <TagPicker
                  label="Domains"
                  category="COMPANY_DOMAIN"
                  values={profile.companyDomains || []}
                  onChange={vals => updateField("companyDomains", vals)}
                  placeholder="Search or add a domain"
                />
              </>
            )}
          </section>

          {/* PREFERENCES */}
          <section className="card">
            <div className="card-header">
              <h2>Preferences</h2>
            </div>

            <div className="row">
              <label>
                Availability
                <select
                  value={profile.availability}
                  onChange={e => updateField("availability", e.target.value as Availability)}
                >
                  <option value="FULL_TIME">Full time</option>
                  <option value="PART_TIME">Part time</option>
                  <option value="WEEKENDS">Weekends</option>
                </select>
              </label>

              <label>
                Experience level
                <select
                  value={profile.experienceLevel}
                  onChange={e =>
                    updateField("experienceLevel", e.target.value as ExperienceLevel)
                  }
                >
                  <option value="JUNIOR">Junior</option>
                  <option value="MID">Mid</option>
                  <option value="SENIOR">Senior</option>
                </select>
              </label>
            </div>

            <div className="checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={profile.openToProjects}
                  onChange={e => updateField("openToProjects", e.target.checked)}
                />
                Open to projects
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={profile.openToMentoring}
                  onChange={e => updateField("openToMentoring", e.target.checked)}
                />
                Open to mentoring
              </label>
            </div>
          </section>

          {/* LINKS */}
          <section className="card">
            <div className="card-header">
              <h2>Links</h2>
            </div>

            <label>
              LinkedIn
              <input
                value={profile.linkedinUrl || ""}
                onChange={e => updateField("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </label>

            <label>
              GitHub
              <input
                value={profile.githubUrl || ""}
                onChange={e => updateField("githubUrl", e.target.value)}
                placeholder="https://github.com/..."
              />
            </label>

            <label>
              Website
              <input
                value={profile.website || ""}
                onChange={e => updateField("website", e.target.value)}
                placeholder="https://..."
              />
            </label>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
