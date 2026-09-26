import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ShieldAlert,
} from "lucide-react";

const iconMap = {
  lost: ShieldAlert,
  active: CheckCircle2,
  location: MapPin,
  warning: AlertTriangle,
};

export default function ActivityFeed({ activity, loading = false }) {
  const activities = activity || [];

  return (
    <section className="activity-panel">
      <div className="activity-header">
        <div>
          <span className="panel-eyebrow">SECURITY LOG</span>
          <h2>Recent Activity</h2>
        </div>

        <span className="activity-live">
          <span />
          LIVE
        </span>
      </div>

      <div className="activity-list">
        {loading ? (
          [1, 2, 3].map((idx) => (
            <div className="activity-item skeleton-card" key={idx} style={{ minHeight: "64px" }}>
              <div className="skeleton-bar" style={{ width: "34px", height: "34px", borderRadius: "5px" }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar skeleton-title" style={{ width: "140px" }} />
                <div className="skeleton-bar skeleton-line" style={{ width: "90px", marginTop: "6px" }} />
              </div>
              <div className="skeleton-bar" style={{ width: "45px", height: "14px" }} />
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="activity-item activity-empty-state">
            <div className="activity-icon" style={{ background: "rgba(255, 255, 255, 0.04)", color: "var(--text-muted)" }}>
              <ShieldAlert size={15} />
            </div>
            <div className="activity-content">
              <strong>No security transitions recorded</strong>
              <span>Status modifications and device security alerts stream here in real time</span>
            </div>
          </div>
        ) : (
          activities.map((item, index) => {
            const type =
              item.new_status === "lost"
                ? "danger"
                : item.new_status === "active"
                  ? "success"
                  : "warning";

            const Icon =
              item.new_status === "lost"
                ? iconMap.lost
                : item.new_status === "active"
                  ? iconMap.active
                  : iconMap.warning;

            return (
              <div className="activity-item" key={item.id || index}>
                <div className={`activity-icon ${type}`}>
                  <Icon size={15} />
                </div>

                <div className="activity-content">
                  <strong>
                    Device status changed
                  </strong>

                  <span>
                    {item.old_status} → {item.new_status}
                  </span>
                </div>

                <time>
                  {item.changed_at
                    ? new Date(item.changed_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--"}
                </time>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}