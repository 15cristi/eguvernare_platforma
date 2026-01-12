import "./Dashboard.css";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <>
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar-left">
          <h2>Dashboard</h2>
          <span className="topbar-sub">Overview & suggestions</span>
        </div>
      </header>

      {/* CONTENT */}
      <section className="content">
        <div className="content-inner">
          <div className="welcome">
            <h1>Welcome back, {user.firstName}</h1>
            <p>Pick something useful to do. Humans love options.</p>
          </div>

          {/* restul conținutului tău */}
        </div>
      </section>
    </>
  );
};

export default Dashboard;
