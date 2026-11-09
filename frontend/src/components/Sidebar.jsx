import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Smartphone,
  Map,
  Activity,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  Terminal,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../services/api";
import { useNav } from "../context/useNav";
import tracexLogo from "../assets/tracex-logo.png";

const mainNavItems = [
  { label: "Command Center", icon: LayoutDashboard, path: "/" },
  { label: "Devices", icon: Smartphone, path: "/devices" },
  { label: "Locations", icon: Map, path: "/locations" },
  { label: "Activity Log", icon: Activity, path: "/activity" },
];

const secondaryNavItems = [
  { label: "Security & Alerts", icon: ShieldCheck, path: "/security" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileNavOpen, closeMobileNav } = useNav();
  const sidebarRef = useRef(null);

  const handleLogout = async () => {
    closeMobileNav();
    await logoutUser();
    navigate("/login");
  };

  const handleNavClick = (path) => {
    closeMobileNav();
    navigate(path);
  };

  // Keyboard navigation for mobile drawer: close on Escape
  useEffect(() => {
    if (!isMobileNavOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobileNav();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen, closeMobileNav]);

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        ref={sidebarRef}
        className={`sidebar ${isMobileNavOpen ? "open" : ""}`}
        aria-label="Application Navigation"
      >
        {/* Brand Header */}
        <div className="brand">
          <div
            className="brand-link"
            onClick={() => handleNavClick("/")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleNavClick("/")}
            aria-label="TRACE-X Dashboard Home"
          >
            <img
              src={tracexLogo}
              alt=""
              aria-hidden="true"
              className="brand-logo"
            />
            <div className="brand-text">
              <h1>TRACE-X</h1>
              <span>DEVICE SECURITY</span>
            </div>
          </div>

          {/* Close button visible only on mobile drawer */}
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={closeMobileNav}
            aria-label="Close navigation drawer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Primary Navigation Group */}
        <nav className="navigation" aria-label="Primary">
          <div className="nav-group">
            <div className="nav-label">COMMAND & ASSETS</div>
            {mainNavItems.map(({ label, icon: Icon, path }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  type="button"
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => handleNavClick(path)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} className="nav-icon" aria-hidden="true" />
                  <span className="nav-text">{label}</span>
                  {active && <span className="active-pill-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="nav-group nav-group--secondary">
            <div className="nav-label">SECURITY & SYSTEM</div>
            {secondaryNavItems.map(({ label, icon: Icon, path }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  type="button"
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => handleNavClick(path)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} className="nav-icon" aria-hidden="true" />
                  <span className="nav-text">{label}</span>
                  {active && <span className="active-pill-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer / Account Actions */}
        <div className="sidebar-bottom">
          <div className="sidebar-system-badge">
            <Terminal size={12} className="sidebar-console-icon" aria-hidden="true" />
            <span>TRACE-X CONSOLE</span>
          </div>

          <button
            type="button"
            className="logout"
            onClick={handleLogout}
            title="Sign out of TRACE-X session"
            aria-label="Sign out of session"
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}