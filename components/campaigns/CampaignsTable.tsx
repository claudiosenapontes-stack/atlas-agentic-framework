interface Campaign {
  id: string;
  name: string;
  platform: string;
  spend: number;
  leads: number;
  cpl: number;
  status: 'active' | 'paused' | 'archived';
}

interface CampaignsTableProps {
  campaigns: Campaign[];
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPL</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                <div className="text-xs text-gray-500">{campaign.id.slice(0, 20)}...</div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {campaign.platform}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-900">
                {formatCurrency(campaign.spend)}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-900">
                {campaign.leads.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right text-sm text-gray-900">
                {formatCurrency(campaign.cpl)}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  campaign.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : campaign.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {campaign.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {campaigns.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No campaigns found for the selected filters.
        </div>
      )}
    </div>
  );
}
