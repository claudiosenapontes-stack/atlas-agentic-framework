#!/usr/bin/env node
// Seed sample tasks for Atlas Agentic Framework

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const sampleTasks = [
  {
    title: "Review Q1 financial projections",
    description: "Analyze and validate quarterly financial forecasts for board presentation",
    priority: "high",
    status: "in_progress",
    assigned_agent_id: null,
    company_id: null,
  },
  {
    title: "Update marketing campaign assets",
    description: "Refresh social media graphics for spring product launch",
    priority: "medium",
    status: "inbox",
    assigned_agent_id: null,
    company_id: null,
  },
  {
    title: "Research competitor AI tools",
    description: "Benchmark against top 5 competing agentic frameworks",
    priority: "urgent",
    status: "in_progress",
    assigned_agent_id: null,
    company_id: null,
  },
  {
    title: "Fix Redis connection pooling",
    description: "Optimize connection handling for high-throughput scenarios",
    priority: "high",
    status: "in_progress",
    assigned_agent_id: null,
    company_id: null,
  },
  {
    title: "Draft investor update email",
    description: "Summarize progress on Atlas framework v2.3 rollout",
    priority: "medium",
    status: "review",
    assigned_agent_id: null,
    company_id: null,
  },
  {
    title: "Audit user permissions",
    description: "Review ACL settings across all company workspaces",
    priority: "low",
    status: "planned",
    assigned_agent_id: null,
    company_id: null,
  },
];

async function seedTasks() {
  console.log('Seeding tasks...');
  
  for (const task of sampleTasks) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          ...task,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        console.log(`✅ Created: ${task.title}`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed: ${task.title} - ${error}`);
      }
    } catch (err) {
      console.error(`❌ Error: ${task.title} - ${err}`);
    }
  }
  
  console.log('Done!');
}

seedTasks();
