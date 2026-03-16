"use client";

import { useMemo } from "react";

interface Execution {
  id: string;
  status: string;
  agent_name: string | null;
  started_at: string;
  completed_at: string | null;
}

interface ExecutionThroughputProps {
  executions: Execution[];
}

export function ExecutionThroughput({ executions }: ExecutionThroughputProps) {
  const data = useMemo(() => {
    const hourlyData: Record<string, { hour: string; count: number; label: string }> = {};
    
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13);
      const label = hour.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
      hourlyData[key] = { hour: key, count: 0, label };
    }
    
    executions.forEach(exec => {
      const hour = exec.started_at.slice(0, 13);
      if (hourlyData[hour]) {
        hourlyData[hour].count++;
      }
    });
    
    return Object.values(hourlyData);
  }, [executions]);

  if (executions.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[#9BA3AF]">No execution data</div>;
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-48 gap-1">
        {data.map((item, i) => (
          <div key={item.hour} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-[#FF6A00]/80 rounded-t transition-all hover:bg-[#FF6A00]"
              style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: item.count > 0 ? "4px" : "0" }}
              title={`${item.label}: ${item.count} executions`}
            />
            {i % 4 === 0 && <span className="text-[10px] text-[#9BA3AF]">{item.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
