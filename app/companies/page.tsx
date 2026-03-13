import { getCompanies, getCompanyStats } from '@/app/actions/companies'
import { Building2, FolderKanban, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * COMPANIES PAGE — Business Layer
 * 
 * Visual characteristics:
 * - Clean, structured card layout
 * - Business-focused information hierarchy
 * - Calmer visual treatment
 * - Clear action pathways
 */

export default async function CompaniesPage() {
  const companies = await getCompanies()

  return (
    <div className="space-y-6">
      {/* Header — Clean Business Style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Companies</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Multi-company workspace overview</p>
        </div>
        <div className="bg-[#111214] border border-[#1F2226] px-4 py-3 rounded-[10px]">
          <div className="text-2xl font-semibold text-white">{companies.length}</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Active</div>
        </div>
      </div>

      {/* Companies Grid — Clean Business Cards */}
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
    <div className="bg-[#111214] rounded-[10px] p-4 border border-[#1F2226] hover:border-[#6B7280]/30 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1F2226] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <h3 className="font-medium text-white">{company.name}</h3>
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">{company.slug}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          company.status === 'active' 
            ? 'bg-[#16C784]/10 text-[#16C784] border border-[#16C784]/30' 
            : 'bg-[#1F2226] text-[#6B7280] border border-[#1F2226]'
        }`}>
          {company.status}
        </span>
      </div>

      {/* Description */}
      {company.description && (
        <p className="text-sm text-[#9BA3AF] mb-4 line-clamp-2">{company.description}</p>
      )}

      {/* Stats — Clean Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#0B0B0C] rounded-lg p-3 border border-[#1F2226]/50">
          <div className="flex items-center gap-2 text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">
            <FolderKanban className="w-3 h-3" />
            Projects
          </div>
          <div className="text-lg font-semibold text-white">{stats.projects}</div>
        </div>
        <div className="bg-[#0B0B0C] rounded-lg p-3 border border-[#1F2226]/50">
          <div className="flex items-center gap-2 text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-3 h-3" />
            Active Tasks
          </div>
          <div className="text-lg font-semibold text-white">{stats.tasksActive}</div>
        </div>
      </div>

      {/* Incidents Alert */}
      {stats.openIncidents > 0 && (
        <div className="flex items-center gap-2 text-[#FF3B30] text-xs mb-3 p-2 bg-[#FF3B30]/10 rounded-lg border border-[#FF3B30]/30">
          <AlertCircle className="w-4 h-4" />
          {stats.openIncidents} open incidents
        </div>
      )}

      {/* Footer — Clear Action */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1F2226]">
        <span className="text-xs text-[#6B7280]">{stats.tasksTotal} total tasks</span>
        <Link 
          href={`/companies/${company.id}`}
          className="flex items-center gap-1 text-xs text-[#FF6A00] hover:text-[#FFB020] transition-colors group-hover:gap-2"
        >
          View
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
