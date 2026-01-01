import "./Dashboard.css";
import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
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
            <button className="nav-item ghost" type="button">
              <span className="nav-ico">🧠</span>
              Expertise / Skills
            </button>
            <button className="nav-item ghost" type="button">
              <span className="nav-ico">📣</span>
              Announcements
            </button>
            <button className="nav-item ghost" type="button">
              <span className="nav-ico">🧰</span>
              Labs / Resources
            </button>
            <button className="nav-item ghost" type="button">
              <span className="nav-ico">📅</span>
              My Bookings
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
            <div className="avatar" />
            <div className="sidebar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{user.role}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <h2>Dashboard</h2>
            <span className="topbar-sub">Overview & suggestions</span>
          </div>

          <div className="topbar-search">
            <span className="search-ico">⌕</span>
            <input placeholder="Search projects, mentors, labs..." />
          </div>

          <div className="topbar-right">
            <button className="icon-btn" type="button" title="Notifications">
              🔔
            </button>
            <button className="icon-btn" type="button" title="Messages">
              💬
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <section className="content">
          <div className="content-inner">
            <div className="welcome">
              <h1>Welcome back, {user.firstName}</h1>
              <p>Pick something useful to do. Humans love options.</p>
            </div>

            <div className="stats">
              <div className="card stat">
                <div className="stat-top">
                  <span>Active Projects</span>
                  <span className="stat-ico">📌</span>
                </div>
                <strong>3</strong>
                <div className="stat-foot">2 updated today</div>
              </div>

              <div className="card stat">
                <div className="stat-top">
                  <span>New Matches</span>
                  <span className="stat-ico">✨</span>
                </div>
                <strong>12</strong>
                <div className="stat-foot">Based on your profile</div>
              </div>

              <div className="card stat">
                <div className="stat-top">
                  <span>Upcoming Bookings</span>
                  <span className="stat-ico">🗓️</span>
                </div>
                <strong>2</strong>
                <div className="stat-foot">Next: tomorrow 14:00</div>
              </div>
            </div>

            <div className="section-header">
              <h2>Suggestions for you</h2>
              <button className="btn-outline" type="button">
                View all
              </button>
            </div>

            <div className="grid">
              <div className="suggestion-card">
                <div className="suggestion-head">
                  <h3>Sarah Chen</h3>
                  <span className="pill">Mentor</span>
                </div>
                <p>Product Strategy, Growth, Fundraising</p>
                <button className="btn-primary" type="button">
                  Connect
                </button>
              </div>

              <div className="suggestion-card">
                <div className="suggestion-head">
                  <h3>EcoTrack Analytics</h3>
                  <span className="pill">Project</span>
                </div>
                <p>Frontend developer needed for dashboard + charts</p>
                <button className="btn-primary" type="button">
                  View project
                </button>
              </div>

              <div className="suggestion-card">
                <div className="suggestion-head">
                  <h3>Advanced Prototyping Lab</h3>
                  <span className="pill">Lab</span>
                </div>
                <p>3D printing, CNC, electronics bench access</p>
                <button className="btn-primary" type="button">
                  Book slot
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
