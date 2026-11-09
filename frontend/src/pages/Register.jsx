import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getToken, registerUser } from "../services/api";
import { useToast } from "../context/useToast";
import tracexLogo from "../assets/tracex-logo.png";
import PageMeta from "../components/PageMeta";

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (getToken()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await registerUser(name, email, password);
      toast.success("Registration successful. Please log in.");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      const msg = err.message || "Unable to register.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <PageMeta
        title="Create Account"
        description="Create a secure TRACE-X account to register hardware, track stolen devices, and receive security telemetry alerts."
        path="/register"
      />

      <div className="login-card">
        <img
          src={tracexLogo}
          alt="TRACE-X — Device Security"
          className="brand-logo login-logo"
        />

        <span className="login-label">TRACE-X / SECURITY</span>

        <h1>Register</h1>

        <p>
          Create a new account for the TRACE-X system.
        </p>

        <form onSubmit={handleRegister}>
          <label htmlFor="name">Full Name</label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            required
          />

          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Choose a password (min. 8 characters)"
            autoComplete="new-password"
            minLength="8"
            required
          />

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "REGISTERING..." : "REGISTER"}
          </button>
        </form>
        
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to="/login" style={{ color: "var(--accent)" }}>Already have an account? Sign In</Link>
        </div>

        <div style={{ marginTop: "1.4rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center", gap: "16px", fontSize: "0.8rem" }}>
            <Link to="/faq" style={{ color: "var(--text-muted)", textDecoration: "none" }}>FAQ</Link>
            <span style={{ color: "var(--border)" }}>•</span>
            <Link to="/contact" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Support</Link>
            <span style={{ color: "var(--border)" }}>•</span>
            <Link to="/privacy" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Privacy</Link>
        </div>
      </div>
    </div>
  );
}
