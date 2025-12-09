import "./Login.css";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { loginUser, loginWithGoogle } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaUsers, FaSync } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = await loginUser(email, password);
      setToken(data.token);
      navigate("/dashboard");
    } catch {
      alert("Email sau parolă invalidă");
    }
  };

  
  const handleGoogleSuccess = async (res: CredentialResponse) => {
    if (!res.credential) {
      alert("Token Google invalid.");
      return;
    }

    try {
      const data = await loginWithGoogle(res.credential);
      setToken(data.token);
      navigate("/dashboard");
    } catch {
      alert("Eroare la autentificarea cu Google");
    }
  };

  return (
    <div className="login-page">
    <div className="login-container">

      {}
      <div className="left-info">
        

        

        <h1 className="main-title">Universitate și Industrie</h1>
        <p className="subtitle">Platformă de colaborare</p>

        <div className="features">
          <div className="feature">
            <i className="icon"><FaShieldAlt /></i>
            <div>
              <h3>Autentificare securizată</h3>
              <p>Datele dvs. sunt protejate cu criptare SSL</p>
            </div>
          </div>

          <div className="feature">
              <i className="icon"><FaUsers /></i>
            <div>
              <h3>Acces bazat pe roluri</h3>
              <p>Autorizare specifică pentru fiecare utilizator</p>
            </div>
          </div>

          <div className="feature">
              <i className="icon"><FaSync /></i>

            <div>
              <h3>În timp real</h3>
              <p>Notificări și actualizări instantanee</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOGIN CARD */}
      <div className="login-card">
        <h2>Autentificare comună</h2>
        <p className="card-subtitle">
          Conectați-vă cu adresa dvs. de email instituțională
        </p>

        <div className="info-box">
          Numele dvs. de utilizator este adresa dvs. de email.  
          Dacă uitați parola, folosiți opțiunea „Am uitat parola”.
        </div>

        {/* FORMULAR LOGIN */}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="nume.prenume@universitate.ro"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <label>Parolă</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="primary-btn">
            Log in
          </button>
        </form>

        <div className="divider">sau</div>

        {/* GOOGLE LOGIN */}
        <div className="google-login">
        <GoogleLogin 
            onSuccess={handleGoogleSuccess}
            onError={() => alert("Eroare la Google")}
        />
        </div>

        <div className="register-section">
          Nu ai un cont?
          <span onClick={() => navigate("/register")}>
            Înregistrează-te acum
          </span>
        </div>
      </div>
    </div>  
    </div>
  );
};

export default Login;
