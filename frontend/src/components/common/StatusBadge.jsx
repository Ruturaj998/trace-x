import { forwardRef } from "react";

/**
 * Reusable StatusBadge component for TRACE-X device and telemetry states.
 *
 * Supported device states:
 * - 'active'   -> Tactical Lime / Nominal Active state
 * - 'lost'     -> Alert Crimson / Security Alert state
 * - 'disabled' -> Muted Slate / Inactive Hardware state
 * - unknown    -> Neutral Gray / Graceful fallback (NEVER falsely marked as active)
 *
 * @param {('active'|'lost'|'disabled'|string)} status - The status identifier
 * @param {string} [label] - Optional label override (defaults to uppercase status)
 * @param {('sm'|'md')} [size='md'] - Visual badge size
 * @param {string} [className=''] - Additional CSS classes
 */
export const StatusBadge = forwardRef(function StatusBadge(
  {
    status,
    label,
    size = "md",
    className = "",
    ...props
  },
  ref
) {
  const rawStatus = typeof status === "string" ? status.trim().toLowerCase() : "";

  let normalizedStatus = "unknown";
  let defaultLabel = "UNKNOWN";

  if (rawStatus === "active" || rawStatus === "online") {
    normalizedStatus = "active";
    defaultLabel = rawStatus.toUpperCase();
  } else if (rawStatus === "lost" || rawStatus === "offline") {
    normalizedStatus = "lost";
    defaultLabel = rawStatus.toUpperCase();
  } else if (rawStatus === "disabled" || rawStatus === "never_connected") {
    normalizedStatus = "disabled";
    defaultLabel = rawStatus === "never_connected" ? "NEVER CONNECTED" : "DISABLED";
  } else if (rawStatus) {
    normalizedStatus = "unknown";
    defaultLabel = rawStatus.toUpperCase();
  }

  const displayLabel = label || defaultLabel;
  const sizeClass = size === "sm" ? "status-badge--sm" : "";

  const combinedClassName = [
    "status-badge",
    `status-badge--${normalizedStatus}`,
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      ref={ref}
      role="status"
      className={combinedClassName}
      aria-label={`Status: ${displayLabel}`}
      {...props}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      <span className="status-badge__text">{displayLabel}</span>
    </span>
  );
});

export default StatusBadge;
