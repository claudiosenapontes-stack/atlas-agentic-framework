"use client";

import { ReactNode, useEffect } from "react";
import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import { useRealtimeStore } from "@/lib/realtime/store";

interface RealtimeProviderProps {
  children: ReactNode;
  options?: {
    campaigns?: boolean;
    tasks?: boolean;
    executions?: boolean;
    alerts?: boolean;
  };
}

export function RealtimeProvider({ 
  children, 
  options = { 
    campaigns: true, 
    tasks: true, 
    executions: true, 
    alerts: true 
  } 
}: RealtimeProviderProps) {
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    
    // Subscribe to enabled channels
    if (options.campaigns) {
      unsubscribers.push(
        subscriptionManager.subscribe("campaigns", {
          table: "campaigns",
          events: ["INSERT", "UPDATE", "DELETE"],
        })
      );
    }
    
    if (options.tasks) {
      unsubscribers.push(
        subscriptionManager.subscribe("tasks", {
          table: "tasks",
          events: ["INSERT", "UPDATE", "DELETE"],
        })
      );
    }
    
    if (options.executions) {
      unsubscribers.push(
        subscriptionManager.subscribe("executions", {
          table: "executions",
          events: ["INSERT", "UPDATE"],
        })
      );
    }
    
    if (options.alerts) {
      unsubscribers.push(
        subscriptionManager.subscribe("alerts", {
          table: "alerts",
          events: ["INSERT"],
        })
      );
    }
    
    // Cleanup on unmount
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [options.campaigns, options.tasks, options.executions, options.alerts]);
  
  return <>{children}</>;
}

// Alert toast notifications component
export function RealtimeAlerts() {
  const alerts = useRealtimeStore((state) => state.alerts);
  const addAlert = useRealtimeStore((state) => state.addAlert);
  const acknowledgeAlert = useRealtimeStore((state) => state.acknowledgeAlert);
  
  useEffect(() => {
    // Listen for new alerts and show toast
    const unacknowledged = alerts.filter((a) => !a.acknowledged);
    
    if (unacknowledged.length > 0) {
      // Could integrate with toast library here
      console.log("[Realtime] New alerts:", unacknowledged);
    }
  }, [alerts]);
  
  return null; // This is a logic-only component
}

// Auto-sync component for initial data load
export function RealtimeSync() {
  useEffect(() => {
    const store = useRealtimeStore.getState();
    
    // Mark initial load
    store.touchUpdate("campaigns");
    store.touchUpdate("tasks");
    store.touchUpdate("executions");
    store.touchUpdate("alerts");
    
    // Set initial connection status
    store.setConnectionStatus("connecting");
  }, []);
  
  return null;
}
