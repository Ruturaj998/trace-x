import { useState } from "react";
import { changePassword } from "../services/api";
import { useToast } from "../context/useToast";
import { Modal } from "./common/Modal";
import { Button } from "./common/Button";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      onClose();
    } catch (err) {
      console.error("Change password error:", err);
      const msg = err.message || "Failed to change password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="SECURITY CREDENTIALS"
      title="Change Password"
      disableBackdropDismiss={loading}
      disableEscapeDismiss={loading}
      formProps={{ onSubmit: handleSubmit }}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            loadingText="Saving..."
          >
            Save Password
          </Button>
        </>
      }
    >
      {error && <div className="modal-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="currentPassword" className="form-label">
          Current Password
        </label>
        <input
          id="currentPassword"
          className="form-input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="newPassword" className="form-label">
          New Password
        </label>
        <input
          id="newPassword"
          className="form-input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password (min. 8 characters)"
          minLength="8"
          disabled={loading}
          required
        />
      </div>
    </Modal>
  );
}
