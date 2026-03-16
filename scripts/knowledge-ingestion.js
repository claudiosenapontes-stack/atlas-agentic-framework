#!/usr/bin/env node
/**
 * ATLAS Knowledge Brain V1 Ingestion Pipeline
 * Usage: node scripts/knowledge-ingestion.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Classification rules
const CLASSIFICATION_RULES = [
  { pattern: /\b(MSA|SOW|NDA|contract|agreement|terms|legal|compliance)\b/i, doc_class: 'LEGAL', confidence: 0.9 },
  { pattern: /\b(architecture|runbook|config|API|infrastructure|terraform|docker)\b/i, doc_class: 'INFRA', confidence: 0.8 },
  { pattern: /\b(PRD|product|roadmap|feature|specification)\b/i, doc_class: 'PRODUCT', confidence: 0.8 },
  { pattern: /\b(meeting|notes|standup|retrospective)\b/i, doc_class: 'MEET', confidence: 0.9 },
  { pattern: /\b(decision|strategy|OKR|board|executive)\b/i, doc_class: 'EXEC', confidence: 0.8 },
  { pattern: /\b(research|analysis|market|study|report)\b/i, doc_class: 'RESEARCH', confidence: 0.8 },
  { pattern: /\b(budget|forecast|financial|invoice|P&L)\b/i, doc_class: 'FIN', confidence: 0.9 },
  { pattern: /\b(marketing|campaign|brand|content)\b/i, doc_class: 'MKTG', confidence: 0.8 }
];

const STOP_WORDS = new Set(['the','a','an','is','are','was','were','be','been','have','has','had','will','would','could','should','may','might','must','can','to','of','in','for','on','with','at','by','from','as','and','but','if','or','this','that','these','those','i','you','he','she','it','we','they']);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function classifyDocument(content, filePath) {
  const text = content.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  
  // Path-based hints
  const pathHints = [
    { pattern: /legal|contract|agreement/i, doc_class: 'LEGAL', confidence: 0.95 },
    { pattern: /research|analysis|market/i, doc_class: 'RESEARCH', confidence: 0.9 },
    { pattern: /exec|decision|strategy/i, doc_class: 'EXEC', confidence: 0.9 },
    { pattern: /product|prd|spec/i, doc_class: 'PRODUCT', confidence: 0.9 },
    { pattern: /marketing|campaign/i, doc_class: 'MKTG', confidence: 0.9 },
    { pattern: /infra|architecture|runbook/i, doc_class: 'INFRA', confidence: 0.9 },
    { pattern: /finance|budget|forecast/i, doc_class: 'FIN', confidence: 0.9 },
    { pattern: /meeting|notes/i, doc_class: 'MEET', confidence: 0.9 }
  ];
  
  for (const hint of pathHints) {
    if (hint.pattern.test(fileName) || hint.pattern.test(filePath)) {
      return { doc_class: hint.doc_class, confidence: hint.confidence, method: 'path_based' };
    }
  }
  
  let bestMatch = { doc_class: 'MEET', confidence: 0.5, method: 'default' };
  for (const rule of CLASSIFICATION_RULES) {
    const matches = (text.match(rule.pattern) || []).length;
    if (matches > 0) {
      const confidence = Math.min(rule.confidence + (matches * 0.05), 0.95);
      if (confidence > bestMatch.confidence) {
        bestMatch = { doc_class: rule.doc_class, confidence, method: 'content_based' };
      }
    }
  }
  return bestMatch;
}

function extractEntities(content, docClass) {
  const entities = {
    companies: [...(content.match(/\b(ARQIA|XGROUP|SENA ENTERPRISES)\b/gi) || [])],
    people: [...(content.match(/\b(Claudio Sena)\b/g) || [])],
    projects: [...(content.match(/\b(Atlas|Mission Control|Severino|Knowledge Brain|Executive Ops)\b/gi) || [])],
    jurisdictions: [...(content.match(/\b(FL|Florida|Miami-Dade|US-Federal|EU|IBC 2021|FBC 2023)\b/gi) || [])],
    dates: [...(content.match(/\b(\d{4}-\d{2}-\d{2})\b/g) || [])]
  };
  
  // Deduplicate
  for (const key of Object.keys(entities)) {
    entities[key] = [...new Set(entities[key])].slice(0, 10);
  }
  
  if (docClass === 'LEGAL') {
    entities.contract_parties = [...(content.match(/\b([A-Z][a-z]+ (?:Inc|LLC|Corp))\b/g) || [])].slice(0, 5);
  }
  if (docClass === 'LEGAL' || docClass === 'RESEARCH') {
    entities.regulations = [...(content.match(/\b(IBC 2021|FBC 2023|NFPA 70|GDPR|HIPAA)\b/gi) || [])].slice(0, 5);
  }
  if (docClass === 'PRODUCT' || docClass === 'INFRA') {
    entities.deliverables = [...(content.match(/\b(PRD|spec|architecture|design|document|report|plan)\b/gi) || [])].slice(0, 5);
  }
  
  return entities;
}

function generateSummary(content, maxLength = 500) {
  const paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 50 && !p.startsWith('#'));
  let summary = paragraphs[0] || content.slice(0, maxLength);
  summary = summary.replace(/#+ /g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__/g, '').replace(/\n/g, ' ').trim();
  if (summary.length > maxLength) {
    const truncateAt = summary.lastIndexOf('.', maxLength - 3);
    summary = truncateAt > maxLength * 0.7 ? summary.slice(0, truncateAt + 1) : summary.slice(0, maxLength - 3) + '...';
  }
  return summary;
}

function extractKeywords(content, maxCount = 10) {
  const words = content.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, maxCount).map(([w]) => w);
}

function scanDirectory(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) return results;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && ['.md', '.txt'].includes(path.extname(entry.name).toLowerCase())) {
      const stats = fs.statSync(fullPath);
      results.push({ path: fullPath, relativePath: fullPath.replace(/\/root\/Documents\//, ''), size: stats.size });
    }
  }
  return results;
}

function processDocument(fileInfo, source) {
  const startTime = Date.now();
  try {
    const content = fs.readFileSync(fileInfo.path, 'utf-8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const classification = classifyDocument(content, fileInfo.path);
    const entities = extractEntities(content, classification.doc_class);
    const summary = generateSummary(content);
    const keywords = extractKeywords(content);
    const docId = `${source}:${generateUUID()}`;
    
    return {
      success: true,
      doc_id: docId,
      doc_class: classification.doc_class,
      source: source,
      source_path: fileInfo.relativePath,
      source_url: `file://${fileInfo.path}`,
      title: path.basename(fileInfo.path, path.extname(fileInfo.path)).replace(/[-_]/g, ' '),
      summary: summary,
      keywords: keywords,
      entities: entities,
      checksum: checksum,
      size_bytes: fileInfo.size,
      classification_confidence: classification.confidence,
      extraction_confidence: 0.85,
      processing_time_ms: Date.now() - startTime,
      raw_content: content.slice(0, 10000) // Store preview
    };
  } catch (error) {
    return { success: false, error: error.message, path: fileInfo.path };
  }
}

// ============================================
// MAIN EXECUTION
// ============================================
console.log('='.repeat(60));
console.log('ATLAS Knowledge Brain V1 Ingestion Pipeline');
console.log('='.repeat(60));

const sources = [
  { name: 'local_arquia', path: '/root/Documents/ARQIA' },
  { name: 'local_atlas', path: '/root/Documents/Atlas' }
];

const results = {
  job_id: generateUUID(),
  started_at: new Date().toISOString(),
  sources_processed: [],
  documents_found: 0,
  documents_ingested: 0,
  documents_failed: 0,
  classification_stats: {},
  entity_stats: {},
  documents: []
};

for (const source of sources) {
  console.log(`\n📁 Scanning ${source.name}: ${source.path}`);
  const files = scanDirectory(source.path);
  console.log(`   Found ${files.length} documents`);
  
  const sourceResult = {
    source: source.name,
    path: source.path,
    documents_found: files.length,
    documents_ingested: 0,
    documents_failed: 0
  };
  
  for (const file of files) {
    const processed = processDocument(file, source.name);
    results.documents_found++;
    
    if (processed.success) {
      results.documents_ingested++;
      sourceResult.documents_ingested++;
      results.documents.push(processed);
      
      // Classification stats
      results.classification_stats[processed.doc_class] = (results.classification_stats[processed.doc_class] || 0) + 1;
      
      // Entity stats
      const entityCount = Object.values(processed.entities).flat().length;
      results.entity_stats[processed.doc_class] = (results.entity_stats[processed.doc_class] || 0) + entityCount;
      
      console.log(`   ✅ ${processed.doc_class.padEnd(10)} | ${path.basename(file.path)}`);
    } else {
      results.documents_failed++;
      sourceResult.documents_failed++;
      console.log(`   ❌ FAILED | ${path.basename(file.path)}: ${processed.error}`);
    }
  }
  
  results.sources_processed.push(sourceResult);
}

results.completed_at = new Date().toISOString();

// Calculate duration
const durationMs = new Date(results.completed_at) - new Date(results.started_at);
results.duration_seconds = Math.round(durationMs / 1000);

// Calculate classification accuracy estimate (based on confidence scores)
const avgConfidence = results.documents.reduce((sum, d) => sum + d.classification_confidence, 0) / results.documents.length;
results.classification_accuracy_estimate = Math.round(avgConfidence * 100);

// Save results
const outputPath = '/root/.openclaw/workspaces/atlas-agentic-framework/docs/KNOWLEDGE_BRAIN_INGESTION_REPORT.json';
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

// Print summary
console.log('\n' + '='.repeat(60));
console.log('INGESTION COMPLETE');
console.log('='.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Documents Found:    ${results.documents_found}`);
console.log(`   Documents Ingested: ${results.documents_ingested}`);
console.log(`   Documents Failed:   ${results.documents_failed}`);
console.log(`   Duration:           ${results.duration_seconds}s`);
console.log(`\n📈 Classification Distribution:`);
for (const [cls, count] of Object.entries(results.classification_stats).sort((a, b) => b[1] - a[1])) {
  const pct = Math.round((count / results.documents_ingested) * 100);
  console.log(`   ${cls.padEnd(12)} ${count.toString().padStart(3)} (${pct}%)`);
}
console.log(`\n🏷️ Classification Accuracy Estimate: ${results.classification_accuracy_estimate}%`);
console.log(`\n🔍 Entity Extraction Results:`);
for (const [cls, count] of Object.entries(results.entity_stats)) {
  console.log(`   ${cls.padEnd(12)} ${count} entities`);
}
console.log(`\n💾 Report saved to: ${outputPath}`);
console.log('\n📝 Sample Documents:');
results.documents.slice(0, 3).forEach((doc, i) => {
  console.log(`\n   ${i + 1}. ${doc.title}`);
  console.log(`      Class: ${doc.doc_class} (confidence: ${Math.round(doc.classification_confidence * 100)}%)`);
  console.log(`      Keywords: ${doc.keywords.slice(0, 5).join(', ')}`);
  console.log(`      Entities: ${Object.entries(doc.entities).filter(([k, v]) => v.length > 0).map(([k, v]) => `${k}(${v.length})`).join(', ')}`);
});

console.log('\n' + '='.repeat(60));
console.log('Knowledge Brain V1 ingestion complete!');
console.log('='.repeat(60));

// Export for module use
module.exports = { processDocument, classifyDocument, extractEntities, generateSummary, extractKeywords };