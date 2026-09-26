import { useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { ToastContext } from "./toastContext";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    if (!message) return;
    const validTypes = ["success", "error", "warning", "info"];
    const toastType = validTypes.includes(type) ? type : "info";
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    const toastItem = { id, message: String(message), type: toastType };

    setToasts((prev) => [...prev.slice(-4), toastItem]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastApi = useMemo(() => {
    const api = {
      show: showToast,
      showToast,
      success: (msg, dur) => showToast(msg, "success", dur),
      error: (msg, dur) => showToast(msg, "error", dur),
      warning: (msg, dur) => showToast(msg, "warning", dur),
      info: (msg, dur) => showToast(msg, "info", dur),
    };
    api.toast = api;
    return api;
  }, [showToast]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} className="toast-icon" />;
      case "error":
        return <AlertCircle size={16} className="toast-icon" />;
      case "warning":
        return <AlertTriangle size={16} className="toast-icon" />;
      default:
        return <Info size={16} className="toast-icon" />;
    }
  };

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`toast-item ${item.type}`}
            role="status"
            aria-live="polite"
          >
            {getIcon(item.type)}
            <div className="toast-content">
              <span className="toast-message">{item.message}</span>
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(item.id)}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
