interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percent';
}

export function KPICard({ title, value, format }: KPICardProps) {
  const formatted = format === 'currency' 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    : format === 'percent'
    ? `${value.toFixed(1)}%`
    : value.toLocaleString();
    
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{formatted}</p>
    </div>
  );
}
