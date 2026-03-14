"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: "active" | "paused" | "archived";
  spend: number;
  leads: number;
  cpl: number;
}

interface TrendPoint {
  date: string;
  spend: number;
  leads: number;
}

interface KPIs {
  total_spend: number;
  total_leads: number;
  avg_cpl: number;
  total_booked_calls: number;
  total_closed_deals: number;
  avg_cac: number;
}

interface LiveCampaignsState {
  campaigns: Campaign[];
  trendData: TrendPoint[];
  kpis: KPIs | null;
  source: "live" | "demo" | "error" | null;
  lastSync: string | null;
  error: string | null;
  loading: boolean;
  syncing: boolean;
}

interface UseLiveCampaignsOptions {
  pollingInterval?: number; // ms, default 30000 (30s)
  enabled?: boolean;
}

export function useLiveCampaigns(options: UseLiveCampaignsOptions = {}) {
  const { pollingInterval = 30000, enabled = true } = options;
  
  const [state, setState] = useState<LiveCampaignsState>({
    campaigns: [],
    trendData: [],
    kpis: null,
    source: null,
    lastSync: null,
    error: null,
    loading: true,
    syncing: false,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isMountedRef.current) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      loading: !isBackground,
      syncing: isBackground,
      error: null,
    }));
    
    try {
      const [campaignsRes, trendRes, kpisRes] = await Promise.all([
        fetch("/api/campaigns", { signal: abortControllerRef.current.signal }),
        fetch("/api/campaigns/trend", { signal: abortControllerRef.current.signal }),
        fetch("/api/campaigns/kpis", { signal: abortControllerRef.current.signal }),
      ]);
      
      if (!isMountedRef.current) return;
      
      const campaignsData = campaignsRes.ok ? await campaignsRes.json() : null;
      const trendData = trendRes.ok ? await trendRes.json() : null;
      const kpisData = kpisRes.ok ? await kpisRes.json() : null;
      
      // Determine overall source
      let source: "live" | "demo" | "error" = "demo";
      if (campaignsData?.source === "live") source = "live";
      if (!campaignsData || !trendData || !kpisData) source = "error";
      
      setState({
        campaigns: campaignsData?.campaigns || [],
        trendData: trendData?.data || [],
        kpis: kpisData?.kpis || null,
        source,
        lastSync: new Date().toISOString(),
        error: null,
        loading: false,
        syncing: false,
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      if ((err as Error).name === "AbortError") return;
      
      setState(prev => ({
        ...prev,
        source: "error",
        error: (err as Error).message,
        loading: false,
        syncing: false,
      }));
    }
  }, []);
  
  // Initial fetch + polling
  useEffect(() => {
    if (!enabled) return;
    
    isMountedRef.current = true;
    fetchData(false);
    
    const startPolling = () => {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchData(true);
          startPolling();
        }
      }, pollingInterval);
    };
    
    startPolling();
    
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [enabled, pollingInterval, fetchData]);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);
  
  return {
    ...state,
    refresh,
  };
}

// Hook for relative time display
export function useRelativeTime(timestamp: string | null) {
  const [relative, setRelative] = useState<string>("");
  
  useEffect(() => {
    if (!timestamp) {
      setRelative("");
      return;
    }
    
    const updateRelative = () => {
      const diff = Date.now() - new Date(timestamp).getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (seconds < 5) setRelative("just now");
      else if (seconds < 60) setRelative(`${seconds}s ago`);
      else if (minutes < 60) setRelative(`${minutes}m ago`);
      else if (hours < 24) setRelative(`${hours}h ago`);
      else setRelative(new Date(timestamp).toLocaleDateString());
    };
    
    updateRelative();
    const interval = setInterval(updateRelative, 10000); // Update every 10s
    
    return () => clearInterval(interval);
  }, [timestamp]);
  
  return relative;
}
