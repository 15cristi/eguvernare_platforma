import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminLookupsUpload from "./pages/AdminLookupsUpload";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin/lookups-upload"
        element={
          <ProtectedRoute>
            <AdminLookupsUpload />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
