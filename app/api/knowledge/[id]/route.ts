/**
 * ATLAS-KNOWLEDGE-BRAIN API - Single Document
 * ATLAS-BACKEND-KNOWLEDGE-BRAIN-API-START-001
 * 
 * GET /api/knowledge/:id
 * Retrieve a single document record
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
  const source = 'knowledge_documents';
  
  try {
    const { id } = params;
    
    // Validation: ID is required
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Document ID is required',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid document ID format. Expected UUID.',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Query single document
    const { data, error } = await (supabase as any)
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      // Check if error is "no rows returned" (not found)
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Document not found',
            document_id: id,
            timestamp,
            source 
          },
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
        { 
          success: false, 
          error: 'Document not found',
          document_id: id,
          timestamp,
          source 
        },
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
      { 
        success: false, 
        error: err.message || 'Internal server error',
        timestamp,
        source 
      },
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
  const source = 'knowledge_documents';
  
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validation: ID is required
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Document ID is required',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Build update object (only allowed fields)
    const updateData: Record<string, any> = {
      updated_at: timestamp
    };
    
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.content_format !== undefined) updateData.content_format = body.content_format;
    if (body.doc_type !== undefined) updateData.doc_type = body.doc_type;
    if (body.source_url !== undefined) updateData.source_url = body.source_url?.trim() || null;
    if (body.source_type !== undefined) updateData.source_type = body.source_type;
    if (body.author_id !== undefined) updateData.author_id = body.author_id;
    if (body.author_name !== undefined) updateData.author_name = body.author_name?.trim() || null;
    if (body.company_id !== undefined) updateData.company_id = body.company_id;
    if (body.project_id !== undefined) updateData.project_id = body.project_id;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Increment version
    updateData.version = (body.version || 1) + 1;
    
    // Update document
    const { data, error } = await (supabase as any)
      .from('knowledge_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Document not found',
            document_id: id,
            timestamp,
            source 
          },
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
        { 
          success: false, 
          error: 'Invalid JSON in request body',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Internal server error',
        timestamp,
        source 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/:id
// Soft delete a document (set status to archived)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_documents';
  
  try {
    const { id } = params;
    
    // Validation: ID is required
    if (!id || id.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Document ID is required',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Soft delete (set status to archived)
    const { data, error } = await (supabase as any)
      .from('knowledge_documents')
      .update({ 
        status: 'archived',
        updated_at: timestamp 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Document not found',
            document_id: id,
            timestamp,
            source 
          },
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
        message: 'Document archived successfully',
        document_id: id,
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] DELETE error:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Internal server error',
        timestamp,
        source 
      },
      { status: 500 }
    );
  }
}
