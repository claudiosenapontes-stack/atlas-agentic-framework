'use client';

import { useState, useCallback, useEffect } from 'react';
import { Send, History, Loader2, Terminal, CheckCircle, XCircle } from 'lucide-react';

interface CommandHistory {
  id: string;
  command: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  response?: string;
}

interface CommandCenterProps {
  companyId?: string;
  sourceUserId?: string;
}

export function CommandCenter({ companyId = '29712e4c-a88a-4269-8adb-2802a79087a6', sourceUserId = '8231688634' }: CommandCenterProps) {
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('atlas-command-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('atlas-command-history', JSON.stringify(history.slice(0, 50)));
    }
  }, [history]);

  const submitCommand = useCallback(async () => {
    if (!command.trim() || isLoading) return;

    setIsLoading(true);
    const commandId = Math.random().toString(36).substring(7);
    
    // Add to history immediately as pending
    setHistory((prev) => [
      { id: commandId, command: command.trim(), timestamp: new Date(), status: 'pending' },
      ...prev.slice(0, 49),
    ]);

    try {
      const response = await fetch('/api/commands/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceChannel: 'mission_control',
          sourceUserId,
          companyId,
          commandText: command.trim(),
          metadata: { 
            source: 'control-panel',
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Command failed');
      }

      // Update history with success
      setHistory((prev) =>
        prev.map((h) =>
          h.id === commandId
            ? { ...h, status: 'success', response: data.message || 'Command queued' }
            : h
        )
      );

      setCommand('');
    } catch (err: any) {
      // Update history with error
      setHistory((prev) =>
        prev.map((h) =>
          h.id === commandId
            ? { ...h, status: 'error', response: err.message }
            : h
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [command, companyId, sourceUserId, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCommand();
    }
  };

  return (
    <div className="bg-[#111214] rounded-[10px] border border-[#1F2226] flex flex-col">
      <div className="px-3 py-2 border-b border-[#1F2226] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#9BA3AF]" />
          <h2 className="text-xs font-medium text-[#9BA3AF] uppercase tracking-wider">Command</h2>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-[10px] text-[#6B7280] hover:text-white px-2 py-1 rounded hover:bg-[#1F2226] transition-colors"
        >
          <History className="w-3 h-3" />
          {showHistory ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 px-3 py-2 bg-[#0B0B0C] border border-[#1F2226] rounded-lg focus:outline-none focus:border-[#6B7280] text-white text-sm placeholder:text-[#6B7280]"
            disabled={isLoading}
          />
          <button
            onClick={submitCommand}
            disabled={isLoading || !command.trim()}
            className="px-3 py-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF6A00]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-[#6B7280] mt-2">
          Press Enter to send. Auto-routed by content.
        </p>
      </div>

      {showHistory && history.length > 0 && (
        <div className="border-t border-[#1F2226] flex-1 overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-[#0B0B0C] text-[10px] font-medium text-[#6B7280] uppercase shrink-0">
            History ({history.length})
          </div>
          <div className="overflow-y-auto flex-1">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="px-3 py-2 border-b border-[#1F2226] last:border-0 hover:bg-[#0B0B0C] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white truncate flex-1 mr-2">{item.command}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                      item.status === 'success'
                        ? 'bg-[#16C784]/10 text-[#16C784]'
                        : item.status === 'error'
                        ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                        : 'bg-[#FFB020]/10 text-[#FFB020]'
                    }`}
                  >
                    {item.status === 'success' && <CheckCircle className="w-3 h-3" />}
                    {item.status === 'error' && <XCircle className="w-3 h-3" />}
                    {item.status}
                  </span>
                </div>
                {item.response && (
                  <p className="text-[10px] text-[#6B7280] mt-1 truncate">{item.response}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
