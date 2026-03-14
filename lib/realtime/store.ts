import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Entity types
export interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: "active" | "paused" | "archived";
  spend: number;
  leads: number;
  cpl: number;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  assignee?: string;
  priority: "low" | "medium" | "high";
  due_date?: string;
  updated_at?: string;
}

export interface Execution {
  id: string;
  task_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  source: string;
  acknowledged: boolean;
  created_at: string;
}

// Connection status
export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "fallback";

// Store state
interface RealtimeState {
  // Data
  campaigns: Campaign[];
  tasks: Task[];
  executions: Execution[];
  alerts: Alert[];
  
  // Metadata
  lastUpdate: Record<string, string>; // entity -> ISO timestamp
  connectionStatus: ConnectionStatus;
  fallbackActive: boolean;
  
  // Actions
  setCampaigns: (campaigns: Campaign[]) => void;
  updateCampaign: (campaign: Partial<Campaign> & { id: string }) => void;
  addCampaign: (campaign: Campaign) => void;
  removeCampaign: (id: string) => void;
  
  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Partial<Task> & { id: string }) => void;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  
  setExecutions: (executions: Execution[]) => void;
  updateExecution: (execution: Partial<Execution> & { id: string }) => void;
  addExecution: (execution: Execution) => void;
  
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  
  setConnectionStatus: (status: ConnectionStatus) => void;
  setFallbackActive: (active: boolean) => void;
  touchUpdate: (entity: string) => void;
  
  // Getters
  getCampaignById: (id: string) => Campaign | undefined;
  getTaskById: (id: string) => Task | undefined;
  getExecutionById: (id: string) => Execution | undefined;
  getUnacknowledgedAlerts: () => Alert[];
  getLatestUpdate: (entity: string) => string | undefined;
}

export const useRealtimeStore = create<RealtimeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    campaigns: [],
    tasks: [],
    executions: [],
    alerts: [],
    lastUpdate: {},
    connectionStatus: "disconnected",
    fallbackActive: false,
    
    // Campaign actions
    setCampaigns: (campaigns) => {
      set({ campaigns });
      get().touchUpdate("campaigns");
    },
    updateCampaign: (campaign) => {
      set((state) => ({
        campaigns: state.campaigns.map((c) =>
          c.id === campaign.id ? { ...c, ...campaign } : c
        ),
      }));
      get().touchUpdate("campaigns");
    },
    addCampaign: (campaign) => {
      set((state) => ({
        campaigns: [campaign, ...state.campaigns],
      }));
      get().touchUpdate("campaigns");
    },
    removeCampaign: (id) => {
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
      }));
      get().touchUpdate("campaigns");
    },
    
    // Task actions
    setTasks: (tasks) => {
      set({ tasks });
      get().touchUpdate("tasks");
    },
    updateTask: (task) => {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, ...task } : t
        ),
      }));
      get().touchUpdate("tasks");
    },
    addTask: (task) => {
      set((state) => ({
        tasks: [task, ...state.tasks],
      }));
      get().touchUpdate("tasks");
    },
    removeTask: (id) => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
      get().touchUpdate("tasks");
    },
    
    // Execution actions
    setExecutions: (executions) => {
      set({ executions });
      get().touchUpdate("executions");
    },
    updateExecution: (execution) => {
      set((state) => ({
        executions: state.executions.map((e) =>
          e.id === execution.id ? { ...e, ...execution } : e
        ),
      }));
      get().touchUpdate("executions");
    },
    addExecution: (execution) => {
      set((state) => ({
        executions: [execution, ...state.executions],
      }));
      get().touchUpdate("executions");
    },
    
    // Alert actions
    setAlerts: (alerts) => {
      set({ alerts });
      get().touchUpdate("alerts");
    },
    addAlert: (alert) => {
      set((state) => ({
        alerts: [alert, ...state.alerts],
      }));
      get().touchUpdate("alerts");
    },
    acknowledgeAlert: (id) => {
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a
        ),
      }));
    },
    
    // Connection actions
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setFallbackActive: (active) => set({ fallbackActive: active }),
    touchUpdate: (entity) => {
      set((state) => ({
        lastUpdate: { ...state.lastUpdate, [entity]: new Date().toISOString() },
      }));
    },
    
    // Getters
    getCampaignById: (id) => get().campaigns.find((c) => c.id === id),
    getTaskById: (id) => get().tasks.find((t) => t.id === id),
    getExecutionById: (id) => get().executions.find((e) => e.id === id),
    getUnacknowledgedAlerts: () => get().alerts.filter((a) => !a.acknowledged),
    getLatestUpdate: (entity) => get().lastUpdate[entity],
  }))
);

// Selectors for optimized re-renders
export const selectCampaigns = (state: RealtimeState) => state.campaigns;
export const selectTasks = (state: RealtimeState) => state.tasks;
export const selectExecutions = (state: RealtimeState) => state.executions;
export const selectAlerts = (state: RealtimeState) => state.alerts;
export const selectConnectionStatus = (state: RealtimeState) => state.connectionStatus;
export const selectFallbackActive = (state: RealtimeState) => state.fallbackActive;
