'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (type: Alert['type'], message: string) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback((type: Alert['type'], message: string) => {
    const id = Math.random().toString(36).substring(7);
    setAlerts((prev) => [...prev, { id, type, message, timestamp: new Date() }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 5000);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
      <AlertContainer alerts={alerts} onRemove={removeAlert} />
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
}

function AlertContainer({ alerts, onRemove }: { alerts: Alert[]; onRemove: (id: string) => void }) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onRemove={onRemove} />
      ))}
    </div>
  );
}

function AlertItem({ alert, onRemove }: { alert: Alert; onRemove: (id: string) => void }) {
  const icons = {
    info: <Info className="w-5 h-5 text-blue-500" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
  };

  const bgColors = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`${bgColors[alert.type]} border rounded-lg p-3 shadow-lg flex items-start gap-3 animate-in slide-in-from-right`}>
      {icons[alert.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{alert.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {alert.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={() => onRemove(alert.id)}
        className="text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
