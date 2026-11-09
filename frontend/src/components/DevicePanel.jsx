import { Link } from "react-router-dom";
import {
  Smartphone,
  ShieldCheck,
  Clock3,
  MapPin,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { StatusBadge, EmptyState, Button } from "./common";

/**
 * Command-center DevicePanel component for registered hardware assets.
 *
 * @param {Array} devices - List of user device objects from /dashboard/devices
 * @param {boolean} [loading=false] - Shimmer loading state
 * @param {Function} [onSelectDevice] - Callback when clicking a device
 * @param {Function} [onAddDevice] - Callback to open the Add Device modal
 */
export default function DevicePanel({
  devices,
  loading = false,
  onSelectDevice,
  onAddDevice,
}) {
  const deviceList = devices || [];

  return (
    <section className="device-panel" aria-label="Tracked Devices">
      <div className="device-panel-header">
        <div className="panel-header-left">
          <span className="panel-eyebrow">DEVICE INTELLIGENCE</span>
          <h2>Tracked Devices</h2>
        </div>

        <div className="panel-header-actions">
          <span className="device-count">
            {loading ? "--" : String(deviceList.length).padStart(2, "0")} TOTAL
          </span>

          <Link
            to="/devices"
            className="panel-action-link"
            title="Open comprehensive device inventory and management"
          >
            <span>Manage</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="device-list" role="list">
        {loading ? (
          [1, 2, 3].map((idx) => (
            <div
              className="device-item skeleton-card"
              key={idx}
              style={{ minHeight: "64px" }}
            >
              <div
                className="skeleton-bar"
                style={{ width: "36px", height: "36px", borderRadius: "6px" }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton-bar skeleton-title"
                  style={{ width: "120px" }}
                />
                <div
                  className="skeleton-bar skeleton-line"
                  style={{ width: "80px", marginTop: "6px" }}
                />
              </div>
              <div
                className="skeleton-bar"
                style={{ width: "54px", height: "20px", borderRadius: "4px" }}
              />
            </div>
          ))
        ) : deviceList.length === 0 ? (
          <EmptyState
            icon={<Smartphone size={22} />}
            title="No Devices Registered"
            description="Register hardware assets to activate real-time telemetry and security monitoring."
            action={
              onAddDevice && (
                <Button variant="primary" size="sm" onClick={onAddDevice}>
                  + Register Device
                </Button>
              )
            }
            className="device-panel-empty"
          />
        ) : (
          deviceList.map((device, index) => (
            <div
              className={`device-item ${index === 0 ? "selected" : ""} ${onSelectDevice ? "device-item-clickable" : ""}`}
              key={device.id}
              role={onSelectDevice ? "button" : undefined}
              tabIndex={onSelectDevice ? 0 : undefined}
              onClick={() => onSelectDevice && onSelectDevice(device)}
              onKeyDown={(e) => {
                if (onSelectDevice && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelectDevice(device);
                }
              }}
              title={onSelectDevice ? `Inspect ${device.device_name}` : undefined}
              aria-label={`Inspect ${device.device_name}, status ${device.status}`}
            >
              <div className="device-icon" aria-hidden="true">
                <Smartphone size={17} strokeWidth={1.8} />
              </div>

              <div className="device-info">
                <strong>{device.device_name}</strong>
                <span>{device.device_identifier}</span>
              </div>

              <StatusBadge status={device.status} size="sm" />

              <ChevronRight
                size={16}
                className="device-arrow"
                aria-hidden="true"
              />
            </div>
          ))
        )}
      </div>

      <div className="device-details">
        <div className="detail-row">
          <div>
            <Clock3 size={13} aria-hidden="true" />
            <span>Devices tracked</span>
          </div>
          <strong>{loading ? "--" : deviceList.length}</strong>
        </div>

        <div className="detail-row">
          <div>
            <MapPin size={13} aria-hidden="true" />
            <span>Tracking system</span>
          </div>
          <strong
            style={{
              color:
                deviceList.length > 0
                  ? "var(--color-accent-lime, #d8ff3e)"
                  : "var(--color-text-muted, #818e9d)",
            }}
          >
            {deviceList.length > 0 ? "ONLINE" : "IDLE"}
          </strong>
        </div>

        <div className="detail-row">
          <div>
            <ShieldCheck size={13} aria-hidden="true" />
            <span>Security state</span>
          </div>
          <strong
            className={
              deviceList.some((device) => device.status === "lost")
                ? "danger-text"
                : "security-good"
            }
          >
            {deviceList.some((device) => device.status === "lost")
              ? "Requires attention"
              : deviceList.length > 0
                ? "Protected"
                : "Standby"}
          </strong>
        </div>
      </div>
    </section>
  );
}