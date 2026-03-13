/**
 * Agent resolver with caching for workflow task creation
 * ATLAS-GATE4-AGENT-ID-MAPPING-291
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Simple in-memory cache for agent name → UUID lookups
// Cache TTL: 5 minutes
const agentCache = new Map<string, { uuid: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface AgentLookupResult {
  success: boolean;
  uuid?: string;
  error?: string;
}

/**
 * Resolve agent name to UUID with caching
 * Query: SELECT id FROM agents WHERE name = $agent_name
 */
export async function resolveAgentName(agentName: string): Promise<AgentLookupResult> {
  if (!agentName || typeof agentName !== "string") {
    return { success: false, error: "Agent name is required" };
  }

  const normalizedName = agentName.trim().toLowerCase();

  // Check cache first
  const cached = agentCache.get(normalizedName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { success: true, uuid: cached.uuid };
  }

  // Query database
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select("id")
    .eq("name", agentName)
    .single();

  if (error || !data) {
    return {
      success: false,
      error: `Agent '${agentName}' not found. Please ensure the agent is registered before creating workflows.`,
    };
  }

  // Cache the result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uuid = (data as any).id as string;
  agentCache.set(normalizedName, { uuid, timestamp: Date.now() });

  return { success: true, uuid };
}

/**
 * Resolve multiple agent names to UUIDs in batch
 * Returns map of name → UUID for successful lookups
 */
export async function resolveAgentNames(agentNames: string[]): Promise<{
  resolved: Map<string, string>;
  errors: string[];
}> {
  const resolved = new Map<string, string>();
  const errors: string[] = [];
  const uniqueNames = Array.from(new Set(agentNames.filter(Boolean)));

  for (const name of uniqueNames) {
    const result = await resolveAgentName(name);
    if (result.success && result.uuid) {
      resolved.set(name, result.uuid);
    } else {
      errors.push(result.error || `Failed to resolve agent: ${name}`);
    }
  }

  return { resolved, errors };
}

/**
 * Clear the agent cache (useful for testing or cache invalidation)
 */
export function clearAgentCache(): void {
  agentCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getAgentCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: agentCache.size,
    entries: Array.from(agentCache.keys()),
  };
}
