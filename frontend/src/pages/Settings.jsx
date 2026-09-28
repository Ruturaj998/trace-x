import { useEffect, useState } from "react";
import {
  User,
  Shield,
  Bell,
  Server,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChangePasswordModal from "../components/ChangePasswordModal";

import {
  getCurrentUser,
  getDashboardSummary,
  getSystemHealth,
  getToken,
  removeToken,
} from "../services/api";
import { useToast } from "../context/useToast";

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [userData, summaryData, healthData] = await Promise.all([
        getCurrentUser(),
        getDashboardSummary(),
        getSystemHealth().catch(() => ({ status: "error", api: "offline", database: "disconnected" })),
      ]);

      setUser(userData);
      setSummary(summaryData);
      setHealth(healthData);
      toast.info("System configuration and telemetry diagnostics updated.");
    } catch (err) {
      console.error("Settings loading failed:", err);
      setError("Unable to load complete settings profile. Backend connection issue.");
      toast.error("Failed to refresh system diagnostics.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userData, summaryData, healthData] = await Promise.all([
        getCurrentUser(),
        getDashboardSummary(),
        getSystemHealth().catch(() => ({ status: "error", api: "offline", database: "disconnected" })),
      ]);

      setUser(userData);
      setSummary(summaryData);
      setHealth(healthData);
    } catch (err) {
      console.error("Settings loading failed:", err);
      setError("Unable to load complete settings profile. Backend connection issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getCurrentUser(),
      getDashboardSummary(),
      getSystemHealth().catch(() => ({ status: "error", api: "offline", database: "disconnected" })),
    ])
      .then(([userData, summaryData, healthData]) => {
        if (isMounted) {
          setUser(userData);
          setSummary(summaryData);
          setHealth(healthData);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Settings loading failed:", err);
          setError("Unable to load complete settings profile. Backend connection issue.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    toast.info("Logged out of TRACE-X session.");
    removeToken();
    navigate("/login");
  };

  if (loading) {
    return (
      <section className="page-content">
        <div className="welcome-block settings-page-heading">
          <div>
            <span className="section-label">SYSTEM CONFIGURATION</span>
            <h1>Settings</h1>
            <p>Loading administrator profile and backend telemetry diagnostics...</p>
          </div>
        </div>

        <div className="settings-grid">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="settings-card skeleton-card">
              <div className="skeleton-bar" style={{ width: "38px", height: "38px", borderRadius: "5px" }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar skeleton-title" style={{ width: "130px" }} />
                <div className="skeleton-bar skeleton-line" style={{ width: "90%", marginTop: "16px" }} />
                <div className="skeleton-bar skeleton-line" style={{ width: "75%", marginTop: "12px" }} />
                <div className="skeleton-bar skeleton-line" style={{ width: "85%", marginTop: "12px" }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const getApiStatus = () => {
    if (refreshing) return { label: "Checking", className: "settings-checking" };
    if (!health) return { label: "Offline", className: "settings-error" };
    if (health.api === "online" || health.status === "healthy") return { label: "Operational", className: "settings-active" };
    if (health.api === "offline") return { label: "Offline", className: "settings-error" };
    return { label: "Error", className: "settings-error" };
  };

  const getDbStatus = () => {
    if (refreshing) return { label: "Checking", className: "settings-checking" };
    if (!health) return { label: "Offline", className: "settings-error" };
    if (health.database === "connected") return { label: "Operational", className: "settings-active" };
    if (health.database === "disconnected") return { label: "Offline", className: "settings-error" };
    return { label: "Error", className: "settings-error" };
  };

  const getSessionStatus = () => {
    const token = getToken();
    if (!token) return { label: "Offline", className: "settings-error" };
    return { label: "Operational", className: "settings-active" };
  };

  const apiStatus = getApiStatus();
  const dbStatus = getDbStatus();
  const sessionStatus = getSessionStatus();

  return (
    <section className="page-content">
      <div className="welcome-block settings-page-heading">
        <div>
          <span className="section-label">
            SYSTEM CONFIGURATION
          </span>

          <h1>Settings</h1>

          <p>
            Manage your TRACE-X account, inspect backend health, and view active sessions.
          </p>
        </div>

        <button
          className="settings-refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh system settings and backend health"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "spin" : ""}
          />

          {refreshing ? "CHECKING..." : "REFRESH"}
        </button>
      </div>

      {error && (
        <div className="app-error-banner" role="alert" style={{ marginBottom: "16px" }}>
          <AlertTriangle size={18} className="app-error-icon" />
          <div className="app-error-text">
            <strong>System Diagnostics Alert</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="app-error-retry"
            onClick={handleRetry}
          >
            Retry Check
          </button>
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-icon">
            <User size={19} />
          </div>

          <div className="settings-content">
            <span className="panel-eyebrow">
              ACCOUNT
            </span>

            <h2>Administrator Profile</h2>

            <div className="settings-row">
              <span>Name</span>
              <strong>{user?.name || "--"}</strong>
            </div>

            <div className="settings-row">
              <span>Email</span>
              <strong>{user?.email || "--"}</strong>
            </div>

            <div className="settings-row">
              <span>User ID</span>
              <strong>{user?.id ?? "--"}</strong>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-icon">
            <Shield size={19} />
          </div>

          <div className="settings-content">
            <span className="panel-eyebrow">
              SECURITY & SESSION
            </span>

            <h2>Authentication</h2>

            <div className="settings-row">
              <span>Session State</span>

              <strong className={sessionStatus.className}>
                <CheckCircle2 size={13} />
                {sessionStatus.label}
              </strong>
            </div>

            <div className="settings-row">
              <span>JWT Protection</span>

              <strong className="settings-active">
                <CheckCircle2 size={13} />
                Operational
              </strong>
            </div>

            <div className="settings-row">
              <span>Role Privilege</span>

              <strong>
                User / Admin
              </strong>
            </div>

            <button 
              className="settings-refresh-button" 
              style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
              onClick={() => setIsPasswordModalOpen(true)}
            >
              CHANGE PASSWORD
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-icon">
            <Bell size={19} />
          </div>

          <div className="settings-content">
            <span className="panel-eyebrow">
              TELEMETRY
            </span>

            <h2>Security Alerts</h2>

            <div className="settings-row">
              <span>In-app toast alerts</span>

              <strong className="settings-active">
                Operational
              </strong>
            </div>

            <div className="settings-row">
              <span>Telemetry polling</span>

              <strong className="settings-active">
                Operational (10s)
              </strong>
            </div>

            <div className="settings-row">
              <span>Map Layer Control</span>

              <strong className="settings-active">
                Satellite / Street
              </strong>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-icon">
            <Server size={19} />
          </div>

          <div className="settings-content">
            <span className="panel-eyebrow">
              SYSTEM HEALTH
            </span>

            <h2>TRACE-X Backend</h2>

            <div className="settings-row">
              <span>API Health</span>

              <strong className={apiStatus.className}>
                <CheckCircle2 size={13} />
                {apiStatus.label}
              </strong>
            </div>

            <div className="settings-row">
              <span>PostgreSQL Database</span>

              <strong className={dbStatus.className}>
                <CheckCircle2 size={13} />
                {dbStatus.label}
              </strong>
            </div>

            <div className="settings-row">
              <span>Registered devices</span>

              <strong>
                {summary?.total_devices ?? 0}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <button
        className="settings-logout"
        onClick={handleLogout}
        aria-label="Sign out of TRACE-X session"
      >
        <LogOut size={17} />
        Sign out of TRACE-X
      </button>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </section>
  );
}