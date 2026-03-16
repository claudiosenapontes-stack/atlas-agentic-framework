'use client';

import { useState, useEffect } from 'react';
import { Search, Brain, FileText, Tag, Filter, X, ChevronRight, Clock, User } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'skill' | 'memory' | 'soul';
  entity: string;
  tags: string[];
  updatedAt: string;
  relevance: number;
}

interface SearchFilters {
  types: string[];
  entities: string[];
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    entities: [],
    dateRange: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const endpoint = semanticMode ? '/api/knowledge/search/semantic' : '/api/knowledge/search';
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&limit=20`);
      
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, semanticMode]);

  const filteredResults = results.filter(r => {
    if (filters.types.length > 0 && !filters.types.includes(r.type)) return false;
    return true;
  });

  const typeColors: Record<string, string> = {
    document: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    skill: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    memory: 'bg-green-500/10 text-green-400 border-green-500/30',
    soul: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-500/30 flex items-center justify-center">
            <Search className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Knowledge Search</h1>
            <p className="text-sm text-[#6B7280]">Search across agent memory, skills, and documents</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full pl-12 pr-4 py-4 bg-[#111214] border border-[#1F2226] rounded-[10px] text-white placeholder-[#6B7280] focus:outline-none focus:border-indigo-500/50"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-5 h-5 text-[#6B7280] hover:text-white" />
              </button>
            )}
          </div>
          
          {/* Search Options */}
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => setSemanticMode(!semanticMode)}
                className={`w-10 h-5 rounded-full transition-colors relative ${semanticMode ? 'bg-indigo-500' : 'bg-[#1F2226]'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${semanticMode ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-[#9BA3AF]">Semantic search</span>
            </label>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${showFilters ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#6B7280] hover:text-white'}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-[#111214] border border-[#1F2226] rounded-[10px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Filter by Type</span>
              <button onClick={() => setFilters({ ...filters, types: [] })} className="text-xs text-[#6B7280] hover:text-white">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['document', 'skill', 'memory', 'soul'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    const newTypes = filters.types.includes(type)
                      ? filters.types.filter(t => t !== type)
                      : [...filters.types, type];
                    setFilters({ ...filters, types: newTypes });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                    filters.types.includes(type)
                      ? typeColors[type]
                      : 'bg-[#1F2226] text-[#6B7280] hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#6B7280] border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : query && filteredResults.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No results found for &quot;{query}&quot;</p>
              {semanticMode && <p className="text-sm mt-1">Try disabling semantic search for exact matches</p>}
            </div>
          ) : (
            filteredResults.map((result) => (
              <Link key={result.id} href={`/knowledge/document/${result.id}`} className="block p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-indigo-500/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded border capitalize ${typeColors[result.type]}`}>{result.type}</span>
                      <span className="text-xs text-[#6B7280]">{result.entity}</span>
                      {result.relevance > 0.8 && <span className="px-2 py-0.5 text-xs bg-[#16C784]/10 text-[#16C784] rounded">High relevance</span>}
                    </div>
                    <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors">{result.title}</h3>
                    <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">{result.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(result.updatedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{result.entity}</span>
                      {result.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1"><Tag className="w-3 h-3" />{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6B7280] group-hover:text-indigo-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
