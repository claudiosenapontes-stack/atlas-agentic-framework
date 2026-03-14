import { useEffect, useCallback } from "react";
import { useRealtimeStore, Campaign, Task, Execution, Alert } from "../lib/realtime/store";
import { subscriptionManager } from "../lib/realtime/subscription-manager";

// Generic realtime hook
export function useRealtime<T>(
  entity: string,
  table: string,
  selector: (state: any) => T[],
  options?: { filter?: string; enabled?: boolean }
) {
  const data = useRealtimeStore(selector);
  const enabled = options?.enabled !== false;
  
  useEffect(() => {
    if (!enabled) return;
    
    const unsubscribe = subscriptionManager.subscribe(entity, {
      table,
      events: ["INSERT", "UPDATE", "DELETE"],
      filter: options?.filter,
    });
    
    return () => {
      unsubscribe();
    };
  }, [entity, table, options?.filter, enabled]);
  
  return data;
}

// Campaigns realtime hook
export function useCampaignsRealtime(options?: { filter?: string; enabled?: boolean }) {
  return useRealtime<Campaign>(
    "campaigns",
    "campaigns",
    (state) => state.campaigns,
    options
  );
}

// Tasks realtime hook
export function useTasksRealtime(options?: { filter?: string; enabled?: boolean }) {
  return useRealtime<Task>(
    "tasks",
    "tasks",
    (state) => state.tasks,
    options
  );
}

// Executions realtime hook
export function useExecutionsRealtime(options?: { filter?: string; enabled?: boolean }) {
  return useRealtime<Execution>(
    "executions",
    "executions",
    (state) => state.executions,
    options
  );
}

// Alerts realtime hook
export function useAlertsRealtime(options?: { filter?: string; enabled?: boolean }) {
  return useRealtime<Alert>(
    "alerts",
    "alerts",
    (state) => state.alerts,
    options
  );
}

// Connection status hook
export function useConnectionStatus() {
  const status = useRealtimeStore((state) => state.connectionStatus);
  const fallbackActive = useRealtimeStore((state) => state.fallbackActive);
  const lastUpdate = useRealtimeStore((state) => state.lastUpdate);
  
  return {
    status,
    fallbackActive,
    lastUpdate,
    isConnected: status === "connected",
    isDisconnected: status === "disconnected",
    isConnecting: status === "connecting",
  };
}

// Combined realtime hook for dashboard
export function useDashboardRealtime() {
  const campaigns = useCampaignsRealtime();
  const tasks = useTasksRealtime();
  const executions = useExecutionsRealtime();
  const alerts = useAlertsRealtime();
  const connection = useConnectionStatus();
  
  // Get unacknowledged alerts count
  const unacknowledgedAlerts = useRealtimeStore(
    (state) => state.alerts.filter((a) => !a.acknowledged)
  );
  
  // Get active executions count
  const activeExecutions = useRealtimeStore(
    (state) => state.executions.filter((e) => e.status === "running").length
  );
  
  // Get pending tasks count
  const pendingTasks = useRealtimeStore(
    (state) => state.tasks.filter((t) => t.status === "pending").length
  );
  
  return {
    campaigns,
    tasks,
    executions,
    alerts,
    connection,
    stats: {
      unacknowledgedAlerts: unacknowledgedAlerts.length,
      activeExecutions,
      pendingTasks,
      totalCampaigns: campaigns.length,
    },
  };
}

// Hook for single entity updates
export function useCampaignRealtime(id: string) {
  const campaign = useRealtimeStore(
    useCallback((state) => state.campaigns.find((c) => c.id === id), [id])
  );
  
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = subscriptionManager.subscribe("campaigns", {
      table: "campaigns",
      events: ["UPDATE"],
      filter: `id=eq.${id}`,
    });
    
    return () => unsubscribe();
  }, [id]);
  
  return campaign;
}

export function useTaskRealtime(id: string) {
  const task = useRealtimeStore(
    useCallback((state) => state.tasks.find((t) => t.id === id), [id])
  );
  
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = subscriptionManager.subscribe("tasks", {
      table: "tasks",
      events: ["UPDATE"],
      filter: `id=eq.${id}`,
    });
    
    return () => unsubscribe();
  }, [id]);
  
  return task;
}

export function useExecutionRealtime(id: string) {
  const execution = useRealtimeStore(
    useCallback((state) => state.executions.find((e) => e.id === id), [id])
  );
  
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = subscriptionManager.subscribe("executions", {
      table: "executions",
      events: ["UPDATE"],
      filter: `id=eq.${id}`,
    });
    
    return () => unsubscribe();
  }, [id]);
  
  return execution;
}

// Manual refresh hook
export function useRefresh() {
  const refresh = useCallback(async (entity: string) => {
    // Trigger a manual poll
    const store = useRealtimeStore.getState();
    
    switch (entity) {
      case "campaigns":
        store.touchUpdate("campaigns");
        break;
      case "tasks":
        store.touchUpdate("tasks");
        break;
      case "executions":
        store.touchUpdate("executions");
        break;
      case "alerts":
        store.touchUpdate("alerts");
        break;
    }
  }, []);
  
  return refresh;
}
