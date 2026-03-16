/**
 * ATLAS-KNOWLEDGE-BRAIN API
 * ATLAS-OPTIMUS-KB-API-REALIGN-003
 * 
 * POST /api/knowledge
 * Ingest/register a document record
 * 
 * REALIGNED to ACTUAL production schema (from search endpoint verification):
 * - Uses knowledge_registry 
 * - id UUID primary key (not doc_id TEXT)
 * - source_system (not source)
 * - realm, visibility, owner_agent_id fields present
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

// Valid source systems
const VALID_SOURCE_SYSTEMS = ['manual', 'google_drive', 'github', 'upload', 'api'];

// Valid realms
const VALID_REALMS = ['executive-ops', 'finance', 'sales-marketing', 'tech', 'strategy'];

// Valid visibility
const VALID_VISIBILITY = ['public', 'internal', 'restricted', 'private'];

interface CreateKnowledgeRequest {
  title: string;
  summary: string;
  doc_class: string;
  source_system?: string;
  source_external_id?: string;
  canonical_url?: string;
  realm?: string;
  owner_agent_id?: string;
  visibility?: string;
  company_id?: string;
  keywords?: string[];
  entities?: Record<string, any>;
  metadata?: Record<string, any>;
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
    
    const supabase = getSupabaseAdmin();
    const docId = randomUUID();
    
    // Build document record for knowledge_registry (ACTUAL production schema)
    const documentRecord = {
      id: docId,
      title: body.title.trim(),
      summary: body.summary.trim(),
      doc_class: body.doc_class,
      source_system: body.source_system || 'manual',
      source_external_id: body.source_external_id || null,
      canonical_url: body.canonical_url || null,
      realm: body.realm || 'executive-ops',
      owner_agent_id: body.owner_agent_id || 'system',
      visibility: body.visibility || 'internal',
      company_id: body.company_id || null,
      keywords: body.keywords || [],
      entities: body.entities || {},
      metadata: body.metadata || {},
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Insert into knowledge_registry table (ACTUAL production schema)
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
        id: docId,
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
    
    // Parse query parameters (mapped to ACTUAL production schema)
    const doc_class = searchParams.get('doc_class');
    const source_system = searchParams.get('source_system');
    const realm = searchParams.get('realm');
    const status = searchParams.get('status') || 'active';
    const owner_agent_id = searchParams.get('owner_agent_id');
    const company_id = searchParams.get('company_id');
    const visibility = searchParams.get('visibility');
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort_by = searchParams.get('sort_by') || 'created_at';
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
    
    if (source_system) {
      query = query.eq('source_system', source_system);
    }
    
    if (realm) {
      query = query.eq('realm', realm);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (owner_agent_id) {
      query = query.eq('owner_agent_id', owner_agent_id);
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (visibility) {
      query = query.eq('visibility', visibility);
    }
    
    if (keywords && keywords.length > 0) {
      // Check if any keyword overlaps
      query = query.overlaps('keywords', keywords);
    }
    
    if (search) {
      // Use full-text search on search_vector or title/summary
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
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
          source_system,
          realm,
          status,
          owner_agent_id,
          company_id,
          visibility,
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
