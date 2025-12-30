import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { registerUser, loginWithGoogle } from "../api/auth";
import "./Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ANTREPRENOR");

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { email?: string; password?: string } = {};

    if (!email.includes("@")) {
      newErrors.email = "Email must contain the @ symbol";
    }

    if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    } else if (!password.includes("!")) {
      newErrors.password = "Password must contain the ! character";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await registerUser(firstName, lastName, email, password, role);
      navigate("/login");
    } catch {
      setErrors({ password: "Registration failed. Please try again." });
    }
  };

  const handleGoogleSuccess = async (res: CredentialResponse) => {
    if (!res.credential) return;
    const data = await loginWithGoogle(res.credential);
    localStorage.setItem("token", data.token);
    navigate("/dashboard");
  };

  return (
    <div className="register-page">
      <div className="register-header">
        <h1>Join the Eco-System</h1>
        <p>Connect with mentors, build projects, and grow your skills.</p>
      </div>

      <main className="register-container">
        <form className="register-form" onSubmit={handleRegister}>
          <section>
            <h2>Choose your role</h2>

            <div className="role-grid">
              {["ANTREPRENOR", "MENTOR", "INVESTITOR", "PRODUCATOR"].map(r => (
                <label key={r} className={`role-card ${role === r ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2>Basic information</h2>

            <div className="form-grid">
              <input
                placeholder="First name"
                value={firstName}
                onChange={e => setFirst(e.target.value)}
              />

              <input
                placeholder="Last name"
                value={lastName}
                onChange={e => setLast(e.target.value)}
              />

              <input
                className="full-row"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              {errors.email && (
                <p className="input-error">{errors.email}</p>
              )}

              <input
                className="full-row"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />

              {errors.password && (
                <p className="input-error">{errors.password}</p>
              )}
            </div>
          </section>

          <button className="primary-btn">Create Account</button>

          <div className="divider">OR</div>

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert("Google error")}
          />

          <p className="bottom-text">
            Already have an account?
            <span onClick={() => navigate("/")}> Log in</span>
          </p>
        </form>
      </main>
    </div>
  );
};

export default Register;
