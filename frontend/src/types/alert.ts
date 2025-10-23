export type AlertType = "success" | "warning" | "error" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  autoHide?: boolean;
  duration?: number;
}
