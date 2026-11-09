import { useLocation, Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PageMeta from "../components/PageMeta";
import { CheckCircle2, Shield, HelpCircle, ArrowRight, MessageSquare } from "lucide-react";

export default function ThankYou() {
  const location = useLocation();
  const state = location.state || {};
  const isDirectSubmission = Boolean(state.submitted);
  const inquiryCategory = state.subject || "General Support";

  return (
    <div className="public-layout">
      <PageMeta
        title="Inquiry Received"
        description="Your support inquiry has been received by the TRACE-X security engineering team."
        path="/contact/thank-you"
        noIndex={true}
      />

      <PublicNav />

      <main
        className="public-main"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "65vh",
        }}
      >
        <div
          className="contact-card"
          style={{
            maxWidth: "540px",
            width: "100%",
            textAlign: "center",
            padding: "48px 36px",
          }}
        >
          {/* Success Animated Mark */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(99, 230, 190, 0.12)",
              border: "1px solid rgba(99, 230, 190, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "var(--success)",
              boxShadow: "0 0 28px rgba(99, 230, 190, 0.2)",
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <span className="login-label" style={{ color: "var(--success)" }}>
            TRANSMISSION SECURED & DISPATCHED
          </span>

          <h1 style={{ fontSize: "28px", margin: "10px 0 12px", fontWeight: 700 }}>
            Inquiry Received
          </h1>

          <p style={{ color: "var(--text-soft)", fontSize: "14px", lineHeight: "1.7", margin: "0 0 24px" }}>
            {isDirectSubmission ? (
              <>
                Your message regarding <strong>{inquiryCategory}</strong> has been logged into our
                secure review queue. Our engineering team will review the details and respond
                within 24 to 48 business hours.
              </>
            ) : (
              <>
                If you recently dispatched a message to TRACE-X Support, it has been received.
                No duplicate transmission will be executed upon refreshing this confirmation.
              </>
            )}
          </p>

          <div
            style={{
              background: "var(--panel-soft)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "28px",
              textAlign: "left",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text)", marginBottom: "4px" }}>
              <Shield size={14} style={{ color: "var(--accent)" }} />
              <strong>Privacy Protection Notice</strong>
            </div>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              To safeguard your account integrity, password reset tokens and telemetry coordinates
              are never transmitted through support tickets.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <Link
              to="/faq"
              className="public-btn-primary"
              style={{ justifyContent: "center" }}
            >
              <HelpCircle size={15} />
              <span>BROWSE KNOWLEDGE BASE & FAQ</span>
            </Link>

            <div style={{ display: "flex", gap: "10px" }}>
              <Link
                to="/login"
                className="faq-cat-btn"
                style={{ flex: 1, textAlign: "center", padding: "10px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <span>Command Center</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                to="/contact"
                className="faq-cat-btn"
                style={{ flex: 1, textAlign: "center", padding: "10px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <MessageSquare size={14} />
                <span>New Inquiry</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
