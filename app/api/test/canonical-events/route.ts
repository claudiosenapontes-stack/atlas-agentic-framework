import { NextRequest, NextResponse } from 'next/server';
import {
  logTaskStarted,
  logTaskCompleted,
  logTaskFailed,
  logApprovalRequested,
  logApprovalResponded,
  logEvent,
} from '@/lib/command-bus';

// POST /api/test/canonical-events
// Test endpoint that emits rich canonical events for Mission Control verification

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId = '29712e4c-a88a-4269-8adb-2802a79087a6', scenario = 'full' } = body;

    const results: string[] = [];
    const testTaskId = `test-task-${Date.now()}`;
    const testApprovalId = `test-approval-${Date.now()}`;
    const testCommandId = `test-cmd-${Date.now()}`;

    // Step 1: Emit task.started event
    await logTaskStarted({
      taskId: testTaskId,
      companyId,
      assignedAgentId: 'henry',
      commandId: testCommandId,
      metadata: {
        test_scenario: scenario,
        step: 1,
        description: 'Task initialization phase',
      },
    });
    results.push('✅ task.started');

    // Step 2: Emit command.received event
    await logEvent({
      eventType: 'command.received',
      actorType: 'user',
      actorId: '8231688634',
      companyId,
      targetType: 'command',
      targetId: testCommandId,
      sourceChannel: 'telegram',
      payload: {
        command_text: 'Test canonical events',
        parsed_intent: { action: 'test', target: 'events' },
      },
    });
    results.push('✅ command.received');

    // Step 3: Emit agent.assigned event
    await logEvent({
      eventType: 'agent.assigned',
      actorType: 'system',
      actorId: 'command_bus',
      companyId,
      targetType: 'task',
      targetId: testTaskId,
      routedToAgentId: 'henry',
      routingReason: 'test_scenario_execution',
      modelUsed: 'openrouter/moonshotai/kimi-k2.5',
    });
    results.push('✅ agent.assigned');

    // Step 4: Emit approval.requested (if scenario includes approval)
    if (scenario === 'full' || scenario === 'approval') {
      await logApprovalRequested({
        approvalId: testApprovalId,
        commandId: testCommandId,
        companyId,
        requestedBy: 'henry',
        riskLevel: 'medium',
        estimatedCostUsd: 0.05,
        approvalType: 'test_verification',
        metadata: {
          reason: 'Mission Control event stream test',
          auto_approve: false,
        },
      });
      results.push('✅ approval.requested');

      // Step 5: Emit approval.responded
      await logApprovalResponded({
        approvalId: testApprovalId,
        commandId: testCommandId,
        companyId,
        respondedBy: '8231688634',
        decision: 'approved',
        reason: 'Test approved for verification',
      });
      results.push('✅ approval.responded');
    }

    // Step 6: Emit task progress events
    await logEvent({
      eventType: 'task.progress',
      actorType: 'agent',
      actorId: 'henry',
      companyId,
      targetType: 'task',
      targetId: testTaskId,
      payload: {
        progress_percent: 50,
        stage: 'executing',
        message: 'Processing test events...',
      },
    });
    results.push('✅ task.progress');

    // Step 7: Emit task.completed (success path)
    if (scenario !== 'failure') {
      await logTaskCompleted({
        taskId: testTaskId,
        companyId,
        assignedAgentId: 'henry',
        commandId: testCommandId,
        durationMs: 1250,
        result: {
          success: true,
          events_emitted: results.length + 1,
          test_passed: true,
        },
        metadata: {
          steps_completed: results.length,
          verification_status: 'passed',
        },
      });
      results.push('✅ task.completed');
    } else {
      // Emit task.failed (failure path)
      await logTaskFailed({
        taskId: testTaskId,
        companyId,
        assignedAgentId: 'henry',
        commandId: testCommandId,
        error: 'Simulated failure for test scenario',
        errorCode: 'TEST_FAILURE',
        retryable: true,
        metadata: {
          failure_stage: 'execution',
          can_retry: true,
        },
      });
      results.push('❌ task.failed');
    }

    // Step 8: Emit final metric event
    await logEvent({
      eventType: 'metric.execution',
      actorType: 'system',
      actorId: 'test_harness',
      companyId,
      targetType: 'task',
      targetId: testTaskId,
      payload: {
        total_events: results.length + 1,
        duration_ms: 1250,
        scenario,
        timestamp: new Date().toISOString(),
      },
    });
    results.push('✅ metric.execution');

    return NextResponse.json({
      success: true,
      testId: testTaskId,
      scenario,
      eventsEmitted: results.length,
      events: results,
      summary: {
        taskId: testTaskId,
        commandId: testCommandId,
        approvalId: scenario.includes('approval') ? testApprovalId : null,
        agent: 'henry',
        companyId,
      },
      message: 'Canonical events emitted successfully. Verify in Mission Control event stream.',
    });

  } catch (error) {
    console.error('[Test Canonical Events] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to emit canonical events',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET /api/test/canonical-events
// Returns test scenarios available
export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios: [
      {
        name: 'full',
        description: 'Full lifecycle: task.started → command.received → agent.assigned → approval.requested → approval.responded → task.progress → task.completed → metric.execution',
        events: 8,
      },
      {
        name: 'quick',
        description: 'Quick test: task.started → command.received → agent.assigned → task.progress → task.completed',
        events: 5,
      },
      {
        name: 'approval',
        description: 'Approval flow only: approval.requested → approval.responded',
        events: 2,
      },
      {
        name: 'failure',
        description: 'Failure path: task.started → task.progress → task.failed',
        events: 3,
      },
    ],
    usage: {
      endpoint: 'POST /api/test/canonical-events',
      body: {
        companyId: 'optional - defaults to test company',
        scenario: 'optional - one of: full, quick, approval, failure',
      },
    },
  });
}
