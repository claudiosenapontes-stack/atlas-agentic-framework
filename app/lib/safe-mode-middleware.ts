// Safe Mode API Middleware
// ATLAS-PRIME-UI-SAFE-MODE-001
// Blocks write operations when UI_SAFE_MODE.ACTIVE is true

import { NextRequest, NextResponse } from 'next/server';
import { UI_SAFE_MODE } from '@/app/config/safe-mode';

export function safeModeMiddleware(request: NextRequest) {
  if (!UI_SAFE_MODE.ACTIVE) {
    return null; // Safe mode not active, allow request
  }

  // Block POST, PUT, DELETE operations (writes)
  const method = request.method;
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    // Allow specific read-only endpoints even in safe mode
    const url = request.nextUrl.pathname;
    
    // Allow health checks and audit operations (read-only)
    const allowedWritePaths = [
      '/api/health',
      '/api/agents/live', // GET only anyway
    ];
    
    if (allowedWritePaths.some(path => url.startsWith(path))) {
      return null;
    }

    // Block the request
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable',
        message: 'Fleet maintenance in progress. Write operations are disabled.',
        safeMode: true,
      },
      { status: 503 }
    );
  }

  return null; // Allow GET and other read operations
}

export function isWriteOperationBlocked(): boolean {
  return UI_SAFE_MODE.ACTIVE && UI_SAFE_MODE.BLOCKED_OPERATIONS.writeAgents;
}

export function safeModeResponse(operation: string) {
  return NextResponse.json(
    {
      error: 'Operation blocked',
      message: `Fleet maintenance in progress. ${operation} is temporarily disabled.`,
      safeMode: true,
      bannerText: UI_SAFE_MODE.BANNER_TEXT,
    },
    { status: 503 }
  );
}
