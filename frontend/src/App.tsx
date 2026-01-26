import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminLookupsUpload from "./pages/AdminLookupsUpload";
import ProtectedLayout from "./layouts/ProtectedLayout";
import Announcements from "./pages/Announcements";
import Projects from "./pages/Projects";
import Publications from "./pages/Publications";
import Messages from "./pages/Messages";
import Matching from "./pages/Matching";
import Connections from "./pages/Connections";
import ConnectionRequests from "./pages/ConnectionRequests";
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
        <Route path="/projects" element={<Projects />} />
        <Route path="/publications" element={<Publications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/matching" element={<Matching />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/connections/requests" element={<ConnectionRequests />} />
      </Route>
    </Routes>
  );
}

export default App;
