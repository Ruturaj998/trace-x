import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { useToast } from "../context/useToast";
import tracexLogo from "../assets/tracex-logo.png";

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
      <div className="login-card">
        <img
          src={tracexLogo}
          alt="TRACE-X logo"
          className="brand-logo login-logo"
        />

        <span className="login-label">TRACE-X / SECURITY</span>

        <h1>Forgot Password</h1>

        <p>
          Enter your email address to receive a password reset link.
        </p>
        
        {success ? (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <p style={{ color: "var(--tx-text-secondary)" }}>
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
              <Link to="/login" style={{ color: "var(--tx-accent-primary)" }}>Return to Sign In</Link>
          </div>
        )}
      </div>
    </div>
  );
}
