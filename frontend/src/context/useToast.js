import { useContext } from "react";
import { ToastContext } from "./toastContext";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  // Ensure consumer always receives the unified toast API
  const api =
    context.toast &&
    typeof context.toast.success === "function" &&
    typeof context.success !== "function"
      ? context.toast
      : context;

  return api;
}

export default useToast;
