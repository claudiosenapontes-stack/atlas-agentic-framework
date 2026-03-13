import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/commands/execute
// Execute a command (typically called after approval)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.commandId) {
      return NextResponse.json(
        { error: 'Missing required field: commandId' },
        { status: 400 }
      );
    }
    
    // Fetch command
    const { data: command, error: fetchError } = await supabase
      .from('commands')
      .select('*')
      .eq('id', body.commandId)
      .single();
      
    if (fetchError || !command) {
      return NextResponse.json(
        { error: 'Command not found' },
        { status: 404 }
      );
    }
    
    if (command.status !== 'approved' && command.status !== 'pending') {
      return NextResponse.json(
        { error: `Command cannot be executed (status: ${command.status})` },
        { status: 400 }
      );
    }
    
    // Update command status
    await supabase
      .from('commands')
      .update({ 
        status: 'executing',
        executed_at: new Date().toISOString(),
      })
      .eq('id', body.commandId);
    
    // Create task
    const taskType = mapCommandToTaskType(command.command_type);
    const assignedAgent = resolveAgentForCommand(command.command_type);
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        company_id: command.company_id,
        command_id: body.commandId,
        task_type: taskType,
        priority: command.risk_level === 'high' ? 'urgent' : 'medium',
        title: generateTaskTitle(command),
        description: command.command_text,
        status: 'approved',
        assigned_agent_id: assignedAgent,
      })
      .select()
      .single();
      
    if (taskError) {
      await supabase
        .from('commands')
        .update({ 
          status: 'failed',
          error_message: taskError.message,
        })
        .eq('id', body.commandId);
        
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }
    
    // Emit event
    await supabase.from('events').insert({
      company_id: command.company_id,
      event_type: 'command.executed',
      actor_type: 'system',
      actor_id: 'command_executor',
      target_type: 'command',
      target_id: body.commandId,
      payload: {
        task_id: task.id,
        assigned_agent: assignedAgent,
      },
    });
    
    return NextResponse.json({
      success: true,
      commandId: body.commandId,
      taskId: task.id,
      assignedAgent,
      status: 'executing',
    });
    
  } catch (error) {
    console.error('[Execute API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions (duplicated from command-bus for independence)
function mapCommandToTaskType(commandType: string): string {
  const mapping: Record<string, string> = {
    deploy: 'deployment',
    spawn_agent: 'implementation',
    kill_agent: 'maintenance',
    create_task: 'implementation',
    query_status: 'analysis',
    report: 'analysis',
  };
  return mapping[commandType] || 'implementation';
}

function resolveAgentForCommand(commandType: string): string {
  const agentMap: Record<string, string> = {
    deploy: 'optimus',
    spawn_agent: 'henry',
    kill_agent: 'henry',
    create_task: 'severino',
    query_status: 'sophia',
    report: 'einstein',
  };
  return agentMap[commandType] || 'henry';
}

function generateTaskTitle(command: any): string {
  const typeLabels: Record<string, string> = {
    deploy: 'Deploy',
    spawn_agent: 'Spawn Agent',
    kill_agent: 'Kill Agent',
    create_task: 'Execute Task',
    query_status: 'Status Check',
    report: 'Generate Report',
  };
  
  const prefix = typeLabels[command.command_type] || 'Process';
  const summary = command.command_text.slice(0, 50);
  return `${prefix}: ${summary}${command.command_text.length > 50 ? '...' : ''}`;
}
