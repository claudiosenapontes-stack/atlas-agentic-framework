// OpenClaw Gateway API Client for Atlas
// Connects to local OpenClaw Gateway to fetch real agent/session data

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

interface OpenClawSession {
  sessionKey: string;
  agentId?: string;
  label?: string;
  kind: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
}

interface OpenClawAgent {
  id: string;
  name: string;
  model: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen?: string;
  currentTask?: string;
}

class OpenClawClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = OPENCLAW_GATEWAY_URL, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token || OPENCLAW_TOKEN;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(5000),
      });

      const contentType = response.headers.get('content-type') || '';
      
      // Check if response is JSON
      if (!contentType.includes('application/json')) {
        const textPreview = await response.text().then(t => t.slice(0, 200));
        console.error(`[OpenClawClient] Non-JSON response from ${path}:`, {
          status: response.status,
          contentType,
          preview: textPreview,
        });
        return null; // Graceful fallback
      }

      if (!response.ok) {
        console.error(`[OpenClawClient] HTTP error from ${path}:`, {
          status: response.status,
          statusText: response.statusText,
        });
        return null; // Graceful fallback
      }

      return await response.json();
    } catch (error) {
      console.error(`[OpenClawClient] Request failed for ${path}:`, error);
      return null; // Graceful fallback instead of throwing
    }
  }

  // Get all active sessions
  async getSessions(kinds?: string[]): Promise<OpenClawSession[]> {
    const params = kinds ? `?kinds=${kinds.join(',')}` : '';
    const data = await this.fetch(`/sessions${params}`);
    return data?.sessions || [];
  }

  // Get active subagent sessions (these are "online" agents)
  async getActiveAgents(): Promise<OpenClawAgent[]> {
    try {
      const sessions = await this.getSessions(['subagent', 'acp']);
      
      if (!sessions.length) {
        console.log('[OpenClawClient] No active sessions found');
        return [];
      }
      
      // Map sessions to agents
      const agentMap = new Map<string, OpenClawAgent>();
      
      for (const session of sessions) {
        const agentId = session.agentId || session.label || 'unknown';
        
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            id: agentId,
            name: this.formatAgentName(agentId),
            model: 'unknown',
            status: 'online',
            lastSeen: session.lastMessageAt,
            currentTask: session.label || 'Active session',
          });
        }
      }

      return Array.from(agentMap.values());
    } catch (error) {
      console.error('[OpenClawClient] Failed to get active agents:', error);
      return []; // Graceful fallback
    }
  }

  // Get cron jobs (tasks)
  async getCronJobs(): Promise<any[]> {
    const data = await this.fetch('/cron');
    return data?.jobs || [];
  }

  // Get agent configuration
  async getAgentConfig(agentId: string): Promise<any> {
    const data = await this.fetch(`/agents/${agentId}`);
    return data;
  }

  // Health check
  async health(): Promise<boolean> {
    const data = await this.fetch('/health');
    return data !== null;
  }

  // Get gateway status/info
  async getGatewayInfo(): Promise<{ url: string; available: boolean; error?: string }> {
    try {
      const isHealthy = await this.health();
      return {
        url: this.baseUrl,
        available: isHealthy,
      };
    } catch (error) {
      return {
        url: this.baseUrl,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatAgentName(id: string): string {
    // Convert agent ID to display name
    const nameMap: Record<string, string> = {
      'henry': 'Henry',
      'harvey': 'Harvey',
      'einstein': 'Einstein',
      'sophia': 'Sophia',
      'severino': 'Severino',
      'olivia': 'Olivia',
      'optimus': 'Optimus',
      'optimus-prime': 'Prime',
      'prime': 'Prime',
    };
    
    return nameMap[id.toLowerCase()] || id.charAt(0).toUpperCase() + id.slice(1);
  }
}

// Singleton instance
let openClawClient: OpenClawClient | null = null;

export function getOpenClawClient(): OpenClawClient {
  if (!openClawClient) {
    openClawClient = new OpenClawClient();
  }
  return openClawClient;
}

export { OpenClawClient, type OpenClawSession, type OpenClawAgent };
