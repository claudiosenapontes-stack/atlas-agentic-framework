"use client";

import { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, 
  Send, 
  Radio, 
  Users, 
  BookOpen,
  RefreshCw,
  Hash,
  Clock
} from "lucide-react";

interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  message: string;
  timestamp: string;
  type: "direct" | "broadcast";
}

interface KnowledgeItem {
  id: string;
  title: string;
  contributedBy: string[];
  content: string;
  tags: string[];
  usage: number;
  timestamp: string;
}

const agentColors: Record<string, string> = {
  forge: "text-orange-400",
  vector: "text-purple-400",
  scout: "text-green-400",
  guard: "text-red-400",
  flux: "text-blue-400",
};

const agentBgColors: Record<string, string> = {
  forge: "bg-orange-500/10",
  vector: "bg-purple-500/10",
  scout: "bg-green-500/10",
  guard: "bg-red-500/10",
  flux: "bg-blue-500/10",
};

export function AgentChatNetwork() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "knowledge">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/agents/chat");
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
        setKnowledgeBase(data.knowledgeBase);
      }
    } catch (err) {
      console.error("Failed to fetch chat data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedAgent === "all" ? "broadcast" : "direct",
          from: "human",
          to: selectedAgent,
          message: newMessage,
        }),
      });

      setNewMessage("");
      fetchData();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-semibold text-white">Agent Chat Network</h3>
            <p className="text-xs text-gray-500">Inter-agent communication</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeTab === "chat"
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeTab === "knowledge"
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            Knowledge
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {activeTab === "chat" ? (
        <>
          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.type === "broadcast" ? "items-center" : ""
                  }`}
                >
                  {msg.type === "broadcast" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Radio className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Broadcast</span>
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.type === "broadcast"
                        ? "bg-yellow-500/10 border border-yellow-500/30 text-center"
                        : msg.from === "human"
                        ? "bg-blue-600 ml-auto"
                        : `${agentBgColors[msg.from] || "bg-gray-800"} border border-gray-700`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${agentColors[msg.from] || "text-blue-400"}`}>
                        {msg.fromName}
                      </span>
                      {msg.type === "direct" && msg.to !== "all" && (
                        <>
                          <span className="text-xs text-gray-500">→</span>
                          <span className="text-xs text-gray-500">{msg.toName}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-white">{msg.message}</p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="px-4 sm:px-6 py-3 border-t border-gray-800">
            <div className="flex gap-2 mb-2">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">📢 Broadcast to All</option>
                <option value="forge">Forge</option>
                <option value="vector">Vector</option>
                <option value="scout">Scout</option>
                <option value="guard">Guard</option>
                <option value="flux">Flux</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Knowledge Base */
        <div className="h-80 overflow-y-auto px-4 sm:px-6 py-4">
          {knowledgeBase.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No shared knowledge yet</p>
          ) : (
            <div className="space-y-4">
              {knowledgeBase.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      {item.title}
                    </h4>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.usage} uses
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{item.content}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded"
                      >
                        <Hash className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-gray-600 flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Contributed by: {item.contributedBy.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
