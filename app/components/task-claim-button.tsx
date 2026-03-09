"use client";

import { useState } from "react";
import { Loader2, CheckCircle, User } from "lucide-react";

interface TaskClaimButtonProps {
  taskId: string;
  agentId: string;
  agentName?: string;
  initiallyClaimed?: boolean;
  claimedByName?: string | null;
}

export function TaskClaimButton({
  taskId,
  agentId,
  agentName = "You",
  initiallyClaimed = false,
  claimedByName = null,
}: TaskClaimButtonProps) {
  const [isClaimed, setIsClaimed] = useState(initiallyClaimed);
  const [claimedBy, setClaimedBy] = useState<string | null>(claimedByName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    if (isClaimed) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId, agentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim task");
      }

      if (data.success && data.claimed) {
        setIsClaimed(true);
        setClaimedBy(agentName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isClaimed || claimedBy) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-400 font-medium">
          Claimed by {claimedBy || agentName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClaim}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Claiming...</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4" />
            <span>Claim Task</span>
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
