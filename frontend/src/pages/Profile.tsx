import "./Profile.css";
import { useEffect, useState } from "react";
import {
  getMyProfile,
  updateMyProfile,
  saveAvatarUrl
} from "../api/profile";
import { uploadAvatarToCloudinary } from "../api/cloudinary";

type Availability = "FULL_TIME" | "PART_TIME" | "WEEKENDS";
type ExperienceLevel = "JUNIOR" | "MID" | "SENIOR";

/**
 * Rolul este DOAR UI momentan.
 * NU este trimis la backend.
 */
type Role = "DEVELOPER" | "MENTOR" | "ENTREPRENEUR";

interface Profile {
  headline: string;
  bio: string;
  country: string;
  city: string;
  availability: Availability;
  experienceLevel: ExperienceLevel;
  openToProjects: boolean;
  openToMentoring: boolean;
  linkedinUrl: string;
  githubUrl: string;
  website: string;
  avatarUrl?: string;

  // doar frontend
  role?: Role;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getMyProfile().then(data => {
      setProfile({
        ...data,
        role: "DEVELOPER" // default UI
      });
    }).catch(() => {});
  }, []);

  if (!profile) {
    return <div className="profile-loading">Loading profile…</div>;
  }

  const update = (field: keyof Profile, value: any) => {
    setProfile(p => (p ? { ...p, [field]: value } : p));
  };

  /**
   * Calcul REAL de profile strength
   */
  const calculateProfileStrength = (p: Profile) => {
    const fields = [
      p.headline,
      p.bio,
      p.country,
      p.city,
      p.availability,
      p.experienceLevel,
      p.openToProjects,
      p.openToMentoring,
      p.linkedinUrl,
      p.githubUrl,
      p.website,
      p.avatarUrl
    ];

    const filled = fields.filter(v => {
      if (typeof v === "boolean") return true;
      return v && String(v).trim().length > 0;
    }).length;

    return Math.round((filled / fields.length) * 100);
  };

  const strength = calculateProfileStrength(profile);

  /**
   * IMPORTANT:
   * trimitem DOAR ce acceptă backend-ul
   */
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        headline: profile.headline,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
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
      alert("Profile update forbidden");
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
                backgroundImage: profile.avatarUrl
                  ? `url(${profile.avatarUrl})`
                  : undefined
              }}
            >
              <label className="avatar-overlay">
                📷
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  disabled={uploading}
                  onChange={async e => {
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

            <p className="headline-preview">
              {profile.headline || "Your professional headline"}
            </p>

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
              <input
                value={profile.headline}
                onChange={e => update("headline", e.target.value)}
              />
            </label>

            <label>
              Bio
              <textarea
                value={profile.bio}
                onChange={e => update("bio", e.target.value)}
              />
            </label>

            <div className="row">
              <label>
                Country
                <input
                  value={profile.country}
                  onChange={e => update("country", e.target.value)}
                />
              </label>
              <label>
                City
                <input
                  value={profile.city}
                  onChange={e => update("city", e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* AVAILABILITY + ROLE */}
          <div className="card">
            <div className="card-header">
              <span>🧠</span>
              <h2>Availability & Role</h2>
            </div>

            <label>
              Availability
              <select
                value={profile.availability}
                onChange={e =>
                  update("availability", e.target.value as Availability)
                }
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
                  update(
                    "experienceLevel",
                    e.target.value as ExperienceLevel
                  )
                }
              >
                <option value="JUNIOR">Junior</option>
                <option value="MID">Mid</option>
                <option value="SENIOR">Senior</option>
              </select>
            </label>

            <label>
              Role
              <select
                value={profile.role}
                onChange={e =>
                  update("role", e.target.value as Role)
                }
              >
                <option value="DEVELOPER">Developer</option>
                <option value="MENTOR">Mentor</option>
                <option value="ENTREPRENEUR">Entrepreneur</option>
              </select>
            </label>

            <div className="checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={profile.openToProjects}
                  onChange={e =>
                    update("openToProjects", e.target.checked)
                  }
                />
                Open to projects
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={profile.openToMentoring}
                  onChange={e =>
                    update("openToMentoring", e.target.checked)
                  }
                />
                Open to mentoring
              </label>
            </div>
          </div>

          {/* LINKS */}
          <div className="card">
            <div className="card-header">
              <span>🔗</span>
              <h2>External links</h2>
            </div>

            <label>
              LinkedIn
              <input
                value={profile.linkedinUrl}
                onChange={e => update("linkedinUrl", e.target.value)}
              />
            </label>

            <label>
              GitHub
              <input
                value={profile.githubUrl}
                onChange={e => update("githubUrl", e.target.value)}
              />
            </label>

            <label>
              Website
              <input
                value={profile.website}
                onChange={e => update("website", e.target.value)}
              />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Profile;
