import { useEffect, useState } from "react";
import {
  Smartphone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RefreshCw,
  Plus,
  Eye,
  AlertCircle,
} from "lucide-react";

import {
  getDashboardDevices,
  updateDeviceStatus,
} from "../services/api";
import { useToast } from "../context/useToast";
import AddDeviceModal from "../components/AddDeviceModal";
import DeviceDetailModal from "../components/DeviceDetailModal";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const toast = useToast();

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getDashboardDevices();
      setDevices(data);
    } catch (err) {
      console.error("Devices loading failed:", err);
      setError("Unable to communicate with TRACE-X device service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getDashboardDevices()
      .then((data) => {
        if (isMounted) {
          setDevices(data);
          setError("");
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Devices loading failed:", err);
          setError("Unable to communicate with TRACE-X device service.");
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

  const handleStatusChange = async (e, device, newStatus) => {
    e.stopPropagation();
    if (device.status === newStatus || updating === device.id) {
      return;
    }

    try {
      setUpdating(device.id);
      await updateDeviceStatus(device.id, newStatus);

      setDevices((currentDevices) =>
        currentDevices.map((item) =>
          item.id === device.id ? { ...item, status: newStatus } : item
        )
      );

      toast.success(
        `"${device.device_name}" status set to ${newStatus.toUpperCase()}.`
      );
    } catch (err) {
      console.error("Device status update failed:", err);
      toast.error(err.message || "Failed to update device status.");
    } finally {
      setUpdating(null);
    }
  };

  const handleDeviceCreated = (newDevice) => {
    setDevices((prev) => [newDevice, ...prev]);
  };

  const handleDeviceUpdated = (updatedDevice) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))
    );
    setSelectedDevice(updatedDevice);
  };

  const handleDeviceDeleted = (deletedId) => {
    setDevices((prev) => prev.filter((d) => d.id !== deletedId));
    setSelectedDevice(null);
  };

  return (
    <section className="page-content">
      <div className="welcome-block">
        <span className="section-label">DEVICE INTELLIGENCE</span>

        <div className="devices-page-heading">
          <div>
            <h1>Tracked Devices</h1>
            <p>
              View, configure, and monitor all security devices registered to your TRACE-X account.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              title="Register a new device"
            >
              <Plus size={15} />
              Add Device
            </button>

            <button
              className="device-refresh-button"
              onClick={fetchDevices}
              disabled={loading}
              title="Refresh device list"
            >
              <RefreshCw
                size={16}
                className={loading ? "spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="empty-state-card">
          <div className="empty-state-icon error">
            <AlertCircle size={26} />
          </div>
          <h2 className="empty-state-title">Device Telemetry Unavailable</h2>
          <p className="empty-state-desc">{error}</p>
          <button className="empty-state-action" onClick={fetchDevices}>
            <RefreshCw size={14} />
            Retry Connection
          </button>
        </div>
      )}

      {/* SKELETON LOADING STATE */}
      {loading ? (
        <div className="devices-page-grid">
          {[1, 2, 3, 4].map((n) => (
            <div className="skeleton-card skeleton-box" key={n}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div className="skeleton-box" style={{ width: "38px", height: "38px", borderRadius: "8px" }} />
                <div className="skeleton-box" style={{ width: "70px", height: "18px", borderRadius: "4px" }} />
              </div>
              <div className="skeleton-line short" />
              <div className="skeleton-line medium" style={{ height: "18px" }} />
              <div className="skeleton-line long" />
              <div style={{ marginTop: "20px", display: "flex", gap: "8px" }}>
                <div className="skeleton-box" style={{ flex: 1, height: "30px", borderRadius: "5px" }} />
                <div className="skeleton-box" style={{ flex: 1, height: "30px", borderRadius: "5px" }} />
                <div className="skeleton-box" style={{ flex: 1, height: "30px", borderRadius: "5px" }} />
              </div>
            </div>
          ))}
        </div>
      ) : !error && devices.length === 0 ? (
        /* POLISHED EMPTY STATE */
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Smartphone size={28} />
          </div>
          <h2 className="empty-state-title">No Devices Registered</h2>
          <p className="empty-state-desc">
            You currently have no hardware devices or assets monitored in TRACE-X.
            Register your first device to begin real-time tracking and security monitoring.
          </p>
          <button
            className="empty-state-action"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={14} />
            Register First Device
          </button>
        </div>
      ) : !error && (
        <div className="devices-page-grid">
          {devices.map((device) => (
            <div
              className="device-page-card"
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              style={{ cursor: "pointer" }}
              title={`Click to inspect telemetry for ${device.device_name}`}
            >
              <div className="device-page-top">
                <div className="device-page-icon">
                  <Smartphone size={22} />
                </div>

                <div className={`device-page-status ${device.status}`}>
                  <span />
                  {device.status?.toUpperCase()}
                </div>
              </div>

              <div className="device-page-main">
                <span className="panel-eyebrow">
                  DEVICE #{device.id}
                </span>

                <h2>{device.device_name}</h2>
                <p>{device.device_identifier}</p>
              </div>

              <div className="device-page-details">
                <div>
                  <MapPin size={15} />
                  <span>Location tracking</span>
                  <strong className={device.status === "disabled" ? "muted-text" : ""}>
                    {device.status === "disabled" ? "OFF" : "ACTIVE"}
                  </strong>
                </div>

                <div>
                  <ShieldCheck size={15} />
                  <span>Security state</span>
                  <strong
                    className={
                      device.status === "lost"
                        ? "danger-text"
                        : device.status === "disabled"
                          ? "muted-text"
                          : ""
                    }
                  >
                    {device.status === "lost"
                      ? "ATTENTION"
                      : device.status === "disabled"
                        ? "DISABLED"
                        : "SECURE"}
                  </strong>
                </div>
              </div>

              <div className="device-actions">
                <button
                  className="device-action active-action"
                  onClick={(e) => handleStatusChange(e, device, "active")}
                  disabled={updating === device.id || device.status === "active"}
                  title="Mark as active"
                >
                  <CheckCircle2 size={14} />
                  Active
                </button>

                <button
                  className="device-action lost-action"
                  onClick={(e) => handleStatusChange(e, device, "lost")}
                  disabled={updating === device.id || device.status === "lost"}
                  title="Mark as lost / alert"
                >
                  <AlertTriangle size={14} />
                  Lost
                </button>

                <button
                  className="device-action disabled-action"
                  onClick={(e) => handleStatusChange(e, device, "disabled")}
                  disabled={updating === device.id || device.status === "disabled"}
                  title="Disable tracking"
                >
                  <Ban size={14} />
                  Disable
                </button>

                <button
                  className="device-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDevice(device);
                  }}
                  title="Inspect device details"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--text-soft)",
                    borderColor: "var(--border)",
                  }}
                >
                  <Eye size={14} />
                  Details
                </button>
              </div>

              {updating === device.id && (
                <div className="device-updating">
                  UPDATING SECURITY STATUS...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD DEVICE MODAL */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={handleDeviceCreated}
      />

      {/* DEVICE DETAIL MODAL */}
      <DeviceDetailModal
        device={selectedDevice}
        isOpen={Boolean(selectedDevice)}
        onClose={() => setSelectedDevice(null)}
        onDeviceUpdated={handleDeviceUpdated}
        onDeviceDeleted={handleDeviceDeleted}
      />
    </section>
  );
}
