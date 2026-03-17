'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Flag, 
  ArrowLeft, 
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  TrendingUp,
  Target,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  progress: number;
  mission_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Mission {
  id: string;
  title: string;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111214] border border-[#1F2226] rounded-lg ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

function Button({ children, onClick, className = "", variant = "primary" }: { 
  children: React.ReactNode; 
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "ghost" | "outline";
}) {
  const variants = {
    primary: "bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white",
    ghost: "hover:bg-[#1F2226] text-[#9BA3AF] hover:text-white",
    outline: "border border-[#1F2226] text-[#9BA3AF] hover:bg-[#1F2226]"
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg transition-colors flex items-center ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-0.5 text-xs rounded-full ${className}`}>{children}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 bg-[#1F2226] rounded-full overflow-hidden">
      <div className="h-full bg-[#FF6A00] rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [missions, setMissions] = useState<Record<string, Mission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch milestones from API
      const res = await fetch('/api/milestones?limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const milestoneList = data.milestones || [];
      setMilestones(milestoneList);

      // Fetch related missions for context
      const missionIds = [...new Set(milestoneList.map((m: Milestone) => m.mission_id).filter(Boolean))];
      if (missionIds.length > 0) {
        const missionsRes = await fetch('/api/missions?limit=100', { cache: 'no-store' });
        if (missionsRes.ok) {
          const missionsData = await missionsRes.json();
          const missionMap: Record<string, Mission> = {};
          (missionsData.missions || []).forEach((m: Mission) => {
            missionMap[m.id] = m;
          });
          setMissions(missionMap);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch milestones:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "closed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress":
      case "executing":
        return <Clock className="w-5 h-5 text-[#FF6A00]" />;
      case "delayed":
      case "blocked":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-[#9BA3AF]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-[#9BA3AF]/20 text-[#9BA3AF]",
      planned: "bg-[#9BA3AF]/20 text-[#9BA3AF]",
      in_progress: "bg-[#FF6A00]/20 text-[#FF6A00]",
      executing: "bg-[#FF6A00]/20 text-[#FF6A00]",
      completed: "bg-green-500/20 text-green-500",
      closed: "bg-green-500/20 text-green-500",
      delayed: "bg-red-500/20 text-red-500",
      blocked: "bg-red-500/20 text-red-500",
    };
    return <Badge className={variants[status] || variants.planned}>{status.replace(/_/g, " ")}</Badge>;
  };

  const getTimelineStatus = (milestone: Milestone) => {
    if (!milestone.target_date) return 'no-date';
    const target = new Date(milestone.target_date);
    const now = new Date();
    const diffDays = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (milestone.status === 'completed' || milestone.status === 'closed') return 'completed';
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 7) return 'approaching';
    return 'on-track';
  };

  const completedCount = milestones.filter(m => m.status === "completed" || m.status === "closed").length;
  const inProgressCount = milestones.filter(m => m.status === "in_progress" || m.status === "executing").length;
  const delayedCount = milestones.filter(m => m.status === "delayed" || m.status === "blocked").length;
  const totalProgress = milestones.length > 0 
    ? milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / milestones.length 
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operations">
            <Button variant="ghost" className="!p-2"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Milestones</h1>
            <p className="text-[#9BA3AF] text-sm">Checkpoint timeline — ETA to next milestone, wins by mission</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} className="!px-3">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Milestone</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-[#9BA3AF]" />
              <div>
                <p className="text-[#9BA3AF] text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{milestones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#FF6A00]" />
              <div>
                <p className="text-[#9BA3AF] text-sm">In Progress</p>
                <p className="text-2xl font-bold text-white">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-[#9BA3AF] text-sm">Completed</p>
                <p className="text-2xl font-bold text-white">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-[#FF6A00]" />
              <div>
                <p className="text-[#9BA3AF] text-sm">Avg Progress</p>
                <p className="text-2xl font-bold text-white">{Math.round(totalProgress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-500 text-sm">Error loading milestones: {error}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="text-white font-medium mb-6">Milestone Timeline</h3>
          
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-6 h-6 text-[#6B7280] animate-spin mx-auto" />
              <p className="text-[#9BA3AF] text-sm mt-2">Loading milestones...</p>
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="w-12 h-12 mx-auto mb-4 text-[#6B7280]" />
              <h3 className="text-lg font-medium text-white mb-2">No milestones found</h3>
              <p className="text-sm text-[#9BA3AF]">Create a milestone to track checkpoint progress.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1F2226]" />
              <div className="space-y-6">
                {milestones
                  .sort((a, b) => {
                    // Sort by target date, then by status priority
                    if (a.target_date && b.target_date) {
                      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
                    }
                    return 0;
                  })
                  .map((milestone) => {
                    const timelineStatus = getTimelineStatus(milestone);
                    const mission = milestone.mission_id ? missions[milestone.mission_id] : null;
                    
                    return (
                      <div key={milestone.id} className="relative pl-12">
                        <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 ${
                          timelineStatus === 'completed' ? 'bg-green-500 border-green-500' :
                          timelineStatus === 'overdue' ? 'bg-red-500 border-red-500' :
                          timelineStatus === 'urgent' ? 'bg-[#FF6A00] border-[#FF6A00]' :
                          'bg-[#111214] border-[#FF6A00]'
                        }`} />
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(milestone.status)}
                              <h3 className="text-white font-medium">{milestone.title}</h3>
                              {getStatusBadge(milestone.status)}
                              {timelineStatus === 'overdue' && (
                                <Badge className="bg-red-500/20 text-red-500">OVERDUE</Badge>
                              )}
                              {timelineStatus === 'urgent' && (
                                <Badge className="bg-[#FF6A00]/20 text-[#FF6A00]">DUE SOON</Badge>
                              )}
                            </div>
                            {milestone.description && (
                              <p className="text-[#9BA3AF] text-sm mt-1">{milestone.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              {milestone.target_date && (
                                <span className={`flex items-center gap-1 ${
                                  timelineStatus === 'overdue' ? 'text-red-500' : 'text-[#9BA3AF]'
                                }`}>
                                  <Calendar className="w-4 h-4" />
                                  Target: {new Date(milestone.target_date).toLocaleDateString()}
                                </span>
                              )}
                              {mission && (
                                <Link href={`/operations/missions/${mission.id}`} className="text-[#FF6A00] hover:underline flex items-center gap-1">
                                  Mission: {mission.title}
                                  <ChevronRight className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-[#6B7280]">Progress</span>
                                <span className="text-white">{milestone.progress || 0}%</span>
                              </div>
                              <Progress value={milestone.progress || 0} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
