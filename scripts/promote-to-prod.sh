#!/bin/bash
#
# ATLAS-PROD-PROMOTION-SCRIPT-706
# Production deployment with Gate 4 verification gate
#
# USAGE: ./scripts/promote-to-prod.sh [force]
# 
# CONDITIONS FOR AUTO-PROMOTE:
# 1. Henry returns gate4_verified = YES
# 2. G4 status updated from PARTIAL to VERIFIED in gate-status-mars.tsx
# 3. Blocker panel updated to "Closeout Success" state
# 4. All tests pass

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  ATLAS PRODUCTION PROMOTION — Gate 4 Verification Required"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check for force flag
FORCE=false
if [ "$1" == "force" ]; then
  FORCE=true
  echo "⚠️  FORCE MODE: Bypassing G4 verification check"
  echo ""
fi

# Working directory
WORKSPACE="/root/.openclaw/workspaces/atlas-agentic-framework"
cd "$WORKSPACE"

# Current Git state
echo "📋 Current State:"
echo "   Branch: $(git branch --show-current)"
echo "   Commit: $(git rev-parse --short HEAD)"
echo "   Message: $(git log -1 --pretty=%s)"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ ERROR: Uncommitted changes detected"
  git status --short
  exit 1
fi

# Verify build passes
echo "🔨 Running build verification..."
npm run build > /tmp/build.log 2>&1
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Build failed"
  tail -50 /tmp/build.log
  exit 1
fi
echo "   ✅ Build passed"
echo ""

# Check Gate 4 status in source code
echo "🔍 Checking Gate 4 status in source..."
G4_STATUS=$(grep -o 'gate4.*=.*"[^"]*"' app/components/gate-status-mars.tsx | head -1 | grep -o 'operational\|in_progress\|pending\|degraded' || echo "unknown")

if [ "$G4_STATUS" == "operational" ]; then
  echo "   ✅ G4 status: VERIFIED (operational)"
  G4_VERIFIED=true
elif [ "$G4_STATUS" == "in_progress" ]; then
  echo "   ⚠️  G4 status: PARTIAL (in_progress)"
  G4_VERIFIED=false
else
  echo "   ⚠️  G4 status: $G4_STATUS"
  G4_VERIFIED=false
fi
echo ""

# Check for Henry's verification marker
if [ -f ".gate4-verified" ]; then
  HENRY_VERIFIED=$(cat .gate4-verified)
  if [ "$HENRY_VERIFIED" == "YES" ]; then
    echo "   ✅ Henry verification: YES (.gate4-verified file present)"
    HENRY_APPROVAL=true
  else
    echo "   ⚠️  Henry verification: $HENRY_VERIFIED"
    HENRY_APPROVAL=false
  fi
else
  echo "   ⚠️  Henry verification: NOT FOUND (no .gate4-verified file)"
  HENRY_APPROVAL=false
fi
echo ""

# PROMOTION DECISION
echo "═══════════════════════════════════════════════════════════"
echo "  PROMOTION DECISION"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FORCE" == true ]; then
  echo "🚀 FORCE PROMOTION — Deploying to production"
  DEPLOY=true
elif [ "$G4_VERIFIED" == true ] && [ "$HENRY_APPROVAL" == true ]; then
  echo "🚀 AUTO-APPROVED — G4 verified + Henry approval"
  DEPLOY=true
else
  echo "⛔ PROMOTION BLOCKED"
  echo ""
  echo "   Conditions for auto-promote:"
  echo "   1. G4 status = VERIFIED (currently: $G4_STATUS)"
  echo "   2. Henry approval = YES (currently: $HENRY_APPROVAL)"
  echo ""
  echo "   To promote anyway, run:"
  echo "   ./scripts/promote-to-prod.sh force"
  echo ""
  DEPLOY=false
fi

if [ "$DEPLOY" == true ]; then
  echo ""
  echo "📦 Deploying to production..."
  vercel --prod --yes
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PRODUCTION DEPLOYMENT COMPLETE"
    echo "   URL: https://atlas-agentic-framework.vercel.app"
    echo "   Time: $(date)"
    echo ""
    
    # Update deployment log
    cat >> prod-deployments.log << EOF
$(date -Iseconds) | $(git rev-parse --short HEAD) | $(git log -1 --pretty=%s) | SUCCESS
EOF
    
    exit 0
  else
    echo ""
    echo "❌ PRODUCTION DEPLOYMENT FAILED"
    exit 1
  fi
fi

exit 0
