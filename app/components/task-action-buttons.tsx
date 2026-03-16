'use client';

import { useState } from 'react';
import { User, Pause, Share2, Loader2, CheckCircle, Clock } from 'lucide-react';

interface TaskActionButtonsProps {
  taskId: string;
  taskStatus: string;
  assignedAgentId?: string | null;
  currentAgentId?: string;
  currentAgentName?: string;
  onClaim?: () => void;
  onDefer?: () => void;
  onDelegate?: () => void;
}

export function TaskActionButtons({
  taskId,
  taskStatus,
  assignedAgentId,
  currentAgentId,
  currentAgentName = 'You',
  onClaim,
  onDefer,
  onDelegate,
}: TaskActionButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(!!assignedAgentId);
  const [claimedBy, setClaimedBy] = useState<string | null>(assignedAgentId ? currentAgentName : null);
  const [error, setError] = useState<string | null>(null);

  const isAssignedToMe = assignedAgentId === currentAgentId;
  const isClaimed = claimed || !!assignedAgentId;

  const handleClaim = async () => {
    if (isClaimed) return;
    setLoading('claim');
    setError(null);

    try {
      const response = await fetch('/api/tasks/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, agentId: currentAgentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim task');
      }

      if (data.success) {
        setClaimed(true);
        setClaimedBy(currentAgentName);
        onClaim?.();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDefer = async () => {
    setLoading('defer');
    setError(null);

    try {
      const response = await fetch('/api/tasks/defer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, reason: 'operator_deferred' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to defer task');
      }

      onDefer?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelegate = async () => {
    setLoading('delegate');
    setError(null);

    try {
      const response = await fetch('/api/tasks/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, targetAgentId: 'auto' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delegate task');
      }

      onDelegate?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // Claimed state
  if (isClaimed || claimedBy) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <span className="text-sm text-green-400 font-medium">
              Claimed by {claimedBy || currentAgentName}
            </span>
            <p className="text-xs text-green-500/70">Lock acquired for 1 hour</p>
          </div>
        </div>
        
        {/* Actions for claimed tasks */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDefer}
            disabled={loading === 'defer'}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 text-amber-400 rounded-lg text-sm font-medium transition-colors"
          >
            {loading === 'defer' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
            Defer
          </button>
          <button
            onClick={handleDelegate}
            disabled={loading === 'delegate'}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 text-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            {loading === 'delegate' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Delegate
          </button>
        </div>
        
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  // Unclaimed state - show all actions
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleClaim}
          disabled={loading === 'claim'}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'claim' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <User className="w-4 h-4" />
          )}
          Claim
        </button>
        <button
          onClick={handleDefer}
          disabled={loading === 'defer'}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 text-amber-400 rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'defer' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
          Defer
        </button>
        <button
          onClick={handleDelegate}
          disabled={loading === 'delegate'}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 text-blue-400 rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'delegate' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          Delegate
        </button>
      </div>
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
