/**
 * ATLAS Agent Timezone Configuration
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * 
 * All agents must import and use this configuration for timezone consistency.
 */

import { 
  ATLAS_TIMEZONE, 
  AGENT_TIMEZONE_CONTEXT,
  formatAtlasDateWithZone,
  formatUTCDate,
  getDualTimestamp,
  initAtlasTimezone,
  validateTimezone 
} from '@/lib/timezone';

import { 
  createAgentLogger,
  logAgentTimezoneInit 
} from '@/lib/logging';

// Agent names
export const AGENTS = [
  'henry',
  'severino', 
  'optimus',
  'prime',
  'sophia',
  'olivia',
  'harvey',
  'einstein',
] as const;

export type AgentName = typeof AGENTS[number];

/**
 * Initialize an agent with Atlas timezone settings
 */
export function initAgent(agentName: AgentName): void {
  // Initialize timezone
  initAtlasTimezone();
  
  // Log initialization
  logAgentTimezoneInit(agentName);
}

/**
 * Get agent context with timezone info
 */
export function getAgentContext(agentName: AgentName) {
  return {
    name: agentName,
    timezone: ATLAS_TIMEZONE,
    location: 'Miami/New York',
    system_time: AGENT_TIMEZONE_CONTEXT.system_time,
    display_time: AGENT_TIMEZONE_CONTEXT.display_time,
    storage_time: AGENT_TIMEZONE_CONTEXT.storage_time,
  };
}

/**
 * Create a logger for a specific agent
 */
export function getAgentLogger(agentName: AgentName) {
  return createAgentLogger(agentName);
}

// Re-export timezone utilities for agents
export {
  ATLAS_TIMEZONE,
  AGENT_TIMEZONE_CONTEXT,
  formatAtlasDateWithZone,
  formatUTCDate,
  getDualTimestamp,
  validateTimezone,
};

// Default export for easy importing
export default {
  initAgent,
  getAgentContext,
  getAgentLogger,
  ATLAS_TIMEZONE,
  AGENT_TIMEZONE_CONTEXT,
};
