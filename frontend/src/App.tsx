import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminLookupsUpload from "./pages/AdminLookupsUpload";
import ProtectedLayout from "./layouts/ProtectedLayout";
import Announcements from "./pages/Announcements";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/lookups-upload" element={<AdminLookupsUpload />} />
        <Route path="/announcements" element={<Announcements />} />

      </Route>
    </Routes>
  );
}

export default App;
