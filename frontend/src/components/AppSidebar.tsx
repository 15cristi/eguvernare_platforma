import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { getMyProfile } from "../api/profile";

export default function AppSidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyProfile()
      .then((data) => {
        if (!cancelled && data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
      })
      .catch(() => {
        // nu stricăm sidebar-ul dacă API-ul nu răspunde
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>EcoCollab</h1>
            <span>Connect & Grow</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-ico">🏠</span>
            Dashboard
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-ico">👤</span>
            My Profile
          </NavLink>

          <NavLink to="/admin/lookups-upload" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-ico">🧪</span>
            Admin Upload
            <span className="badge">test</span>
          </NavLink>

          <div className="nav-section">Explore</div>

          <button className="nav-item ghost" type="button">
            <span className="nav-ico">📁</span>
            Projects
          </button>
          <button className="nav-item ghost" type="button">
            <span className="nav-ico">📚</span>
            Publications
          </button>

          <NavLink to="/announcements" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-ico">📣</span>
            Announcements
          </NavLink>

          <button className="nav-item ghost" type="button">
            <span className="nav-ico">🧰</span>
            Matching
          </button>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button className="nav-item ghost" type="button">
          <span className="nav-ico">⚙️</span>
          Account Settings
        </button>

        <button
          className="nav-item danger"
          type="button"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <span className="nav-ico">🚪</span>
          Logout
        </button>

        <div className="sidebar-user">
          <div
            className="avatar"
            style={
              avatarUrl
                ? {
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          />
          <div className="sidebar-user-meta">
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <span>{user?.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
