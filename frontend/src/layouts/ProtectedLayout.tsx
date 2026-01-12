import { Outlet } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AppSidebar from "../components/AppSidebar";
import "./ProtectedLayout.css";
import "../pages/Dashboard.css"; // rapid: aduce css-ul sidebar-ului

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        <AppSidebar />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
