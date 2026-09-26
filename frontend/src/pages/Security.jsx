import { useEffect, useState } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  Database,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

import {
  getDashboardDevices,
  getDashboardSummary,
  getSystemHealth,
  getToken,
} from "../services/api";
import { useToast } from "../context/useToast";

export default function Security() {
  const toast = useToast();
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [devicesData, summaryData, healthData] = await Promise.all([
        getDashboardDevices(),
        getDashboardSummary(),
        getSystemHealth().catch(() => ({ status: "error", api: "error", database: "disconnected" })),
      ]);

      setDevices(devicesData);
      setSummary(summaryData);
      setHealth(healthData);
      toast.info("Security status diagnostics updated.");
    } catch (err) {
      console.error("Security loading failed:", err);
      setError("Unable to connect to security telemetry service.");
      toast.error("Security diagnostic refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = async () => {
    try {
      setLoading(true);
      setError(null);
      const [devicesData, summaryData, healthData] = await Promise.all([
        getDashboardDevices(),
        getDashboardSummary(),
        getSystemHealth().catch(() => ({ status: "error", api: "error", database: "disconnected" })),
      ]);

      setDevices(devicesData);
      setSummary(summaryData);
      setHealth(healthData);
    } catch (err) {
      console.error("Security loading failed:", err);
      setError("Unable to connect to security telemetry service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getDashboardDevices(),
      getDashboardSummary(),
      getSystemHealth().catch(() => ({ status: "error", api: "error", database: "disconnected" })),
    ])
      .then(([devicesData, summaryData, healthData]) => {
        if (isMounted) {
          setDevices(devicesData);
          setSummary(summaryData);
          setHealth(healthData);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Security loading failed:", err);
          setError("Unable to connect to security telemetry service.");
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

  const lostDevices = devices.filter(
    (device) => device.status === "lost"
  );

  const disabledDevices = devices.filter(
    (device) => device.status === "disabled"
  );

  const systemAttention = lostDevices.length > 0;

  if (loading) {
    return (
      <section className="page-content">
        <div className="welcome-block security-page-heading">
          <div>
            <span className="section-label">SECURITY CENTER</span>
            <h1>System Security</h1>
            <p>Scanning active protection parameters and device telemetry...</p>
          </div>
        </div>

        <div className="security-grid">
          <div className="security-main-card skeleton-card">
            <div className="skeleton-bar" style={{ width: "62px", height: "62px", borderRadius: "8px" }} />
            <div>
              <div className="skeleton-bar skeleton-title" style={{ width: "160px" }} />
              <div className="skeleton-bar skeleton-line" style={{ width: "240px", marginTop: "12px" }} />
            </div>
            <div className="skeleton-bar" style={{ width: "90px", height: "28px" }} />
          </div>

          <div className="security-card skeleton-card">
            <div className="skeleton-bar" style={{ width: "38px", height: "38px", borderRadius: "6px" }} />
            <div className="skeleton-bar skeleton-title" style={{ width: "120px", marginTop: "16px" }} />
            <div className="skeleton-bar skeleton-line" style={{ width: "80%", marginTop: "10px" }} />
          </div>

          <div className="security-card skeleton-card">
            <div className="skeleton-bar" style={{ width: "38px", height: "38px", borderRadius: "6px" }} />
            <div className="skeleton-bar skeleton-title" style={{ width: "120px", marginTop: "16px" }} />
            <div className="skeleton-bar skeleton-line" style={{ width: "80%", marginTop: "10px" }} />
          </div>

          <div className="security-card skeleton-card">
            <div className="skeleton-bar" style={{ width: "38px", height: "38px", borderRadius: "6px" }} />
            <div className="skeleton-bar skeleton-title" style={{ width: "120px", marginTop: "16px" }} />
            <div className="skeleton-bar skeleton-line" style={{ width: "80%", marginTop: "10px" }} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-content">
      <div className="welcome-block security-page-heading">
        <div>
          <span className="section-label">
            SECURITY CENTER
          </span>

          <h1>System Security</h1>

          <p>
            Monitor the real security state and verified protection systems of TRACE-X.
          </p>
        </div>

        <button
          className="security-refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh security diagnostics"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "spin" : ""}
          />

          {refreshing ? "REFRESHING..." : "REFRESH"}
        </button>
      </div>

      {error && (
        <div className="app-error-banner" role="alert" style={{ marginBottom: "16px" }}>
          <AlertTriangle size={18} className="app-error-icon" />
          <div className="app-error-text">
            <strong>Security Diagnostic Notice</strong>
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

      <div className="security-grid">
        <div
          className={`security-main-card ${
            systemAttention ? "security-attention" : ""
          }`}
        >
          <div className="security-shield">
            {systemAttention ? (
              <ShieldAlert size={34} />
            ) : (
              <ShieldCheck size={34} />
            )}
          </div>

          <div>
            <span className="panel-eyebrow">
              CURRENT SECURITY STATE
            </span>

            <h2>
              {systemAttention
                ? "Security Attention Required"
                : "System Protected"}
            </h2>

            <p>
              {systemAttention
                ? `${lostDevices.length} lost device${
                    lostDevices.length > 1 ? "s" : ""
                  } require${
                    lostDevices.length === 1 ? "s" : ""
                  } immediate attention.`
                : "All registered devices and TRACE-X telemetry services are operating normally."}
            </p>
          </div>

          <div
            className={`security-status ${
              systemAttention ? "attention" : ""
            }`}
          >
            <span />
            {systemAttention ? "ATTENTION" : "OPERATIONAL"}
          </div>
        </div>

        <div className="security-card">
          <div className="security-card-icon">
            <LockKeyhole size={19} />
          </div>

          <span className="panel-eyebrow">
            AUTHENTICATION
          </span>

          <h3>JWT Protection</h3>

          <p>
            API requests require valid cryptographically signed access tokens.
          </p>

          <strong className={getToken() ? "security-good" : "security-warning"}>
            <CheckCircle2 size={14} />
            {getToken() ? "ACTIVE SESSION" : "UNAUTHENTICATED"}
          </strong>
        </div>

        <div className="security-card">
          <div className="security-card-icon">
            <Database size={19} />
          </div>

          <span className="panel-eyebrow">
            DATABASE
          </span>

          <h3>Data Protection</h3>

          <p>
            Device identities, locations, and audit logs stored in PostgreSQL.
          </p>

          <strong className={health?.database === "connected" ? "security-good" : "security-danger"}>
            <CheckCircle2 size={14} />
            {health?.database === "connected" ? "CONNECTED" : "OFFLINE"}
          </strong>
        </div>

        <div className="security-card">
          <div className="security-card-icon">
            <Radio size={19} />
          </div>

          <span className="panel-eyebrow">
            TRACKING
          </span>

          <h3>Location Monitoring</h3>

          <p>
            GPS telemetry coordinates streamed to live Leaflet mapping layers.
          </p>

          <strong
            className={
              disabledDevices.length === devices.length &&
              devices.length > 0
                ? "security-warning"
                : "security-good"
            }
          >
            <CheckCircle2 size={14} />
            {disabledDevices.length === devices.length &&
            devices.length > 0
              ? "OFFLINE"
              : "ONLINE"}
          </strong>
        </div>

        <div className="security-card security-device-summary">
          <div className="security-card-icon">
            <ShieldCheck size={19} />
          </div>

          <span className="panel-eyebrow">
            DEVICE SECURITY
          </span>

          <h3>Security Overview</h3>

          <div className="security-stat-list">
            <div>
              <span>Total devices</span>
              <strong>{summary?.total_devices ?? 0}</strong>
            </div>

            <div>
              <span>Active</span>
              <strong>{summary?.active_devices ?? 0}</strong>
            </div>

            <div>
              <span>Lost</span>
              <strong className="security-danger">
                {summary?.lost_devices ?? 0}
              </strong>
            </div>

            <div>
              <span>Disabled</span>
              <strong>{summary?.disabled_devices ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}