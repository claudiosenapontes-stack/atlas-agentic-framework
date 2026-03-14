import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useRealtimeStore } from "./store";

// Subscription configuration
interface SubscriptionConfig {
  table: string;
  events: ("INSERT" | "UPDATE" | "DELETE")[];
  filter?: string;
}

// Channel registry
const channels: Map<string, ReturnType<SupabaseClient["channel"]>> = new Map();
let supabase: SupabaseClient | null = null;
let fallbackIntervals: Map<string, NodeJS.Timeout> = new Map();

// Initialize Supabase client
function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn("[Realtime] Supabase not configured");
    return null;
  }
  
  supabase = createClient(url, key);
  return supabase;
}

// Subscription manager
export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectDelay = 30000; // 30s max
  private baseReconnectDelay = 1000; // 1s base
  
  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }
  
  // Subscribe to a table
  subscribe(channelName: string, config: SubscriptionConfig): () => void {
    const client = getSupabase();
    const store = useRealtimeStore.getState();
    
    if (!client) {
      console.warn(`[Realtime] Cannot subscribe to ${channelName}: Supabase not configured`);
      store.setFallbackActive(true);
      this.startPolling(channelName, config);
      return () => this.unsubscribe(channelName);
    }
    
    // Check if already subscribed
    if (channels.has(channelName)) {
      console.log(`[Realtime] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }
    
    // Create channel
    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          this.handleChange(channelName, payload);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelName} status: ${status}`);
        
        if (status === "SUBSCRIBED") {
          store.setConnectionStatus("connected");
          store.setFallbackActive(false);
          this.reconnectAttempts.set(channelName, 0);
          this.stopPolling(channelName);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          store.setConnectionStatus("disconnected");
          this.handleDisconnect(channelName, config);
        }
      });
    
    channels.set(channelName, channel);
    store.setConnectionStatus("connecting");
    
    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }
  
  // Unsubscribe from a channel
  unsubscribe(channelName: string): void {
    const channel = channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      channels.delete(channelName);
      console.log(`[Realtime] Unsubscribed from ${channelName}`);
    }
    this.stopPolling(channelName);
  }
  
  // Unsubscribe from all channels
  unsubscribeAll(): void {
    const channelKeys = Array.from(channels.keys());
    for (const name of channelKeys) {
      this.unsubscribe(name);
    }
    const intervalKeys = Array.from(fallbackIntervals.keys());
    for (const name of intervalKeys) {
      this.stopPolling(name);
    }
  }
  
  // Handle database change
  private handleChange(channelName: string, payload: any): void {
    const store = useRealtimeStore.getState();
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log(`[Realtime] ${channelName}: ${eventType}`, newRecord || oldRecord);
    
    switch (channelName) {
      case "campaigns":
        this.handleCampaignChange(eventType, newRecord, oldRecord, store);
        break;
      case "tasks":
        this.handleTaskChange(eventType, newRecord, oldRecord, store);
        break;
      case "executions":
        this.handleExecutionChange(eventType, newRecord, oldRecord, store);
        break;
      case "alerts":
        this.handleAlertChange(eventType, newRecord, oldRecord, store);
        break;
    }
  }
  
  // Entity-specific handlers
  private handleCampaignChange(type: string, newRec: any, oldRec: any, store: any): void {
    switch (type) {
      case "INSERT":
        store.addCampaign(newRec);
        break;
      case "UPDATE":
        store.updateCampaign(newRec);
        break;
      case "DELETE":
        store.removeCampaign(oldRec.id);
        break;
    }
  }
  
  private handleTaskChange(type: string, newRec: any, oldRec: any, store: any): void {
    switch (type) {
      case "INSERT":
        store.addTask(newRec);
        break;
      case "UPDATE":
        store.updateTask(newRec);
        break;
      case "DELETE":
        store.removeTask(oldRec.id);
        break;
    }
  }
  
  private handleExecutionChange(type: string, newRec: any, oldRec: any, store: any): void {
    switch (type) {
      case "INSERT":
        store.addExecution(newRec);
        break;
      case "UPDATE":
        store.updateExecution(newRec);
        break;
    }
  }
  
  private handleAlertChange(type: string, newRec: any, _oldRec: any, store: any): void {
    if (type === "INSERT") {
      store.addAlert(newRec);
      // Could trigger toast notification here
    }
  }
  
  // Handle disconnection with exponential backoff
  private handleDisconnect(channelName: string, config: SubscriptionConfig): void {
    const store = useRealtimeStore.getState();
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, attempts),
      this.maxReconnectDelay
    );
    
    console.log(`[Realtime] Reconnecting to ${channelName} in ${delay}ms (attempt ${attempts + 1})`);
    
    this.reconnectAttempts.set(channelName, attempts + 1);
    store.setFallbackActive(true);
    
    // Start polling fallback
    this.startPolling(channelName, config);
    
    // Attempt reconnect
    setTimeout(() => {
      this.unsubscribe(channelName);
      this.subscribe(channelName, config);
    }, delay);
  }
  
  // Start polling fallback
  private startPolling(channelName: string, config: SubscriptionConfig): void {
    if (fallbackIntervals.has(channelName)) return;
    
    console.log(`[Realtime] Starting 30s polling fallback for ${channelName}`);
    const store = useRealtimeStore.getState();
    store.setFallbackActive(true);
    
    const interval = setInterval(async () => {
      await this.pollData(channelName, config);
    }, 30000); // 30s polling
    
    fallbackIntervals.set(channelName, interval);
    
    // Initial poll
    this.pollData(channelName, config);
  }
  
  // Stop polling fallback
  private stopPolling(channelName: string): void {
    const interval = fallbackIntervals.get(channelName);
    if (interval) {
      clearInterval(interval);
      fallbackIntervals.delete(channelName);
      console.log(`[Realtime] Stopped polling fallback for ${channelName}`);
    }
  }
  
  // Poll data via REST API
  private async pollData(channelName: string, config: SubscriptionConfig): Promise<void> {
    const client = getSupabase();
    if (!client) return;
    
    try {
      const { data, error } = await client
        .from(config.table)
        .select("*")
        .limit(100);
      
      if (error) throw error;
      
      const store = useRealtimeStore.getState();
      
      switch (channelName) {
        case "campaigns":
          store.setCampaigns(data || []);
          break;
        case "tasks":
          store.setTasks(data || []);
          break;
        case "executions":
          store.setExecutions(data || []);
          break;
        case "alerts":
          store.setAlerts(data || []);
          break;
      }
      
      console.log(`[Realtime] Polled ${data?.length || 0} records from ${channelName}`);
    } catch (err) {
      console.error(`[Realtime] Poll failed for ${channelName}:`, err);
    }
  }
}

// Export singleton instance
export const subscriptionManager = SubscriptionManager.getInstance();
