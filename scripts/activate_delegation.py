#!/usr/bin/env python3
"""
ATLAS-9930: Activate Real AI Worker Delegation System
One-command setup for production execution
"""

import os
import sys
import subprocess
import json

# Configuration
WORKERS = [
    'henry', 'optimus', 'optimus-prime', 'prime',
    'olivia', 'sophia', 'harvey', 'einstein', 'severino'
]

def check_prerequisites():
    """Check that required tools are available"""
    print("🔍 Checking prerequisites...")
    
    # Check PM2
    result = subprocess.run(['which', 'pm2'], capture_output=True)
    if result.returncode != 0:
        print("❌ PM2 not found. Install with: npm install -g pm2")
        return False
    
    # Check Redis
    result = subprocess.run(['redis-cli', 'ping'], capture_output=True)
    if b'PONG' not in result.stdout:
        print("❌ Redis not running. Start with: redis-server")
        return False
    
    # Check Python
    result = subprocess.run(['python3', '--version'], capture_output=True)
    if result.returncode != 0:
        print("❌ Python3 not found")
        return False
    
    print("✅ All prerequisites met")
    return True

def setup_environment():
    """Set up environment variables"""
    print("\n⚙️  Setting up environment...")
    
    env_vars = {
        'SUPABASE_URL': 'https://ukuicfswabcaioszcunb.supabase.co',
        'SUPABASE_SERVICE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWxvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg',
        'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWxvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg',
        'TZ': 'America/New_York',
        'PYTHONPATH': '/root/clawd-severino/scripts'
    }
    
    # Check for OpenRouter key
    openrouter_key = os.environ.get('OPENROUTER_API_KEY', '')
    if not openrouter_key:
        print("\n⚠️  WARNING: OPENROUTER_API_KEY not set!")
        print("Workers will run in SIMULATION mode (no AI execution)")
        print("\nTo enable real AI execution, set the key:")
        print("  export OPENROUTER_API_KEY='your-key-here'")
        print("  Then run this script again.\n")
    else:
        env_vars['OPENROUTER_API_KEY'] = openrouter_key
        print("✅ OpenRouter API key configured")
    
    for key, value in env_vars.items():
        os.environ[key] = value
    
    print("✅ Environment configured")
    return True

def stop_old_workers():
    """Stop any existing workers"""
    print("\n🛑 Stopping old workers...")
    
    for agent in WORKERS:
        worker_name = f"worker-{agent}"
        subprocess.run(['pm2', 'stop', worker_name], capture_output=True)
        subprocess.run(['pm2', 'delete', worker_name], capture_output=True)
    
    print("✅ Old workers cleaned up")

def start_workers():
    """Start all workers with real AI"""
    print("\n🚀 Starting workers with REAL AI execution...")
    
    script_path = '/root/clawd-severino/scripts/agent_worker.py'
    
    for agent in WORKERS:
        worker_name = f"worker-{agent}"
        print(f"  Starting {worker_name}...")
        
        subprocess.run([
            'pm2', 'start', script_path,
            '--name', worker_name,
            '--interpreter', 'python3',
            '--', agent, '--interval', '3'
        ], capture_output=True)
    
    print("✅ All workers started")

def verify_workers():
    """Verify workers are running"""
    print("\n🔍 Verifying workers...")
    
    result = subprocess.run(['pm2', 'list'], capture_output=True, text=True)
    
    online_count = 0
    for agent in WORKERS:
        worker_name = f"worker-{agent}"
        if worker_name in result.stdout and 'online' in result.stdout:
            online_count += 1
    
    print(f"✅ {online_count}/{len(WORKERS)} workers online")
    
    if online_count == len(WORKERS):
        print("\n🎉 DELEGATION SYSTEM IS LIVE!")
        print("\nWorkers are now:")
        print("  • Pulling tasks from Redis queues")
        print("  • Executing with real AI (if OPENROUTER_API_KEY set)")
        print("  • Updating Supabase with results")
        print("  • Showing progress in Mission Control UI")
        return True
    else:
        print("\n⚠️  Some workers failed to start. Check logs:")
        print("  pm2 logs")
        return False

def main():
    print("="*60)
    print("  ATLAS REAL AI DELEGATION SYSTEM - ACTIVATION")
    print("="*60)
    
    if not check_prerequisites():
        sys.exit(1)
    
    if not setup_environment():
        sys.exit(1)
    
    stop_old_workers()
    start_workers()
    
    # Wait a moment for workers to start
    import time
    time.sleep(3)
    
    if verify_workers():
        print("\n📊 Monitor with:")
        print("  pm2 logs                    # View all logs")
        print("  pm2 monit                   # Real-time monitor")
        print("  redis-cli llen agent:assignments:optimus-prime  # Check queue")
        print("\n🌐 Mission Control:")
        print("  https://atlas-agentic-framework.vercel.app/operations/missions")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
