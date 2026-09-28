import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../services/api";
import { useToast } from "../context/useToast";
import tracexLogo from "../assets/tracex-logo.png";

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
      <div className="login-card">
        <img
          src={tracexLogo}
          alt="TRACE-X logo"
          className="brand-logo login-logo"
        />

        <span className="login-label">TRACE-X / SECURITY</span>

        <h1>Reset Password</h1>
        
        {success ? (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <p style={{ color: "var(--tx-text-secondary)" }}>
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
                <Link to="/login" style={{ color: "var(--tx-accent-primary)" }}>Return to Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
