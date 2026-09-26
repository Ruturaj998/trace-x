import {
  LayoutDashboard,
  Smartphone,
  Map,
  Activity,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { removeToken } from "../services/api";
import tracexLogo from "../assets/tracex-logo.png";

const navigation = [
  { label: "Command", icon: LayoutDashboard, path: "/" },
  { label: "Devices", icon: Smartphone, path: "/devices" },
  { label: "Locations", icon: Map, path: "/locations" },
  { label: "Activity", icon: Activity, path: "/activity" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <img
          src={tracexLogo}
          alt="TRACE-X logo"
          className="brand-logo"
        />

        <div>
          <h1>TRACE-X</h1>
          <span>DEVICE SECURITY</span>
        </div>
      </div>

      <nav className="navigation">
        <div className="nav-label">COMMAND CENTER</div>

        {navigation.map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            className={`nav-item ${
              location.pathname === path ? "active" : ""
            }`}
            onClick={() => navigate(path)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className={`nav-item ${
            location.pathname === "/security" ? "active" : ""
          }`}
          onClick={() => navigate("/security")}
          title="Security"
          aria-label="Security"
        >
          <ShieldCheck size={18} strokeWidth={1.8} />
          <span>Security</span>
        </button>

        <button
          className={`nav-item ${
            location.pathname === "/settings" ? "active" : ""
          }`}
          onClick={() => navigate("/settings")}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={18} strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        <button
          className="logout"
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}