import { Activity, Smartphone, ShieldAlert, ShieldOff } from "lucide-react";

const icons = {
  total: Smartphone,
  active: Activity,
  lost: ShieldAlert,
  disabled: ShieldOff,
};

/**
 * Reusable StatCard component for TRACE-X command-center metrics.
 *
 * @param {('total'|'active'|'lost'|'disabled')} type - Visual semantic accent
 * @param {string} label - Top-level telemetry label
 * @param {number|string} value - Verified metric value
 * @param {string} meta - Contextual description or units
 * @param {boolean} [loading=false] - Shimmer loading state
 */
export default function StatCard({
  type = "total",
  label,
  value,
  meta,
  loading = false,
}) {
  const Icon = icons[type] || Activity;

  return (
    <div
      className={`stat-card ${type} ${loading ? "stat-card-loading" : ""}`}
      aria-busy={loading ? "true" : undefined}
    >
      <div className="stat-card-top">
        <span>{label}</span>

        <div className={`stat-icon ${type}`} aria-hidden="true">
          <Icon size={17} strokeWidth={1.7} />
        </div>
      </div>

      <div className="stat-value">
        {loading ? (
          <span className="stat-skeleton-pulse" aria-hidden="true" />
        ) : (
          value
        )}
      </div>

      <div className="stat-meta">{meta}</div>
    </div>
  );
}