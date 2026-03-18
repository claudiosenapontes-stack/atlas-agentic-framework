# Mission Control | Atlas Agentic Framework

A production-ready dashboard for managing AI agent swarms, tasks, and orchestration.

![Version](https://img.shields.io/badge/version-2.0-purple)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations (see Schema section)
# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 📋 Prerequisites

- Node.js 18+
- Redis server (local or cloud — Upstash recommended)
- Supabase account
- PM2 (optional, for agent process management)

## 🔧 Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Redis
REDIS_URL=redis://localhost:6379
# Or for Upstash: REDIS_URL=rediss://default:password@host:port

# Optional
MOCK_MODE=false
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mission Control V2.0                     │
├─────────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router)                                    │
│  ├── React Server Components                               │
│  ├── API Routes (12 endpoints)                             │
│  └── Tailwind CSS + Mobile Responsive                      │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── Supabase (PostgreSQL) — Tasks, Agents, Executions     │
│  └── Redis — Queues, Presence, Distributed Locks           │
├─────────────────────────────────────────────────────────────┤
│  Agent Runtime                                              │
│  ├── 5 Agent Types (Forge, Vector, Scout, Guard, Flux)     │
│  ├── child_process.spawn() for process isolation          │
│  └── Redis pub/sub for inter-agent communication          │
└─────────────────────────────────────────────────────────────┘
```

## 📡 API Endpoints

### Tasks (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create new task |
| POST | `/api/tasks/claim` | Claim task with Redis lock |
| PATCH | `/api/tasks/[id]/status` | Update task status |

### Agents (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/live` | Real-time agent metrics |
| POST | `/api/agents/spawn` | Spawn new agent process |
| POST | `/api/agents/kill` | Terminate agent process |
| GET | `/api/agents/self-heal` | Healing events & status |
| GET | `/api/agents/scale` | Auto-scaling status |
| GET | `/api/agents/insights` | Agent learning insights |
| GET | `/api/agents/meta` | Skill trees & reflections |
| GET | `/api/agents/chat` | Inter-agent messages |
| GET | `/api/agents/autonomy` | Decision log & controls |

### Health (2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/health/processes` | PM2 process status |

## 🎨 Feature Matrix

### V1.3 — UI Foundation ✅
- Task Claim Button with loading states
- Agent Dashboard with stats grid
- Notification Bell + Panel
- Task status workflow UI

### V1.4 — Wired Backend ✅
- Redis distributed locks for task claiming
- Status workflow (inbox → in_progress → review → completed)
- Task creation API with validation
- Execution record tracking

### V1.5 — Agent Control Center ✅
- Spawn 5 agent types (Forge, Vector, Scout, Guard, Flux)
- Live Agent Monitor (CPU, memory, uptime)
- Swarm Orchestrator (parallel spawn 2-8 agents)
- Auto-refresh every 10 seconds

### V1.6 — Real Process Control ✅
- Real process spawning via child_process
- Process termination with SIGTERM/SIGKILL
- Live metrics from `ps aux`
- PID tracking in Supabase

### V1.7 — UI Polish ✅
- Mobile responsive (stacks on <768px)
- 12 loading skeleton variants
- Touch-friendly interface (44px min)
- Complete README documentation

### V1.8 — Intelligence Layer ✅
- Self-Healing Monitor (restart tracking, alerts)
- Auto-Scaler (queue depth gauge, recommendations)
- Agent Insights (learning feed, sharing)
- Critical agent detection (>3 restarts/hour)

### V2.0 — Autonomous Network ✅
- **Meta-Cognition Dashboard**
  - Skill trees with progress bars
  - Agent self-reflections
  - Collaboration network visualization
  - Per-agent training controls

- **Agent Chat Network**
  - Real-time inter-agent messaging
  - Broadcast to all agents
  - Direct agent-to-agent messages
  - Shared knowledge base

- **Autonomous Decisions**
  - Decision log with confidence scores
  - Autonomy level slider (0-100%)
  - Human override controls
  - Approve/reject pending decisions

## 🧪 Agent Types

| Agent | Purpose | Capabilities | Best For |
|-------|---------|--------------|----------|
| **Forge** | Code generation | coding, architecture, refactoring | Building features |
| **Vector** | Data analysis | analytics, charts, reporting | Data processing |
| **Scout** | Research | web_search, data_gathering | Information gathering |
| **Guard** | Security | security, testing, validation | Security audits |
| **Flux** | DevOps | deployment, infrastructure, ci_cd | Deployments |

## 📁 Project Structure

```
atlas-agentic-framework/
├── app/                          # Next.js app router
│   ├── api/                     # 12 API routes
│   │   ├── agents/             # 8 agent endpoints
│   │   └── tasks/              # 4 task endpoints
│   ├── components/             # 12 UI components
│   │   ├── agent-chat-network.tsx
│   │   ├── agent-insights.tsx
│   │   ├── agent-meta-dashboard.tsx
│   │   ├── auto-scaler.tsx
│   │   ├── autonomous-decisions.tsx
│   │   ├── live-agent-monitor.tsx
│   │   ├── self-healing-monitor.tsx
│   │   ├── swarm-controller.tsx
│   │   ├── swarm-orchestrator.tsx
│   │   └── task-claim-button.tsx
│   ├── agents/                 # Fleet, Tasks, etc.
│   └── globals.css            # Mobile responsive styles
├── agents/                     # Agent process scripts
│   ├── forge/index.js         # Code generation agent
│   ├── vector/index.js        # Data analysis agent
│   ├── scout/index.js         # Research agent
│   ├── guard/index.js         # Security agent
│   └── flux/index.js          # DevOps agent
├── components/                # Shared components
│   ├── ui/                   # Skeleton, Navbar, etc.
│   └── health-dashboard.tsx
├── lib/                       # Utilities
│   ├── redis.ts              # Redis client + locks
│   ├── supabase.ts           # Supabase client
│   └── utils.ts              # Helper functions
├── README.md                 # This file
├── INTEGRATION_TEST_LOG.md   # Test results
└── package.json
```

## 🗄️ Database Schema

### Agents Table
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT,
  status TEXT DEFAULT 'offline',
  capabilities TEXT[],
  pid INTEGER,                    -- ADD THIS
  killed_at TIMESTAMP,            -- ADD THIS
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox',
  priority TEXT DEFAULT 'medium',
  assigned_agent_id UUID REFERENCES agents(id),
  company_id UUID,
  claimed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Executions Table
```sql
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  agent_id UUID REFERENCES agents(id),
  status TEXT DEFAULT 'queued',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**⚠️ Required Schema Update:**
Run this in Supabase SQL Editor:
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS pid INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS killed_at TIMESTAMP WITH TIME ZONE;
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

**Environment Variables in Vercel:**
- Add all vars from `.env.local` to Vercel Project Settings
- Add `REDIS_URL` (use Upstash for serverless Redis)

### Docker

```bash
# Build image
docker build -t atlas-agentic-framework .

# Run container
docker run -p 3000:3000 \
  -e REDIS_URL=redis://host:6379 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  atlas-agentic-framework
```

### Self-Hosted with PM2

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "atlas-agentic-framework" -- start

# Save PM2 config
pm2 save
pm2 startup
```

## 📊 Monitoring

### Health Check
```bash
curl https://your-domain.com/api/health
```

### Agent Status
```bash
curl https://your-domain.com/api/agents/live
```

### Queue Depth
```bash
curl https://your-domain.com/api/agents/scale
```

## 🐛 Troubleshooting

### Build fails
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Redis connection errors
- Check `REDIS_URL` format
- For Upstash: ensure `rediss://` (with SSL)
- Check firewall rules

### Supabase errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Run schema updates (see Database Schema section)
- Check RLS policies if using auth

### Agent processes not spawning
- Ensure Node.js has permission to spawn processes
- Check PM2 is installed: `npm list -g pm2`
- Review logs: `pm2 logs`

## 🛣️ Roadmap

### V2.1 — Agent Result Aggregation
- Collect outputs from swarm agents
- Automatic result merging
- Conflict resolution

### V2.2 — Advanced Autonomy
- Self-healing with automatic restarts
- Predictive scaling based on patterns
- Agent learning from failures

### V2.3 — Multi-Region
- Agent federation across regions
- Latency-based task routing
- Cross-region collaboration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

## 🙏 Credits

Built by the Atlas AI team:
- **Henry** — CEO/Strategy & Architecture
- **Optimus** — Tech Lead & Backend
- **Prime** — Engineering/UI & V2.0 Implementation
- **Severino** — Ops/Infrastructure

---

**Mission Control V2.0** — The Agent Network is Self-Aware. ⚡
// Deployment trigger: Mon Mar 16 14:23:36 EDT 2026
// Force redeploy Mon Mar 16 21:58:40 EDT 2026
// Force redeploy 1773715119
// Schema refresh trigger 1773716645
# Force redeploy 1773716979
// Force redeploy 1773717190
// Force redeploy 1773717776
// Force redeploy 1773724115
# Force redeploy - Build cache OFF - 1773727791
// Force deploy 1773729891
# Deployment trigger 2026-03-18T02:21:03Z
