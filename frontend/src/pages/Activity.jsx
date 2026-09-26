import { useEffect, useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  RefreshCw,
  Activity as ActivityIcon,
  AlertCircle,
} from "lucide-react";
import { getRecentActivity } from "../services/api";

export default function Activity() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchActivity = async () => {
    try {
      setRefreshing(true);
      const data = await getRecentActivity();
      setActivity(data || []);
      setError("");
    } catch (err) {
      console.error("Activity loading failed:", err);
      setError("Unable to retrieve security event stream from TRACE-X server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getRecentActivity()
      .then((data) => {
        if (isMounted) {
          setActivity(data || []);
          setError("");
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Activity loading failed:", err);
          setError("Unable to retrieve security event stream from TRACE-X server.");
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

  const getActivityIcon = (status) => {
    if (status === "lost") return ShieldAlert;
    if (status === "active") return CheckCircle2;
    return AlertTriangle;
  };

  const getActivityType = (status) => {
    if (status === "lost") return "danger";
    if (status === "active") return "success";
    return "warning";
  };

  return (
    <section className="page-content">
      <div className="welcome-block activity-page-heading">
        <div>
          <span className="section-label">SECURITY INTELLIGENCE</span>
          <h1>Security Activity Log</h1>
          <p>
            Audit recent device state transitions, security warnings, and activation events.
          </p>
        </div>

        <button
          className="activity-refresh-button"
          onClick={fetchActivity}
          disabled={refreshing || loading}
          title="Refresh event log"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "spin" : ""}
          />
          {refreshing ? "REFRESHING..." : "REFRESH"}
        </button>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="empty-state-card">
          <div className="empty-state-icon error">
            <AlertCircle size={26} />
          </div>
          <h2 className="empty-state-title">Audit Log Disconnected</h2>
          <p className="empty-state-desc">{error}</p>
          <button className="empty-state-action" onClick={fetchActivity}>
            <RefreshCw size={14} />
            Retry Stream
          </button>
        </div>
      )}

      {/* SKELETON LOADING STATE */}
      {loading ? (
        <div className="activity-page-list">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="skeleton-card skeleton-box"
              style={{ minHeight: "80px", padding: "16px 20px" }}
            >
              <div className="skeleton-line short" />
              <div className="skeleton-line medium" />
            </div>
          ))}
        </div>
      ) : !error && activity.length === 0 ? (
        /* POLISHED EMPTY STATE */
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <ActivityIcon size={28} />
          </div>
          <h2 className="empty-state-title">No Security Events Logged</h2>
          <p className="empty-state-desc">
            Your registered devices have not triggered any state transitions or security alerts.
            Events will be logged automatically whenever device statuses change.
          </p>
          <button className="empty-state-action" onClick={fetchActivity}>
            <RefreshCw size={14} />
            Check Now
          </button>
        </div>
      ) : !error && (
        <div className="activity-page-list">
          {activity.map((item, index) => {
            const Icon = getActivityIcon(item.new_status);
            const type = getActivityType(item.new_status);

            return (
              <div className="activity-timeline-item" key={item.id || index}>
                <div className={`activity-page-icon ${type}`}>
                  <Icon size={19} />
                </div>

                {index !== activity.length - 1 && (
                  <div className="activity-timeline-line" />
                )}

                <div className="activity-page-card">
                  <div className="activity-page-main">
                    <span className="panel-eyebrow">
                      DEVICE #{item.device_id}
                    </span>

                    <h2>Device status changed</h2>

                    <div className="activity-transition">
                      <span>{item.old_status?.toUpperCase()}</span>
                      <strong>→</strong>
                      <span className={type}>
                        {item.new_status?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="activity-page-time">
                    <Clock3 size={14} />
                    <span>
                      {item.changed_at
                        ? new Date(item.changed_at).toLocaleString()
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}