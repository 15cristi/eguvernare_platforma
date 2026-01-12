import { Outlet } from "react-router-dom";
import Sidebar from "../components/AppSidebar"; // adaptează importul la ce ai tu
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <div className="appLayout">
      <aside className="appLayoutSidebar">
        <Sidebar />
      </aside>
      <main className="appLayoutMain">
        <Outlet />
      </main>
    </div>
  );
}
