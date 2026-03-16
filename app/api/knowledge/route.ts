/**
 * ATLAS-KNOWLEDGE-BRAIN API
 * ATLAS-BACKEND-KNOWLEDGE-BRAIN-API-START-001
 * 
 * POST /api/knowledge
 * Ingest/register a document record
 * 
 * Requirements:
 * - explicit JSON responses
 * - no fake data
 * - source tracking included
 * - validation errors return 400
 * - successful create returns created id
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid document types
const VALID_DOC_TYPES = [
  'article',
  'document',
  'pdf',
  'meeting_notes',
  'transcript',
  'briefing',
  'research',
  'proposal',
  'contract',
  'email_thread',
  'other'
];

// Valid content formats
const VALID_CONTENT_FORMATS = [
  'text',
  'markdown',
  'html',
  'json',
  'structured'
];

interface CreateKnowledgeRequest {
  title: string;
  description?: string;
  content?: string;
  content_format?: string;
  doc_type: string;
  source_url?: string;
  source_type?: string;
  author_id?: string;
  author_name?: string;
  company_id?: string;
  project_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  is_public?: boolean;
}

// POST /api/knowledge
// Ingest/register a document record
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_documents';
  
  try {
    const body: CreateKnowledgeRequest = await request.json();
    
    // Validation: required fields
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'title is required',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    if (!body.doc_type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'doc_type is required',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    // Validation: doc_type must be valid
    if (!VALID_DOC_TYPES.includes(body.doc_type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}`,
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    // Validation: content_format must be valid if provided
    if (body.content_format && !VALID_CONTENT_FORMATS.includes(body.content_format)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `content_format must be one of: ${VALID_CONTENT_FORMATS.join(', ')}`,
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    const documentId = randomUUID();
    
    // Build document record
    const documentRecord = {
      id: documentId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      content: body.content || null,
      content_format: body.content_format || 'text',
      doc_type: body.doc_type,
      source_url: body.source_url?.trim() || null,
      source_type: body.source_type || 'manual',
      author_id: body.author_id || null,
      author_name: body.author_name?.trim() || null,
      company_id: body.company_id || null,
      project_id: body.project_id || null,
      tags: body.tags || [],
      metadata: body.metadata || {},
      is_public: body.is_public !== undefined ? body.is_public : true,
      version: 1,
      created_at: timestamp,
      updated_at: timestamp,
      indexed_at: null,
      embedding_id: null,
      status: 'active'
    };
    
    // Insert into knowledge_documents table
    const { data, error } = await (supabase as any)
      .from('knowledge_documents')
      .insert(documentRecord)
      .select()
      .single();
    
    if (error) {
      console.error('[Knowledge] Insert error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create knowledge document',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    // Successful creation
    return NextResponse.json(
      { 
        success: true, 
        document_id: documentId,
        document: data,
        timestamp,
        source 
      },
      { status: 201 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] POST error:', err);
    
    // Handle JSON parse errors
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

// GET /api/knowledge
// List knowledge documents with filtering
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_documents';
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const doc_type = searchParams.get('doc_type');
    const author_id = searchParams.get('author_id');
    const company_id = searchParams.get('company_id');
    const project_id = searchParams.get('project_id');
    const status = searchParams.get('status') || 'active';
    const is_public = searchParams.get('is_public');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';
    
    const supabase = getSupabaseAdmin();
    
    // Build query
    let query = (supabase as any)
      .from('knowledge_documents')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (doc_type) {
      query = query.eq('doc_type', doc_type);
    }
    
    if (author_id) {
      query = query.eq('author_id', author_id);
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (is_public !== null) {
      query = query.eq('is_public', is_public === 'true');
    }
    
    if (tags && tags.length > 0) {
      // Filter by any of the provided tags (overlap)
      query = query.contains('tags', tags);
    }
    
    if (search) {
      // Basic text search on title and description
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Knowledge] Query error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to query knowledge documents',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    // Return results
    return NextResponse.json(
      { 
        success: true, 
        documents: data || [],
        count: data?.length || 0,
        total: count || 0,
        pagination: {
          limit,
          offset,
          has_more: count ? offset + limit < count : false
        },
        filters: {
          doc_type,
          author_id,
          company_id,
          project_id,
          status,
          is_public,
          tags,
          search
        },
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] GET error:', err);
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
