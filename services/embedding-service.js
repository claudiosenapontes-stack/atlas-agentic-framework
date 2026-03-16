// ATLAS-EINSTEIN-KNOWLEDGE-BRAIN-V1.1-EMBEDDING-SERVICE
// Standalone embedding microservice
// Port: 3001 (default)
// Model: all-MiniLM-L6-v2 (384 dimensions)

const express = require('express');
const { pipeline } = require('@xenova/transformers');
const cors = require('cors');

const app = express();
const PORT = process.env.EMBEDDING_PORT || 3001;

// Configuration
const CONFIG = {
  model: 'Xenova/all-MiniLM-L6-v2',
  dimensions: 384,
  maxTextLength: 2000,
  maxBatchSize: 10,
};

// Global embedder instance
let embedder = null;
let modelLoaded = false;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    model: CONFIG.model,
    loaded: modelLoaded,
    dimensions: CONFIG.dimensions,
    uptime: process.uptime(),
  });
});

// Generate single embedding
app.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > CONFIG.maxTextLength) {
      return res.status(400).json({ 
        error: `Text exceeds maximum length of ${CONFIG.maxTextLength} characters` 
      });
    }

    const startTime = Date.now();
    const embedding = await generateEmbedding(text);
    const processingTime = Date.now() - startTime;

    res.json({
      embedding,
      model: CONFIG.model,
      dimensions: CONFIG.dimensions,
      processing_time_ms: processingTime,
    });

  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ 
      error: 'Failed to generate embedding',
      message: error.message 
    });
  }
});

// Generate batch embeddings
app.post('/embed/batch', async (req, res) => {
  try {
    const { texts } = req.body;

    if (!Array.isArray(texts)) {
      return res.status(400).json({ error: 'Texts must be an array' });
    }

    if (texts.length > CONFIG.maxBatchSize) {
      return res.status(400).json({ 
        error: `Batch size exceeds maximum of ${CONFIG.maxBatchSize}` 
      });
    }

    const startTime = Date.now();
    const results = [];
    const errors = [];

    for (let i = 0; i < texts.length; i++) {
      try {
        const text = texts[i];
        if (!text || typeof text !== 'string') {
          errors.push({ index: i, error: 'Invalid text' });
          continue;
        }

        const truncatedText = text.slice(0, CONFIG.maxTextLength);
        const embedding = await generateEmbedding(truncatedText);
        
        results.push({
          index: i,
          embedding,
          success: true,
        });
      } catch (error) {
        errors.push({ 
          index: i, 
          error: error.message,
          success: false 
        });
      }
    }

    const processingTime = Date.now() - startTime;

    res.json({
      results,
      errors,
      model: CONFIG.model,
      dimensions: CONFIG.dimensions,
      processing_time_ms: processingTime,
      total_processed: results.length,
      total_failed: errors.length,
    });

  } catch (error) {
    console.error('Batch embedding error:', error);
    res.status(500).json({ 
      error: 'Failed to generate batch embeddings',
      message: error.message 
    });
  }
});

// Compare two texts (similarity)
app.post('/similarity', async (req, res) => {
  try {
    const { text1, text2 } = req.body;

    if (!text1 || !text2) {
      return res.status(400).json({ error: 'Both text1 and text2 are required' });
    }

    const startTime = Date.now();
    
    const [embedding1, embedding2] = await Promise.all([
      generateEmbedding(text1.slice(0, CONFIG.maxTextLength)),
      generateEmbedding(text2.slice(0, CONFIG.maxTextLength)),
    ]);

    const similarity = cosineSimilarity(embedding1, embedding2);
    const processingTime = Date.now() - startTime;

    res.json({
      similarity,
      model: CONFIG.model,
      processing_time_ms: processingTime,
    });

  } catch (error) {
    console.error('Similarity error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate similarity',
      message: error.message 
    });
  }
});

// Model info
app.get('/model', (req, res) => {
  res.json({
    name: CONFIG.model,
    dimensions: CONFIG.dimensions,
    loaded: modelLoaded,
    max_text_length: CONFIG.maxTextLength,
    max_batch_size: CONFIG.maxBatchSize,
  });
});

// Generate embedding helper
async function generateEmbedding(text) {
  if (!embedder) {
    throw new Error('Model not loaded');
  }

  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}

// Cosine similarity helper
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Initialize and start server
async function startServer() {
  console.log('🔄 Loading embedding model...');
  console.log(`   Model: ${CONFIG.model}`);
  console.log(`   Dimensions: ${CONFIG.dimensions}`);
  
  try {
    embedder = await pipeline('feature-extraction', CONFIG.model);
    modelLoaded = true;
    console.log('✅ Model loaded successfully\n');

    app.listen(PORT, () => {
      console.log('🚀 Embedding service running');
      console.log(`   Port: ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Model: http://localhost:${PORT}/model`);
      console.log(`   Embed: POST http://localhost:${PORT}/embed`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to load model:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down embedding service...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down embedding service...');
  process.exit(0);
});

// Start
startServer();