import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

interface DirectExecutionParams {
  commandText: string;
  agentId: string;
  sourceChannel: string;
  sourceUserId: string;
  metadata?: Record<string, unknown>;
  companyId?: string;
}

interface DirectExecutionResult {
  success: boolean;
  taskId: string;
  output: string;
  executionTimeMs: number;
  persisted: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Agent workspace mapping
const AGENT_WORKSPACES: Record<string, string> = {
  henry: '/root/.openclaw/workspaces/henry',
  olivia: '/root/.openclaw/workspaces/olivia',
  harvey: '/root/.openclaw/workspaces/harvey',
  sophia: '/root/.openclaw/workspaces/sophia',
  einstein: '/root/.openclaw/workspaces/einstein',
  optimus: '/root/.openclaw/workspaces/optimus',
  'optimus-prime': '/root/.openclaw/workspaces/optimus-prime',
  prime: '/root/.openclaw/workspaces/optimus-prime',
  severino: '/root/.openclaw/workspaces/severino',
};

/**
 * Execute a command directly in the agent's context
 * Bypasses the durable worker pipeline for immediate response
 */
export async function executeDirectCommand(
  params: DirectExecutionParams
): Promise<DirectExecutionResult> {
  const startTime = Date.now();
  const taskId = randomUUID();
  
  const { commandText, agentId, sourceChannel, sourceUserId, metadata, companyId } = params;
  
  console.log(`[DIRECT_EXEC] Starting direct execution for ${agentId}: ${commandText.substring(0, 50)}...`);
  
  try {
    // Get agent workspace
    const workspacePath = AGENT_WORKSPACES[agentId.toLowerCase()];
    if (!workspacePath) {
      throw new Error(`Unknown agent: ${agentId}`);
    }
    
    // Execute using OpenClaw sessions_spawn via exec
    // This runs in the agent's context with their SOUL.md, TOOLS.md, etc.
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Prepare the command - remove "DIRECT:" prefix and agent name if present
    let cleanCommand = commandText
      .replace(/^DIRECT:/i, '')
      .replace(/^Direct:/i, '')
      .trim();
    
    // Remove agent name prefix if present (e.g., "Henry do something" → "do something")
    const agentNames = Object.keys(AGENT_WORKSPACES);
    for (const name of agentNames) {
      const regex = new RegExp(`^${name}\s+`, 'i');
      if (regex.test(cleanCommand)) {
        cleanCommand = cleanCommand.replace(regex, '').trim();
        break;
      }
    }
    
    // Use openclaw CLI to spawn a direct execution
    // This leverages the existing agent infrastructure
    const openclawCommand = `openclaw agent --agent ${agentId} --message '${cleanCommand.replace(/'/g, "'\\''")}' --json --timeout 60 2>&1`;
    
    console.log(`[DIRECT_EXEC] Executing: ${openclawCommand.substring(0, 100)}...`);
    
    const { stdout, stderr } = await execAsync(openclawCommand, {
      timeout: 60000, // 60 second timeout for direct commands
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
    
    const output = stdout || stderr || 'No output';
    const executionTimeMs = Date.now() - startTime;
    
    console.log(`[DIRECT_EXEC] Completed in ${executionTimeMs}ms`);
    
    // Persist execution record asynchronously (don't await)
    persistExecution({
      taskId,
      agentId,
      commandText: cleanCommand,
      output,
      executionTimeMs,
      sourceChannel,
      sourceUserId,
      companyId,
      success: true,
    }).catch(err => {
      console.error('[DIRECT_EXEC] Persistence error (non-blocking):', err);
    });
    
    return {
      success: true,
      taskId,
      output,
      executionTimeMs,
      persisted: true,
    };
    
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[DIRECT_EXEC] Error after ${executionTimeMs}ms:`, errorMessage);
    
    // Persist error record asynchronously
    persistExecution({
      taskId,
      agentId,
      commandText,
      output: `Error: ${errorMessage}`,
      executionTimeMs,
      sourceChannel,
      sourceUserId,
      companyId,
      success: false,
    }).catch(() => {});
    
    return {
      success: false,
      taskId,
      output: `Error: ${errorMessage}`,
      executionTimeMs,
      persisted: true,
    };
  }
}

/**
 * Check if a command should use direct execution
 */
export function isDirectCommand(commandText: string): boolean {
  if (!commandText) return false;
  
  const text = commandText.trim();
  
  // Explicit DIRECT: prefix
  if (/^DIRECT:/i.test(text)) {
    return true;
  }
  
  // Check for agent name at start + simple command patterns
  const agentNames = ['henry', 'olivia', 'harvey', 'sophia', 'einstein', 'optimus', 'prime', 'severino'];
  const lowerText = text.toLowerCase();
  
  for (const name of agentNames) {
    // Check if command starts with agent name
    if (lowerText.startsWith(`${name} `) || lowerText === name) {
      // Check for simple command patterns that indicate direct execution
      const afterAgent = text.slice(name.length).trim().toLowerCase();
      
      // Simple patterns - direct questions, status checks, quick commands
      const directPatterns = [
        /^ping$/i,
        /^status$/i,
        /^hello$/i,
        /^help$/i,
        /^what\s+is/i,
        /^what\s+are/i,
        /^who\s+is/i,
        /^when\s+is/i,
        /^where\s+is/i,
        /^how\s+(to|do|can|many)/i,
        /^check\s+/i,
        /^show\s+/i,
        /^list\s+/i,
        /^get\s+/i,
        /^return\s+/i,
        /^echo\s+/i,
        /^tell\s+me/i,
        /^audit/i,
        /^report/i,
        /^monitor/i,
      ];
      
      // Check if it matches a simple pattern OR is a short command (<100 chars)
      const isPatternMatch = directPatterns.some(pattern => pattern.test(afterAgent));
      const isShortCommand = text.length < 100;
      
      // Also check for complex patterns that should NOT be direct
      const complexPatterns = [
        /implement/i,
        /create\s+(a|an)\s+(new|full)/i,
        /build\s+(a|an)/i,
        /develop/i,
        /deploy/i,
        /mission/i,
        /project/i,
        /workflow/i,
        /schedule.*recurring/i,
        /every\s+(day|week|hour)/i,
      ];
      
      const isComplex = complexPatterns.some(pattern => pattern.test(afterAgent));
      
      return (isPatternMatch || isShortCommand) && !isComplex;
    }
  }
  
  return false;
}

/**
 * Persist execution record to Supabase (async, non-blocking)
 */
async function persistExecution(data: {
  taskId: string;
  agentId: string;
  commandText: string;
  output: string;
  executionTimeMs: number;
  sourceChannel: string;
  sourceUserId: string;
  companyId?: string;
  success: boolean;
}): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create task record
    await supabase.from('tasks').insert({
      id: data.taskId,
      title: `Direct: ${data.commandText.substring(0, 50)}`,
      description: data.commandText,
      status: data.success ? 'completed' : 'failed',
      assigned_agent_id: data.agentId,
      company_id: data.companyId || '64c8d2e8-da05-4f77-8898-9b1726bf8fd9',
      source_channel: data.sourceChannel,
      source_user_id: data.sourceUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      execution_mode: 'direct',
    });
    
    // Create execution record
    await supabase.from('executions').insert({
      id: randomUUID(),
      task_id: data.taskId,
      status: data.success ? 'completed' : 'failed',
      output_preview: data.output.substring(0, 500),
      output_full: data.output,
      started_at: new Date(Date.now() - data.executionTimeMs).toISOString(),
      completed_at: new Date().toISOString(),
      execution_time_ms: data.executionTimeMs,
    });
    
    console.log(`[DIRECT_EXEC] Persisted task ${data.taskId}`);
    
  } catch (error) {
    console.error('[DIRECT_EXEC] Failed to persist:', error);
    throw error;
  }
}

export default {
  executeDirectCommand,
  isDirectCommand,
};