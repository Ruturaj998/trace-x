import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { EmptyState } from "./common";

const iconMap = {
  lost: ShieldAlert,
  active: CheckCircle2,
  warning: AlertTriangle,
};

/**
 * Safe timestamp formatting helper for security audit events.
 *
 * @param {string} isoString - ISO-formatted timestamp
 * @returns {string} Formatted time string
 */
function formatEventTime(isoString) {
  if (!isoString) return "--:--";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

/**
 * Safe date formatting helper for security audit events.
 *
 * @param {string} isoString - ISO-formatted timestamp
 * @returns {string} Formatted date string
 */
function formatEventDate(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Command-center ActivityFeed component for real-time security events.
 *
 * @param {Array} activity - List of DeviceStatusHistory records
 * @param {boolean} [loading=false] - Shimmer loading state
 */
export default function ActivityFeed({ activity, loading = false }) {
  const activities = activity || [];

  return (
    <section className="activity-panel" aria-label="Security Audit Log">
      <div className="activity-header">
        <div className="panel-header-left">
          <span className="panel-eyebrow">SECURITY AUDIT</span>
          <h2>Recent Activity</h2>
        </div>

        <div className="panel-header-actions">
          <span className="activity-live" aria-label="Live event stream active">
            <span aria-hidden="true" />
            LIVE AUDIT
          </span>

          <Link
            to="/activity"
            className="panel-action-link"
            title="Open comprehensive system security and audit history"
          >
            <span>View Log</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="activity-list" role="feed">
        {loading ? (
          [1, 2, 3].map((idx) => (
            <div
              className="activity-item skeleton-card"
              key={idx}
              style={{ minHeight: "60px" }}
            >
              <div
                className="skeleton-bar"
                style={{ width: "34px", height: "34px", borderRadius: "6px" }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton-bar skeleton-title"
                  style={{ width: "130px" }}
                />
                <div
                  className="skeleton-bar skeleton-line"
                  style={{ width: "95px", marginTop: "6px" }}
                />
              </div>
              <div
                className="skeleton-bar"
                style={{ width: "50px", height: "14px" }}
              />
            </div>
          ))
        ) : activities.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert size={22} />}
            title="No Security Transitions Recorded"
            description="Status modifications, hardware alerts, and device state transitions stream here in real time."
            className="activity-panel-empty"
          />
        ) : (
          activities.map((item, index) => {
            const isLost = item.new_status === "lost";
            const isActive = item.new_status === "active";
            const type = isLost ? "danger" : isActive ? "success" : "warning";
            const Icon = isLost
              ? iconMap.lost
              : isActive
                ? iconMap.active
                : iconMap.warning;

            const timeStr = formatEventTime(item.changed_at);
            const dateStr = formatEventDate(item.changed_at);

            return (
              <article
                className="activity-item"
                key={item.id || index}
                aria-label={`Device status changed from ${item.old_status} to ${item.new_status}`}
              >
                <div className={`activity-icon ${type}`} aria-hidden="true">
                  <Icon size={16} strokeWidth={1.8} />
                </div>

                <div className="activity-content">
                  <strong>Device State Transition</strong>

                  <div className="activity-transition">
                    <span
                      className={`activity-status-chip ${item.old_status || "unknown"}`}
                    >
                      {item.old_status || "UNKNOWN"}
                    </span>
                    <ArrowRight size={11} aria-hidden="true" />
                    <span
                      className={`activity-status-chip ${item.new_status || "unknown"}`}
                    >
                      {item.new_status || "UNKNOWN"}
                    </span>
                  </div>
                </div>

                <time
                  dateTime={item.changed_at || undefined}
                  title={item.changed_at ? new Date(item.changed_at).toLocaleString() : undefined}
                >
                  {dateStr ? `${dateStr} ` : ""}
                  {timeStr}
                </time>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}