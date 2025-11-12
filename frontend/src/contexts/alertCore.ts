import { createContext } from 'react'

export interface AlertContextType {
  showAlert: (type: 'success' | 'error' | 'info' | 'warning', message: string, autoHide?: boolean, duration?: number) => void
  hideAlert: (id: string) => void
}

export const AlertContext = createContext<AlertContextType | undefined>(undefined)
