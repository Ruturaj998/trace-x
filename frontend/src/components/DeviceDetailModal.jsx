import { useState, useEffect, useCallback } from "react";
import {
  X,
  MapPin,
  Clock3,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Trash2,
  Key,
  Copy,
  Check,
} from "lucide-react";
import {
  getDeviceLatestLocation,
  getDeviceStatusHistory,
  getDeviceLocations,
  updateDeviceStatus,
  deleteDevice,
  generateDeviceToken,
  revokeDeviceToken,
} from "../services/api";
import { useToast } from "../context/useToast";
import { isValidLocation } from "../utils/coordinates";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { Button } from "./common/Button";
import { StatusBadge } from "./common/StatusBadge";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [generatedToken, setGeneratedToken] = useState(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [managingToken, setManagingToken] = useState(false);

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

  const handleClose = useCallback(() => {
    setGeneratedToken(null);
    setTokenCopied(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !deleting && !updatingStatus && !showDeleteConfirm) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleting, updatingStatus, showDeleteConfirm, handleClose]);

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

  const handleGenerateToken = async () => {
    try {
      setManagingToken(true);
      const res = await generateDeviceToken(device.id);
      setGeneratedToken(res.device_token);
      setTokenCopied(false);
      toast.success("Device credential generated. Copy it now.");
      if (onDeviceUpdated) {
        onDeviceUpdated({ ...device, has_token: true, token_prefix: res.token_prefix });
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate device credential.");
    } finally {
      setManagingToken(false);
    }
  };

  const handleRevokeToken = async () => {
    try {
      setManagingToken(true);
      await revokeDeviceToken(device.id);
      setGeneratedToken(null);
      toast.success("Device credential revoked.");
      if (onDeviceUpdated) {
        onDeviceUpdated({ ...device, has_token: false, token_prefix: null });
      }
    } catch (err) {
      toast.error(err.message || "Failed to revoke device credential.");
    } finally {
      setManagingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      toast.success("Device token copied to clipboard!");
      setTimeout(() => setTokenCopied(false), 3000);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteDevice(device.id);
      toast.success(`Device "${device.device_name}" deleted successfully.`);
      setShowDeleteConfirm(false);
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
      onClick={() => !deleting && !updatingStatus && handleClose()}
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
            onClick={handleClose}
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
              <div style={{ marginTop: "4px" }}>
                <StatusBadge status={device.status} />
              </div>
            </div>

            <div className="device-detail-metric">
              <span>CONNECTIVITY</span>
              <div style={{ marginTop: "4px" }}>
                <StatusBadge status={device.connectivity_status || "never_connected"} />
              </div>
            </div>

            <div className="device-detail-metric">
              <span>LAST SEEN</span>
              <strong style={{ fontSize: "11px" }}>
                {device.last_seen
                  ? new Date(device.last_seen).toLocaleString()
                  : "Never"}
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

          {/* EDGE TELEMETRY CREDENTIALS */}
          <div className="device-detail-history">
            <h3>EDGE TELEMETRY CREDENTIALS</h3>
            <div
              style={{
                marginTop: "8px",
                padding: "12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "12px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>CREDENTIAL STATUS</span>
                  <div style={{ marginTop: "2px", fontWeight: "600" }}>
                    {device.has_token ? (
                      <span style={{ color: "var(--color-accent-lime, #d8ff3e)" }}>
                        Active (Key prefix: {device.token_prefix}...)
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>No credential configured</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateToken}
                    disabled={managingToken}
                    icon={<Key size={13} />}
                  >
                    {device.has_token ? "Rotate Key" : "Generate Key"}
                  </Button>

                  {device.has_token && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleRevokeToken}
                      disabled={managingToken}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>

              {generatedToken && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    background: "rgba(216, 255, 62, 0.05)",
                    border: "1px solid rgba(216, 255, 62, 0.3)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--color-accent-lime, #d8ff3e)",
                        fontWeight: "600",
                      }}
                    >
                      NEW DEVICE TOKEN (STORE SECURELY — NOT SHOWN AGAIN):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      style={{
                        background: "none",
                        border: "none",
                        color: tokenCopied ? "var(--color-accent-lime, #d8ff3e)" : "var(--text-main)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                      }}
                    >
                      {tokenCopied ? <Check size={12} /> : <Copy size={12} />}
                      {tokenCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code
                    style={{
                      display: "block",
                      wordBreak: "break-all",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      color: "#fff",
                      background: "rgba(0,0,0,0.4)",
                      padding: "6px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {generatedToken}
                  </code>
                </div>
              )}
            </div>
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
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting || updatingStatus}
            icon={<Trash2 size={14} />}
          >
            Delete Device
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={deleting || updatingStatus}
          >
            Close
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Device"
        description={`Permanently delete "${device.device_name}" and its associated location records? This action cannot be undone.`}
        confirmLabel="Delete Device"
        cancelLabel="Cancel"
        destructive
        pending={deleting}
      />
    </div>
  );
}
