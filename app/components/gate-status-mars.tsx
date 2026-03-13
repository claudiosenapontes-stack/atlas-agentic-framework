'use client';

import { CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react';

interface GateStatusMarsProps {
  gate1?: 'operational' | 'degraded' | 'in_progress' | 'pending';
  gate2?: 'operational' | 'degraded' | 'in_progress' | 'pending';
  gate3?: 'operational' | 'degraded' | 'in_progress' | 'pending';
  gate4?: 'operational' | 'degraded' | 'in_progress' | 'pending';
  gate5a?: 'operational' | 'degraded' | 'in_progress' | 'pending';
}

// Strict color usage:
// - Green (#16C784): operational/verified ONLY
// - Yellow (#FFB020): in_progress/partial/preview
// - Red (#FF3B30): degraded/error
// - Gray (#6B7280): pending
const GATE_CONFIG = {
  operational: {
    icon: CheckCircle2,
    color: 'text-[#16C784]',
    bg: 'bg-[#16C784]/10',
    border: 'border-[#16C784]/30',
    label: 'VERIFIED',
  },
  degraded: {
    icon: AlertCircle,
    color: 'text-[#FF3B30]',
    bg: 'bg-[#FF3B30]/10',
    border: 'border-[#FF3B30]/30',
    label: 'DEGRADED',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-[#FFB020]',
    bg: 'bg-[#FFB020]/10',
    border: 'border-[#FFB020]/30',
    label: 'PARTIAL',
  },
  pending: {
    icon: Circle,
    color: 'text-[#6B7280]',
    bg: 'bg-[#1F2226]',
    border: 'border-[#1F2226]',
    label: 'PENDING',
  },
};

/**
 * GateStatusMars — Truthful Gate Status Display
 * 
 * Current Truth:
 * - Gate 1 (Ingest): VERIFIED (green)
 * - Gate 2 (Execute): VERIFIED (green)
 * - Gate 3 (Delegate): VERIFIED (green)
 * - Gate 4 (Orchestrate): PARTIAL (yellow)
 * - Gate 5A (Durable): PLANNED/SPEC'D (gray)
 */
export function GateStatusMars({ 
  gate1 = 'operational', 
  gate2 = 'operational', 
  gate3 = 'operational',
  gate4 = 'operational',
  gate5a = 'in_progress'
}: GateStatusMarsProps) {
  const gates = [
    { id: 'G1', name: 'INGEST', status: gate1 },
    { id: 'G2', name: 'EXECUTE', status: gate2 },
    { id: 'G3', name: 'DELEGATE', status: gate3 },
    { id: 'G4', name: 'ORCH', status: gate4 },
    { id: 'G5A', name: 'DURABLE', status: gate5a },
  ];

  return (
    <div className="flex items-center gap-1 bg-[#111214] rounded-lg p-1 border border-[#1F2226]">
      {gates.map((gate, index) => {
        const config = GATE_CONFIG[gate.status];
        const Icon = config.icon;
        
        return (
          <div key={gate.id} className="flex items-center">
            <div 
              className={`
                flex items-center gap-1.5 px-2 py-1.5 rounded-md
                ${config.bg} ${config.border} border
                transition-all duration-300
              `}
              title={`${gate.id}: ${gate.name} — ${config.label}`}
            >
              <Icon className={`w-3.5 h-3.5 ${config.color} ${gate.status === 'in_progress' ? 'animate-spin' : ''}`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#6B7280] leading-none">{gate.id}</span>
                <span className={`text-[9px] font-medium ${config.color} leading-tight mt-0.5`}>
                  {config.label}
                </span>
              </div>
            </div>
            {index < gates.length - 1 && (
              <div className="w-px h-5 bg-[#1F2226] mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}
