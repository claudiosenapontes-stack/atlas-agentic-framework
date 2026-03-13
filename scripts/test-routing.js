// Routing Test Script for Atlas Command Bus
// Tests the corrected deterministic routing logic

const AGENT_NAMES = ['henry', 'harvey', 'einstein', 'sophia', 'severino', 'olivia', 'optimus', 'prime'];

const AGENT_ROUTING = {
  // Finance operations
  budget: { agent: 'harvey', reason: 'financial_analysis_required' },
  finance: { agent: 'harvey', reason: 'financial_analysis_required' },
  cost: { agent: 'harvey', reason: 'financial_analysis_required' },
  pricing: { agent: 'harvey', reason: 'financial_analysis_required' },
  invoice: { agent: 'harvey', reason: 'financial_analysis_required' },
  
  // Research and analysis
  research: { agent: 'einstein', reason: 'research_deep_dive_required' },
  analyze: { agent: 'einstein', reason: 'research_deep_dive_required' },
  investigate: { agent: 'einstein', reason: 'research_deep_dive_required' },
  study: { agent: 'einstein', reason: 'research_deep_dive_required' },
  
  // Marketing
  marketing: { agent: 'sophia', reason: 'marketing_strategy_required' },
  brand: { agent: 'sophia', reason: 'marketing_strategy_required' },
  campaign: { agent: 'sophia', reason: 'marketing_strategy_required' },
  social: { agent: 'sophia', reason: 'marketing_strategy_required' },
  content: { agent: 'sophia', reason: 'marketing_strategy_required' },
  
  // Infrastructure / DevOps
  deploy: { agent: 'severino', reason: 'infrastructure_operation_required' },
  server: { agent: 'severino', reason: 'infrastructure_operation_required' },
  infrastructure: { agent: 'severino', reason: 'infrastructure_operation_required' },
  hosting: { agent: 'severino', reason: 'infrastructure_operation_required' },
  database: { agent: 'severino', reason: 'infrastructure_operation_required' },
  
  // Technical implementation
  code: { agent: 'optimus', reason: 'technical_implementation_required' },
  implement: { agent: 'optimus', reason: 'technical_implementation_required' },
  build: { agent: 'optimus', reason: 'technical_implementation_required' },
  develop: { agent: 'optimus', reason: 'technical_implementation_required' },
  feature: { agent: 'optimus', reason: 'technical_implementation_required' },
  bug: { agent: 'optimus', reason: 'technical_implementation_required' },
  fix: { agent: 'optimus', reason: 'technical_implementation_required' },
  
  // Complex technical architecture
  architecture: { agent: 'prime', reason: 'senior_technical_design_required' },
  refactor: { agent: 'prime', reason: 'senior_technical_design_required' },
  redesign: { agent: 'prime', reason: 'senior_technical_design_required' },
  optimize: { agent: 'prime', reason: 'senior_technical_design_required' },
  scale: { agent: 'prime', reason: 'senior_technical_design_required' },
  
  // Executive/operations coordination
  coordinate: { agent: 'henry', reason: 'operational_coordination_required' },
  orchestrate: { agent: 'henry', reason: 'operational_coordination_required' },
  manage: { agent: 'henry', reason: 'operational_coordination_required' },
  sync: { agent: 'henry', reason: 'operational_coordination_required' },
  
  // Administrative/EA tasks
  schedule: { agent: 'olivia', reason: 'executive_assistance_required' },
  calendar: { agent: 'olivia', reason: 'executive_assistance_required' },
  meeting: { agent: 'olivia', reason: 'executive_assistance_required' },
  organize: { agent: 'olivia', reason: 'executive_assistance_required' },
  prepare: { agent: 'olivia', reason: 'executive_assistance_required' },
  email: { agent: 'olivia', reason: 'communication_management_required' },
  gmail: { agent: 'olivia', reason: 'communication_management_required' },
  notify: { agent: 'olivia', reason: 'notification_delivery_required' },
  document: { agent: 'olivia', reason: 'document_management_required' },
  
  // Code review specific (distinguish from general review)
  'code review': { agent: 'prime', reason: 'senior_code_review_required' },
  'pr review': { agent: 'prime', reason: 'senior_code_review_required' },
  'pull request': { agent: 'prime', reason: 'senior_code_review_required' },
};

function extractExplicitAgent(text) {
  const t = text.toLowerCase();
  
  // Pattern 1: "for [Agent]" or "to [Agent]"
  const forPattern = /\b(?:for|to|assign to|assign|ask|tell|have)\s+(\w+)\b/i;
  const forMatch = t.match(forPattern);
  if (forMatch) {
    const name = forMatch[1].toLowerCase();
    if (AGENT_NAMES.includes(name)) {
      return { agent: name, reason: `explicit_agent_mention_via_preposition: "${forMatch[0]}"` };
    }
  }
  
  // Pattern 2: Direct agent name at start or after punctuation
  const directPattern = /^(?:\w+\s+)?(\w+)(?:\s+(?:to|that|about|the))/i;
  const directMatch = t.match(directPattern);
  if (directMatch) {
    const name = directMatch[1].toLowerCase();
    if (AGENT_NAMES.includes(name)) {
      return { agent: name, reason: `explicit_agent_mention_at_start: "${directMatch[1]}"` };
    }
  }
  
  // Pattern 3: Context-aware routing - if agent name appears before action keywords
  for (const agentName of AGENT_NAMES) {
    // Check if agent name appears early in the command (first 5 words)
    const words = t.split(/\s+/).slice(0, 5);
    if (words.includes(agentName)) {
      return { agent: agentName, reason: `explicit_agent_mention_in_opening: "${agentName}"` };
    }
  }
  
  return null;
}

function determineAgent(text, commandType) {
  const t = text.toLowerCase();
  
  // PRIORITY 1: Check for explicit agent mentions (highest priority)
  const explicitAgent = extractExplicitAgent(text);
  if (explicitAgent) {
    return explicitAgent;
  }
  
  // PRIORITY 2: Context-aware keyword routing
  // Distinguish between "review" (code review) and "review" (general assessment)
  if (t.includes('review')) {
    // Code review context
    if (t.includes('code') || t.includes('pr') || t.includes('pull request') || t.includes('merge')) {
      return { agent: 'prime', reason: 'code_review_context_detected' };
    }
    // Gmail/document review context
    if (t.includes('gmail') || t.includes('email') || t.includes('document') || t.includes('doc')) {
      return { agent: 'olivia', reason: 'document_review_assistance_required' };
    }
  }
  
  // PRIORITY 3: Standard keyword matches from AGENT_ROUTING
  for (const [keyword, route] of Object.entries(AGENT_ROUTING)) {
    if (t.includes(keyword)) {
      return route;
    }
  }
  
  // PRIORITY 4: Default routing based on command type
  const defaultRoutes = {
    deploy: { agent: 'severino', reason: 'infrastructure_deployment_default' },
    report: { agent: 'henry', reason: 'operational_report_default' },
    query_status: { agent: 'henry', reason: 'status_query_default' },
    spawn_agent: { agent: 'henry', reason: 'agent_management_default' },
    kill_agent: { agent: 'henry', reason: 'agent_management_default' },
    analyze: { agent: 'einstein', reason: 'analysis_default' },
    investigate: { agent: 'einstein', reason: 'investigation_default' },
    implement: { agent: 'optimus', reason: 'implementation_default' },
    review: { agent: 'prime', reason: 'code_review_default' },
  };
  
  return defaultRoutes[commandType] || { agent: 'henry', reason: 'general_task_default' };
}

// Test cases
const testCases = [
  { command: "create task for Olivia to review the Gmail integration", expected: "olivia", reason: "explicit agent mention" },
  { command: "Henry deploy Atlas and notify Olivia", expected: "severino", reason: "keyword 'deploy' routes to severino" },
  { command: "review the code PR for bugs", expected: "prime", reason: "code review context" },
  { command: "ask Olivia to schedule a meeting", expected: "olivia", reason: "explicit agent mention" },
  { command: "Optimus implement the new feature", expected: "optimus", reason: "explicit agent mention at start" },
  { command: "analyze the market trends", expected: "einstein", reason: "keyword 'analyze'" },
  { command: "prepare the quarterly report", expected: "olivia", reason: "keyword 'prepare'" },
  { command: "review the document", expected: "olivia", reason: "document review context" },
  { command: "have Harvey check the budget", expected: "harvey", reason: "explicit agent mention" },
  { command: "tell Sophia to start the campaign", expected: "sophia", reason: "explicit agent mention" },
  { command: "Severino restart the server", expected: "severino", reason: "explicit agent mention at start" },
  { command: "Einstein research AI trends", expected: "einstein", reason: "explicit agent mention at start" },
];

console.log('='.repeat(80));
console.log('ATLAS ROUTING TEST RESULTS');
console.log('='.repeat(80));
console.log();

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = determineAgent(test.command, 'create_task');
  const success = result.agent === test.expected;
  
  if (success) {
    passed++;
    console.log(`✅ PASS: "${test.command.slice(0, 50)}..."`);
    console.log(`   → ${result.agent} (${result.reason})`);
  } else {
    failed++;
    console.log(`❌ FAIL: "${test.command.slice(0, 50)}..."`);
    console.log(`   Expected: ${test.expected} (${test.reason})`);
    console.log(`   Got: ${result.agent} (${result.reason})`);
  }
  console.log();
}

console.log('='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

process.exit(failed > 0 ? 1 : 0);
