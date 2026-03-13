import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/agent-runs
 * DEPRECATED: Use /api/executions instead
 * This endpoint redirects to the canonical /api/executions endpoint
 */
export async function GET(request: NextRequest) {
  // Get the original query parameters
  const { searchParams } = new URL(request.url);
  
  // Build redirect URL to canonical endpoint
  const redirectUrl = new URL('/api/executions', request.url);
  
  // Copy all query parameters
  searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });
  
  // Redirect to canonical endpoint
  return NextResponse.redirect(redirectUrl, 307);
}

/**
 * POST /api/agent-runs
 * DEPRECATED: Use /api/executions instead
 * This endpoint redirects to the canonical /api/executions endpoint
 */
export async function POST(request: NextRequest) {
  // Clone the request for the redirect
  const body = await request.json();
  
  // Forward to canonical endpoint
  const response = await fetch(new URL('/api/executions', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  
  return NextResponse.json(data, { status: response.status });
}
