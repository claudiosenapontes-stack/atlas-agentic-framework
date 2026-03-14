interface QuarantineDetail {
  row_number: number;
  error_code: string;
  error_message: string;
}

interface ImportSummaryCardProps {
  company_name: string;
  rows_received: number;
  rows_accepted: number;
  rows_deduped: number;
  rows_quarantined: number;
  campaigns_normalized: number;
  date_range: {
    earliest: string;
    latest: string;
    days_covered: number;
  };
  quarantine_details?: QuarantineDetail[];
}

export function ImportSummaryCard(props: ImportSummaryCardProps) {
  const status = props.rows_quarantined === 0 
    ? 'success' 
    : props.rows_accepted > 0 
    ? 'partial' 
    : 'failed';
    
  const statusConfig = {
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', title: 'Import Successful' },
    partial: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠️', title: 'Import Partial' },
    failed: { bg: 'bg-red-50', border: 'border-red-200', icon: '❌', title: 'Import Failed' }
  };
  
  const config = statusConfig[status];
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
    
  return (
    <div className={`bg-white rounded-lg shadow border ${config.border} max-w-3xl`}>
      <div className={`p-4 rounded-t-lg ${config.bg} border-b ${config.border}`}>
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <h3 className="font-semibold text-gray-900">{config.title} — {props.company_name}</h3>
        </div>
      </div>
      
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatBox label="Received" value={props.rows_received} />
          <StatBox label="Accepted" value={props.rows_accepted} color="green" />
          <StatBox label="Deduped" value={props.rows_deduped} color="blue" />
          <StatBox label="Quarantined" value={props.rows_quarantined} color={props.rows_quarantined > 0 ? 'red' : 'gray'} />
        </div>
        
        {/* Campaigns & Date Range */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Campaigns Normalized</p>
            <p className="text-lg font-semibold text-gray-900">{props.campaigns_normalized}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date Range</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(props.date_range.earliest)} → {formatDate(props.date_range.latest)}
            </p>
            <p className="text-xs text-gray-500">({props.date_range.days_covered} days)</p>
          </div>
        </div>
        
        {/* Quarantine Details */}
        {props.quarantine_details && props.quarantine_details.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quarantine Details</h4>
            <div className="space-y-2">
              {props.quarantine_details.map((detail, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg text-sm">
                  <span className="text-red-600 font-medium">Row {detail.row_number}</span>
                  <span className="text-red-800">{detail.error_code}</span>
                  <span className="text-red-600">—</span>
                  <span className="text-red-700">{detail.error_message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            View Campaigns
          </button>
          {props.rows_quarantined > 0 && (
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Download Quarantined
            </button>
          )}
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors ml-auto">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ 
  label, 
  value, 
  color = 'gray' 
}: { 
  label: string; 
  value: number; 
  color?: 'gray' | 'green' | 'blue' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-900',
    green: 'bg-green-50 text-green-900',
    blue: 'bg-blue-50 text-blue-900',
    red: 'bg-red-50 text-red-900'
  };
  
  return (
    <div className={`text-center p-4 rounded-lg ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{label}</p>
    </div>
  );
}
