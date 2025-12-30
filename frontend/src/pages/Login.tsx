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
          

          <h1 className="hero-title">
            European Network<br />
            of Young Green Entrepreneurs.<br />
            <span className="accent">Youngreenteco</span>
          </h1>

          

        <div className="features">
          <div className="feature">
            <span className="icon"><FaUsers /></span>
            <div>
              <h3>Entrepreneurs</h3>
              <p>
                Find mentors, investors, and partners aligned with your startup stage and domain.
              </p>
            </div>
          </div>

          <div className="feature">
            <span className="icon"><FaUsers /></span>
            <div>
              <h3>Mentors</h3>
              <p>
                Share expertise, guide founders, and engage only in areas where you add real value.
              </p>
            </div>
          </div>

          <div className="feature">
            <span className="icon"><FaUsers /></span>
            <div>
              <h3>Investors</h3>
              <p>
                Discover vetted startups by sector, maturity, and traction, without noisy deal flow.
              </p>
            </div>
          </div>

          <div className="feature">
            <span className="icon"><FaUsers /></span>
            <div>
              <h3>Manufacturers</h3>
              <p>
                Connect with startups ready to prototype, scale production, or industrialize ideas.
              </p>
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
