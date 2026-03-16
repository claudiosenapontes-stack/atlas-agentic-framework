// ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-V1.1-EMBEDDING-SERVICE
// Embedding generation service for Knowledge Brain semantic search
// Model: all-MiniLM-L6-v2 (384 dimensions)
// Status: V1.1 Operational

const { pipeline } = require('@xenova/transformers');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  model: 'Xenova/all-MiniLM-L6-v2',
  dimensions: 384,
  batchSize: 5,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3005',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'local-dev-key',
};

class EmbeddingService {
  constructor() {
    this.embedder = null;
    this.supabase = null;
  }

  async initialize() {
    console.log('🔄 Loading embedding model:', CONFIG.model);
    this.embedder = await pipeline('feature-extraction', CONFIG.model);
    console.log('✅ Model loaded');

    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text) {
    if (!this.embedder) {
      throw new Error('Embedding service not initialized');
    }

    // Truncate text to model's max input (512 tokens ~ 2000 chars)
    const truncatedText = text.slice(0, 2000);
    
    const output = await this.embedder(truncatedText, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to array of floats
    return Array.from(output.data);
  }

  /**
   * Generate embeddings for documents from ingestion report
   */
  async generateForDocuments(documents) {
    const results = [];
    const errors = [];

    console.log(`\n🔄 Processing ${documents.length} documents in batches of ${CONFIG.batchSize}...\n`);

    for (let i = 0; i < documents.length; i += CONFIG.batchSize) {
      const batch = documents.slice(i, i + CONFIG.batchSize);
      const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(documents.length / CONFIG.batchSize);

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} documents)`);

      for (const doc of batch) {
        try {
          // Create rich text for embedding: title + summary + keywords + entity hints
          const entityText = this._entitiesToText(doc.entities);
          const embeddingText = `
            Title: ${doc.title}
            Summary: ${doc.summary}
            Keywords: ${doc.keywords.join(', ')}
            Class: ${doc.doc_class}
            Entities: ${entityText}
          `.trim();

          console.log(`  📝 Generating embedding for: ${doc.doc_id}`);
          const embedding = await this.generateEmbedding(embeddingText);

          results.push({
            doc_id: doc.doc_id,
            embedding: embedding,
            model: CONFIG.model,
            text_length: embeddingText.length,
            success: true,
          });

        } catch (error) {
          console.error(`  ❌ Failed for ${doc.doc_id}:`, error.message);
          errors.push({
            doc_id: doc.doc_id,
            error: error.message,
          });
        }
      }

      // Small delay between batches to prevent memory pressure
      if (i + CONFIG.batchSize < documents.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return { results, errors };
  }

  /**
   * Store embeddings in database
   */
  async storeEmbeddings(embeddings) {
    console.log(`\n💾 Storing ${embeddings.length} embeddings in database...\n`);

    const stored = [];
    const failed = [];

    for (const emb of embeddings) {
      try {
        const { error } = await this.supabase
          .from('knowledge_embeddings')
          .upsert({
            doc_id: emb.doc_id,
            embedding: emb.embedding,
            model: emb.model,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'doc_id',
          });

        if (error) {
          throw error;
        }

        stored.push(emb.doc_id);
        console.log(`  ✅ Stored: ${emb.doc_id}`);

      } catch (error) {
        console.error(`  ❌ Failed to store ${emb.doc_id}:`, error.message);
        failed.push({ doc_id: emb.doc_id, error: error.message });
      }
    }

    return { stored, failed };
  }

  /**
   * Semantic search using cosine similarity
   */
  async semanticSearch(query, options = {}) {
    const {
      limit = 10,
      threshold = 0.5,
      classFilter = null,
      sourceFilter = null,
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Perform vector search via Supabase RPC or direct query
    const { data, error } = await this.supabase.rpc('semantic_search', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      class_filter: classFilter,
      source_filter: sourceFilter,
    });

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Hybrid search: combine semantic + full-text
   */
  async hybridSearch(query, options = {}) {
    const {
      limit = 10,
      semanticWeight = 0.7,
      ftsWeight = 0.3,
    } = options;

    // Run both searches in parallel
    const [semanticResults, ftsResults] = await Promise.all([
      this.semanticSearch(query, { limit: limit * 2 }),
      this.fullTextSearch(query, { limit: limit * 2 }),
    ]);

    // Merge and rerank
    const merged = this._mergeResults(semanticResults, ftsResults, semanticWeight, ftsWeight);
    
    return merged.slice(0, limit);
  }

  /**
   * Full-text search via Supabase
   */
  async fullTextSearch(query, options = {}) {
    const { limit = 10 } = options;

    const { data, error } = await this.supabase
      .from('knowledge_registry')
      .select('*')
      .textSearch('title', query)
      .limit(limit);

    if (error) {
      throw new Error(`FTS search failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Convert entities to searchable text
   */
  _entitiesToText(entities) {
    if (!entities) return '';
    
    const parts = [];
    if (entities.companies?.length) parts.push(`Companies: ${entities.companies.join(', ')}`);
    if (entities.people?.length) parts.push(`People: ${entities.people.join(', ')}`);
    if (entities.projects?.length) parts.push(`Projects: ${entities.projects.join(', ')}`);
    if (entities.jurisdictions?.length) parts.push(`Jurisdictions: ${entities.jurisdictions.join(', ')}`);
    if (entities.regulations?.length) parts.push(`Regulations: ${entities.regulations.join(', ')}`);
    if (entities.contract_parties?.length) parts.push(`Parties: ${entities.contract_parties.join(', ')}`);
    if (entities.deliverables?.length) parts.push(`Deliverables: ${entities.deliverables.join(', ')}`);
    
    return parts.join('. ');
  }

  /**
   * Merge and rerank semantic + FTS results
   */
  _mergeResults(semantic, fts, semanticWeight, ftsWeight) {
    const scores = new Map();

    // Normalize semantic scores (0-1)
    semantic.forEach((doc, idx) => {
      const normalizedScore = 1 - (idx / semantic.length); // Descending rank
      scores.set(doc.doc_id, {
        doc,
        semanticScore: normalizedScore,
        ftsScore: 0,
      });
    });

    // Normalize FTS scores
    fts.forEach((doc, idx) => {
      const normalizedScore = 1 - (idx / fts.length);
      if (scores.has(doc.doc_id)) {
        scores.get(doc.doc_id).ftsScore = normalizedScore;
      } else {
        scores.set(doc.doc_id, {
          doc,
          semanticScore: 0,
          ftsScore: normalizedScore,
        });
      }
    });

    // Calculate weighted scores and sort
    const merged = Array.from(scores.values()).map(item => ({
      ...item.doc,
      hybrid_score: (item.semanticScore * semanticWeight) + (item.ftsScore * ftsWeight),
      semantic_score: item.semanticScore,
      fts_score: item.ftsScore,
    }));

    return merged.sort((a, b) => b.hybrid_score - a.hybrid_score);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const service = new EmbeddingService();
  
  try {
    // Initialize
    await service.initialize();

    // Load ingestion report
    const reportPath = path.join(__dirname, '..', 'docs', 'KNOWLEDGE_BRAIN_INGESTION_REPORT.json');
    const reportData = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(reportData);

    console.log('\n📊 Ingestion Report Loaded:');
    console.log(`   Documents: ${report.documents_ingested}`);
    console.log(`   Sources: ${report.sources_processed.map(s => s.source).join(', ')}\n`);

    // Filter successful documents
    const documents = report.documents.filter(d => d.success);
    console.log(`✅ Processing ${documents.length} successful documents\n`);

    // Generate embeddings
    const { results, errors } = await service.generateForDocuments(documents);
    console.log(`\n✅ Generated ${results.length} embeddings`);
    if (errors.length > 0) {
      console.log(`⚠️  Failed: ${errors.length}`);
    }

    // Store in database
    const { stored, failed } = await service.storeEmbeddings(results);
    console.log(`\n✅ Stored ${stored.length} embeddings in database`);
    if (failed.length > 0) {
      console.log(`⚠️  Failed to store: ${failed.length}`);
    }

    // Generate summary report
    const summaryReport = {
      generated_at: new Date().toISOString(),
      model: CONFIG.model,
      dimensions: CONFIG.dimensions,
      total_documents: documents.length,
      embeddings_generated: results.length,
      embeddings_stored: stored.length,
      errors: errors.length + failed.length,
      doc_ids: stored,
    };

    const summaryPath = path.join(__dirname, '..', 'docs', 'KNOWLEDGE_BRAIN_EMBEDDING_REPORT.json');
    await fs.writeFile(summaryPath, JSON.stringify(summaryReport, null, 2));
    console.log(`\n📄 Summary report saved to: ${summaryPath}`);

    // Test semantic search
    console.log('\n🧪 Testing semantic search...');
    const testQuery = 'Atlas agentic framework architecture';
    const searchResults = await service.semanticSearch(testQuery, { limit: 3 });
    console.log(`\nQuery: "${testQuery}"`);
    console.log(`Results: ${searchResults.length}`);
    searchResults.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.doc_id} (similarity: ${r.similarity?.toFixed(3) || 'N/A'})`);
    });

    console.log('\n✅ Embedding generation complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { EmbeddingService };