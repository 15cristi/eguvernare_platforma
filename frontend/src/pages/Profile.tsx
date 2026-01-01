import "./Profile.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { getMyProfile, updateMyProfile, saveAvatarUrl } from "../api/profile";
import { suggestLookup, upsertLookup } from "../api/lookups";
import { uploadAvatarToCloudinary } from "../api/cloudinary";
import { AuthContext } from "../context/AuthContext";
import { SinglePicker } from "../components/SinglePicker";

type Availability = "FULL_TIME" | "PART_TIME" | "WEEKENDS";
type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

interface Profile {
  headline: string;
  bio: string;
  country: string;
  city: string;

  faculty: string;
  expertAreas: string[];

  companyName: string;
  companyDescription: string;
  companyDomains: string[];

  availability: Availability;
  experienceLevel: ExperienceLevel;
  openToProjects: boolean;
  openToMentoring: boolean;
  linkedinUrl: string;
  githubUrl: string;
  website: string;
  avatarUrl?: string;
}

type LookupCategory = "CITY" | "COUNTRY" | "FACULTY" | "EXPERT_AREA" | "COMPANY_DOMAIN";

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

// wrappers ca să nu te blochezi pe union-uri din api/lookups.ts
const suggest = (category: LookupCategory, q: string) => suggestLookup(category as any, q);
const upsert = (category: LookupCategory, value: string) => upsertLookup(category as any, value);

const ProfilePage = () => {
  const { user } = useContext(AuthContext);

  const backendRole = user?.role as
    | "CITIZEN"
    | "ENTREPRENEURS"
    | "MENTORS"
    | "INVESTORS"
    | "MANUFACTURERS"
    | "ADMIN"
    | undefined;

  const isCompanyRole = backendRole === "ENTREPRENEURS" || backendRole === "MANUFACTURERS";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [facultySuggestions, setFacultySuggestions] = useState<string[]>([]);
  const [countrySuggestions, setCountrySuggestions] = useState<string[]>([]);

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile({
          headline: data.headline || "",
          bio: data.bio || "",
          country: data.country || "",
          city: data.city || "",

          faculty: data.faculty || "",
          expertAreas: data.expertAreas || [],

          companyName: data.companyName || "",
          companyDescription: data.companyDescription || "",
          companyDomains: data.companyDomains || [],

          availability: data.availability || "FULL_TIME",
          experienceLevel: data.experienceLevel || "JUNIOR",
          openToProjects: !!data.openToProjects,
          openToMentoring: !!data.openToMentoring,
          linkedinUrl: data.linkedinUrl || "",
          githubUrl: data.githubUrl || "",
          website: data.website || "",
          avatarUrl: data.avatarUrl
        });
      })
      .catch(() => {});
  }, []);

  if (!profile) return <div className="profile-loading">Loading profile…</div>;

  const update = (field: keyof Profile, value: any) => {
    setProfile((p) => (p ? { ...p, [field]: value } : p));
  };

  const calculateProfileStrength = (p: Profile) => {
    const fields = [
      p.headline,
      p.bio,
      p.country,
      p.city,
      p.faculty,
      p.availability,
      p.experienceLevel,
      p.openToProjects,
      p.openToMentoring,
      p.linkedinUrl,
      p.githubUrl,
      p.website,
      p.avatarUrl,
      p.expertAreas,
      // câmpuri companie (contează, chiar dacă nu sunt vizibile pentru toți)
      p.companyName,
      p.companyDescription,
      p.companyDomains
    ];

    const filled = fields.filter((v) => {
      if (typeof v === "boolean") return true;
      if (Array.isArray(v)) return v.length > 0;
      return v && String(v).trim().length > 0;
    }).length;

    return Math.round((filled / fields.length) * 100);
  };

  const strength = calculateProfileStrength(profile);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
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

      await updateMyProfile(payload);
      alert("Profile saved");
    } catch (err) {
      console.error(err);
      alert("Profile save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p>Update your profile details and preferences.</p>
        </div>
        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </header>

      <div className="profile-grid">
        {/* SIDEBAR */}
        <aside className="profile-sidebar">
          <div className="sidebar-card">
            <div
              className="profile-avatar"
              style={{
                backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined
              }}
            >
              <label className="avatar-overlay">
                📷
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setUploading(true);
                    try {
                      const url = await uploadAvatarToCloudinary(file);
                      await saveAvatarUrl(url);
                      update("avatarUrl", url);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>

            <p className="headline-preview">{profile.headline || "Your professional headline"}</p>

            <div className="profile-strength">
              <div className="strength-header">
                <span>Profile strength</span>
                <strong>{strength}%</strong>
              </div>
              <div className="strength-bar">
                <div style={{ width: `${strength}%` }} />
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <section className="profile-content">
          {/* BASIC */}
          <div className="card">
            <div className="card-header">
              <span>🧾</span>
              <h2>Profile details</h2>
            </div>

            <label>
              Headline
              <input value={profile.headline} onChange={(e) => update("headline", e.target.value)} />
            </label>

            <label>
              Bio
              <textarea value={profile.bio} onChange={(e) => update("bio", e.target.value)} />
            </label>

            <div className="row">
              <SinglePicker
              label="Country"
              category="COUNTRY"
              value={profile.country}
              onChange={(v) => update("country", v)}
              placeholder="Search or add country"
            />

            <SinglePicker
              label="City"
              category="CITY"
              value={profile.city}
              onChange={(v) => update("city", v)}
              placeholder="Search or add city"
            />

            </div>
          </div>

          {/* AVAILABILITY */}
          <div className="card">
            <div className="card-header">
              <span>🧠</span>
              <h2>Availability</h2>
            </div>

            <label>
              Availability
              <select value={profile.availability} onChange={(e) => update("availability", e.target.value as Availability)}>
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="WEEKENDS">Weekends</option>
              </select>
            </label>

            <label>
              Experience level
              <select
                value={profile.experienceLevel}
                onChange={(e) => update("experienceLevel", e.target.value as ExperienceLevel)}
              >
                <option value="JUNIOR">Junior</option>
                <option value="MID">Mid</option>
                <option value="SENIOR">Senior</option>
              </select>
            </label>

            <div className="checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={profile.openToProjects}
                  onChange={(e) => update("openToProjects", e.target.checked)}
                />
                Open to projects
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={profile.openToMentoring}
                  onChange={(e) => update("openToMentoring", e.target.checked)}
                />
                Open to mentoring
              </label>
            </div>

            <SinglePicker
              label="Faculty"
              category="FACULTY"
              value={profile.faculty}
              onChange={(v) => update("faculty", v)}
              placeholder="Search or add faculty"
            />
          </div>

          {/* EXPERTISE / COMPANY */}
          <div className="card">
            <div className="card-header">
              <span>🧩</span>
              <h2>{isCompanyRole ? "Company details" : "Expertise"}</h2>
            </div>

            {isCompanyRole ? (
              <>
                <label>
                  Company name
                  <input value={profile.companyName} onChange={(e) => update("companyName", e.target.value)} />
                </label>

                <label>
                  Company description
                  <textarea
                    value={profile.companyDescription}
                    onChange={(e) => update("companyDescription", e.target.value)}
                  />
                </label>

                <TagPicker
                  label="Domains"
                  category="COMPANY_DOMAIN"
                  values={profile.companyDomains || []}
                  onChange={(vals) => update("companyDomains", vals)}
                  placeholder="Search or add a domain"
                />
              </>
            ) : (
              <TagPicker
                label="Expert Areas"
                category="EXPERT_AREA"
                values={profile.expertAreas || []}
                onChange={(vals) => update("expertAreas", vals)}
                placeholder="Search or add an expert area"
              />
            )}
          </div>

          {/* LINKS */}
          <div className="card">
            <div className="card-header">
              <span>🔗</span>
              <h2>External links</h2>
            </div>

            <label>
              LinkedIn
              <input value={profile.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} />
            </label>

            <label>
              GitHub
              <input value={profile.githubUrl} onChange={(e) => update("githubUrl", e.target.value)} />
            </label>

            <label>
              Website
              <input value={profile.website} onChange={(e) => update("website", e.target.value)} />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
};

type TagPickerProps = {
  label: string;
  category: LookupCategory;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

function TagPicker({ label, category, values, onChange, placeholder }: TagPickerProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => new Set(values.map((v) => v.toLowerCase())), [values]);

  useEffect(() => {
    const q = input.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const items = await suggest(category, q);
        const filtered = items.filter((i: string) => !selected.has(i.toLowerCase()));
        setSuggestions(filtered.slice(0, 10));
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [input, category, selected]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const addValue = async (raw: string) => {
    const v = norm(raw);
    if (!v) return;

    if (selected.has(v.toLowerCase())) {
      setInput("");
      setOpen(false);
      return;
    }

    onChange([...values, v]);

    try {
      await upsert(category, v);
    } catch {
      // ok, UI-ul merge oricum
    }

    setInput("");
    setSuggestions([]);
    setOpen(false);
  };

  const removeValue = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  return (
    <div className="tagpicker" ref={boxRef}>
      <label>{label}</label>

      <div className="tagpicker-inputwrap">
        <div className="chips">
          {values.map((v) => (
            <span className="chip" key={v}>
              {v}
              <button type="button" onClick={() => removeValue(v)} aria-label="remove">
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          value={input}
          placeholder={placeholder || "Search or add..."}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => input.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue(input);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />

        {open && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <div
                key={s}
                className="suggestion"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addValue(s);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <small className="hint">Enter pentru a adăuga dacă nu există în listă.</small>
    </div>
  );
}

export default ProfilePage;
