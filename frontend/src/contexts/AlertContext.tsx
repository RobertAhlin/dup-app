import { useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import AlertBanner from "../components/AlertBanner";
import type { AlertType, Alert } from "../types/alert";
import { AlertContext } from "./alertCore";
// import type { AlertContextType } from "./alertCore";

// This file now only exports a component to satisfy react-refresh/only-export-components
// The context and hook live in separate files (alertCore.ts, useAlert.ts)

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const showAlert = useCallback(
    (
      type: AlertType,
      message: string,
      autoHide?: boolean,
      duration?: number
    ) => {
      // Defaults by type: success auto-hides after 2s, error after 5s
      const defaultAutoHide =
        autoHide ?? (type === "success" || type === "error");
      const defaultDuration =
        duration ??
        (type === "success" ? 2000 : type === "error" ? 5000 : undefined);
      const id = Math.random().toString(36).substr(2, 9);
      const newAlert: Alert = {
        id,
        type,
        message,
        autoHide: defaultAutoHide,
        duration: defaultDuration,
      };

      setAlerts((prev) => {
        // Remove any existing alerts of the same type to avoid duplicates
        const filtered = prev.filter((alert) => alert.type !== type);
        return [...filtered, newAlert];
      });
    },
    []
  );

  const hideAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const value = useMemo(() => ({
    showAlert,
    hideAlert,
  }), [showAlert, hideAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      {/* Render alerts */}
      {alerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          type={alert.type}
          message={alert.message}
          onClose={() => hideAlert(alert.id)}
          autoHide={alert.autoHide}
          duration={alert.duration}
        />
      ))}
    </AlertContext.Provider>
  );
}
