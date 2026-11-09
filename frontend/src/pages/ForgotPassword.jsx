import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { useToast } from "../context/useToast";
import tracexLogo from "../assets/tracex-logo.png";
import PageMeta from "../components/PageMeta";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
      toast.success("Password reset email sent.");
    } catch (err) {
      console.error("Forgot password error:", err);
      const msg = err.message || "Unable to process request.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <PageMeta
        title="Forgot Password"
        description="Request a single-use password reset link for your TRACE-X device security account."
        path="/forgot-password"
      />

      <div className="login-card">
        <img
          src={tracexLogo}
          alt="TRACE-X — Device Security"
          className="brand-logo login-logo"
        />

        <span className="login-label">TRACE-X / SECURITY</span>

        <h1>Forgot Password</h1>

        <p>
          Enter your email address to receive a password reset link.
        </p>

        {success ? (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <p style={{ color: "var(--text-soft)" }}>
                If an account exists with {email}, a password reset link has been sent.
            </p>
            <button onClick={() => navigate("/login")} style={{ marginTop: "1rem" }}>
                Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "SENDING..." : "SEND RESET LINK"}
            </button>
          </form>
        )}

        {!success && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link to="/login" style={{ color: "var(--accent)" }}>Return to Sign In</Link>
          </div>
        )}

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
