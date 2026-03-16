/**
 * ATLAS-KNOWLEDGE-BRAIN API
 * ATLAS-OPTIMUS-KB-API-REALIGN-003
 * 
 * POST /api/knowledge
 * Ingest/register a document record
 * 
 * REALIGNED to production schema:
 * - Uses knowledge_registry (not knowledge_documents)
 * - doc_id TEXT primary key (not UUID)
 * - doc_class (not doc_type)
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

export const dynamic = 'force-dynamic';

// Valid document classes (from Einstein V1 taxonomy)
const VALID_DOC_CLASSES = [
  'LEGAL',
  'RESEARCH', 
  'EXEC',
  'PRODUCT',
  'MKTG',
  'INFRA',
  'FIN',
  'MEET'
];

// Valid sources
const VALID_SOURCES = ['local', 'google_drive', 'github'];

interface CreateKnowledgeRequest {
  doc_id?: string; // Optional, will generate if not provided
  title: string;
  summary: string;
  doc_class: string;
  source: string;
  source_path: string;
  source_url?: string;
  keywords?: string[];
  entities?: Record<string, any>;
  checksum?: string;
  size_bytes?: number;
  classification_confidence?: number;
  extraction_confidence?: number;
}

// POST /api/knowledge
// Ingest/register a document record
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const body: CreateKnowledgeRequest = await request.json();
    
    // Validation: required fields
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'title is required', timestamp, source },
        { status: 400 }
      );
    }
    
    if (!body.summary || body.summary.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'summary is required', timestamp, source },
        { status: 400 }
      );
    }
    
    if (!body.doc_class) {
      return NextResponse.json(
        { success: false, error: 'doc_class is required', timestamp, source },
        { status: 400 }
      );
    }
    
    // Validation: doc_class must be valid
    if (!VALID_DOC_CLASSES.includes(body.doc_class)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `doc_class must be one of: ${VALID_DOC_CLASSES.join(', ')}`,
          timestamp, 
          source 
        },
        { status: 400 }
      );
    }
    
    if (!body.source) {
      return NextResponse.json(
        { success: false, error: 'source is required', timestamp, source },
        { status: 400 }
      );
    }
    
    if (!VALID_SOURCES.includes(body.source)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `source must be one of: ${VALID_SOURCES.join(', ')}`,
          timestamp, 
          source 
        },
        { status: 400 }
      );
    }
    
    if (!body.source_path || body.source_path.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'source_path is required', timestamp, source },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    const docId = body.doc_id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Build document record for knowledge_registry
    const documentRecord = {
      doc_id: docId,
      title: body.title.trim(),
      summary: body.summary.trim(),
      doc_class: body.doc_class,
      source: body.source,
      source_path: body.source_path.trim(),
      source_url: body.source_url?.trim() || null,
      keywords: body.keywords || [],
      entities: body.entities || {},
      checksum: body.checksum || '',
      size_bytes: body.size_bytes || 0,
      extracted_at: timestamp,
      extracted_by: 'api',
      classification_confidence: body.classification_confidence || 0.5,
      extraction_confidence: body.extraction_confidence || 0.5,
      status: 'active',
      last_ingested_at: timestamp,
      ingest_version: 1
    };
    
    // Insert into knowledge_registry table (production schema)
    const { data, error } = await (supabase as any)
      .from('knowledge_registry')
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
        doc_id: docId,
        document: data,
        timestamp,
        source 
      },
      { status: 201 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge] POST error:', err);
    
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

// GET /api/knowledge
// List knowledge documents with filtering
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters (mapped to production schema)
    const doc_class = searchParams.get('doc_class');
    const source_filter = searchParams.get('source');
    const status = searchParams.get('status') || 'active';
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort_by = searchParams.get('sort_by') || 'extracted_at';
    const sort_order = searchParams.get('sort_order') || 'desc';
    
    const supabase = getSupabaseAdmin();
    
    // Build query against knowledge_registry
    let query = (supabase as any)
      .from('knowledge_registry')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (doc_class) {
      query = query.eq('doc_class', doc_class);
    }
    
    if (source_filter) {
      query = query.eq('source', source_filter);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (keywords && keywords.length > 0) {
      // Check if any keyword overlaps
      query = query.overlaps('keywords', keywords);
    }
    
    if (search) {
      // Full-text search using PostgreSQL
      query = query.textSearch('title', search);
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
          error: 'Failed to query knowledge registry',
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
          doc_class,
          source: source_filter,
          status,
          keywords,
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
      { success: false, error: err.message || 'Internal server error', timestamp, source },
      { status: 500 }
    );
  }
}
