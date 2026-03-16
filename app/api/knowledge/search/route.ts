/**
 * ATLAS-KNOWLEDGE-BRAIN API - Search
 * ATLAS-BACKEND-KNOWLEDGE-BRAIN-API-START-001
 * 
 * POST /api/knowledge/search
 * Basic search (semantic/vector search only if schema ready)
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
  'description',
  'content',
  'tags',
  'all'
];

// Valid sort options
const VALID_SORT_OPTIONS = [
  'relevance',
  'created_at',
  'updated_at',
  'title'
];

interface SearchRequest {
  query: string;
  fields?: string[];
  filters?: {
    doc_type?: string | string[];
    author_id?: string;
    company_id?: string;
    project_id?: string;
    status?: string;
    is_public?: boolean;
    tags?: string[];
    created_after?: string;
    created_before?: string;
  };
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include_content?: boolean;
  semantic_search?: boolean; // Future: vector search
}

// POST /api/knowledge/search
// Search knowledge documents
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_documents';
  
  try {
    const body: SearchRequest = await request.json();
    
    // Validation: query is required
    if (!body.query || body.query.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'query is required',
          timestamp,
          source 
        },
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
            error: `Invalid search fields: ${invalidFields.join(', ')}. Valid fields: ${VALID_SEARCH_FIELDS.join(', ')}`,
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
          error: `Invalid sort_by: ${body.sort_by}. Valid options: ${VALID_SORT_OPTIONS.join(', ')}`,
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
    const limit = Math.min(Math.max(body.limit || 20, 1), 100); // Clamp between 1-100
    const offset = Math.max(body.offset || 0, 0);
    const sortBy = body.sort_by || 'created_at';
    const sortOrder = body.sort_order || 'desc';
    const includeContent = body.include_content !== false; // Default true
    
    // Build search conditions
    let searchConditions: string[] = [];
    
    if (searchFields.includes('all') || searchFields.includes('title')) {
      searchConditions.push(`title.ilike.%${searchQuery}%`);
    }
    if (searchFields.includes('all') || searchFields.includes('description')) {
      searchConditions.push(`description.ilike.%${searchQuery}%`);
    }
    if (searchFields.includes('all') || searchFields.includes('content')) {
      searchConditions.push(`content.ilike.%${searchQuery}%`);
    }
    if (searchFields.includes('all') || searchFields.includes('tags')) {
      // For tags, we need to check if any tag contains the search query
      // This is a simplified approach - exact tag match
      searchConditions.push(`tags.cs.{"${searchQuery}"}`);
    }
    
    // Build base query
    let query = (supabase as any)
      .from('knowledge_documents')
      .select(includeContent ? '*' : 'id, title, description, doc_type, tags, author_name, created_at, updated_at', { count: 'exact' });
    
    // Apply search conditions
    if (searchConditions.length > 0) {
      query = query.or(searchConditions.join(','));
    }
    
    // Apply filters
    const filters = body.filters || {};
    
    if (filters.doc_type) {
      if (Array.isArray(filters.doc_type)) {
        query = query.in('doc_type', filters.doc_type);
      } else {
        query = query.eq('doc_type', filters.doc_type);
      }
    }
    
    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id);
    }
    
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      // Default to active documents only
      query = query.eq('status', 'active');
    }
    
    if (filters.is_public !== undefined) {
      query = query.eq('is_public', filters.is_public);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }
    
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }
    
    // Apply sorting
    // Note: For 'relevance' we default to created_at since we don't have relevance scoring yet
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
          error: 'Failed to search knowledge documents',
          details: error.message,
          timestamp,
          source 
        },
        { status: 500 }
      );
    }
    
    // Calculate relevance scores (basic text matching for now)
    // In the future, this could use vector similarity
    const documents = (data || []).map((doc: any) => {
      let relevanceScore = 0;
      const queryLower = searchQuery.toLowerCase();
      const titleLower = (doc.title || '').toLowerCase();
      const descLower = (doc.description || '').toLowerCase();
      const contentLower = (doc.content || '').toLowerCase();
      
      // Title match (highest weight)
      if (titleLower.includes(queryLower)) {
        relevanceScore += 100;
        if (titleLower === queryLower) relevanceScore += 50; // Exact match
      }
      
      // Description match (medium weight)
      if (descLower.includes(queryLower)) {
        relevanceScore += 50;
      }
      
      // Content match (lower weight)
      if (contentLower.includes(queryLower)) {
        relevanceScore += 25;
        // Count occurrences
        const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
        relevanceScore += Math.min(occurrences * 5, 50); // Cap at 50 bonus points
      }
      
      // Tag match
      if (doc.tags && doc.tags.some((tag: string) => tag.toLowerCase() === queryLower)) {
        relevanceScore += 75; // Exact tag match
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
          include_content: includeContent,
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

// GET /api/knowledge/search
// Alternative search via query parameters
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const source = 'knowledge_documents';
  
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query parameter "q" or "query" is required',
          timestamp,
          source 
        },
        { status: 400 }
      );
    }
    
    // Parse fields
    const fieldsParam = searchParams.get('fields');
    const fields = fieldsParam ? fieldsParam.split(',') : ['all'];
    
    // Parse filters
    const filters: any = {};
    if (searchParams.get('doc_type')) filters.doc_type = searchParams.get('doc_type') || undefined;
    if (searchParams.get('author_id')) filters.author_id = searchParams.get('author_id') || undefined;
    if (searchParams.get('company_id')) filters.company_id = searchParams.get('company_id') || undefined;
    if (searchParams.get('project_id')) filters.project_id = searchParams.get('project_id') || undefined;
    if (searchParams.get('status')) filters.status = searchParams.get('status') || undefined;
    if (searchParams.get('is_public')) filters.is_public = searchParams.get('is_public') === 'true';
    if (searchParams.get('tags')) filters.tags = (searchParams.get('tags') || '').split(',').filter(Boolean);
    
    // Build search request
    const searchRequest: SearchRequest = {
      query,
      fields,
      filters,
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      include_content: searchParams.get('include_content') !== 'false'
    };
    
    // Forward to POST handler logic
    // We'll make an internal call to avoid code duplication
    const supabase = getSupabaseAdmin();
    
    const searchQuery = query.trim();
    const limit = Math.min(Math.max(searchRequest.limit || 20, 1), 100);
    const offset = Math.max(searchRequest.offset || 0, 0);
    
    // Build search conditions
    let searchConditions: string[] = [];
    
    if (fields.includes('all') || fields.includes('title')) {
      searchConditions.push(`title.ilike.%${searchQuery}%`);
    }
    if (fields.includes('all') || fields.includes('description')) {
      searchConditions.push(`description.ilike.%${searchQuery}%`);
    }
    if (fields.includes('all') || fields.includes('content')) {
      searchConditions.push(`content.ilike.%${searchQuery}%`);
    }
    
    let dbQuery = (supabase as any)
      .from('knowledge_documents')
      .select('*', { count: 'exact' });
    
    if (searchConditions.length > 0) {
      dbQuery = dbQuery.or(searchConditions.join(','));
    }
    
    // Apply status filter
    dbQuery = dbQuery.eq('status', filters.status || 'active');
    
    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    
    const { data, error, count } = await dbQuery;
    
    if (error) {
      console.error('[Knowledge Search] GET error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to search knowledge documents',
          timestamp,
          source 
        },
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
