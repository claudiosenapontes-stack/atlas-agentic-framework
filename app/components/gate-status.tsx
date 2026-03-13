'use client';

import { CheckCircle, Clock, Loader2 } from 'lucide-react';

interface GateStatusProps {
  gate1?: 'operational' | 'degraded' | 'down' | 'in_progress';
  gate2?: 'operational' | 'degraded' | 'down' | 'in_progress';
  gate3?: 'pending' | 'in_progress' | 'operational';
}

export function GateStatus({ 
  gate1 = 'operational', 
  gate2 = 'operational', 
  gate3 = 'in_progress' 
}: GateStatusProps) {
  const gates = [
    { id: 1, name: 'Command Ingest', status: gate1 },
    { id: 2, name: 'Task Execution', status: gate2 },
    { id: 3, name: 'Delegation', status: gate3 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'degraded':
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'down':
        return <span className="w-4 h-4 rounded-full bg-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'degraded':
      case 'in_progress':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      case 'pending':
        return 'bg-slate-100 border-slate-200 text-slate-600';
      case 'down':
        return 'bg-red-100 border-red-200 text-red-800';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gates</span>
        <div className="flex items-center gap-2">
          {gates.map((gate) => (
            <div
              key={gate.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${getStatusColor(gate.status)}`}
              title={`Gate ${gate.id}: ${gate.name}`}
            >
              {getStatusIcon(gate.status)}
              <span>G{gate.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
