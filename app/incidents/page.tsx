import { getIncidents } from '@/app/actions/incidents'
import { IncidentList } from '@/components/incident-list'

export const dynamic = 'force-dynamic'

export default async function IncidentsPage() {
  const incidents = await getIncidents()
  const openCount = incidents.filter((i: any) => ['open', 'in_progress'].includes(i.status)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-gray-400">Monitor and resolve operational incidents</p>
        </div>
        {openCount > 0 ? (
          <div className="bg-red-900/50 border border-red-700 px-4 py-2 rounded-lg">
            <span className="text-red-400 font-medium">{openCount} Open</span>
          </div>
        ) : (
          <div className="bg-green-900/50 border border-green-700 px-4 py-2 rounded-lg">
            <span className="text-green-400 font-medium">All Clear</span>
          </div>
        )}
      </div>

      <IncidentList incidents={incidents} />
    </div>
  )
}
