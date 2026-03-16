// ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-V1.1-API
// Semantic Search API Route
// Route: /api/knowledge/search/semantic
// Model: all-MiniLM-L6-v2 (384 dimensions)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Build config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Supabase client lazily
let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Embedding service URL (could be external service or same server)
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:3001';

/**
 * POST /api/knowledge/search/semantic
 * 
 * Semantic search using vector similarity.
 * 
 * Request Body:
 * {
 *   query: string,           // Search query
 *   limit?: number,          // Max results (default: 10, max: 100)
 *   threshold?: number,      // Similarity threshold 0-1 (default: 0.5)
 *   filters?: {
 *     doc_class?: string[],  // Filter by document class
 *     source?: string[],     // Filter by source
 *     entities?: {           // Filter by entities
 *       companies?: string[];
 *       people?: string[];
 *       projects?: string[];
 *       jurisdictions?: string[];
 *     }
 *   }
 * }
 * 
 * Response:
 * {
 *   results: SemanticSearchResult[],
 *   meta: {
 *     total: number;
 *     query: string;
 *     search_time_ms: number;
 *     threshold: number;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      query,
      limit = 10,
      threshold = 0.5,
      filters = {},
    } = body;

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query must be less than 1000 characters' },
        { status: 400 }
      );
    }

    const normalizedLimit = Math.min(Math.max(1, limit), 100);
    const normalizedThreshold = Math.min(Math.max(0, threshold), 1);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Perform semantic search via Supabase RPC
    const { data: searchResults, error: searchError } = await (getSupabase().rpc as any)('semantic_search', {
      query_embedding: queryEmbedding,
      match_threshold: normalizedThreshold,
      match_count: normalizedLimit,
      class_filter: filters.doc_class || null,
      source_filter: filters.source || null,
    });

    if (searchError) {
      console.error('Semantic search RPC error:', searchError);
      return NextResponse.json(
        { error: 'Search failed', details: searchError.message },
        { status: 500 }
      );
    }

    // Apply entity filters if specified
    let filteredResults = searchResults || [];
    if (filters.entities && Object.keys(filters.entities).length > 0) {
      filteredResults = filteredResults.filter(doc => {
        const entities = doc.entities || {};
        return Object.entries(filters.entities).every(([key, values]) => {
          const valueArray = values as string[];
          if (!valueArray || valueArray.length === 0) return true;
          const docValues = entities[key] || [];
          return valueArray.some(v => docValues.includes(v));
        });
      });
    }

    // Format results
    const formattedResults = filteredResults.map(result => ({
      doc_id: result.doc_id,
      title: result.title,
      doc_class: result.doc_class,
      source: result.source,
      source_path: result.source_path,
      summary: result.summary,
      keywords: result.keywords || [],
      entities: result.entities || {},
      similarity: result.similarity,
      classification_confidence: result.classification_confidence,
      created_at: result.created_at,
      updated_at: result.updated_at,
    }));

    const searchTime = Date.now() - startTime;

    return NextResponse.json({
      results: formattedResults,
      meta: {
        total: formattedResults.length,
        query,
        search_time_ms: searchTime,
        threshold: normalizedThreshold,
        filters_applied: filters,
      },
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/knowledge/search/semantic
 * 
 * Simple semantic search via query parameters.
 * Useful for quick testing and direct links.
 * 
 * Query Parameters:
 * - q: search query (required)
 * - limit: max results (default: 10)
 * - threshold: similarity threshold (default: 0.5)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const threshold = parseFloat(searchParams.get('threshold') || '0.5');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const normalizedLimit = Math.min(Math.max(1, limit), 100);
    const normalizedThreshold = Math.min(Math.max(0, threshold), 1);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Perform semantic search
    const { data: searchResults, error: searchError } = await (getSupabase().rpc as any)('semantic_search', {
      query_embedding: queryEmbedding,
      match_threshold: normalizedThreshold,
      match_count: normalizedLimit,
      class_filter: null,
      source_filter: null,
    });

    if (searchError) {
      console.error('Semantic search RPC error:', searchError);
      return NextResponse.json(
        { error: 'Search failed', details: searchError.message },
        { status: 500 }
      );
    }

    const searchTime = Date.now() - startTime;

    return NextResponse.json({
      results: searchResults || [],
      meta: {
        total: (searchResults || []).length,
        query,
        search_time_ms: searchTime,
        threshold: normalizedThreshold,
      },
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate embedding for query text
 * Uses the embedding service or falls back to direct generation
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Try calling embedding service first
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.embedding;
    }
  } catch (error) {
    // Embedding service not available, use fallback
    console.warn('Embedding service unavailable, using fallback');
  }

  // Fallback: Return zero vector (will need actual embedding generation)
  // In production, you'd want to use @xenova/transformers here directly
  // or ensure the embedding service is always available
  throw new Error('Embedding generation not available');
}

/**
 * Type definitions
 */
interface SemanticSearchResult {
  doc_id: string;
  title: string;
  doc_class: string;
  source: string;
  source_path: string;
  summary: string;
  keywords: string[];
  entities: Record<string, string[]>;
  similarity: number;
  classification_confidence: number;
  created_at: string;
  updated_at: string;
}