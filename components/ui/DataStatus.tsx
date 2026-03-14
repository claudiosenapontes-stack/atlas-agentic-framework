"use client";

import { Wifi, WifiOff, Database, AlertCircle, RefreshCw } from "lucide-react";

interface SourceBadgeProps {
  source: "live" | "demo" | "error" | null;
  syncing?: boolean;
  className?: string;
}

export function SourceBadge({ source, syncing, className = "" }: SourceBadgeProps) {
  if (!source) return null;
  
  const configs = {
    live: {
      icon: Wifi,
      label: "LIVE",
      color: "text-[#16C784]",
      bg: "bg-[#16C784]/10",
      border: "border-[#16C784]/30",
    },
    demo: {
      icon: Database,
      label: "DEMO",
      color: "text-[#FFB020]",
      bg: "bg-[#FFB020]/10",
      border: "border-[#FFB020]/30",
    },
    error: {
      icon: AlertCircle,
      label: "ERROR",
      color: "text-[#FF3B30]",
      bg: "bg-[#FF3B30]/10",
      border: "border-[#FF3B30]/30",
    },
  };
  
  const config = configs[source];
  const Icon = syncing ? RefreshCw : config.icon;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${config.bg} ${config.border} ${config.color} ${className}`}>
      <Icon className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
      <span>{syncing ? "SYNCING" : config.label}</span>
    </div>
  );
}

interface LastSyncProps {
  timestamp: string | null;
  className?: string;
}

import { useRelativeTime } from "@/hooks/useLiveCampaigns";

export function LastSync({ timestamp, className = "" }: LastSyncProps) {
  const relative = useRelativeTime(timestamp);
  
  if (!timestamp || !relative) return null;
  
  return (
    <span 
      className={`text-xs text-[#6B7280] ${className}`}
      title={new Date(timestamp).toLocaleString()}
    >
      Updated {relative}
    </span>
  );
}

interface DataStatusProps {
  source: "live" | "demo" | "error" | null;
  lastSync: string | null;
  syncing?: boolean;
  error?: string | null;
  className?: string;
}

export function DataStatus({ source, lastSync, syncing, error, className = "" }: DataStatusProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SourceBadge source={source} syncing={syncing} />
      <LastSync timestamp={lastSync} />
      {error && (
        <span className="text-xs text-[#FF3B30]" title={error}>
          Connection failed
        </span>
      )}
    </div>
  );
}
