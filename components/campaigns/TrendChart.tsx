"use client";

interface TrendDataPoint {
  date: string;
  spend: number;
  leads: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  const maxSpend = Math.max(...data.map(d => d.spend));
  const maxLeads = Math.max(...data.map(d => d.leads));
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">7-Day Trend</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded"></span>
            <span className="text-gray-600">Spend</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Leads</span>
          </div>
        </div>
      </div>
      
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
          <span>${maxSpend.toFixed(0)}</span>
          <span>${(maxSpend / 2).toFixed(0)}</span>
          <span>$0</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-16 mr-8 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map(i => (
              <div key={i} className="border-t border-gray-200"></div>
            ))}
          </div>
          
          {/* Bars for spend */}
          <div className="absolute inset-0 flex items-end justify-around">
            {data.map((point, i) => {
              const height = (point.spend / maxSpend) * 80;
              const leadY = 100 - (point.leads / maxLeads) * 80;
              
              return (
                <div key={i} className="flex flex-col items-center gap-2" style={{ width: '12%' }}>
                  {/* Leads dot */}
                  <div 
                    className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"
                    style={{ 
                      bottom: `${leadY}%`,
                      left: `${(i / data.length) * 100 + (50 / data.length)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  
                  {/* Spend bar */}
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`${formatDate(point.date)}: $${point.spend.toFixed(2)} spend, ${point.leads} leads`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Leads axis (right) */}
        <div className="absolute right-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxLeads}</span>
          <span>{Math.round(maxLeads / 2)}</span>
          <span>0</span>
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-around ml-16 mr-8 mt-2 text-xs text-gray-500">
        {data.map((point, i) => (
          <span key={i} style={{ width: '12%', textAlign: 'center' }}>
            {formatDate(point.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
