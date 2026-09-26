import {
  Smartphone,
  ShieldCheck,
  Clock3,
  MapPin,
  ChevronRight,
} from "lucide-react";

export default function DevicePanel({ devices, loading = false, onSelectDevice, onAddDevice }) {
  const deviceList = devices || [];

  return (
    <section className="device-panel">
      <div className="device-panel-header">
        <div>
          <span className="panel-eyebrow">DEVICE INTELLIGENCE</span>
          <h2>Tracked Devices</h2>
        </div>

        <span className="device-count">
          {loading ? "--" : String(deviceList.length).padStart(2, "0")} TOTAL
        </span>
      </div>

      <div className="device-list">
        {loading ? (
          [1, 2, 3].map((idx) => (
            <div className="device-item skeleton-card" key={idx} style={{ minHeight: "66px" }}>
              <div className="skeleton-bar" style={{ width: "36px", height: "36px", borderRadius: "5px" }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar skeleton-title" style={{ width: "110px" }} />
                <div className="skeleton-bar skeleton-line" style={{ width: "70px", marginTop: "6px" }} />
              </div>
              <div className="skeleton-bar" style={{ width: "50px", height: "18px", borderRadius: "4px" }} />
            </div>
          ))
        ) : deviceList.length === 0 ? (
          <div className="device-item device-empty-state">
            <div className="device-icon">
              <Smartphone size={18} />
            </div>
            <div className="device-info">
              <strong>No devices registered</strong>
              <span>NO ACTIVE DEVICE TELEMETRY</span>
            </div>
            {onAddDevice && (
              <button
                type="button"
                className="device-mini-add-btn"
                onClick={onAddDevice}
                aria-label="Add new device"
              >
                + Add
              </button>
            )}
          </div>
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
            >
              <div className="device-icon">
                <Smartphone size={18} />
              </div>

              <div className="device-info">
                <strong>{device.device_name}</strong>
                <span>{device.device_identifier}</span>
              </div>

              <div className={`device-status ${device.status}`}>
                <span />
                {device.status?.toUpperCase()}
              </div>

              <ChevronRight size={16} className="device-arrow" />
            </div>
          ))
        )}
      </div>

      <div className="device-details">
        <div className="detail-row">
          <div>
            <Clock3 size={14} />
            <span>Devices tracked</span>
          </div>

          <strong>{loading ? "--" : deviceList.length}</strong>
        </div>

        <div className="detail-row">
          <div>
            <MapPin size={14} />
            <span>Tracking system</span>
          </div>

          <strong>{deviceList.length > 0 ? "ONLINE" : "IDLE"}</strong>
        </div>

        <div className="detail-row">
          <div>
            <ShieldCheck size={14} />
            <span>Security state</span>
          </div>

          <strong className={deviceList.some((device) => device.status === "lost") ? "danger-text" : "security-good"}>
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