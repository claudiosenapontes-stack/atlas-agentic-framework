'use client'

import { useState } from 'react'
import { resolveIncident } from '@/app/actions/incidents'
import { formatDistanceToNow } from 'date-fns'

interface IncidentListProps {
  incidents: any[]
}

export function IncidentList({ incidents }: IncidentListProps) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? incidents : 
    filter === 'open' ? incidents.filter((i: any) => ['open', 'in_progress'].includes(i.status)) :
    incidents.filter((i: any) => i.status === 'resolved')

  const handleResolve = async (id: string) => {
    await resolveIncident(id, 'Resolved via Mission Control')
    window.location.reload()
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-700 text-red-100',
    high: 'bg-orange-700 text-orange-100',
    medium: 'bg-amber-700 text-amber-100',
    low: 'bg-gray-700 text-gray-100',
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'open', 'resolved'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No incidents found</div>
        ) : (
          filtered.map((incident: any) => (
            <div key={incident.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[incident.severity] || 'bg-gray-700'}`}>
                      {incident.severity}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      incident.status === 'open' ? 'bg-red-900/50 text-red-400' :
                      incident.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-green-900/50 text-green-400'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-white">{incident.summary}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Opened {formatDistanceToNow(new Date(incident.opened_at))} ago
                    {incident.company && ` • ${incident.company.name}`}
                  </p>
                </div>

                {['open', 'in_progress'].includes(incident.status) && (
                  <button
                    onClick={() => handleResolve(incident.id)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
