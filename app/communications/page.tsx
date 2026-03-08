import { getCommunications } from '@/app/actions/communications'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Mail, Phone, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CommunicationsPage() {
  const communications = await getCommunications(100)

  const channelIcons: Record<string, any> = {
    telegram: MessageSquare,
    email: Mail,
    phone: Phone,
    sms: MessageSquare,
    whatsapp: MessageSquare,
  }

  const directionColors = {
    inbound: 'bg-blue-900/50 border-blue-700',
    outbound: 'bg-green-900/50 border-green-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-gray-400">Cross-channel message tracking and coordination</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-900/50 border border-blue-700 px-4 py-2 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-400">
              {communications.filter((c: any) => c.direction === 'inbound').length}
            </div>
            <div className="text-xs text-blue-500">Inbound</div>
          </div>
          <div className="bg-green-900/50 border border-green-700 px-4 py-2 rounded-lg text-center">
            <div className="text-xl font-bold text-green-400">
              {communications.filter((c: any) => c.direction === 'outbound').length}
            </div>
            <div className="text-xs text-green-500">Outbound</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Channel</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Direction</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Company</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Summary</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Agent</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {communications.map((comm: any) => {
              const Icon = channelIcons[comm.channel_type] || MessageSquare
              return (
                <tr key={comm.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300 capitalize">{comm.channel_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      comm.direction === 'inbound' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'
                    }`}>
                      {comm.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {comm.company?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-white max-w-md truncate">
                    {comm.summary}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {comm.agent?.display_name || comm.agent?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
