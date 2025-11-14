import { useEffect, useState } from "react";
import "./AlertBanner.css";
import type { AlertType } from "../types/alert";

interface AlertBannerProps {
  type: AlertType;
  message: string | React.ReactNode;
  onClose?: () => void;
  autoHide?: boolean;
  duration?: number;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  width?: string;
}

export default function AlertBanner({
  type,
  message,
  onClose,
  autoHide = false,
  duration = 2000,
  actionButton,
  width = '350px',
}: AlertBannerProps) {
  const [isSlidingOut, setIsSlidingOut] = useState(false);

  useEffect(() => {
    if (autoHide && onClose) {
      const timer = setTimeout(() => {
        setIsSlidingOut(true);
        // Wait for slide-out animation to complete before calling onClose
        setTimeout(() => {
          onClose();
        }, 300); // Match the CSS animation duration
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onClose]);
  const getIcon = (alertType: AlertType) => {
    switch (alertType) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✕";
      case "info":
        return "ℹ";
      default:
        return "";
    }
  };

  return (
    <div
      className={`alert-banner alert-${type} ${
        isSlidingOut ? "slide-out" : ""
      }`}
      style={{ width }}
    >
      <div className="alert-content">
        <span className="alert-icon">{getIcon(type)}</span>
        <span className="alert-message">{message}</span>
        {actionButton && (
          <button
            className="alert-action"
            onClick={actionButton.onClick}
          >
            {actionButton.label}
          </button>
        )}
        {onClose && (
          <button
            className="alert-close"
            onClick={onClose}
            aria-label="Close alert"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
