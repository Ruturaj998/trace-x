import { forwardRef } from "react";

/**
 * Reusable EmptyState component for command-center views and asset lists.
 *
 * @param {React.ReactNode} [icon] - Primary visual icon (e.g., Lucide icon)
 * @param {string} [title] - Concise heading explaining the empty or idle state
 * @param {string|React.ReactNode} [description] - Clear guidance or technical explanation
 * @param {React.ReactNode} [action] - Call-to-action button or interactive element
 * @param {boolean} [isError=false] - When true, applies alert styling to the icon container
 * @param {React.ReactNode} [children] - Optional custom content or nested actions
 * @param {string} [className=''] - Additional CSS classes
 */
export const EmptyState = forwardRef(function EmptyState(
  {
    icon,
    title,
    description,
    action,
    isError = false,
    children,
    className = "",
    ...props
  },
  ref
) {
  const combinedClassName = ["empty-state-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={combinedClassName} role="region" {...props}>
      {icon && (
        <div
          className={`empty-state-icon ${isError ? "error" : ""}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      {title && <h2 className="empty-state-title">{title}</h2>}
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-actions">{action}</div>}
      {children}
    </div>
  );
});

export default EmptyState;
