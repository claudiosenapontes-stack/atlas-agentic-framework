'use client';

import { useState, useEffect } from 'react';
import { FileText, Folder, Grid, List, ChevronRight, Clock, User, Tag, Plus, Upload } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  type: 'markdown' | 'json' | 'code' | 'text';
  folder: string;
  updatedAt: string;
  author: string;
  tags: string[];
  size: number;
}

const mockDocuments: Document[] = [
  { id: '1', title: 'AGENTS.md', type: 'markdown', folder: 'atlas', updatedAt: '2026-03-16T10:00:00Z', author: 'system', tags: ['config', 'agents'], size: 2048 },
  { id: '2', title: 'SOUL.md', type: 'markdown', folder: 'prime', updatedAt: '2026-03-15T14:30:00Z', author: 'prime', tags: ['identity', 'soul'], size: 1536 },
  { id: '3', title: 'memory-records.json', type: 'json', folder: 'memory', updatedAt: '2026-03-14T09:00:00Z', author: 'system', tags: ['memory', 'data'], size: 4096 },
  { id: '4', title: 'deployment-guide.md', type: 'markdown', folder: 'docs', updatedAt: '2026-03-13T16:45:00Z', author: 'optimus', tags: ['docs', 'deployment'], size: 5120 },
  { id: '5', title: 'api-routes.ts', type: 'code', folder: 'api', updatedAt: '2026-03-12T11:20:00Z', author: 'prime', tags: ['api', 'code'], size: 3072 },
];

const folders = ['all', 'atlas', 'prime', 'memory', 'docs', 'api'];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter(doc => {
    if (selectedFolder !== 'all' && doc.folder !== selectedFolder) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const typeIcons: Record<string, React.ReactNode> = {
    markdown: <FileText className="w-5 h-5 text-blue-400" />,
    json: <FileText className="w-5 h-5 text-green-400" />,
    code: <FileText className="w-5 h-5 text-purple-400" />,
    text: <FileText className="w-5 h-5 text-[#6B7280]" />,
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Documents</h1>
              <p className="text-sm text-[#6B7280]">{filteredDocs.length} files in knowledge base</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#1F2226] text-white' : 'text-[#6B7280] hover:text-white'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#1F2226] text-white' : 'text-[#6B7280] hover:text-white'}`}>
              <List className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-[#1F2226] mx-1" />
            <button className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-white transition-colors">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-sm text-indigo-400 transition-colors">
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        {/* Folder Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                selectedFolder === folder
                  ? 'bg-[#1F2226] text-white border border-[#2A2D32]'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]/50'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>

        {/* Documents */}
        {viewMode === 'list' ? (
          <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2226]">
                  <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">Folder</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">Tags</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">Updated</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">Size</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-[#1F2226] last:border-0 hover:bg-[#1F2226]/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/knowledge/document/${doc.id}`} className="flex items-center gap-3 group">
                        {typeIcons[doc.type]}
                        <span className="text-sm text-white group-hover:text-indigo-400 transition-colors">{doc.title}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-[#1F2226] rounded text-xs text-[#9BA3AF]">{doc.folder}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {doc.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="flex items-center gap-1 text-xs text-[#6B7280]"><Tag className="w-3 h-3" />{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{new Date(doc.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{formatSize(doc.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocs.map((doc) => (
              <Link key={doc.id} href={`/knowledge/document/${doc.id}`} className="p-4 bg-[#111214] border border-[#1F2226] rounded-[10px] hover:border-indigo-500/30 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  {typeIcons[doc.type]}
                  <span className="text-xs text-[#6B7280]">{formatSize(doc.size)}</span>
                </div>
                <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors mb-1">{doc.title}</h3>
                <p className="text-xs text-[#6B7280]">{doc.folder} • {new Date(doc.updatedAt).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
