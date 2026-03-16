"use client";

import { Bell, Check, X, AlertCircle, Info, Send, MessageSquare } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'failed';
  channels?: string[];
  channel_status?: Record<string, { sent: boolean; mocked?: boolean; error?: string }>;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
}

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <Check className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeStyles = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "border-green-500/30 bg-green-500/5";
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/5";
      case "error":
        return "border-red-500/30 bg-red-500/5";
      default:
        return "border-blue-500/30 bg-blue-500/5";
    }
  };

  const getDeliveryStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'pending':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-gray-400 bg-gray-700 border-gray-600';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'telegram':
        return <Send className="w-3 h-3" />;
      case 'in_app':
        return <MessageSquare className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-4 px-4 py-4 hover:bg-gray-800/30 transition-colors ${
                  !notification.read ? "bg-gray-800/20" : ""
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${getTypeStyles(
                    notification.type
                  )}`}
                >
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white">
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {notification.timestamp.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {notification.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {notification.message}
                  </p>
                  
                  {/* Delivery Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Delivery Status */}
                    {notification.delivery_status && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getDeliveryStatusColor(notification.delivery_status)}`}>
                        {notification.delivery_status === 'delivered' && <Check className="w-3 h-3" />}
                        {notification.delivery_status === 'failed' && <X className="w-3 h-3" />}
                        {notification.delivery_status === 'pending' && <AlertCircle className="w-3 h-3" />}
                        <span className="capitalize">{notification.delivery_status}</span>
                      </span>
                    )}
                    
                    {/* Channel Status */}
                    {notification.channels?.map((channel) => {
                      const chStatus = notification.channel_status?.[channel];
                      const isDelivered = chStatus?.sent;
                      const hasError = chStatus?.error;
                      
                      return (
                        <span
                          key={channel}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                            isDelivered
                              ? 'bg-green-500/10 text-green-400 border-green-500/30'
                              : hasError
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-gray-700 text-gray-400 border-gray-600'
                          }`}
                        >
                          {getChannelIcon(channel)}
                          <span className="capitalize">{channel}</span>
                          {chStatus?.mocked && <span className="opacity-50">(m)</span>}
                        </span>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {!notification.read && onMarkAsRead && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Mark as read
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(notification.id)}
                        className="text-xs text-gray-500 hover:text-gray-400"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
