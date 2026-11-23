import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getToken, loginUser } from "../services/api";
import { useToast } from "../context/useToast";
import signInMap from "../assets/stitch-sign-in-map.png";
import PageMeta from "../components/PageMeta";
import { ArrowLeft, ArrowRight, AtSign, Eye, EyeOff, KeyRound, LockKeyhole, Navigation, Radar, ShieldCheck, UserRound } from "lucide-react";
import "./stitch-public.css";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (getToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      toast.success("Authentication successful. Welcome to TRACE-X.");
      navigate("/dashboard");
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
    <main className="stitch-page stitch-signin">
      <PageMeta
        title="Command Center Sign In"
        description="Sign in to your TRACE-X device security command center to monitor registered hardware telemetry, GPS coordinates, and lost-device status."
        path="/login"
      />
      <header className="stitch-login-mobile-header">
        <Link to="/" aria-label="Back to TRACE-X home"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <span>Operator Auth</span>
        <span className="stitch-user-link"><UserRound size={17} aria-hidden="true" /></span>
      </header>
      <div className="stitch-login-shell">
        <aside className="stitch-login-visual" aria-label="Example location preview">
          <img src={signInMap} alt="" className="stitch-login-map" />
          <div className="stitch-login-map-grid" />
          <Link className="stitch-brand" to="/"><Radar size={24} aria-hidden="true" />TRACE-X <span>Secure node</span></Link>
          <div className="stitch-map-reticle" aria-hidden="true">
            <div><Navigation size={23} /><span>Sector 9</span></div>
          </div>
          <div className="stitch-login-map-footer">
            <div className="stitch-mono">LAT 37.7749° N <span>│</span> LON 122.4194° W</div>
            <div className="stitch-map-fleet"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Location preview</strong><span>Example coordinates from San Francisco</span></div></div>
            <small>Map data © Google</small>
          </div>
        </aside>
        <section className="stitch-login-panel" aria-labelledby="signin-title">
          <div className="stitch-login-state" role="status">
            <span><i /> Session</span><strong>{loading ? "Submitting" : error ? "Sign-in failed" : "Ready"}</strong>
          </div>
          <div className="stitch-login-heading">
            <span className="stitch-eyebrow"><KeyRound size={14} aria-hidden="true" /> Restricted access portal</span>
            <span className="stitch-login-mobile-icon"><Radar size={24} aria-hidden="true" /></span>
            <h1 id="signin-title">Sign in to TRACE-X</h1>
            <p>Access your registered devices and location telemetry.</p>
          </div>

          <form className="stitch-login-form" onSubmit={handleLogin} aria-busy={loading}>
            <label htmlFor="email">Operator email</label>
            <div className="stitch-login-field">
              <AtSign size={18} aria-hidden="true" />
              <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" required />
            </div>

            <div className="stitch-login-label-row">
              <label htmlFor="password">Password</label>
              <Link className="stitch-forgot-link" to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="stitch-login-field">
              <LockKeyhole size={17} aria-hidden="true" />
              <input id="password" name="password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
              <button className="stitch-password-toggle" type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
              </button>
            </div>

            {error && <div className="stitch-login-error" role="alert">{error}</div>}
            <button className="stitch-button stitch-button-primary stitch-login-submit" type="submit" disabled={loading}>
              {loading ? "AUTHENTICATING..." : "Sign in"} {loading ? null : <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <p className="stitch-login-register">Need an account? <Link to="/register">Create account</Link></p>
          <nav className="stitch-login-footer" aria-label="Sign-in help">
            <Link to="/faq">FAQ</Link><Link to="/contact">Support</Link><Link to="/privacy">Privacy policy</Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
