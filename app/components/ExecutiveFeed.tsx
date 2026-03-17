'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageCircle, CheckCircle, AlertTriangle, UserPlus, Clock, 
  Calendar, Target, ChevronDown, ChevronUp, ArrowRight, RefreshCw
} from 'lucide-react';
import { getExecutiveFeed, type FeedItem } from '@/lib/executive-feed';

const typeConfig = {
  reply: { icon: MessageCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', label: 'Reply' },
  approve: { icon: CheckCircle, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', label: 'Approve' },
  blocked: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Blocked' },
  delegate: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', label: 'Delegated' },
  followup: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', label: 'Follow up' },
  meeting: { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', label: 'Meeting' },
  mission: { icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', label: 'Mission' }
};

function FeedCard({ item, showAction = true }: { item: FeedItem; showAction?: boolean }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg} ${config.border} group hover:opacity-90 transition-all`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
        )}
      </div>
      
      {showAction && item.actionUrl && (
        <Link 
          href={item.actionUrl}
          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md ${config.bg} ${config.color} hover:bg-opacity-20 transition-colors`}
        >
          {item.actionLabel || config.label}
        </Link>
      )}
    </div>
  );
}

function SectionHeader({ 
  title, 
  count, 
  color = 'gray',
  isExpanded, 
  onToggle 
}: { 
  title: string; 
  count: number; 
  color?: 'red' | 'blue' | 'gray';
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  const colorClasses = {
    red: 'text-red-400 border-red-400/30',
    blue: 'text-blue-400 border-blue-400/30',
    gray: 'text-gray-400 border-gray-700'
  };
  
  return (
    <div className={`flex items-center justify-between py-2 border-b ${colorClasses[color].split(' ')[1]}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${colorClasses[color].split(' ')[0]}`}>
          {title}
        </span>
        {count > 0 && (
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${color === 'red' ? 'bg-red-400/20 text-red-400' : color === 'blue' ? 'bg-blue-400/20 text-blue-400' : 'bg-gray-700 text-gray-300'}`}>
            {count}
          </span>
        )}
      </div>
      
      {onToggle && (
        <button onClick={onToggle} className="text-gray-500 hover:text-gray-300">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export default function ExecutiveFeed() {
  const [data, setData] = useState<{ needsAction: FeedItem[]; activeToday: FeedItem[]; watching: FeedItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({ watch: false });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadFeed = async () => {
    setLoading(true);
    const feed = await getExecutiveFeed();
    if (feed) {
      setData({
        needsAction: feed.needsAction,
        activeToday: feed.activeToday,
        watching: feed.watching
      });
      setLastRefresh(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  const actionCount = data?.needsAction.length || 0;
  const hasCritical = data?.needsAction.some(i => i.priority === 'critical');

  if (loading && !data) {
    return (
      <div className="bg-[#111214] border border-[#1F2226] rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-800 rounded"></div>
          <div className="h-12 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  // Empty state - all caught up
  if (data && actionCount === 0 && data.activeToday.length === 0) {
    return (
      <div className="bg-[#111214] border border-[#1F2226] rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">All caught up</h3>
        <p className="text-sm text-gray-400">Nothing needs your attention right now.</p>
        <button 
          onClick={loadFeed}
          className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#111214] border border-[#1F2226] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2226]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Executive Feed</h2>
          {hasCritical && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full animate-pulse">
              Critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={loadFeed}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* NEEDS ACTION - Critical Section */}
      {actionCount > 0 && (
        <div className="px-4 py-3 bg-red-500/5">
          <SectionHeader 
            title="Needs Action" 
            count={actionCount} 
            color="red"
          />
          <div className="mt-3 space-y-2">
            {data?.needsAction.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
          {actionCount >= 5 && (
            <Link 
              href="/executive-ops/approvals"
              className="flex items-center justify-center gap-1 mt-3 text-xs text-red-400 hover:text-red-300"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* ACTIVE TODAY */}
      {data && data.activeToday.length > 0 && (
        <div className={`px-4 py-3 ${actionCount > 0 ? 'border-t border-[#1F2226]' : ''}`}>
          <SectionHeader 
            title="Active Today" 
            count={data.activeToday.length} 
            color="blue"
          />
          <div className="mt-3 space-y-2">
            {data.activeToday.map((item) => (
              <FeedCard key={item.id} item={item} showAction={false} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-px bg-[#1F2226] border-t border-[#1F2226]">
        {[
          { label: 'Replies', count: data?.needsAction.filter(i => i.type === 'reply').length || 0, color: 'text-red-400' },
          { label: 'Approvals', count: data?.needsAction.filter(i => i.type === 'approve').length || 0, color: 'text-orange-400' },
          { label: 'Blocked', count: data?.needsAction.filter(i => i.type === 'blocked').length || 0, color: 'text-red-500' },
          { label: 'Active', count: data?.activeToday.length || 0, color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111214] px-3 py-2 text-center">
            <p className={`text-lg font-semibold ${stat.color}`}>{stat.count}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
