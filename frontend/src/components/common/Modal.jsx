import { useEffect, useRef, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Reusable, accessible Modal dialog component for TRACE-X.
 *
 * Implements WCAG 2.1 Dialog (Modal) pattern:
 * - Proper ARIA semantics (role="dialog", aria-modal="true", aria-labelledby)
 * - Safe focus trapping inside the dialog while open
 * - Focus restoration to the trigger element on close
 * - Safe Escape key and backdrop dismissal
 * - Background scroll lock with clean restoration
 * - Optional formProps wrapper for native form submission
 *
 * @param {boolean} isOpen - Whether the dialog is displayed
 * @param {() => void} onClose - Callback invoked when close is requested
 * @param {React.ReactNode} [title] - Header title text or element
 * @param {React.ReactNode} [eyebrow] - Small uppercase technical category tag
 * @param {React.ReactNode} [footer] - Action buttons placed in modal footer
 * @param {React.ReactNode} children - Dialog body content
 * @param {Object} [formProps] - Optional props to render body/footer inside a <form>
 * @param {boolean} [disableBackdropDismiss=false] - Prevent closing on backdrop click
 * @param {boolean} [disableEscapeDismiss=false] - Prevent closing on Escape key
 * @param {boolean} [showCloseButton=true] - Whether to render top-right close icon
 * @param {boolean} [hasBodyWrapper=true] - Wrap children in standard .modal-body
 * @param {string} [maxWidth] - Custom maximum width (e.g., '540px')
 * @param {string} [className=''] - Additional class names for modal container
 * @param {string} [overlayClassName=''] - Additional class names for overlay backdrop
 */
export function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  footer,
  children,
  formProps,
  disableBackdropDismiss = false,
  disableEscapeDismiss = false,
  showCloseButton = true,
  hasBodyWrapper = true,
  maxWidth,
  className = "",
  overlayClassName = "",
}) {
  const containerRef = useRef(null);
  const openerRef = useRef(null);
  const uniqueId = useId();
  const titleId = `modal-title-${uniqueId}`;

  // Close handler with backdrop validation
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget && !disableBackdropDismiss && onClose) {
        onClose();
      }
    },
    [disableBackdropDismiss, onClose]
  );

  // Focus management and keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for focus restoration
    openerRef.current = document.activeElement;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable element inside the modal on next frame
    const focusTimer = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ");

      const focusableElements = containerRef.current.querySelectorAll(focusableSelectors);

      // If an element already has autoFocus, honor it
      if (!containerRef.current.contains(document.activeElement)) {
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          containerRef.current.focus();
        }
      }
    });

    // Keyboard navigation (Tab loop & Escape dismissal)
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (!disableEscapeDismiss && onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
        return;
      }

      if (e.key === "Tab" && containerRef.current) {
        const focusableSelectors = [
          'button:not([disabled])',
          '[href]',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(", ");

        const focusableElements = Array.from(
          containerRef.current.querySelectorAll(focusableSelectors)
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            document.activeElement === containerRef.current
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // Restore focus to opener element
      if (openerRef.current && typeof openerRef.current.focus === "function") {
        openerRef.current.focus();
      }
    };
  }, [isOpen, disableEscapeDismiss, onClose]);

  if (!isOpen) return null;

  const containerStyle = maxWidth ? { maxWidth } : undefined;

  const bodyContent = hasBodyWrapper ? (
    <div className="modal-body">{children}</div>
  ) : (
    children
  );

  const innerContent = formProps ? (
    <form {...formProps} className="modal-form-root">
      {bodyContent}
      {footer && <div className="modal-footer">{footer}</div>}
    </form>
  ) : (
    <>
      {bodyContent}
      {footer && <div className="modal-footer">{footer}</div>}
    </>
  );

  const modalNode = (
    <div
      className={`modal-overlay ${overlayClassName}`.trim()}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`modal-container ${className}`.trim()}
        style={containerStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || eyebrow || showCloseButton) && (
          <div className="modal-header">
            <div>
              {eyebrow && <span className="panel-eyebrow">{eyebrow}</span>}
              {title && <h2 id={titleId}>{title}</h2>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                disabled={disableBackdropDismiss || disableEscapeDismiss}
                aria-label="Close dialog"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {innerContent}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalNode, document.body)
    : modalNode;
}

export default Modal;
