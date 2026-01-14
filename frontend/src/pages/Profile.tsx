import "./Profile.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { getMyProfile, updateMyProfile, saveAvatarUrl } from "../api/profile";
import { suggestLookup, upsertLookup } from "../api/lookups";
import type { LookupCategory } from "../api/lookups";
import { uploadAvatarToCloudinary } from "../api/cloudinary";
import { SinglePicker } from "../components/SinglePicker";

type Availability = "FULL_TIME" | "PART_TIME" | "WEEKENDS";
type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

type IdItem = { id: string };

interface ExpertiseItem extends IdItem {
  area: string;
  description: string;
}

interface ResourceItem extends IdItem {
  title: string;
  description: string;
  url: string;
}

interface Profile {
  headline: string;
  bio: string;
  country: string;
  city: string;

  affiliation: string;
  profession: string;

  faculty: string;

  // legacy kept for compatibility
  expertAreas: string[];

  // new
  expertise: ExpertiseItem[];
  resources: ResourceItem[];

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

const norm = (s: string) => s.trim().replace(/\s+/g, " ");
const suggest = (category: LookupCategory, q: string) => suggestLookup(category, q);
const upsert = (category: LookupCategory, value: string) => upsertLookup(category, value);

// Stable id generator (works in modern browsers; fallback included)
const makeId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id_${Date.now()}_${Math.random()}`);

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        const expertiseFromApi: any[] = data.expertise || [];
        const resourcesFromApi: any[] = data.resources || [];

        const expertise: ExpertiseItem[] =
          expertiseFromApi.length > 0
            ? expertiseFromApi.map((x: any) => ({
                id: x.id || makeId(),
                area: x.area || "",
                description: x.description || ""
              }))
            : (data.expertAreas || []).map((a: string) => ({
                id: makeId(),
                area: a,
                description: ""
              }));

        const resources: ResourceItem[] = resourcesFromApi.map((x: any) => ({
          id: x.id || makeId(),
          title: x.title || "",
          description: x.description || "",
          url: x.url || ""
        }));

        setProfile({
          headline: data.headline || "",
          bio: data.bio || "",
          country: data.country || "",
          city: data.city || "",

          affiliation: data.affiliation || "",
          profession: data.profession || "",

          faculty: data.faculty || "",

          expertAreas: data.expertAreas || [],
          expertise,
          resources,

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
      p.affiliation,
      p.profession,
      p.faculty,
      p.availability,
      p.experienceLevel,
      p.openToProjects,
      p.openToMentoring,
      p.linkedinUrl,
      p.githubUrl,
      p.website,
      p.avatarUrl,
      p.expertise,
      p.resources,
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

  const safeUpsert = async (category: LookupCategory, value: string) => {
    const v = norm(value || "");
    if (!v) return;
    try {
      await upsert(category, v);
    } catch (e) {
      console.error("Lookup upsert failed:", category, v, e);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        safeUpsert("COUNTRY", profile.country),
        safeUpsert("CITY", profile.city),
        safeUpsert("FACULTY", profile.faculty),
        safeUpsert("AFFILIATION", profile.affiliation),
        safeUpsert("PROFESSION", profile.profession)
      ]);

      // IMPORTANT: we keep ids only on the client side. Send only what backend expects.
      const payload = {
        headline: profile.headline,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,

        affiliation: profile.affiliation,
        profession: profile.profession,
        faculty: profile.faculty,

        expertAreas: profile.expertAreas,
        expertise: profile.expertise.map((x) => ({ area: x.area, description: x.description })),
        resources: profile.resources.map((x) => ({ title: x.title, description: x.description, url: x.url })),

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
    <div className="profile-page">
      <header className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p>Update your profile details and preferences.</p>
        </div>

        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </header>

      {/* OVERVIEW */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span>🪪</span>
          <h2>Profile overview</h2>
          <InfoTip text="Your avatar and a quick profile strength indicator." />
        </div>

        <div className="profile-overview">
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

          <div className="profile-overview-meta">
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
        </div>
      </div>

      {/* DETAILS */}
      <div className="card">
        <div className="card-header">
          <span>🧾</span>
          <h2>Profile details</h2>
          <InfoTip text="Basic info shown publicly: headline, bio, location, affiliation, profession and faculty." />
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

        <div className="row">
          <SinglePicker
            label="Affiliation"
            category="AFFILIATION"
            value={profile.affiliation}
            onChange={(v) => update("affiliation", v)}
            placeholder="Search or add affiliation"
          />

          <SinglePicker
            label="Profession"
            category="PROFESSION"
            value={profile.profession}
            onChange={(v) => update("profession", v)}
            placeholder="Search or add profession"
          />
        </div>

        <SinglePicker
          label="Faculty"
          category="FACULTY"
          value={profile.faculty}
          onChange={(v) => update("faculty", v)}
          placeholder="Search or add faculty"
        />
      </div>

      {/* COLLABORATION */}
      <div className="card">
        <div className="card-header">
          <span>🤝</span>
          <h2>Collaboration</h2>
          <InfoTip text="Availability, experience level and collaboration preferences." />
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

        <div className="toggles">
          <Toggle label="Open to projects" checked={profile.openToProjects} onChange={(v) => update("openToProjects", v)} />
          <Toggle label="Open to mentoring" checked={profile.openToMentoring} onChange={(v) => update("openToMentoring", v)} />
        </div>
      </div>

      {/* EXPERTISE */}
      <div className="card">
        <div className="card-header">
          <span>🧩</span>
          <h2>Expertise</h2>
          <InfoTip text="Add expert areas and a short description so people understand your skills." />
        </div>

        <ExpertiseEditor
          items={profile.expertise}
          onChange={(items) => {
            update("expertise", items);
            update(
              "expertAreas",
              items.map((i) => i.area).filter(Boolean)
            );
          }}
        />
      </div>

      {/* RESOURCES */}
      <div className="card">
        <div className="card-header">
          <span>🧪</span>
          <h2>Labs / Resources</h2>
          <InfoTip text="Optional links to labs, tools, repositories, papers or datasets." />
        </div>

        <ResourcesEditor items={profile.resources} onChange={(items) => update("resources", items)} />
      </div>

      {/* COMPANY */}
      <div className="card">
        <div className="card-header">
          <span>🏢</span>
          <h2>Company details</h2>
          <InfoTip text="If relevant, add company info and domains. Otherwise you can leave it blank." />
        </div>

        <label>
          Company name
          <input value={profile.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </label>

        <label>
          Company description
          <textarea value={profile.companyDescription} onChange={(e) => update("companyDescription", e.target.value)} />
        </label>

        <TagPicker
          label="Domains"
          category="COMPANY_DOMAIN"
          values={profile.companyDomains || []}
          onChange={(vals) => update("companyDomains", vals)}
          placeholder="Search or add a domain"
        />
      </div>

      {/* LINKS */}
      <div className="card">
        <div className="card-header">
          <span>🔗</span>
          <h2>External links</h2>
          <InfoTip text="Add links (LinkedIn, GitHub, website) so others can view your work." />
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
    </div>
  );
}

/* ---------- Info tooltip ---------- */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="infoTip" tabIndex={0}>
      i
      <span className="infoTipBubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

/* ---------- Toggle ---------- */
function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggleRow">
      <span className="toggleLabel">{label}</span>
      <input className="toggleInput" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggleTrack" aria-hidden="true">
        <span className="toggleThumb" />
      </span>
    </label>
  );
}

/* ---------- Expertise editor ---------- */
type ExpertiseEditorProps = {
  items: ExpertiseItem[];
  onChange: (items: ExpertiseItem[]) => void;
};

function ExpertiseEditor({ items, onChange }: ExpertiseEditorProps) {
  const updateItem = (idx: number, patch: Partial<ExpertiseItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const add = () => onChange([...(items || []), { id: makeId(), area: "", description: "" }]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      {items.length === 0 && <small className="hint">Add at least one area so others can find you.</small>}

      {items.map((it, idx) => (
        <div key={it.id} className="subcard">
          <SinglePicker
            label="Expert area"
            category="EXPERT_AREA"
            value={it.area}
            onChange={(v) => updateItem(idx, { area: v })}
            placeholder="Search or add an expert area"
          />

          <label>
            Description
            <textarea value={it.description || ""} onChange={(e) => updateItem(idx, { description: e.target.value })} />
          </label>

          <div className="actionsRow">
            <button type="button" className="btnDanger" onClick={() => remove(idx)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btnSecondary" onClick={add} style={{ marginTop: 12 }}>
        + Add expertise
      </button>
    </div>
  );
}

/* ---------- Resources editor ---------- */
type ResourcesEditorProps = {
  items: ResourceItem[];
  onChange: (items: ResourceItem[]) => void;
};

function ResourcesEditor({ items, onChange }: ResourcesEditorProps) {
  const updateItem = (idx: number, patch: Partial<ResourceItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const add = () => onChange([...(items || []), { id: makeId(), title: "", description: "", url: "" }]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      {items.length === 0 && <small className="hint">Optional: add links to labs, tools, papers, or repositories.</small>}

      {items.map((it, idx) => (
        <div key={it.id} className="subcard">
          <div className="row">
            <label>
              Title
              <input value={it.title || ""} onChange={(e) => updateItem(idx, { title: e.target.value })} />
            </label>

            <label>
              URL
              <input value={it.url || ""} onChange={(e) => updateItem(idx, { url: e.target.value })} />
            </label>
          </div>

          <label>
            Description
            <textarea value={it.description || ""} onChange={(e) => updateItem(idx, { description: e.target.value })} />
          </label>

          <div className="actionsRow">
            <button type="button" className="btnDanger" onClick={() => remove(idx)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btnSecondary" onClick={add} style={{ marginTop: 12 }}>
        + Add resource
      </button>
    </div>
  );
}

/* ---------- TagPicker ---------- */
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
      setOpen(false);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const items = await suggest(category, q);
        const filtered = items.filter((i: string) => !selected.has(i.toLowerCase()));
        setSuggestions(filtered.slice(0, 10));
        setOpen(true);
      } catch (e) {
        console.error("Lookup suggest failed:", category, input, e);
        setSuggestions([]);
        setOpen(false);
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
    } catch (e) {
      console.error("Lookup upsert failed:", category, v, e);
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

      <small className="hint">Press Enter to add if it is not in the list.</small>
    </div>
  );
}
