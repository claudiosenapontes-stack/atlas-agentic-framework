import { NextRequest, NextResponse } from 'next/server';
import { ingestCommand, ingestComplexCommand } from '@/lib/command-bus';

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
      });
    } else {
      result = await ingestCommand({
        sourceChannel: body.sourceChannel,
        sourceUserId: body.sourceUserId ?? null,
        sourceMessageId: body.sourceMessageId,
        companyId: normalizedCompanyId,
        commandText: body.commandText,
        metadata: body.metadata,
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
      'model_routing_k2_k25'
    ],
  });
}
