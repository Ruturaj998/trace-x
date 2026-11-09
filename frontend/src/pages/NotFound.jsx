import { useNavigate, Link } from "react-router-dom";
import { getToken } from "../services/api";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PageMeta from "../components/PageMeta";
import { ArrowLeft, Shield, HelpCircle, Mail, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getToken());

  return (
    <div className="public-layout">
      <PageMeta
        title="404 — Signal Lost"
        description="The requested coordinate or security route does not exist in TRACE-X Command Center."
        path="/404"
        noIndex={true}
      />

      <PublicNav />

      <main
        className="public-main"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          className="contact-card"
          style={{
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
            padding: "48px 36px",
          }}
        >
          {/* Signal Lost Icon & Radar Glow */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(255, 92, 103, 0.1)",
              border: "1px solid rgba(255, 92, 103, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "var(--danger)",
              boxShadow: "0 0 24px rgba(255, 92, 103, 0.2)",
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <span className="login-label" style={{ color: "var(--danger)" }}>
            ERROR 404 / TELEMETRY UNREACHABLE
          </span>

          <h1 style={{ fontSize: "28px", margin: "10px 0 12px", fontWeight: 700 }}>
            Signal Lost
          </h1>

          <p style={{ color: "var(--text-soft)", fontSize: "13px", lineHeight: "1.7", margin: "0 0 28px" }}>
            The requested coordinate or system route does not exist in the TRACE-X console.
            The link may be outdated, or the route has been decommissioned.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {isAuthenticated ? (
              <Link
                to="/"
                className="public-btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Shield size={16} />
                <span>RETURN TO COMMAND CENTER</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="public-btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Shield size={16} />
                <span>SIGN IN TO COMMAND CENTER</span>
              </Link>
            )}

            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <Link
                to="/faq"
                className="faq-cat-btn"
                style={{ flex: 1, textAlign: "center", padding: "10px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <HelpCircle size={14} />
                <span>View FAQ</span>
              </Link>

              <Link
                to="/contact"
                className="faq-cat-btn"
                style={{ flex: 1, textAlign: "center", padding: "10px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <Mail size={14} />
                <span>Contact</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                marginTop: "12px",
              }}
            >
              <ArrowLeft size={14} />
              <span>Go back to previous page</span>
            </button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
