"use client";

import { Inbox, Upload, AlertCircle, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  type: "empty" | "error" | "loading";
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ type, message, onAction, actionLabel }: EmptyStateProps) {
  if (type === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#6B7280]">
        <div className="w-8 h-8 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading campaigns...</p>
      </div>
    );
  }
  
  if (type === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-[#FF3B30]" />
        </div>
        <p className="text-sm text-[#9BA3AF] mb-1">Failed to load campaigns</p>
        <p className="text-xs text-[#6B7280] mb-4">{message || "Something went wrong"}</p>
        {onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2 px-4 py-2 bg-[#1F2226] hover:bg-[#2A2D31] text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {actionLabel || "Try again"}
          </button>
        )}
      </div>
    );
  }
  
  // Empty state
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-[#6B7280]" />
      </div>
      <p className="text-sm text-[#9BA3AF] mb-1">No campaigns found</p>
      <p className="text-xs text-[#6B7280] mb-4">Import your first campaign to get started</p>
      {onAction && (
        <label className="flex items-center gap-2 px-4 py-2 bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white text-sm rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={() => {}} />
        </label>
      )}
    </div>
  );
}
