import Modal from "./Modal";
import Button from "./Button";

/**
 * Reusable ConfirmDialog component built on Modal and Button primitives.
 *
 * @param {boolean} isOpen - Whether confirmation modal is displayed
 * @param {() => void} onClose - Cancellation callback
 * @param {() => void|Promise<void>} onConfirm - Action callback triggered on explicit user confirmation
 * @param {string} [title='Confirm Action'] - Dialog heading
 * @param {string|React.ReactNode} [description] - Clear explanation of the consequence
 * @param {string} [confirmLabel='Confirm'] - Label for confirm action button
 * @param {string} [cancelLabel='Cancel'] - Label for cancel action button
 * @param {boolean} [destructive=false] - Whether this is a destructive/danger action
 * @param {boolean} [pending=false] - Whether confirmation async action is processing
 * @param {('primary'|'danger'|'secondary')} [confirmVariant] - Override button variant
 * @param {React.ReactNode} [confirmIcon] - Optional icon displayed inside confirm button
 * @param {string} [className=''] - Additional CSS classes
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  confirmVariant,
  confirmIcon,
  className = "",
}) {
  const resolvedVariant =
    confirmVariant || (destructive ? "danger" : "primary");

  const handleConfirm = () => {
    if (pending || !onConfirm) return;
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !pending && onClose?.()}
      title={title}
      eyebrow={destructive ? "SECURITY CONFIRMATION" : "CONFIRMATION"}
      disableBackdropDismiss={pending}
      disableEscapeDismiss={pending}
      maxWidth="460px"
      className={`confirm-dialog ${className}`.trim()}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={resolvedVariant}
            onClick={handleConfirm}
            loading={pending}
            icon={confirmIcon}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-dialog-content">
        {typeof description === "string" ? (
          <p className="confirm-dialog-description">{description}</p>
        ) : (
          description
        )}
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
