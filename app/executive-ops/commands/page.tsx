'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  Loader2,
  AlertCircle,
  Mic,
  Send,
  CheckCircle,
  XCircle,
  Mail,
  Target,
  Clock,
  Users,
  DollarSign,
  X
} from 'lucide-react';

interface Command {
  id: string;
  text: string;
  agent?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  createdAt: string;
  completedAt?: string;
}

async function getCommands(): Promise<Command[] | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-agentic-framework.vercel.app';
    const res = await fetch(`${baseUrl}/api/commands`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch commands');
    return await res.json();
  } catch {
    return null;
  }
}

const QUICK_COMMANDS = [
  { text: "Check my calendar", icon: Target },
  { text: "Summarize today's emails", icon: Mail },
  { text: "What are my P0 tasks?", icon: Target },
  { text: "Schedule focus time", icon: Clock },
  { text: "Who's working on what?", icon: Users },
  { text: "Cost summary", icon: DollarSign },
];

const STATUS_COLORS = {
  pending: 'text-[#FFB020]',
  processing: 'text-[#3B82F6]',
  completed: 'text-[#16C784]',
  failed: 'text-[#FF3B30]',
};

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCommands().then(data => {
      setCommands(data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    setInputValue('');
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setShowPermissionError(true);
      return;
    }
    setIsListening(true);
    setTimeout(() => setIsListening(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Voice & Commands</h1>
            <p className="text-sm text-[#6B7280]">Quick actions & voice control</p>
          </div>
        </div>

        {/* Voice Permission Error */}
        {showPermissionError && (
          <div className="mb-4 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-sm text-white">Voice recognition not available</span>
            </div>
            <button onClick={() => setShowPermissionError(false)} className="text-[#6B7280] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Command Input */}
        <div className="mb-6">
          <div className="flex items-center gap-2 p-2 bg-[#111214] border border-[#1F2226] rounded-[10px] focus-within:border-[#FF6A00] transition-colors">
            <button
              onClick={handleVoiceInput}
              className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'}`}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(inputValue)}
              placeholder="Type a command or use voice..."
              className="flex-1 bg-transparent text-white placeholder-[#6B7280] outline-none"
            />
            <button
              onClick={() => handleSubmit(inputValue)}
              disabled={!inputValue.trim()}
              className="p-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF8533] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="mb-6">
          <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-3">Quick Commands</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.text}
                  onClick={() => handleSubmit(cmd.text)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#111214] border border-[#1F2226] rounded-lg text-xs text-[#9BA3AF] hover:text-white hover:border-[#6B7280] transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cmd.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Command History */}
        <div>
          <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-3">Recent Commands</p>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" />
            </div>
          ) : commands?.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280]">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No commands yet</p>
              <p className="text-xs">Start typing or use voice</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commands?.map((cmd) => (
                <div
                  key={cmd.id}
                  className="p-3 bg-[#111214] border border-[#1F2226] rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${STATUS_COLORS[cmd.status]}`}>
                      {cmd.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                      {cmd.status === 'failed' && <XCircle className="w-4 h-4" />}
                      {cmd.status === 'pending' && <Clock className="w-4 h-4" />}
                      {cmd.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{cmd.text}</p>
                      {cmd.agent && (
                        <p className="text-xs text-[#6B7280]">Agent: {cmd.agent}</p>
                      )}
                      {cmd.result && (
                        <p className="mt-1 text-xs text-[#9BA3AF] bg-[#1F2226] p-2 rounded">{cmd.result}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#6B7280]">
                        <span>{new Date(cmd.createdAt).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className={STATUS_COLORS[cmd.status]}>{cmd.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
