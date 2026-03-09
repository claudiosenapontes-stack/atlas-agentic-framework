"use client";

import { useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";

type TaskStatus = "inbox" | "in_progress" | "review" | "completed" | "archived";

interface TaskStatusUpdateProps {
  taskId: string;
  currentStatus: TaskStatus;
  onStatusChange?: (newStatus: TaskStatus) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  inbox: { 
    label: "Inbox", 
    color: "text-gray-400", 
    bgColor: "bg-gray-500/10 border-gray-500/30" 
  },
  in_progress: { 
    label: "In Progress", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/10 border-blue-500/30" 
  },
  review: { 
    label: "Review", 
    color: "text-yellow-400", 
    bgColor: "bg-yellow-500/10 border-yellow-500/30" 
  },
  completed: { 
    label: "Completed", 
    color: "text-green-400", 
    bgColor: "bg-green-500/10 border-green-500/30" 
  },
  archived: { 
    label: "Archived", 
    color: "text-gray-500", 
    bgColor: "bg-gray-600/10 border-gray-600/30" 
  },
};

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  inbox: ["in_progress", "archived"],
  in_progress: ["review", "completed", "inbox"],
  review: ["completed", "in_progress", "inbox"],
  completed: ["archived", "in_progress"],
  archived: ["inbox"],
};

export function TaskStatusUpdate({
  taskId,
  currentStatus,
  onStatusChange,
  disabled = false,
}: TaskStatusUpdateProps) {
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentConfig = STATUS_CONFIG[status];
  const allowedTransitions = VALID_TRANSITIONS[status] || [];

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === status || isUpdating) return;

    // Optimistic update
    const previousStatus = status;
    setStatus(newStatus);
    setIsUpdating(true);
    setError(null);
    setIsOpen(false);

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert on error
        setStatus(previousStatus);
        throw new Error(data.error || "Failed to update status");
      }

      // Call callback if provided
      onStatusChange?.(newStatus);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && !isUpdating && setIsOpen(!isOpen)}
        disabled={disabled || isUpdating}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium
          transition-colors min-w-[140px] justify-between
          ${currentConfig.bgColor}
          ${disabled || isUpdating ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}
        `}
      >
        <span className={currentConfig.color}>
          {isUpdating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating...
            </span>
          ) : (
            currentConfig.label
          )}
        </span>
        {!isUpdating && (
          <ChevronDown className={`w-4 h-4 ${currentConfig.color} transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Options */}
          <div className="absolute top-full left-0 mt-1 w-full bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
            {allowedTransitions.map((transitionStatus) => {
              const config = STATUS_CONFIG[transitionStatus];
              return (
                <button
                  key={transitionStatus}
                  onClick={() => handleStatusChange(transitionStatus)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors
                    ${config.color}
                  `}
                >
                  {config.label}
                </button>
              );
            })}
            {allowedTransitions.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No valid transitions
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <span className="absolute top-full left-0 mt-1 text-xs text-red-400 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}
