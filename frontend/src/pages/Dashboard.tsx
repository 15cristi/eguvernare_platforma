import "./Dashboard.css";
import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // ⏳ Așteptăm user-ul din context (ProtectedRoute garantează auth)
  if (!user) {
    return (
      <div className="dashboard-loading">
        Loading dashboard...
      </div>
    );
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
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              My Profile
            </NavLink>

            <span>Projects</span>
            <span>Publications</span>
            <span>Expertise / Skills</span>
            <span>Project Announcements</span>
            <span>Labs / Resources</span>
            <span>My Bookings</span>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <span>Account Settings</span>
          <span
            className="logout"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Logout
          </span>
        </div>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main">
        {/* TOPBAR */}
        <header className="topbar">
          <h2>Dashboard</h2>

          <input placeholder="Search projects, mentors, labs..." />

          <div className="user">
            <div className="avatar" />
            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{user.role}</span>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <section className="content">
          <div className="content-inner">
            <div className="welcome">
              <h1>Welcome back, {user.firstName} 👋</h1>
              <p>Ready to collaborate and build something great today?</p>
            </div>

            <div className="stats">
              <div className="card">
                <span>Active Projects</span>
                <strong>3</strong>
              </div>
              <div className="card">
                <span>New Matches</span>
                <strong>12</strong>
              </div>
              <div className="card">
                <span>Upcoming Bookings</span>
                <strong>2</strong>
              </div>
            </div>

            <div className="section-header">
              <h2>Suggestions for you</h2>
              <button>View all</button>
            </div>

            <div className="grid">
              <div className="suggestion-card">
                <h3>Sarah Chen</h3>
                <p>Product Strategy Mentor</p>
                <button>Connect</button>
              </div>

              <div className="suggestion-card">
                <h3>EcoTrack Analytics</h3>
                <p>Frontend developer needed</p>
                <button>View Project</button>
              </div>

              <div className="suggestion-card">
                <h3>Advanced Prototyping Lab</h3>
                <p>Access to hardware tools</p>
                <button>Book Slot</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
