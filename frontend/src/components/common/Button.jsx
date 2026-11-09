import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * Reusable Button component for TRACE-X command-center design system.
 *
 * @param {('primary'|'secondary'|'danger'|'ghost')} [variant='primary']
 * @param {('sm'|'md'|'lg')} [size='md']
 * @param {boolean} [loading=false]
 * @param {string} [loadingText]
 * @param {React.ReactNode} [icon]
 * @param {React.ReactNode} [children]
 * @param {('button'|'submit'|'reset')} [type='button']
 * @param {boolean} [disabled=false]
 * @param {string} [className='']
 */
export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    icon,
    children,
    type = "button",
    disabled = false,
    className = "",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== "md" ? `btn-${size}` : "";
  const combinedClassName = ["ui-button", variantClass, sizeClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      className={combinedClassName}
      {...props}
    >
      {loading ? (
        <>
          <Loader2
            size={size === "sm" ? 12 : 14}
            className="spin"
            aria-hidden="true"
          />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon" aria-hidden="true">{icon}</span>}
          {children && <span>{children}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
