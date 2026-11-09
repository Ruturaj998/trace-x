import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getToken } from "../services/api";
import tracexLogo from "../assets/tracex-logo.png";
import { Shield, Menu, X, ArrowRight } from "lucide-react";

export default function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = Boolean(getToken());

  const navLinks = [
    { label: "FAQ", path: "/faq" },
    { label: "Privacy Policy", path: "/privacy" },
    { label: "Contact", path: "/contact" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="public-header" role="banner">
      <div className="public-nav-container">
        <Link to="/" className="public-brand" aria-label="TRACE-X Home">
          <img
            src={tracexLogo}
            alt=""
            aria-hidden="true"
            className="brand-logo"
            style={{ width: "32px", height: "32px" }}
          />
          <div>
            <span className="brand-name">TRACE-X</span>
            <span className="brand-tagline">DEVICE SECURITY</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="public-nav-links" aria-label="Main Navigation">
          {navLinks.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className={`public-nav-link ${isActive(path) ? "active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Action CTAs */}
        <div className="public-nav-actions">
          {isAuthenticated ? (
            <Link to="/" className="public-btn-primary">
              <Shield size={14} />
              <span>COMMAND CENTER</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="public-nav-link">
                Sign In
              </Link>
              <Link to="/register" className="public-btn-primary">
                <span>Register Device</span>
                <ArrowRight size={14} />
              </Link>
            </>
          )}

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <nav aria-label="Mobile Navigation">
            {navLinks.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className={`mobile-nav-link ${isActive(path) ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mobile-nav-divider" />
            {isAuthenticated ? (
              <Link
                to="/"
                className="mobile-nav-link primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Go to Command Center
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="mobile-nav-link primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Account
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
