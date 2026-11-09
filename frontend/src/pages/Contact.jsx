import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PageMeta from "../components/PageMeta";
import { submitContactForm } from "../services/api";
import { useToast } from "../context/useToast";
import { trackEvent } from "../utils/analytics";
import {
  Mail,
  Shield,
  Clock,
  Send,
  AlertTriangle,
  Lock,
  MessageSquare,
} from "lucide-react";

export default function Contact() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "Technical Support & Telemetry Sync",
    message: "",
    // Honeypot field for bot mitigation. Must remain empty for genuine submissions.
    organization_verification_code: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side pre-validation
    if (!formData.name.trim()) {
      setError("Please provide your name.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (formData.message.trim().length < 10) {
      setError("Message must be at least 10 characters long.");
      return;
    }

    setLoading(true);

    try {
      await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        honeypot: formData.organization_verification_code || "",
      });

      // Track privacy-safe conversion event (no PII or message body passed)
      trackEvent("contact_submission_success", {
        category: formData.subject,
      });

      toast.success("Inquiry transmitted successfully.");

      // Navigate to dedicated thank-you page with internal navigation state
      // (NO PII or query params in URL)
      navigate("/contact/thank-you", {
        replace: true,
        state: {
          submitted: true,
          subject: formData.subject,
        },
      });
    } catch (err) {
      console.error("Contact submission error:", err);
      const msg = err.message || "Failed to transmit inquiry. Please check your network and retry.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-layout">
      <PageMeta
        title="Contact Technical Support"
        description="Contact the TRACE-X security engineering team for technical support, telemetry agent integration questions, or lost-device recovery assistance."
        path="/contact"
      />

      <PublicNav />

      <main className="public-main" id="main-content">
        <div className="public-hero">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span>SECURITY SUPPORT & ASSISTANCE</span>
          </div>

          <h1>Contact TRACE-X Support</h1>
          <p>
            Have a question regarding device tracking, telemetry agent deployment,
            or security auditing? Submit an inquiry and our engineering team will respond.
          </p>
        </div>

        <div className="contact-grid">
          {/* Left: Contact Form */}
          <div className="contact-card">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <MessageSquare size={20} className="faq-icon" />
              <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 600 }}>Send an Inquiry</h2>
            </div>

            {error && (
              <div
                className="app-error-banner"
                role="alert"
                style={{ marginBottom: "20px" }}
              >
                <AlertTriangle size={18} className="app-error-icon" />
                <div className="app-error-text">
                  <strong>Transmission Error</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Honeypot field - visually hidden, inaccessible to keyboard/screen readers */}
              <div
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  height: 0,
                  width: 0,
                  overflow: "hidden",
                }}
                aria-hidden="true"
              >
                <label htmlFor="organization_verification_code">Do not fill this field</label>
                <input
                  type="text"
                  id="organization_verification_code"
                  name="organization_verification_code"
                  value={formData.organization_verification_code}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="contact-form-group">
                <label htmlFor="contact-name">FULL NAME *</label>
                <input
                  type="text"
                  id="contact-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Alex Mercer"
                  required
                  maxLength={100}
                />
              </div>

              <div className="contact-form-group">
                <label htmlFor="contact-email">BUSINESS OR PERSONAL EMAIL *</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  maxLength={255}
                />
              </div>

              <div className="contact-form-group">
                <label htmlFor="contact-subject">INQUIRY CATEGORY *</label>
                <select
                  id="contact-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="Technical Support & Telemetry Sync">Technical Support & Telemetry Sync</option>
                  <option value="Device Recovery Assistance">Device Recovery Assistance</option>
                  <option value="Account Access & Authentication">Account Access & Authentication</option>
                  <option value="Security Vulnerability / Bug Report">Security Vulnerability / Bug Report</option>
                  <option value="Data Privacy & Deletion Request">Data Privacy & Deletion Request</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div className="contact-form-group">
                <label htmlFor="contact-message">INQUIRY DETAILS (MIN. 10 CHARACTERS) *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Describe your inquiry, device model, or issue details..."
                  required
                  minLength={10}
                  maxLength={3000}
                />
              </div>

              <button
                type="submit"
                className="public-btn-primary"
                disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "12px" }}
              >
                <Send size={15} />
                <span>{loading ? "TRANSMITTING INQUIRY..." : "TRANSMIT INQUIRY"}</span>
              </button>
            </form>
          </div>

          {/* Right: Security & Support Protocol Details */}
          <div>
            <div className="contact-card" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Shield size={20} className="faq-icon" />
                <h3 style={{ fontSize: "16px", margin: 0, fontWeight: 600 }}>Security Protocol</h3>
              </div>
              <p style={{ color: "var(--text-soft)", fontSize: "13px", lineHeight: "1.7", margin: 0 }}>
                All contact submissions are transmitted over encrypted TLS 1.3 channels and verified against
                bot activity and rate-limiting limits. Your inquiry will be logged directly into our secure
                support queue.
              </p>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <Clock size={16} />
                  </div>
                  <div>
                    <strong>Response Timeline</strong>
                    <span>Standard inquiries are reviewed within 24 to 48 business hours.</span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <Mail size={16} />
                  </div>
                  <div>
                    <strong>Electronic Dispatch</strong>
                    <span>Direct correspondence sent to: support@tracex.example.com [User Confirmation Pending]</span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <Lock size={16} />
                  </div>
                  <div>
                    <strong>Confidentiality Guarantee</strong>
                    <span>We do not disclose device identifiers or user coordinates in support threads.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Link Card */}
            <div className="contact-card">
              <h3 style={{ fontSize: "15px", margin: "0 0 10px", fontWeight: 600 }}>Need Immediate Assistance?</h3>
              <p style={{ color: "var(--text-soft)", fontSize: "12px", lineHeight: "1.6", margin: "0 0 16px" }}>
                Answers to common questions regarding GPS tracking permissions, lost-device mode,
                and telemetry agents are documented in our knowledge base.
              </p>
              <button
                type="button"
                className="faq-cat-btn active"
                onClick={() => navigate("/faq")}
                style={{ width: "100%", padding: "10px", textAlign: "center" }}
              >
                Browse Frequently Asked Questions
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
