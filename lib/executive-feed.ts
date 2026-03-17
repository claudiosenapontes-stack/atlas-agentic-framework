interface FeedItem {
  id: string;
  type: 'reply' | 'approve' | 'blocked' | 'delegate' | 'followup' | 'meeting' | 'mission';
  title: string;
  subtitle?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
  owner?: string;
  dueAt?: string;
}

interface ExecutiveFeedData {
  needsAction: FeedItem[];
  activeToday: FeedItem[];
  watching: FeedItem[];
  lastUpdated: string;
}

export async function getExecutiveFeed(): Promise<ExecutiveFeedData | null> {
  try {
    // Fetch from multiple endpoints in parallel
    const [
      notificationsRes,
      approvalsRes,
      missionsRes,
      calendarRes,
      tasksRes
    ] = await Promise.all([
      fetch('/api/notifications?unread=true&limit=10', { cache: 'no-store' }),
      fetch('/api/approvals?status=pending&limit=5', { cache: 'no-store' }),
      fetch('/api/missions?limit=20', { cache: 'no-store' }),
      fetch('/api/calendar/today', { cache: 'no-store' }),
      fetch('/api/tasks?limit=20', { cache: 'no-store' })
    ]);

    const needsAction: FeedItem[] = [];
    const activeToday: FeedItem[] = [];
    const watching: FeedItem[] = [];

    // Process notifications (reply needed)
    if (notificationsRes.ok) {
      const { notifications = [] } = await notificationsRes.json();
      notifications
        .filter((n: any) => !n.read && n.type !== 'info')
        .forEach((n: any) => {
          needsAction.push({
            id: n.id,
            type: n.type === 'approval_request' ? 'approve' : 'reply',
            title: n.title,
            subtitle: n.message,
            priority: n.priority === 'urgent' ? 'critical' : 'high',
            timestamp: n.createdAt,
            actionUrl: n.actionUrl || '#',
            actionLabel: n.type === 'approval_request' ? 'Review' : 'Reply'
          });
        });
    }

    // Process approvals
    if (approvalsRes.ok) {
      const approvals = await approvalsRes.json();
      (approvals.data || approvals || [])
        .filter((a: any) => a.status === 'pending')
        .forEach((a: any) => {
          needsAction.push({
            id: a.id,
            type: 'approve',
            title: `Approve: ${a.title}`,
            subtitle: a.amount ? `$${a.amount.toLocaleString()}` : undefined,
            priority: 'critical',
            timestamp: a.created_at,
            actionUrl: `/executive-ops/approvals/${a.id}`,
            actionLabel: 'Review'
          });
        });
    }

    // Process missions (blocked + active)
    if (missionsRes.ok) {
      const { missions = [] } = await missionsRes.json();
      missions.forEach((m: any) => {
        if (m.status === 'blocked' && m.current_blocker) {
          needsAction.push({
            id: m.id,
            type: 'blocked',
            title: `Blocked: ${m.title}`,
            subtitle: m.current_blocker,
            priority: 'critical',
            timestamp: m.updated_at,
            actionUrl: `/operations/missions/${m.id}`,
            actionLabel: 'Fix',
            owner: m.owner_agent
          });
        } else if (['active', 'in_progress'].includes(m.status)) {
          activeToday.push({
            id: m.id,
            type: 'mission',
            title: m.title,
            subtitle: m.phase ? `${m.phase} • ${m.progress_percent || 0}%` : undefined,
            priority: 'normal',
            timestamp: m.updated_at,
            actionUrl: `/operations/missions/${m.id}`,
            actionLabel: 'View',
            owner: m.owner_agent
          });
        }
      });
    }

    // Process calendar (meetings today)
    if (calendarRes.ok) {
      const { events = [] } = await calendarRes.json();
      const now = new Date();
      events
        .filter((e: any) => new Date(e.start_time) >= now)
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 3)
        .forEach((e: any) => {
          activeToday.push({
            id: e.id,
            type: 'meeting',
            title: e.title,
            subtitle: new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            priority: 'normal',
            timestamp: e.start_time,
            actionUrl: e.meeting_url || `#`,
            actionLabel: 'Join'
          });
        });
    }

    // Process delegated tasks
    if (tasksRes.ok) {
      const { tasks = [] } = await tasksRes.json();
      tasks
        .filter((t: any) => t.status === 'pending' && t.assigned_agent_id && t.assigned_agent_id !== 'claudio')
        .forEach((t: any) => {
          activeToday.push({
            id: t.id,
            type: 'delegate',
            title: `Delegated: ${t.title}`,
            subtitle: `Assigned to ${t.assigned_agent_id}`,
            priority: 'normal',
            timestamp: t.created_at,
            actionUrl: `/operations/tasks/${t.id}`,
            actionLabel: 'Check',
            owner: t.assigned_agent_id
          });
        });
    }

    // Sort by priority and timestamp
    needsAction.sort((a, b) => {
      const priorityWeight = { critical: 0, high: 1, normal: 2, low: 3 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return {
      needsAction: needsAction.slice(0, 5), // Max 5 critical
      activeToday: activeToday.slice(0, 5), // Max 5 active
      watching: watching,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to fetch executive feed:', error);
    return null;
  }
}
