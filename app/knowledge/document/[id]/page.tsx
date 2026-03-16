'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, User, Tag, Edit, Download, Share2, MessageSquare } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'json' | 'code' | 'text';
  folder: string;
  updatedAt: string;
  createdAt: string;
  author: string;
  lastEditor: string;
  tags: string[];
  size: number;
  version: number;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

const mockDocument: Document = {
  id: '1',
  title: 'AGENTS.md',
  content: `# AGENTS.md - Agent Registry

## Active Agents

### Prime
- **Role:** Web Development & Technology Lead
- **Focus:** Web development, technology implementation
- **Status:** Active

### Optimus
- **Role:** Infrastructure & DevOps Lead
- **Focus:** Infrastructure, deployment, systems
- **Status:** Active

### Einstein
- **Role:** Research & Analysis Lead
- **Focus:** Deep research, data analysis
- **Status:** Active

## Agent Communication Protocol

All agents follow the ATLAS protocol for task delegation and status reporting.`,
  type: 'markdown',
  folder: 'atlas',
  updatedAt: '2026-03-16T10:00:00Z',
  createdAt: '2026-03-01T09:00:00Z',
  author: 'system',
  lastEditor: 'prime',
  tags: ['config', 'agents', 'registry'],
  size: 2048,
  version: 3,
};

const mockComments: Comment[] = [
  { id: '1', author: 'prime', text: 'Updated agent list with new Einstein role', createdAt: '2026-03-15T14:30:00Z' },
  { id: '2', author: 'optimus', text: 'Added deployment protocol section', createdAt: '2026-03-14T11:20:00Z' },
];

const mockVersions = [
  { version: 3, date: '2026-03-16T10:00:00Z', author: 'prime', changes: 'Added Einstein agent' },
  { version: 2, date: '2026-03-14T11:20:00Z', author: 'optimus', changes: 'Added protocol section' },
  { version: 1, date: '2026-03-01T09:00:00Z', author: 'system', changes: 'Initial creation' },
];

export default function DocumentPage() {
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'history' | 'comments'>('content');
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setDocument(mockDocument);
      setLoading(false);
    }, 300);
  }, [params.id]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'operator',
      text: newComment,
      createdAt: new Date().toISOString(),
    };
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const renderContent = () => {
    if (!document) return null;
    
    if (document.type === 'markdown') {
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          {document.content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-white mt-4 mb-2">{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium text-white mt-3 mb-2">{line.slice(4)}</h3>;
            if (line.startsWith('- ')) return <li key={i} className="text-[#9BA3AF] ml-4">{line.slice(2)}</li>;
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>;
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <p key={i} className="text-[#9BA3AF]">{line}</p>;
          })}
        </div>
      );
    }
    
    if (document.type === 'json') {
      return (
        <pre className="bg-[#0B0B0C] p-4 rounded-lg overflow-x-auto">
          <code className="text-sm text-green-400">{document.content}</code>
        </pre>
      );
    }
    
    if (document.type === 'code') {
      return (
        <pre className="bg-[#0B0B0C] p-4 rounded-lg overflow-x-auto">
          <code className="text-sm text-blue-400">{document.content}</code>
        </pre>
      );
    }
    
    return <pre className="text-[#9BA3AF] whitespace-pre-wrap">{document.content}</pre>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6B7280] border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <FileText className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Document not found</h1>
          <p className="text-[#6B7280] mb-4">The document you&apos;re looking for does not exist or has been removed.</p>
          <Link href="/knowledge/documents" className="text-indigo-400 hover:text-indigo-300">Back to documents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0B0B0C]/95 backdrop-blur border-b border-[#1F2226] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/knowledge/documents" className="p-2 hover:bg-[#1F2226] rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white">{document.title}</h1>
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <span className="px-2 py-0.5 bg-[#1F2226] rounded">{document.folder}</span>
                  <span>v{document.version}</span>
                  <span>Edited {new Date(document.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-[#9BA3AF] transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-[#1F2226] hover:bg-[#2A2D31] rounded-lg text-sm text-[#9BA3AF] transition-colors">
                <Download className="w-4 h-4" /> Download
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-sm text-indigo-400 transition-colors">
                <Edit className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {(['content', 'history', 'comments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-[#1F2226] text-white'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                {tab === 'comments' ? `Comments (${comments.length})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 bg-[#111214] border border-[#1F2226] rounded-[10px] p-6">
                {renderContent()}
              </div>
              <div className="space-y-4">
                <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                  <h3 className="text-sm font-medium text-white mb-3">Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <User className="w-4 h-4" />
                      <span>Created by {document.author}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      <Edit className="w-4 h-4" />
                      <span>Last edit by {document.lastEditor}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-4">
                  <h3 className="text-sm font-medium text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-[#1F2226] rounded text-xs text-[#9BA3AF]">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Version History</h2>
              <div className="space-y-4">
                {mockVersions.map((v, i) => (
                  <div key={v.version} className="flex items-start gap-4 pb-4 border-b border-[#1F2226] last:border-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-medium">
                      v{v.version}
                    </div>
                    <div className="flex-1">
                      <p className="text-white">{v.changes}</p>
                      <p className="text-sm text-[#6B7280]">
                        {v.author} • {new Date(v.date).toLocaleString()}
                      </p>
                    </div>
                    {i === 0 && <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">Current</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="bg-[#111214] border border-[#1F2226] rounded-[10px] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Comments</h2>
              <div className="space-y-4 mb-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 pb-4 border-b border-[#1F2226] last:border-0">
                    <div className="w-8 h-8 rounded-full bg-[#1F2226] flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{comment.author.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{comment.author}</span>
                        <span className="text-xs text-[#6B7280]">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[#9BA3AF]">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-4 py-3 bg-[#0B0B0C] border border-[#1F2226] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-indigo-500/50 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-400 rounded-lg text-sm transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
