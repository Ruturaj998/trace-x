import { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Clock3,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  getDeviceLatestLocation,
  getDeviceStatusHistory,
  getDeviceLocations,
  updateDeviceStatus,
  deleteDevice,
} from "../services/api";
import { useToast } from "../context/useToast";
import { isValidLocation } from "../utils/coordinates";

export default function DeviceDetailModal({
  device,
  isOpen,
  onClose,
  onDeviceUpdated,
  onDeviceDeleted,
}) {
  const [latestLocation, setLatestLocation] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [locationCount, setLocationCount] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen || !device) return;

    let isMounted = true;

    const fetchDetails = async () => {
      try {
        const [locResult, historyResult, allLocs] = await Promise.allSettled([
          getDeviceLatestLocation(device.id),
          getDeviceStatusHistory(device.id),
          getDeviceLocations(device.id),
        ]);

        if (!isMounted) return;

        if (locResult.status === "fulfilled" && isValidLocation(locResult.value)) {
          setLatestLocation(locResult.value);
        } else {
          setLatestLocation(null);
        }

        if (historyResult.status === "fulfilled") {
          setStatusHistory(historyResult.value || []);
        } else {
          setStatusHistory([]);
        }

        if (allLocs.status === "fulfilled") {
          setLocationCount(allLocs.value ? allLocs.value.length : 0);
        } else {
          setLocationCount(0);
        }
      } catch (err) {
        console.error("Device detail loading error:", err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, device]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !deleting && !updatingStatus) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleting, updatingStatus, onClose]);

  if (!isOpen || !device) return null;

  const handleStatusChange = async (newStatus) => {
    if (device.status === newStatus || updatingStatus) return;

    try {
      setUpdatingStatus(true);
      await updateDeviceStatus(device.id, newStatus);
      toast.success(
        `"${device.device_name}" status updated to ${newStatus.toUpperCase()}.`
      );

      const updatedDevice = { ...device, status: newStatus };
      if (onDeviceUpdated) {
        onDeviceUpdated(updatedDevice);
      }

      // Refresh status history
      const newHistory = await getDeviceStatusHistory(device.id).catch(() => []);
      setStatusHistory(newHistory);
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.message || "Failed to update device status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Permanently delete "${device.device_name}" and its associated location records? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteDevice(device.id);
      toast.success(`Device "${device.device_name}" deleted successfully.`);
      if (onDeviceDeleted) {
        onDeviceDeleted(device.id);
      }
      onClose();
    } catch (err) {
      console.error("Device deletion error:", err);
      toast.error(err.message || "Failed to delete device.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => !deleting && !updatingStatus && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-detail-title"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="panel-eyebrow">DEVICE TELEMETRY #{device.id}</span>
            <h2 id="device-detail-title">{device.device_name}</h2>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={deleting || updatingStatus}
            aria-label="Close device details"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* TOP OVERVIEW GRID */}
          <div className="device-detail-grid">
            <div className="device-detail-metric">
              <span>IDENTIFIER</span>
              <strong>{device.device_identifier}</strong>
            </div>

            <div className="device-detail-metric">
              <span>SECURITY STATUS</span>
              <strong
                className={
                  device.status === "active"
                    ? "security-good"
                    : device.status === "lost"
                      ? "danger-text"
                      : "muted-text"
                }
              >
                {device.status?.toUpperCase()}
              </strong>
            </div>

            <div className="device-detail-metric">
              <span>LOCATION RECORDS</span>
              <strong>{loadingDetails ? "..." : `${locationCount} recorded`}</strong>
            </div>

            <div className="device-detail-metric">
              <span>OWNER ID</span>
              <strong>User #{device.user_id}</strong>
            </div>
          </div>

          {/* LATEST POSITION SECTION */}
          <div className="device-detail-history">
            <h3>LATEST TELEMETRY FIX</h3>
            {loadingDetails ? (
              <div className="skeleton-box" style={{ height: "60px" }} />
            ) : isValidLocation(latestLocation) ? (
              <div className="location-data-list" style={{ marginTop: "8px" }}>
                <div className="location-data-row" style={{ minHeight: "36px" }}>
                  <div>
                    <MapPin size={14} />
                    <span>Coordinates</span>
                  </div>
                  <strong>
                    {Number(latestLocation.latitude).toFixed(4)}° N,{" "}
                    {Number(latestLocation.longitude).toFixed(4)}° E
                  </strong>
                </div>

                <div className="location-data-row" style={{ minHeight: "36px" }}>
                  <div>
                    <ShieldCheck size={14} />
                    <span>Accuracy</span>
                  </div>
                  <strong>
                    {latestLocation.accuracy != null
                      ? `${latestLocation.accuracy} meters`
                      : "N/A"}
                  </strong>
                </div>

                <div className="location-data-row" style={{ minHeight: "36px" }}>
                  <div>
                    <Clock3 size={14} />
                    <span>Timestamp</span>
                  </div>
                  <strong>
                    {latestLocation.timestamp &&
                    !isNaN(new Date(latestLocation.timestamp).getTime())
                      ? new Date(latestLocation.timestamp).toLocaleString()
                      : "N/A"}
                  </strong>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--mono)",
                }}
              >
                No GPS location fixes have been transmitted by this device yet.
              </div>
            )}
          </div>

          {/* STATUS CONTROLS */}
          <div className="device-detail-history">
            <h3>SET SECURITY STATUS</h3>
            <div className="device-actions" style={{ marginTop: "8px" }}>
              <button
                type="button"
                className="device-action active-action"
                onClick={() => handleStatusChange("active")}
                disabled={updatingStatus || device.status === "active"}
              >
                <CheckCircle2 size={14} />
                Active
              </button>

              <button
                type="button"
                className="device-action lost-action"
                onClick={() => handleStatusChange("lost")}
                disabled={updatingStatus || device.status === "lost"}
              >
                <AlertTriangle size={14} />
                Lost
              </button>

              <button
                type="button"
                className="device-action disabled-action"
                onClick={() => handleStatusChange("disabled")}
                disabled={updatingStatus || device.status === "disabled"}
              >
                <Ban size={14} />
                Disable
              </button>
            </div>
          </div>

          {/* RECENT STATUS HISTORY TRAIL */}
          {statusHistory.length > 0 && (
            <div className="device-detail-history">
              <h3>STATUS AUDIT LOG ({statusHistory.length})</h3>
              <div
                style={{
                  maxHeight: "140px",
                  overflowY: "auto",
                  marginTop: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {statusHistory.slice(0, 5).map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      padding: "6px 8px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "4px",
                    }}
                  >
                    <span>
                      {h.old_status} → <strong>{h.new_status}</strong>
                    </span>
                    <span style={{ color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                      {h.changed_at ? new Date(h.changed_at).toLocaleDateString() : "--"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting || updatingStatus}
          >
            {deleting ? (
              <>
                <Loader2 size={14} className="spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Device
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={deleting || updatingStatus}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
