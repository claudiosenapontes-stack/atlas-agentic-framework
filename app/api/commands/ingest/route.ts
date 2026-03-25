import { NextRequest, NextResponse } from 'next/server';
import { ingestCommand, ingestComplexCommand, detectDirectExecutionAgent } from '@/lib/command-bus';
import { executeDirectCommand } from '@/lib/direct-executor';

// Canonical company UUID map
const COMPANY_ID_MAP: Record<string, string> = {
  ARQIA: '64c8d2e8-da05-4f77-8898-9b1726bf8fd9',
  arqia: '64c8d2e8-da05-4f77-8898-9b1726bf8fd9',
};

// POST /api/commands/ingest
// Normalized entry point for all commands with Phase 3B routing

export async function POST(request: NextRequest) {
  console.log('[API] Command ingest called');
  try {
    const body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body));

    // Validate required fields
    if (!body.sourceChannel || !body.companyId || !body.commandText) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceChannel, companyId, commandText' },
        { status: 400 }
      );
    }

    // Validate source channel
    const validChannels = ['telegram', 'mission_control', 'cron', 'webhook', 'api'];
    if (!validChannels.includes(body.sourceChannel)) {
      return NextResponse.json(
        { error: `Invalid sourceChannel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalize companyId: allow ARQIA code/slug, resolve to canonical UUID
    const normalizedCompanyId =
      COMPANY_ID_MAP[String(body.companyId)] ?? String(body.companyId);

    // Telegram must preserve real sender/chat identity
    if (body.sourceChannel === 'telegram' && !body.sourceUserId) {
      return NextResponse.json(
        { error: 'Missing Telegram identity' },
        { status: 400 }
      );
    }

    // ATLAS-OPTIMUS-TRUE-DIRECT-EXECUTION-LANE-001
    // Check for TRUE direct execution (bypasses worker pipeline)
    const directAgent = detectDirectExecutionAgent(body.commandText);
    if (directAgent && body.mode !== 'mission') {
      console.log(`[DIRECT_LANE] Detected direct command for ${directAgent}: ${body.commandText.substring(0, 50)}...`);
      
      const directStartTime = Date.now();
      const result = await executeDirectCommand({
        commandText: body.commandText,
        agentId: directAgent,
        sourceChannel: body.sourceChannel,
        sourceUserId: body.sourceUserId,
        companyId: normalizedCompanyId,
        metadata: body.metadata,
      });
      
      const totalTimeMs = Date.now() - directStartTime;
      console.log(`[DIRECT_LANE] Completed in ${totalTimeMs}ms, task ${result.taskId}`);
      
      return NextResponse.json({
        success: result.success,
        executionMode: 'direct_true', // True direct lane - bypasses worker pipeline
        taskId: result.taskId,
        routedToAgent: directAgent,
        output: result.output,
        executionTimeMs: result.executionTimeMs,
        timeToFirstOutputMs: totalTimeMs,
        persisted: result.persisted,
        message: result.success 
          ? `Direct execution completed in ${result.executionTimeMs}ms`
          : `Direct execution failed: ${result.output}`,
      });
    }

    // Check if this is a complex command with subtasks
    const isComplexCommand =
      body.subTasks &&
      Array.isArray(body.subTasks) &&
      body.subTasks.length > 0;

    let result;
    if (isComplexCommand) {
      result = await ingestComplexCommand({
        sourceChannel: body.sourceChannel,
        sourceUserId: body.sourceUserId ?? null,
        sourceMessageId: body.sourceMessageId,
        companyId: normalizedCompanyId,
        commandText: body.commandText,
        metadata: body.metadata,
        subTasks: body.subTasks,
        mode: body.mode, // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
      });
    } else {
      result = await ingestCommand({
        sourceChannel: body.sourceChannel,
        sourceUserId: body.sourceUserId ?? null,
        sourceMessageId: body.sourceMessageId,
        companyId: normalizedCompanyId,
        commandText: body.commandText,
        metadata: body.metadata,
        mode: body.mode, // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
      });
    }

    // Build response
    const response: Record<string, any> = {
      success: true,
      commandId: result.commandId,
      status: result.status,
      message: result.status === 'awaiting_approval'
        ? 'Command requires approval before execution'
        : 'Command queued for execution',
    };

    // Add execution mode (ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001)
    response.executionMode = result.executionMode || 'direct';
    
    // Add fields based on result type
    if ('parentTaskId' in result) {
      // Complex command result
      response.parentTaskId = result.parentTaskId;
      response.childTaskIds = result.childTaskIds;
      response.subTaskCount = result.childTaskIds.length;
    } else {
      // Standard command result
      if (result.taskId) {
        response.taskId = result.taskId;
      }
      if (result.routedToAgent) {
        response.routedToAgent = result.routedToAgent;
      }
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Commands API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// GET /api/commands/ingest
// Health check

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/commands/ingest',
    supportedChannels: ['telegram', 'mission_control', 'cron', 'webhook', 'api'],
    version: '3.0.0',
    phase: '3B',
    features: [
      'command_classification',
      'deterministic_agent_routing',
      'parent_child_tasks',
      'task_dependencies',
      'canonical_event_logging',
      'model_routing_k2_k25',
      'direct_vs_mission_mode_policy', // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
      'true_direct_execution_lane', // ATLAS-OPTIMUS-TRUE-DIRECT-EXECUTION-LANE-001
    ],
  });
}
