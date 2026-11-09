import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getToken, setToken, loginUser } from "../services/api";
import { useToast } from "../context/useToast";
import tracexLogo from "../assets/tracex-logo.png";
import PageMeta from "../components/PageMeta";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (getToken()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      setToken(data.access_token);
      toast.success("Authentication successful. Welcome to TRACE-X.");
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.message || "Unable to connect to TRACE-X backend.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <PageMeta
        title="Command Center Sign In"
        description="Sign in to your TRACE-X device security command center to monitor registered hardware telemetry, GPS coordinates, and lost-device status."
        path="/login"
      />

      <div className="login-card">
        <img
          src={tracexLogo}
          alt="TRACE-X — Device Security"
          className="brand-logo login-logo"
        />

        <span className="login-label">TRACE-X / SECURITY</span>

        <h1>Command Center</h1>

        <p>
          Sign in to access your device security dashboard.
        </p>

        <form onSubmit={handleLogin}>
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
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
            <Link to="/forgot-password" style={{ color: "var(--text-soft)" }}>Forgot Password?</Link>
            <Link to="/register" style={{ color: "var(--accent)" }}>Create Account</Link>
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
