import { getCompanies, getCompanyStats } from '@/app/actions/companies'
import { Building2, FolderKanban, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
  const companies = await getCompanies()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-gray-400">Multi-company overview and management</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-lg">
          <div className="text-3xl font-bold">{companies.length}</div>
          <div className="text-sm text-gray-500">Active Companies</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company: any) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  )
}

async function CompanyCard({ company }: { company: any }) {
  const stats = await getCompanyStats(company.id)

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-900/50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{company.name}</h3>
            <span className="text-xs text-gray-500 uppercase">{company.slug}</span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          company.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
        }`}>
          {company.status}
        </span>
      </div>

      {company.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{company.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-700/50 rounded p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <FolderKanban className="w-4 h-4" />
            Projects
          </div>
          <div className="text-xl font-bold">{stats.projects}</div>
        </div>
        <div className="bg-gray-700/50 rounded p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Active Tasks
          </div>
          <div className="text-xl font-bold">{stats.tasksActive}</div>
        </div>
      </div>

      {stats.openIncidents > 0 && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          {stats.openIncidents} open incidents
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Total Tasks: {stats.tasksTotal}</span>
        <Link 
          href={`/companies/${company.id}`}
          className="text-blue-400 hover:text-blue-300"
        >
          View Details →
        </Link>
      </div>
    </div>
  )
}
