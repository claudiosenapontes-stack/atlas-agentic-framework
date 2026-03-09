# Mission Control | Atlas Agentic Framework

A production-ready dashboard for managing AI agent swarms, tasks, and orchestration.

![Version](https://img.shields.io/badge/version-1.6-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 📋 Prerequisites

- Node.js 18+
- Redis server (local or cloud)
- Supabase account
- PM2 (for agent process management)

## 🔧 Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Redis
REDIS_URL=redis://localhost:6379

# Optional
MOCK_MODE=false
```

## 🏗️ Architecture

```
Mission Control
├── Next.js 14 (App Router)
├── Supabase (Database & Auth)
├── Redis (Queues & Presence)
├── PM2 (Process Management)
└── Tailwind CSS (Styling)
```

## 📡 API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `POST /api/tasks/claim` - Claim task (with Redis lock)
- `PATCH /api/tasks/[id]/status` - Update task status

### Agents
- `GET /api/agents/live` - List active agents with metrics
- `POST /api/agents/spawn` - Spawn new agent process
- `POST /api/agents/kill` - Stop agent process

### Health
- `GET /api/health` - System health check
- `GET /api/health/processes` - PM2 process status

## 🎨 Features

### V1.6 — Real Process Control
- ✅ Real PM2 process spawning/killing
- ✅ Live CPU/memory monitoring
- ✅ Distributed task claiming with Redis locks

### V1.5 — Agent Control Center
- ✅ Spawn 5 agent types (Forge, Vector, Scout, Guard, Flux)
- ✅ Real-time agent monitor with auto-refresh
- ✅ Swarm orchestration (parallel agent spawning)

### V1.4 — Wired Backend
- ✅ Task claiming with Redis locks
- ✅ Status workflow (inbox → in_progress → review → completed)
- ✅ Task creation API

### V1.3 — UI Foundation
- ✅ Task claim buttons
- ✅ Agent dashboard with load bars
- ✅ Notification system

### UI Polish
- ✅ Mobile responsive design
- ✅ Loading skeletons
- ✅ Touch-friendly interface

## 🧪 Agent Types

| Agent | Purpose | Capabilities |
|-------|---------|--------------|
| **Forge** | Code generation | coding, architecture, refactoring |
| **Vector** | Data analysis | analytics, charts, reporting |
| **Scout** | Research | web_search, data_gathering |
| **Guard** | Security | security, testing, validation |
| **Flux** | DevOps | deployment, infrastructure, ci_cd |

## 📁 Project Structure

```
mission-control/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── agents/            # Agent fleet page
│   ├── tasks/             # Task management page
│   └── ...
├── agents/                # Agent process scripts
│   ├── forge/index.js
│   ├── vector/index.js
│   └── ...
├── components/            # React components
│   ├── ui/               # UI primitives
│   └── ...
├── lib/                   # Utilities
│   ├── redis.ts          # Redis client
│   └── supabase.ts       # Supabase client
└── public/               # Static assets
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

### Docker

```bash
docker build -t mission-control .
docker run -p 3000:3000 mission-control
```

### Self-Hosted

```bash
npm run build
npm start
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
  pid INTEGER,
  killed_at TIMESTAMP,
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Credits

Built by the Atlas AI team:
- **Henry** — CEO/Strategy
- **Optimus** — Tech Lead
- **Prime** — Engineering/UI
- **Severino** — Ops/Infrastructure

---

**Mission Control** — Orchestrate your AI swarm.
