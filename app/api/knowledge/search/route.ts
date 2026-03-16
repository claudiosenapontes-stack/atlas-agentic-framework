/**
 * ATLAS-KNOWLEDGE-BRAIN API - Search
 * ATLAS-OPTIMUS-KB-API-REALIGN-003
 * 
 * POST /api/knowledge/search
 * Full-text search on knowledge_registry
 * 
 * REALIGNED to production schema:
 * - Uses knowledge_registry (not knowledge_documents)
 * - Searches title, summary, keywords
 * 
 * Requirements:
 * - explicit JSON responses
 * - no fake data
 * - source tracking included
 * - validation errors return 400
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// Valid search fields
const VALID_SEARCH_FIELDS = [
  'title',
  'summary',
  'keywords',
  'all'
];

// Valid sort options
const VALID_SORT_OPTIONS = [
  'relevance',
  'created_at',
  'last_ingested_at',
  'title',
  'classification_confidence'
];

interface SearchRequest {
  query: string;
  fields?: string[];
  filters?: {
    doc_class?: string | string[];
    source?: string;
    status?: string;
    keywords?: string[];
    extracted_after?: string;
    extracted_before?: string;
  };
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  semantic_search?: boolean;
}

// POST /api/knowledge/search
// Search knowledge documents
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const body: SearchRequest = await request.json();
    
    // Validation: query is required
    if (!body.query || body.query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'query is required', timestamp, source },
        { status: 400 }
      );
    }
    
    // Validate fields if provided
    if (body.fields) {
      const invalidFields = body.fields.filter(f => !VALID_SEARCH_FIELDS.includes(f));
      if (invalidFields.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid search fields: ${invalidFields.join(', ')}. Valid: ${VALID_SEARCH_FIELDS.join(', ')}`,
            timestamp, 
            source 
          },
          { status: 400 }
        );
      }
    }
    
    // Validate sort_by if provided
    if (body.sort_by && !VALID_SORT_OPTIONS.includes(body.sort_by)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid sort_by: ${body.sort_by}. Valid: ${VALID_SORT_OPTIONS.join(', ')}`,
          timestamp, 
          source 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Search parameters
    const searchQuery = body.query.trim();
    const searchFields = body.fields || ['all'];
    const limit = Math.min(Math.max(body.limit || 20, 1), 100);
    const offset = Math.max(body.offset || 0, 0);
    const sortBy = body.sort_by || 'created_at';
    const sortOrder = body.sort_order || 'desc';
    
    // Build search conditions for knowledge_registry
    let searchConditions: string[] = [];
    
    if (searchFields.includes('all') || searchFields.includes('title')) {
      searchConditions.push(`title.ilike.%${searchQuery}%`);
    }
    if (searchFields.includes('all') || searchFields.includes('summary')) {
      searchConditions.push(`summary.ilike.%${searchQuery}%`);
    }
    
    // Apply filters
    const filters = body.filters || {};
    
    // Build base query
    console.log('[KB Search] Building query with filters:', filters);
    let query = (supabase as any)
      .from('knowledge_registry')
      .select('*', { count: 'exact' });
    
    // Apply search conditions
    if (searchConditions.length > 0) {
      query = query.or(searchConditions.join(','));
    }
    
    if (filters.doc_class) {
      if (Array.isArray(filters.doc_class)) {
        query = query.in('doc_class', filters.doc_class);
      } else {
        query = query.eq('doc_class', filters.doc_class);
      }
    }
    
    if (filters.source) {
      query = query.eq('source_system', filters.source);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      // Default to active documents only
      query = query.eq('status', 'active');
    }
    
    if (filters.keywords && filters.keywords.length > 0) {
      query = query.overlaps('keywords', filters.keywords);
    }
    
    if (filters.extracted_after) {
      query = query.gte('created_at', filters.extracted_after);
    }

    if (filters.extracted_before) {
      query = query.lte('created_at', filters.extracted_before);
    }

    // Apply sorting
    const sortColumn = sortBy === 'relevance' ? 'created_at' : sortBy;
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute search
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Knowledge Search] Query error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to search knowledge registry',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    // Calculate relevance scores (basic text matching)
    const documents = (data || []).map((doc: any) => {
      let relevanceScore = 0;
      const queryLower = searchQuery.toLowerCase();
      const titleLower = (doc.title || '').toLowerCase();
      const summaryLower = (doc.summary || '').toLowerCase();
      
      // Title match (highest weight)
      if (titleLower.includes(queryLower)) {
        relevanceScore += 100;
        if (titleLower === queryLower) relevanceScore += 50;
      }
      
      // Summary match (medium weight)
      if (summaryLower.includes(queryLower)) {
        relevanceScore += 50;
        const occurrences = (summaryLower.match(new RegExp(queryLower, 'g')) || []).length;
        relevanceScore += Math.min(occurrences * 5, 50);
      }
      
      // Keyword match
      if (doc.keywords && doc.keywords.some((kw: string) => kw.toLowerCase() === queryLower)) {
        relevanceScore += 75;
      }
      
      return {
        ...doc,
        relevance_score: relevanceScore
      };
    });
    
    // Sort by relevance if requested
    if (sortBy === 'relevance') {
      documents.sort((a: any, b: any) => b.relevance_score - a.relevance_score);
    }
    
    return NextResponse.json(
      { 
        success: true, 
        query: searchQuery,
        documents: documents,
        count: documents.length,
        total: count || 0,
        search_params: {
          fields: searchFields,
          filters,
          sort_by: sortBy,
          sort_order: sortOrder,
          semantic_search: body.semantic_search || false
        },
        pagination: {
          limit,
          offset,
          has_more: count ? offset + limit < count : false
        },
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge Search] Error:', err);
    
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

// GET /api/knowledge/search
// Alternative search via query parameters
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_registry';
  
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" or "query" is required', timestamp, source },
        { status: 400 }
      );
    }
    
    // Parse fields
    const fieldsParam = searchParams.get('fields');
    const fields = fieldsParam ? fieldsParam.split(',') : ['all'];
    
    // Parse filters
    const filters: any = {};
    if (searchParams.get('doc_class')) filters.doc_class = searchParams.get('doc_class') || undefined;
    if (searchParams.get('source')) filters.source = searchParams.get('source') || undefined;
    if (searchParams.get('status')) filters.status = searchParams.get('status') || undefined;
    if (searchParams.get('keywords')) filters.keywords = (searchParams.get('keywords') || '').split(',').filter(Boolean);
    
    const supabase = getSupabaseAdmin();
    
    const searchQuery = query.trim();
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build search conditions
    let searchConditions: string[] = [];
    
    if (fields.includes('all') || fields.includes('title')) {
      searchConditions.push(`title.ilike.%${searchQuery}%`);
    }
    if (fields.includes('all') || fields.includes('summary')) {
      searchConditions.push(`summary.ilike.%${searchQuery}%`);
    }
    
    let dbQuery = (supabase as any)
      .from('knowledge_registry')
      .select('*', { count: 'exact' });
    
    if (searchConditions.length > 0) {
      dbQuery = dbQuery.or(searchConditions.join(','));
    }
    
    // Apply status filter
    dbQuery = dbQuery.eq('status', filters.status || 'active');
    
    // Apply source filter
    if (filters.source) {
      dbQuery = dbQuery.eq('source_system', filters.source);
    }
    
    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    
    const { data, error, count } = await dbQuery;
    
    if (error) {
      console.error('[Knowledge Search] GET error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search knowledge registry', timestamp, source },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        query: searchQuery,
        documents: data || [],
        count: data?.length || 0,
        total: count || 0,
        timestamp,
        source 
      },
      { status: 200 }
    );
    
  } catch (err: any) {
    console.error('[Knowledge Search] GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error', timestamp, source },
      { status: 500 }
    );
  }
}
