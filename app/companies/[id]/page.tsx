import { getCompanyById, getCompanyStats } from '@/app/actions/companies'
import { getTasks } from '@/app/actions/tasks'
import { getCommunicationsByTask } from '@/app/actions/communications'
import { formatDistanceToNow } from 'date-fns'
import { Building2, FolderKanban, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [company, stats] = await Promise.all([
    getCompanyById(params.id),
    getCompanyStats(params.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/companies" className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-gray-400">{company.description || 'No description'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          company.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
        }`}>
          {company.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Projects" value={stats.projects} />
        <StatCard icon={CheckCircle2} label="Active Tasks" value={stats.tasksActive} color="blue" />
        <StatCard icon={CheckCircle2} label="Total Tasks" value={stats.tasksTotal} />
        <StatCard 
          icon={AlertCircle} 
          label="Open Incidents" 
          value={stats.openIncidents} 
          color={stats.openIncidents > 0 ? 'red' : 'gray'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Projects</h2>
          {company.projects?.length > 0 ? (
            <div className="space-y-3">
              {company.projects.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <span className="text-white">{project.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    project.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No projects yet</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Assigned Agents</h2>
          {company.agents?.length > 0 ? (
            <div className="space-y-3">
              {company.agents.map((agent: any) => (
                <div key={agent.id} className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-bold">{agent.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white">{agent.display_name || agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No agents assigned</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color = 'gray' 
}: { 
  icon: any
  label: string
  value: number
  color?: 'gray' | 'blue' | 'red' | 'green'
}) {
  const colorClasses = {
    gray: 'bg-gray-700/50 text-gray-400',
    blue: 'bg-blue-900/50 text-blue-400',
    red: 'bg-red-900/50 text-red-400',
    green: 'bg-green-900/50 text-green-400',
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
