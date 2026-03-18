#!/bin/bash
# ATLAS-9930: Setup worker environment and restart with real AI execution

echo "=== SETTING UP WORKER ENVIRONMENT ==="

# Export all required env vars
export SUPABASE_URL="https://ukuicfswabcaioszcunb.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWxvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg"
export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_KEY"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-sk-or-v1-7d8f4a9b2c1e5d6f8a3b4c5d6e7f8a9b}"
export TZ="America/New_York"

echo "✅ Environment configured"
echo ""
echo "=== STOPPING OLD WORKERS ==="
pm2 stop worker-optimus-prime 2>/dev/null || true
pm2 delete worker-optimus-prime 2>/dev/null || true

echo ""
echo "=== RESTARTING ALL WORKERS WITH REAL AI ==="

# Define workers with proper agent names
declare -a WORKERS=(
    "henry"
    "optimus"
    "optimus-prime"
    "prime"
    "olivia"
    "sophia"
    "harvey"
    "einstein"
    "severino"
)

for agent in "${WORKERS[@]}"; do
    pm2_name="worker-$agent"
    echo "Restarting $pm2_name..."
    
    # Check if exists
    if pm2 describe "$pm2_name" > /dev/null 2>&1; then
        # Update env and restart
        pm2 restart "$pm2_name" --update-env
    else
        # Create new worker
        pm2 start /root/clawd-severino/scripts/agent_worker.py \
            --name "$pm2_name" \
            --interpreter python3 \
            -- "$agent" --interval 3
    fi
done

echo ""
echo "=== SAVING PM2 CONFIG ==="
pm2 save

echo ""
echo "=== VERIFYING WORKERS ==="
pm2 list | grep worker

echo ""
echo "✅ ALL WORKERS RESTARTED WITH REAL AI EXECUTION!"
echo ""
echo "Workers will now:"
echo "  1. Pull tasks from Redis queues"
echo "  2. Execute via OpenRouter AI (kimi-k2.5)"
echo "  3. Update Supabase with real results"
echo "  4. Show live progress in Mission Control UI"
