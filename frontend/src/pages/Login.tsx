import "./Login.css";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { loginUser, loginWithGoogle } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaUsers, FaBolt, FaEnvelope, FaLock } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const { setToken ,setUser} = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginUser(email, password);
      setToken(data.token);
      setUser(data.user);
      navigate("/dashboard");
    } catch {
      alert("Invalid credentials");
    }
  };

  const handleGoogleSuccess = async (res: CredentialResponse) => {
  if (!res.credential) return;

  const data = await loginWithGoogle(res.credential);

  setToken(data.token);
  setUser(data.user); // 🔥 LINIA LIPSĂ
  navigate("/dashboard");
};


  return (
    <div className="login-page">
      {/* LEFT */}
      <section className="login-left">
        <div className="left-content">
          <span className="brand">Collaborate</span>

          <h1 className="hero-title">
            Connect.<br />
            Collaborate.<br />
            <span className="accent">Innovate.</span>
          </h1>

          <p className="hero-subtitle">
            Where Entrepreneurs, Mentors, and Students collide.
          </p>

          <div className="features">
            <div className="feature">
              <span className="icon"><FaShieldAlt /></span>
              <div>
                <h3>Secure authentication</h3>
                <p>Enterprise-grade security.</p>
              </div>
            </div>

            <div className="feature">
              <span className="icon"><FaUsers /></span>
              <div>
                <h3>Role-based access</h3>
                <p>Tailored experiences.</p>
              </div>
            </div>

            <div className="feature">
              <span className="icon"><FaBolt /></span>
              <div>
                <h3>Real-time matching</h3>
                <p>Instant connections.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT */}
      <section className="login-right">
        <div className="login-box">
          <h2>Welcome Back</h2>
          <p className="subtitle">Enter your credentials to access your workspace</p>

          <form onSubmit={handleSubmit}>
            <label>Email Address</label>
            <div className="input-wrapper">
            <span className="input-icon"><FaEnvelope /></span>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>


            <label>Password</label>
            <div className="input-wrapper">
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="primary-btn">Log In</button>
          </form>

          <div className="divider">OR CONTINUE WITH</div>

          <div className="oauth">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => alert("Google error")}
            />
          </div>

          <p className="bottom-text">
            Don’t have an account?
            <span onClick={() => navigate("/register")}> Register now</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
