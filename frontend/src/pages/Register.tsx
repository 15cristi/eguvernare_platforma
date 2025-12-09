import { useState } from "react";
import { registerUser, loginWithGoogle } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

import "./Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CITIZEN");
  const [password, setPassword] = useState("");

  // FORM REGISTER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await registerUser(firstName, lastName, email, password, role);
      navigate("/login"); 
    } catch {
      alert("Eroare la înregistrare");
    }
  };

  // GOOGLE REGISTER
  const handleGoogleSuccess = async (res: CredentialResponse) => {
    if (!res.credential) {
      alert("Token Google invalid");
      return;
    }

    try {
      const data = await loginWithGoogle(res.credential);
        localStorage.setItem("token", data.token); // sau setToken dacă ai context
        navigate("/dashboard");
    } catch {
      alert("Eroare la contul Google");
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Creare cont nou</h2>
        <p className="subtitle">Completați informațiile de mai jos</p>

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label>Prenume</label>
            <input
              type="text"
              placeholder="Prenume"
              value={firstName}
              onChange={e => setFirst(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Nume</label>
            <input
              type="text"
              placeholder="Nume"
              value={lastName}
              onChange={e => setLast(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="email@exemplu.ro"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Rol</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="ANTREPRENOR">Antreprenor</option>
            <option value="MENTOR">Mentor</option>
            <option value="INVESTITOR">Investitor</option>
            <option value="PRODUCATOR">Producător</option>
            </select>
          </div>

          <div className="form-group">
            <label>Parola</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="primary-btn" type="submit">
            Înregistrare
          </button>
        </form>

        <div className="divider">sau</div>

        {/* GOOGLE LOGIN */}
        <div className="google-register">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert("Eroare la Google")}
          />
        </div>

        <p className="bottom-text">
          Ai deja un cont?
          <span onClick={() => navigate("/")}> Autentifică-te</span>
        </p>
      </div>
    </div>
  );
};

export default Register;
