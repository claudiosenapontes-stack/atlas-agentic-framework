/**
 * ATLAS-KNOWLEDGE-BRAIN API - Single Document
 * ATLAS-OPTIMUS-KB-API-REALIGN-003
 * 
 * GET /api/knowledge/:id
 * Retrieve a single document record
 * 
 * REALIGNED to production schema:
 * - Uses knowledge_registry (not knowledge_documents)
 * - doc_id TEXT (not UUID)
 * 
 * Requirements:
 * - explicit JSON responses
 * - no fake data
 * - source tracking included
 * - missing records return 404
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// GET /api/knowledge/:id
// Retrieve a single document record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const { id } = params;
    
    // Validation: doc_id is required
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Document ID is required', timestamp, source },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Query single document from knowledge_registry
    const { data, error } = await (supabase as any)
      .from('knowledge_registry')
      .select('*')
      .eq('doc_id', id)
      .single();
    
    if (error) {
      // Check if error is "no rows returned" (not found)
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return NextResponse.json(
          { success: false, error: 'Document not found', doc_id: id, timestamp, source },
          { status: 404 }
        );
      }
      
      console.error('[Knowledge] Query error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve document',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    // Check if data exists
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Document not found', doc_id: id, timestamp, source },
        { status: 404 }
      );
    }
    
    // Return document
    return NextResponse.json(
      { 
        success: true, 
        document: data,
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] GET by ID error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error', timestamp, source },
      { status: 500 }
    );
  }
}

// PATCH /api/knowledge/:id
// Update a document record
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validation: doc_id is required
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Document ID is required', timestamp, source },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Build update object (only allowed fields from production schema)
    const updateData: Record<string, any> = {
      last_ingested_at: timestamp,
      ingest_version: (body.ingest_version || 1) + 1
    };
    
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.summary !== undefined) updateData.summary = body.summary.trim();
    if (body.doc_class !== undefined) updateData.doc_class = body.doc_class;
    if (body.source_url !== undefined) updateData.source_url = body.source_url?.trim() || null;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.entities !== undefined) updateData.entities = body.entities;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Update document in knowledge_registry
    const { data, error } = await (supabase as any)
      .from('knowledge_registry')
      .update(updateData)
      .eq('doc_id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return NextResponse.json(
          { success: false, error: 'Document not found', doc_id: id, timestamp, source },
          { status: 404 }
        );
      }
      
      console.error('[Knowledge] Update error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update document',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        document: data,
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] PATCH error:', err);
    
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', timestamp, source },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error', timestamp, source },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/:id
// Soft delete a document (set status to deprecated)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const { id } = params;
    
    // Validation: doc_id is required
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Document ID is required', timestamp, source },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Soft delete (set status to deprecated)
    const { data, error } = await (supabase as any)
      .from('knowledge_registry')
      .update({ 
        status: 'deprecated',
        last_ingested_at: timestamp 
      })
      .eq('doc_id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return NextResponse.json(
          { success: false, error: 'Document not found', doc_id: id, timestamp, source },
          { status: 404 }
        );
      }
      
      console.error('[Knowledge] Delete error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete document',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Document deprecated successfully',
        doc_id: id,
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error', timestamp, source },
      { status: 500 }
    );
  }
}
