/**
 * ATLAS-9930 Phase 3: /api/agents/skills
 * Returns agent capabilities and model routing rules
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AgentSkills {
  id: string;
  displayName: string;
  description: string;
  handlers: {
    type: string;
    description: string;
    icon: string;
  }[];
  modelRouting: {
    provider: string;
    model: string;
    priority: 'high' | 'normal' | 'low';
  };
  capabilities: string[];
  permissions: string[];
  color: string;
}

const AGENT_CONFIGS: Record<string, AgentSkills> = {
  'henry': {
    id: 'henry',
    displayName: 'Henry',
    description: 'Fleet Commander and Chief Operating Officer. Coordinates all agents, monitors system health, and ensures mission success.',
    handlers: [
      { type: 'fleet', description: 'Fleet coordination and worker management', icon: 'Users' },
      { type: 'operations', description: 'Mission planning and status tracking', icon: 'Target' },
      { type: 'audit', description: 'System audits and health checks', icon: 'Search' },
      { type: 'coordinate', description: 'Cross-agent task orchestration', icon: 'GitBranch' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2.5', priority: 'normal' },
    capabilities: ['System Monitoring', 'Fleet Management', 'Mission Coordination', 'Health Audits'],
    permissions: ['view_all', 'restart_agents', 'create_missions', 'delegate_tasks'],
    color: 'blue'
  },
  'optimus': {
    id: 'optimus',
    displayName: 'Optimus',
    description: 'Lead Software Architect and Backend Developer. Builds APIs, database schemas, and core infrastructure.',
    handlers: [
      { type: 'code', description: 'Software development and coding', icon: 'Code' },
      { type: 'development', description: 'Backend API development', icon: 'Server' },
      { type: 'api', description: 'REST API design and implementation', icon: 'Globe' },
      { type: 'orchestrate', description: 'Service orchestration', icon: 'Layers' },
      { type: 'architecture', description: 'System architecture design', icon: 'Box' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2.5', priority: 'high' },
    capabilities: ['API Development', 'Database Design', 'System Architecture', 'Code Review'],
    permissions: ['deploy_api', 'modify_database', 'restart_services'],
    color: 'purple'
  },
  'optimus-prime': {
    id: 'optimus-prime',
    displayName: 'Optimus Prime',
    description: 'Autonomous AI Leader and Senior Developer. Handles complex architectural decisions and high-priority implementations.',
    handlers: [
      { type: 'code', description: 'Advanced software development', icon: 'Code' },
      { type: 'autonomy', description: 'Autonomous decision making', icon: 'Cpu' },
      { type: 'control', description: 'Fleet control and management', icon: 'Shield' },
      { type: 'deployment', description: 'Production deployment', icon: 'Rocket' },
      { type: 'orchestrate', description: 'Multi-service orchestration', icon: 'GitMerge' },
      { type: 'research', description: 'Technical research', icon: 'BookOpen' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2.5', priority: 'high' },
    capabilities: ['Autonomous Execution', 'Production Deployment', 'Architecture Leadership', 'Complex Problem Solving'],
    permissions: ['all', 'deploy_production', 'modify_infrastructure', 'restart_all'],
    color: 'indigo'
  },
  'prime': {
    id: 'prime',
    displayName: 'Prime',
    description: 'Infrastructure and DevOps Specialist. Manages deployments, monitoring, and system reliability.',
    handlers: [
      { type: 'deployment', description: 'Infrastructure deployment', icon: 'Cloud' },
      { type: 'infrastructure', description: 'Infrastructure as code', icon: 'Server' },
      { type: 'monitoring', description: 'System monitoring setup', icon: 'Activity' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2', priority: 'normal' },
    capabilities: ['DevOps', 'Infrastructure', 'Monitoring', 'CI/CD'],
    permissions: ['deploy', 'modify_infrastructure', 'view_monitoring'],
    color: 'violet'
  },
  'olivia': {
    id: 'olivia',
    displayName: 'Olivia',
    description: 'UI/UX Designer and Frontend Developer. Creates beautiful, responsive user interfaces.',
    handlers: [
      { type: 'ui', description: 'User interface design', icon: 'Layout' },
      { type: 'frontend', description: 'Frontend development', icon: 'Monitor' },
      { type: 'design', description: 'Visual design', icon: 'Palette' },
      { type: 'testing', description: 'UI testing', icon: 'CheckCircle' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2', priority: 'normal' },
    capabilities: ['UI Design', 'Frontend Dev', 'Responsive Design', 'Accessibility'],
    permissions: ['modify_ui', 'deploy_frontend'],
    color: 'pink'
  },
  'sophia': {
    id: 'sophia',
    displayName: 'Sophia',
    description: 'Data Analyst and Research Specialist. Extracts insights from data and conducts research.',
    handlers: [
      { type: 'data', description: 'Data analysis', icon: 'BarChart' },
      { type: 'analytics', description: 'Analytics and reporting', icon: 'PieChart' },
      { type: 'research', description: 'Market research', icon: 'Search' },
      { type: 'content', description: 'Content creation', icon: 'FileText' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2', priority: 'normal' },
    capabilities: ['Data Analysis', 'Research', 'Content Creation', 'Reporting'],
    permissions: ['view_data', 'create_reports'],
    color: 'emerald'
  },
  'harvey': {
    id: 'harvey',
    displayName: 'Harvey',
    description: 'Legal and Compliance Officer. Ensures all operations meet legal requirements.',
    handlers: [
      { type: 'legal', description: 'Legal review', icon: 'Scale' },
      { type: 'compliance', description: 'Compliance checking', icon: 'ShieldCheck' },
      { type: 'contracts', description: 'Contract analysis', icon: 'FileSignature' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2', priority: 'low' },
    capabilities: ['Legal Review', 'Compliance', 'Contract Analysis', 'Risk Assessment'],
    permissions: ['view_legal', 'flag_compliance'],
    color: 'red'
  },
  'einstein': {
    id: 'einstein',
    displayName: 'Einstein',
    description: 'Scientific Researcher and Analyst. Handles complex mathematical and scientific problems.',
    handlers: [
      { type: 'research', description: 'Scientific research', icon: 'Microscope' },
      { type: 'analysis', description: 'Deep analysis', icon: 'Brain' },
      { type: 'math', description: 'Mathematical modeling', icon: 'Calculator' },
      { type: 'science', description: 'Scientific computation', icon: 'Atom' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2.5', priority: 'normal' },
    capabilities: ['Scientific Research', 'Mathematical Modeling', 'Data Science', 'Analysis'],
    permissions: ['access_research', 'run_analysis'],
    color: 'cyan'
  },
  'severino': {
    id: 'severino',
    displayName: 'Severino',
    description: 'MCP Integration Specialist. Manages external tool integrations and API connections.',
    handlers: [
      { type: 'mcp', description: 'MCP server management', icon: 'Plug' },
      { type: 'integration', description: 'Third-party integration', icon: 'Link' },
      { type: 'tools', description: 'Tool orchestration', icon: 'Tool' }
    ],
    modelRouting: { provider: 'OpenRouter', model: 'kimi-k2', priority: 'low' },
    capabilities: ['MCP Integration', 'API Management', 'Tool Orchestration', 'External Services'],
    permissions: ['manage_integrations', 'configure_mcp'],
    color: 'orange'
  }
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    
    if (agentId) {
      // Return single agent skills
      const config = AGENT_CONFIGS[agentId];
      if (!config) {
        return NextResponse.json({
          success: false,
          error: `Agent ${agentId} not found`
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        agent: config,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
    
    // Return all agent skills
    return NextResponse.json({
      success: true,
      agents: Object.values(AGENT_CONFIGS),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });
    
  } catch (error: any) {
    console.error('Error fetching agent skills:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
