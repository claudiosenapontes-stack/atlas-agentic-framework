// Mock Supabase client for demonstration when real DB unavailable
const mockAgents = [
  { id: '1', name: 'henry', display_name: 'Henry', role: 'CEO', status: 'active', delegation_level: 'strategic' },
  { id: '2', name: 'olivia', display_name: 'Olivia', role: 'Executive Assistant', status: 'active', delegation_level: 'operational' },
  { id: '3', name: 'harvey', display_name: 'Harvey', role: 'Finance', status: 'active', delegation_level: 'execution' },
  { id: '4', name: 'sophia', display_name: 'Sophia', role: 'Marketing', status: 'active', delegation_level: 'execution' },
  { id: '5', name: 'einstein', display_name: 'Einstein', role: 'Research', status: 'active', delegation_level: 'execution' },
  { id: '6', name: 'optimus', display_name: 'Optimus', role: 'Tech Lead', status: 'active', delegation_level: 'execution' },
  { id: '7', name: 'prime', display_name: 'Prime', role: 'Senior Dev', status: 'active', delegation_level: 'execution' },
  { id: '8', name: 'severino', display_name: 'Severino', role: 'Operations', status: 'active', delegation_level: 'integrity' },
]

const mockTasks = [
  { id: '1', title: 'Deploy Mission Control', status: 'completed', priority: 'high', company_id: '1', assigned_agent_id: '6', created_at: '2026-03-07T10:00:00Z' },
  { id: '2', title: 'Setup Redis Queues', status: 'in_progress', priority: 'high', company_id: '1', assigned_agent_id: '8', created_at: '2026-03-07T11:00:00Z' },
  { id: '3', title: 'Configure PM2 Services', status: 'in_progress', priority: 'medium', company_id: '1', assigned_agent_id: '8', created_at: '2026-03-07T12:00:00Z' },
  { id: '4', title: 'Test ACL Processor', status: 'planned', priority: 'medium', company_id: '1', assigned_agent_id: '6', created_at: '2026-03-07T13:00:00Z' },
  { id: '5', title: 'Deploy Google Broker', status: 'blocked', priority: 'low', company_id: '1', assigned_agent_id: '6', created_at: '2026-03-07T14:00:00Z' },
]

const mockCompanies = [
  { id: '1', name: 'ARQIA', slug: 'arqia', status: 'active', description: 'AI Executive Network' },
  { id: '2', name: 'XGROUP', slug: 'xgroup', status: 'active', description: 'Investment Holdings' },
  { id: '3', name: 'SENA ENTERPRISES', slug: 'sena', status: 'active', description: 'Parent Company' },
]

const mockApprovals = [
  { id: '1', task_id: '1', status: 'approved', action_type: 'deployment', requested_by_agent_id: '6', created_at: '2026-03-07T10:00:00Z' },
  { id: '2', task_id: '2', status: 'pending', action_type: 'infrastructure_change', requested_by_agent_id: '8', created_at: '2026-03-07T11:00:00Z' },
]

const mockIncidents = [
  { id: '1', summary: 'Supabase DNS resolution failure', severity: 'high', status: 'open', company_id: '1', opened_at: '2026-03-07T22:00:00Z' },
]

const mockExecutions = [
  { id: '1', task_id: '1', agent_id: '6', status: 'succeeded', step: 'deploy', started_at: '2026-03-07T10:00:00Z', result_summary: 'Deployment successful' },
  { id: '2', task_id: '2', agent_id: '8', status: 'running', step: 'configure', started_at: '2026-03-07T11:00:00Z' },
]

const mockCommunications = [
  { id: '1', channel_type: 'telegram', direction: 'inbound', summary: 'Deployment status request', company_id: '1', agent_id: '1', created_at: '2026-03-07T22:00:00Z' },
  { id: '2', channel_type: 'email', direction: 'outbound', summary: 'Phase 4 completion report', company_id: '1', agent_id: '6', created_at: '2026-03-07T22:30:00Z' },
]

class MockSupabaseClient {
  from(table: string) {
    return new MockTableQuery(table)
  }
}

class MockTableQuery {
  private table: string
  private filters: any[] = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null

  constructor(table: string) {
    this.table = table
  }

  select(columns: string = '*') {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, op: 'in', value: values })
    return this
  }

  not(column: string, op: string, value: any) {
    this.filters.push({ column, op: 'not', value })
    return this
  }

  order(column: string, { ascending = true } = {}) {
    this.orderBy = { column, ascending }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  async single() {
    const data = this.getData()
    return { data: data[0] || null, error: null }
  }

  async then(callback: (result: any) => any) {
    const data = this.getData()
    return callback({ data, error: null })
  }

  private getData() {
    let data: any[] = []
    
    switch (this.table) {
      case 'agents': data = [...mockAgents]; break
      case 'tasks': data = [...mockTasks]; break
      case 'companies': data = [...mockCompanies]; break
      case 'approvals': data = [...mockApprovals]; break
      case 'incidents': data = [...mockIncidents]; break
      case 'executions': data = [...mockExecutions]; break
      case 'communications': data = [...mockCommunications]; break
      default: data = []
    }

    // Apply filters
    for (const filter of this.filters) {
      if (filter.op === 'eq') {
        data = data.filter(row => row[filter.column] === filter.value)
      } else if (filter.op === 'in') {
        data = data.filter(row => filter.value.includes(row[filter.column]))
      } else if (filter.op === 'not') {
        data = data.filter(row => !filter.value.includes(row[filter.column]))
      }
    }

    // Apply ordering
    if (this.orderBy) {
      data.sort((a, b) => {
        const aVal = a[this.orderBy!.column]
        const bVal = b[this.orderBy!.column]
        if (aVal < bVal) return this.orderBy!.ascending ? -1 : 1
        if (aVal > bVal) return this.orderBy!.ascending ? 1 : -1
        return 0
      })
    }

    // Apply limit
    if (this.limitCount) {
      data = data.slice(0, this.limitCount)
    }

    return data
  }
}

export const supabase = new MockSupabaseClient() as any
