'use client';

import { useState } from 'react';
import { Flame, User, Clock, Send, CheckCircle, XCircle, AlertCircle, Loader2, UserPlus, Phone, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HotLeadCardProps {
  lead: {
    id: string;
    name: string;
    email: string;
    company: string;
    score: number;
    source: string;
    estimated_value?: number;
  };
  task: {
    id: string;
    sla_minutes: number;
    due_at: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipientId: string;
  onNotificationSent?: (notificationId: string) => void;
  onClaim?: () => Promise<any>;
}

export function HotLeadCard({
  lead,
  task,
  priority,
  recipientId,
  onNotificationSent,
  onClaim,
}: HotLeadCardProps) {
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [deliveryState, setDeliveryState] = useState<'idle' | 'sending' | 'delivered' | 'failed'>('idle');
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed' | 'failed'>('idle');
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dueDate = new Date(task.due_at);
  const now = new Date();
  const isOverdue = dueDate < now;
  const timeRemaining = formatDistanceToNow(dueDate, { addSuffix: true });

  const handleSendNotification = async (type: 'hot_lead_assigned' | 'hot_lead_escalated') => {
    setSending(true);
    setDeliveryState('sending');
    setError(null);

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          recipient_id: recipientId,
          priority,
          lead,
          task,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.sent) {
        throw new Error(data.error || 'Failed to send notification');
      }

      setDeliveryState('delivered');
      setNotificationId(data.notification_id);
      onNotificationSent?.(data.notification_id);
    } catch (err: any) {
      setDeliveryState('failed');
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleClaim = async () => {
    if (!onClaim) return;
    
    setClaiming(true);
    setClaimState('claiming');
    setError(null);

    try {
      await onClaim();
      setClaimState('claimed');
    } catch (err: any) {
      setClaimState('failed');
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'medium': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-white">Hot Lead Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(priority)} uppercase`}>
              {priority}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                OVERDUE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lead Info */}
      <div className="p-4 space-y-4">
        {/* Score & Value */}
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg border ${getScoreColor(lead.score)}`}>
            <div className="text-xs uppercase tracking-wider opacity-70">Lead Score</div>
            <div className="text-2xl font-bold">{lead.score}/100</div>
          </div>
          {lead.estimated_value && (
            <div className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-700">
              <div className="text-xs uppercase tracking-wider text-gray-500">Est. Value</div>
              <div className="text-xl font-bold text-white">
                ${lead.estimated_value.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Lead Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-white font-medium">{lead.name}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-6">
              <Mail className="w-3 h-3" />
              {lead.email}
            </div>
          )}
          <div className="text-sm text-gray-400 ml-6">
            {lead.company} • Source: {lead.source}
          </div>
        </div>

        {/* SLA */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800 border-gray-700'}`}>
          <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`} />
          <div className="flex-1">
            <span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-gray-300'}`}>
              SLA: {task.sla_minutes} minutes
            </span>
            <span className="text-sm text-gray-500 ml-2">
              • Due {timeRemaining}
            </span>
          </div>
        </div>

        {/* Claim Status */}
        {claimState !== 'idle' && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            claimState === 'claimed' ? 'bg-green-500/10 border-green-500/30' :
            claimState === 'failed' ? 'bg-red-500/10 border-red-500/30' :
            'bg-blue-500/10 border-blue-500/30'
          }`}>
            {claimState === 'claiming' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
            {claimState === 'claimed' && <CheckCircle className="w-4 h-4 text-green-400" />}
            {claimState === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
            <span className={`text-sm ${
              claimState === 'claimed' ? 'text-green-400' :
              claimState === 'failed' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {claimState === 'claiming' && 'Claiming lead...'}
              {claimState === 'claimed' && 'Lead claimed successfully'}
              {claimState === 'failed' && `Claim failed: ${error}`}
            </span>
          </div>
        )}

        {/* Delivery State */}
        {deliveryState !== 'idle' && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            deliveryState === 'delivered' ? 'bg-green-500/10 border-green-500/30' :
            deliveryState === 'failed' ? 'bg-red-500/10 border-red-500/30' :
            'bg-blue-500/10 border-blue-500/30'
          }`}>
            {deliveryState === 'sending' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
            {deliveryState === 'delivered' && <CheckCircle className="w-4 h-4 text-green-400" />}
            {deliveryState === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
            <span className={`text-sm ${
              deliveryState === 'delivered' ? 'text-green-400' :
              deliveryState === 'failed' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {deliveryState === 'sending' && 'Sending notification...'}
              {deliveryState === 'delivered' && `Delivered (${notificationId?.slice(0, 8)}...)`}
              {deliveryState === 'failed' && `Failed: ${error}`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onClaim && claimState !== 'claimed' && (
            <button
              onClick={handleClaim}
              disabled={claiming || sending}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {claiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Claim Lead
            </button>
          )}
          <button
            onClick={() => handleSendNotification('hot_lead_assigned')}
            disabled={sending || claiming}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Notify
          </button>
          <button
            onClick={() => handleSendNotification('hot_lead_escalated')}
            disabled={sending || claiming}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            Escalate
          </button>
        </div>
      </div>
    </div>
  );
}
