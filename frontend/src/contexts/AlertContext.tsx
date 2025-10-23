import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import AlertBanner from "../components/AlertBanner";
import type { AlertType, Alert } from "../types/alert";

interface AlertContextType {
  showAlert: (
    type: AlertType,
    message: string,
    autoHide?: boolean,
    duration?: number
  ) => void;
  hideAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

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
      const id = Math.random().toString(36).substr(2, 9);
      const newAlert: Alert = {
        id,
        type,
        message,
        autoHide: autoHide ?? type === "success", // Default to auto-hide for success alerts
        duration: duration ?? (type === "success" ? 2000 : undefined), // Default 2 seconds for success
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

  const value = {
    showAlert,
    hideAlert,
  };

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
