import { Link } from "react-router-dom";
import tracexLogo from "../assets/tracex-logo.png";
import { ShieldCheck, Activity, HelpCircle, FileText, Mail, Lock } from "lucide-react";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer" role="contentinfo">
      <div className="public-footer-inner">
        <div className="footer-grid">
          {/* Brand & Summary */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <img
                src={tracexLogo}
                alt=""
                aria-hidden="true"
                className="brand-logo"
                style={{ width: "28px", height: "28px" }}
              />
              <span className="brand-name">TRACE-X</span>
            </div>
            <p className="footer-tagline">
              Real-time stolen-device tracking and security command console.
              Monitor registered hardware, geographic coordinates, and lost-device status.
            </p>
            <div className="footer-status-pill">
              <span className="footer-status-dot" />
              <span>Telemetry Network Nominal</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h3 className="footer-heading">SYSTEM & RECOVERY</h3>
            <ul className="footer-links">
              <li>
                <Link to="/faq">
                  <HelpCircle size={14} />
                  <span>Frequently Asked Questions</span>
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  <Mail size={14} />
                  <span>Technical Support & Inquiries</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy">
                  <FileText size={14} />
                  <span>Privacy Policy & Telemetry</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Authentication & Account */}
          <div className="footer-col">
            <h3 className="footer-heading">ACCOUNT ACCESS</h3>
            <ul className="footer-links">
              <li>
                <Link to="/login">
                  <Lock size={14} />
                  <span>Command Center Sign In</span>
                </Link>
              </li>
              <li>
                <Link to="/register">
                  <ShieldCheck size={14} />
                  <span>Register Account & Hardware</span>
                </Link>
              </li>
              <li>
                <Link to="/forgot-password">
                  <Activity size={14} />
                  <span>Recover Account Access</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Notice & Copyright */}
        <div className="footer-bottom">
          <p className="footer-disclaimer">
            TRACE-X provides owner-directed device telemetry and status management.
            Device tracking requires an active location source (e.g. telemetry agent or GPS fix),
            network connectivity, and valid system permissions. Registering hardware alone does
            not passively enable tracking without a functioning telemetry stream.
          </p>
          <div className="footer-copyright">
            <span>© {currentYear} TRACE-X Security Systems. All rights reserved.</span>
            <div className="footer-legal-links">
              <Link to="/privacy">Privacy Policy</Link>
              <span aria-hidden="true">•</span>
              <Link to="/faq">FAQ</Link>
              <span aria-hidden="true">•</span>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
