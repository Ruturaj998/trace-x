import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { createDevice } from "../services/api";
import { useToast } from "../context/useToast";
import { Modal } from "./common/Modal";
import { Button } from "./common/Button";

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
      handleClose();
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="REGISTRATION"
      title="Register New Device"
      disableBackdropDismiss={submitting}
      disableEscapeDismiss={submitting}
      formProps={{ onSubmit: handleSubmit }}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            loadingText="Registering..."
            icon={<Plus size={14} />}
          >
            Register Device
          </Button>
        </>
      }
    >
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
    </Modal>
  );
}
