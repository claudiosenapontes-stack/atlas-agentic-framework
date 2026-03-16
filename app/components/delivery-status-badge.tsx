'use client';

import { CheckCircle, XCircle, Clock, Loader2, Send, MessageSquare } from 'lucide-react';

interface DeliveryStatusBadgeProps {
  channels: string[];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'sending';
  channelStatus?: Record<string, { sent: boolean; mocked?: boolean; error?: string }>;
  compact?: boolean;
}

export function DeliveryStatusBadge({
  channels,
  status,
  channelStatus,
  compact = false,
}: DeliveryStatusBadgeProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
      case 'delivered':
      case 'sent':
        return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'delivered':
      case 'sent':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'sending':
        return 'Sending';
      case 'delivered':
        return 'Delivered';
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusLabel()}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusLabel()}</span>
      </div>
      
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {channels.map((channel) => {
            const chStatus = channelStatus?.[channel];
            const isDelivered = chStatus?.sent;
            const hasError = chStatus?.error;
            
            return (
              <div
                key={channel}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                  isDelivered
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : hasError
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-gray-700 text-gray-400 border-gray-600'
                }`}
              >
                {channel === 'telegram' ? (
                  <Send className="w-3 h-3" />
                ) : channel === 'in_app' ? (
                  <MessageSquare className="w-3 h-3" />
                ) : null}
                <span className="capitalize">{channel}</span>
                {chStatus?.mocked && <span className="text-[10px] opacity-50">(mock)</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
