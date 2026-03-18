/**
 * ATLAS-9930 Phase 4: Agent Control Actions
 * POST endpoints for controlling PM2 agent processes
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Map agent IDs to PM2 process names
function getPM2ProcessName(agentId: string): string | null {
  const mapping: Record<string, string> = {
    'henry': 'worker-henry',
    'optimus': 'worker-optimus',
    'optimus-prime': 'worker-optimus-prime',
    'prime': 'worker-prime',
    'olivia': 'worker-olivia',
    'sophia': 'worker-sophia',
    'harvey': 'worker-harvey',
    'einstein': 'worker-einstein',
    'severino': 'worker-severino'
  };
  return mapping[agentId] || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const agentId = params.id;
  const { action } = await request.json();
  
  try {
    const pm2Name = getPM2ProcessName(agentId);
    
    if (!pm2Name) {
      return NextResponse.json({
        success: false,
        error: `Unknown agent: ${agentId}`
      }, { status: 400 });
    }
    
    let result: { success: boolean; output?: string; error?: string } = { success: false };
    
    switch (action) {
      case 'restart':
        try {
          const output = execSync(`pm2 restart ${pm2Name}`, { 
            encoding: 'utf-8',
            timeout: 10000 
          });
          result = { success: true, output };
        } catch (e: any) {
          result = { success: false, error: e.message };
        }
        break;
        
      case 'stop':
        try {
          const output = execSync(`pm2 stop ${pm2Name}`, { 
            encoding: 'utf-8',
            timeout: 10000 
          });
          result = { success: true, output };
        } catch (e: any) {
          result = { success: false, error: e.message };
        }
        break;
        
      case 'start':
        try {
          const output = execSync(`pm2 start ${pm2Name}`, { 
            encoding: 'utf-8',
            timeout: 10000 
          });
          result = { success: true, output };
        } catch (e: any) {
          result = { success: false, error: e.message };
        }
        break;
        
      case 'logs':
        try {
          const output = execSync(`pm2 logs ${pm2Name} --lines 50 --nostream`, { 
            encoding: 'utf-8',
            timeout: 5000 
          });
          result = { success: true, output };
        } catch (e: any) {
          result = { success: false, error: e.message };
        }
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Valid: restart, stop, start, logs`
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: result.success,
      agentId,
      action,
      result: result.output || result.error,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });
    
  } catch (error: any) {
    console.error(`Error executing ${action} on ${agentId}:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
