import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createDevice } from "../services/api";
import { useToast } from "../context/useToast";

export default function AddDeviceModal({ isOpen, onClose, onDeviceCreated }) {
  const [deviceName, setDeviceName] = useState("");
  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handleClose = useCallback(() => {
    if (submitting) return;
    setDeviceName("");
    setDeviceIdentifier("");
    setError("");
    onClose();
  }, [submitting, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = deviceName.trim();
    const trimmedId = deviceIdentifier.trim();

    if (!trimmedName) {
      setError("Device name is required.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Device name must be at least 2 characters.");
      return;
    }

    if (!trimmedId) {
      setError("Device identifier is required.");
      return;
    }

    if (trimmedId.length < 3) {
      setError("Device identifier must be at least 3 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const newDevice = await createDevice({
        device_name: trimmedName,
        device_identifier: trimmedId,
      });

      toast.success(`Device "${trimmedName}" registered successfully.`);
      if (onDeviceCreated) {
        onDeviceCreated(newDevice);
      }
      onClose();
    } catch (err) {
      console.error("Device registration error:", err);
      const msg = err.message || "Failed to register device.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-device-title"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="panel-eyebrow">REGISTRATION</span>
            <h2 id="add-device-title">Register New Device</h2>
          </div>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="device-name-input" className="form-label">
                Device Name
              </label>
              <input
                id="device-name-input"
                className="form-input"
                type="text"
                placeholder="e.g. Field Laptop X1, Fleet Drone Alpha"
                value={deviceName}
                onChange={(e) => {
                  setDeviceName(e.target.value);
                  if (error) setError("");
                }}
                disabled={submitting}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="device-id-input" className="form-label">
                Device Identifier
              </label>
              <input
                id="device-id-input"
                className="form-input"
                type="text"
                placeholder="e.g. TRACEX-LPT-091, DEV-SN-9941"
                value={deviceIdentifier}
                onChange={(e) => {
                  setDeviceIdentifier(e.target.value);
                  if (error) setError("");
                }}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Register Device
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
