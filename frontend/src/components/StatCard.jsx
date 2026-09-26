import { Activity, Smartphone, ShieldAlert } from "lucide-react";

const icons = {
  total: Smartphone,
  active: Activity,
  lost: ShieldAlert,
};

export default function StatCard({ type, label, value, meta, loading = false }) {
  const Icon = icons[type];

  return (
    <div className={`stat-card ${loading ? "stat-card-loading" : ""}`}>
      <div className="stat-card-top">
        <span>{label}</span>

        <div className={`stat-icon ${type}`}>
          <Icon size={17} strokeWidth={1.7} />
        </div>
      </div>

      <div className="stat-value">
        {loading ? <span className="stat-skeleton-pulse" /> : value}
      </div>

      <div className="stat-meta">{meta}</div>
    </div>
  );
}