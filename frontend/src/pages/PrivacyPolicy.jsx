import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PageMeta from "../components/PageMeta";
import { Shield, Lock, Database, Trash2, Globe, Mail, AlertCircle } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "October 17, 2026";

  return (
    <div className="public-layout">
      <PageMeta
        title="Privacy Policy & Telemetry Practices"
        description="TRACE-X Privacy Policy. Transparent documentation of collected hardware identifiers, geographic coordinates, retention periods, and security practices."
        path="/privacy"
      />

      <PublicNav />

      <main className="public-main" id="main-content">
        <div className="public-hero">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span>TRANSPARENCY & DATA GOVERNANCE</span>
          </div>

          <h1>Privacy Policy & Telemetry Practices</h1>
          <p>
            This policy accurately details how TRACE-X collects, processes, stores, and protects
            telemetry and account data. All statements are grounded in our codebase architecture.
          </p>
          <div style={{ marginTop: "12px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            Effective Date: {lastUpdated}
          </div>
        </div>

        <div className="privacy-card">
          {/* Operational Confirmation Alert */}
          <div
            className="faq-callout"
            style={{
              borderColor: "var(--warning)",
              background: "rgba(255, 200, 87, 0.08)",
              marginBottom: "32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--warning)", marginBottom: "4px" }}>
              <AlertCircle size={16} />
              <strong>Operational & Legal Review Items</strong>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-soft)" }}>
              Items tagged with <span className="confirmation-tag">[Requires User Confirmation]</span> represent
              business or organizational variables (such as company legal entity, physical mailing address, or specific legal jurisdiction)
              that must be verified by the system owner before formal legal publication.
            </p>
          </div>

          {/* Section 1: Data We Collect */}
          <section className="privacy-section">
            <h2>
              <Database size={18} className="faq-icon" />
              <span>1. Information We Collect</span>
              <span className="section-tag">[CODEBASE AUDITED]</span>
            </h2>
            <p>
              TRACE-X collects only the data necessary to provide authentic device ownership verification,
              telemetry reporting, and security alerts:
            </p>

            <table className="privacy-data-table">
              <thead>
                <tr>
                  <th>Data Category</th>
                  <th>Fields Collected</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Account Credentials</strong></td>
                  <td>User Full Name, Email Address, Cryptographic Password Hash (bcrypt)</td>
                  <td>User authentication, account recovery, and tenant authorization.</td>
                </tr>
                <tr>
                  <td><strong>Hardware Telemetry</strong></td>
                  <td>User-defined Device Name, Unique Device Identifier (UUID/MAC/Serial), Device Status (Active, Lost, Disabled)</td>
                  <td>Establishing device identity and coordinating security alert states.</td>
                </tr>
                <tr>
                  <td><strong>Geographic Telemetry</strong></td>
                  <td>Latitude, Longitude, Horizontal Accuracy Radius (meters), UTC Timestamp</td>
                  <td>Rendering map tracking coordinates and historical trajectory logs.</td>
                </tr>
                <tr>
                  <td><strong>Security Audit Log</strong></td>
                  <td>Previous Device Status, Updated Status, Status Change Timestamp</td>
                  <td>Audit trail for incident investigation and tracking device recovery events.</td>
                </tr>
                <tr>
                  <td><strong>Password Reset</strong></td>
                  <td>SHA-256 Hashed Recovery Token, Expiration Timestamp (1 hour), Used Flag</td>
                  <td>Secure single-use password recovery without plaintext token exposure.</td>
                </tr>
                <tr>
                  <td><strong>Inquiry Submissions</strong></td>
                  <td>Contact Name, Email Address, Subject Category, Message Body, Client IP</td>
                  <td>Responding to user support inquiries and preventing spam abuse.</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section 2: Why We Collect Data */}
          <section className="privacy-section">
            <h2>
              <Shield size={18} className="faq-icon" />
              <span>2. Purpose of Processing</span>
            </h2>
            <p>We process collected data exclusively for the following purposes:</p>
            <ul>
              <li><strong>Owner-Directed Device Recovery:</strong> Enabling users to track their own lost or stolen hardware.</li>
              <li><strong>Strict Tenant Isolation:</strong> Ensuring every location point and device query strictly belongs to the authenticated user account (`WHERE user_id = current_user.id`).</li>
              <li><strong>Brute-Force & Abuse Mitigation:</strong> Applying IP rate-limiting to sensitive endpoints (e.g. login, registration, contact submissions) to safeguard accounts from unauthorized credential testing.</li>
              <li><strong>System Reliability:</strong> Monitoring API and database health status to ensure continuous telemetry ingestion.</li>
            </ul>
            <p>
              <strong>We do not sell, rent, or trade your personal data or location coordinates to third-party advertisers or data brokers.</strong>
            </p>
          </section>

          {/* Section 3: Third-Party Services */}
          <section className="privacy-section">
            <h2>
              <Globe size={18} className="faq-icon" />
              <span>3. Third-Party Integrations & Map Providers</span>
            </h2>
            <p>TRACE-X interacts with selected third-party infrastructure providers:</p>
            <ul>
              <li>
                <strong>OpenStreetMap / Leaflet:</strong> The web console renders geographic map tiles using OpenStreetMap tiles via the Leaflet library. When the map loads in your browser, standard HTTP requests for map tiles are sent to the tile server. Coordinates are rendered locally in your browser session.
              </li>
              <li>
                <strong>SMTP Email Provider:</strong> If configured in production (e.g. SendGrid, Mailgun, Amazon SES), the server transmits single-use password reset links to your registered email address.
                <span className="confirmation-tag">[Requires User Confirmation: Production SMTP Provider]</span>
              </li>
              <li>
                <strong>Google Analytics 4 (Optional):</strong> If configured by the site operator, anonymized public page views and aggregated contact submissions are tracked. Sensitive fields (passwords, tokens, GPS coordinates, device IDs) are explicitly filtered out.
              </li>
            </ul>
          </section>

          {/* Section 4: Data Retention & Deletion */}
          <section className="privacy-section">
            <h2>
              <Trash2 size={18} className="faq-icon" />
              <span>4. Data Retention & Deletion Rights</span>
            </h2>
            <p>
              TRACE-X implements automated cascading deletions at the database layer:
            </p>
            <ul>
              <li>
                <strong>Device Deletion:</strong> When you delete a registered device from the Command Center, all associated historical locations (`locations` table) and status transition records (`device_status_history` table) are automatically purged via foreign key cascading (`cascade="all, delete-orphan"`).
              </li>
              <li>
                <strong>Token Expiration:</strong> Password reset tokens automatically expire after 60 minutes and cannot be reused.
              </li>
              <li>
                <strong>Account Deletion:</strong> If an account is removed, all linked devices, location histories, and reset tokens are permanently destroyed.
              </li>
            </ul>
          </section>

          {/* Section 5: Security Measures */}
          <section className="privacy-section">
            <h2>
              <Lock size={18} className="faq-icon" />
              <span>5. Technical & Organizational Security Measures</span>
            </h2>
            <p>We implement defense-in-depth protections across our architecture:</p>
            <ul>
              <li><strong>Password Hashing:</strong> Passwords are cryptographically hashed using standard one-way derivation algorithms (bcrypt / argon2) with unique salts.</li>
              <li><strong>Token-Based Authentication:</strong> Sessions utilize cryptographically signed JSON Web Tokens (JWT) using HMAC-SHA256 with 60-minute expirations.</li>
              <li><strong>Multi-Tier Rate Limiting:</strong> Endpoints are protected against automated brute-force attacks by sliding-window rate limiters.</li>
              <li><strong>Encryption in Transit:</strong> All communications between clients, the telemetry agent, and the API server are routed over HTTPS (TLS 1.2 / TLS 1.3).</li>
            </ul>
          </section>

          {/* Section 6: Contact & Regulatory Information */}
          <section className="privacy-section">
            <h2>
              <Mail size={18} className="faq-icon" />
              <span>6. Contact Information & Legal Entity</span>
            </h2>
            <p>
              For privacy-related inquiries, data access requests, or telemetry questions, please contact our
              security team through our <Link to="/contact" style={{ color: "var(--accent)" }}>Contact Page</Link>.
            </p>
            <div style={{ background: "var(--panel-soft)", padding: "16px", borderRadius: "6px", fontSize: "12px" }}>
              <div><strong>Operating Organization:</strong> TRACE-X Security Systems <span className="confirmation-tag">[Requires User Confirmation: Legal Entity Name]</span></div>
              <div style={{ marginTop: "6px" }}><strong>Mailing Address:</strong> Physical corporate address to be specified <span className="confirmation-tag">[Requires User Confirmation: Physical Address]</span></div>
              <div style={{ marginTop: "6px" }}><strong>Governing Jurisdiction:</strong> Applicable jurisdiction to be specified <span className="confirmation-tag">[Requires User Confirmation: Jurisdiction]</span></div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
