import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../services/api";
import { useToast } from "../context/useToast";
import tracexLogo from "../assets/tracex-logo.png";
import PageMeta from "../components/PageMeta";

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const error = !token ? "Invalid or missing reset token." : submitError;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;

    setSubmitError("");
    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast.success("Password has been reset successfully.");
    } catch (err) {
      console.error("Reset password error:", err);
      const msg = err.message || "Unable to reset password.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <PageMeta
        title="Reset Password"
        description="Choose a new password for your TRACE-X account."
        path="/reset-password"
        noIndex={true}
      />

      <div className="login-card">
        <img
          src={tracexLogo}
          alt="TRACE-X — Device Security"
          className="brand-logo login-logo"
        />

        <span className="login-label">TRACE-X / SECURITY</span>

        <h1>Reset Password</h1>

        {success ? (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <p style={{ color: "var(--text-soft)" }}>
                Your password has been changed successfully.
            </p>
            <button onClick={() => navigate("/login")} style={{ marginTop: "1rem" }}>
                Sign In Now
            </button>
          </div>
        ) : (
          <>
            <p>
              Enter a new password for your account.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="password">New Password</label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Choose a new password"
                autoComplete="new-password"
                minLength="8"
                required
                disabled={!token}
              />

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !token}>
                {loading ? "RESETTING..." : "RESET PASSWORD"}
              </button>
            </form>

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <Link to="/login" style={{ color: "var(--accent)" }}>Return to Sign In</Link>
            </div>
          </>
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
