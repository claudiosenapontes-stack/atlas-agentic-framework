"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useRealtime";

interface ConnectionStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function ConnectionStatus({ showLabel = true, className = "" }: ConnectionStatusProps) {
  const { status, fallbackActive, lastUpdate } = useConnectionStatus();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Format last update time
  const getLastUpdateText = () => {
    const times = Object.entries(lastUpdate);
    if (times.length === 0) return "Never";
    
    const latest = times.reduce((a, b) => 
      new Date(a[1]) > new Date(b[1]) ? a : b
    );
    
    const diff = Date.now() - new Date(latest[1]).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(latest[1]).toLocaleTimeString();
  };
  
  // Status colors and icons
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: Wifi,
          color: "text-[#16C784]",
          bg: "bg-[#16C784]/10",
          border: "border-[#16C784]/30",
          label: fallbackActive ? "Live (Polling)" : "Live",
        };
      case "connecting":
        return {
          icon: RefreshCw,
          color: "text-[#FFB020]",
          bg: "bg-[#FFB020]/10",
          border: "border-[#FFB020]/30",
          label: "Connecting...",
        };
      case "disconnected":
      default:
        return {
          icon: WifiOff,
          color: "text-[#FF3B30]",
          bg: "bg-[#FF3B30]/10",
          border: "border-[#FF3B30]/30",
          label: "Offline",
        };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  return (
    <div 
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Icon 
        className={`w-4 h-4 ${config.color} ${status === "connecting" ? "animate-spin" : ""}`} 
      />
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1F2226] border border-[#2A2D31] rounded-lg shadow-lg text-xs whitespace-nowrap z-50">
          <div className="text-[#9BA3AF] mb-1">Connection Status</div>
          <div className="text-white">Status: {status}</div>
          <div className="text-white">Fallback: {fallbackActive ? "Active" : "Inactive"}</div>
          <div className="text-white">Last update: {getLastUpdateText()}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2226]" />
        </div>
      )}
    </div>
  );
}

// Compact version for nav bar
export function ConnectionStatusDot() {
  const { status, fallbackActive } = useConnectionStatus();
  
  const getColor = () => {
    if (status === "connected") return fallbackActive ? "bg-[#FFB020]" : "bg-[#16C784]";
    if (status === "connecting") return "bg-[#FFB020]";
    return "bg-[#FF3B30]";
  };
  
  return (
    <div className="relative group">
      <div className={`w-2 h-2 rounded-full ${getColor()} ${status === "connecting" ? "animate-pulse" : ""}`} />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1F2226] border border-[#2A2D31] rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {status === "connected" && fallbackActive ? "Polling (30s)" : status}
      </div>
    </div>
  );
}
