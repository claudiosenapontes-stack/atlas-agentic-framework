#!/bin/bash
# ATLAS-COMMS-SAFETY-HOTFIX-601
# Patch OpenClaw to disable automatic pairing/debug messages

SAFE_MODE_CHECK='if(process.env.COMMS_SAFE_MODE==="true")return null;'

echo "[ATLAS-COMMS-SAFETY] Patching OpenClaw pairing messages..."

# Files to patch
FILES=(
  "/usr/lib/node_modules/openclaw/dist/compact-D3emcZgv.js"
  "/usr/lib/node_modules/openclaw/dist/pi-embedded-CrsFdYam.js"
  "/usr/lib/node_modules/openclaw/dist/pi-embedded-jHMb7qEG.js"
  "/usr/lib/node_modules/openclaw/dist/reply-DeXK9BLT.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/bluebubbles.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/dispatch-BCrTbhbt.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/dispatch-CJdFmoH9.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/dispatch-CM4tRXYq.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/dispatch-DwgTiP0N.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/dispatch-F_Zbttj6.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/feishu.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/googlechat.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/reply-UQ7w3uFC.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/zalo.js"
  "/usr/lib/node_modules/openclaw/dist/plugin-sdk/zalouser.js"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Check if already patched
    if grep -q "COMMS_SAFE_MODE" "$file"; then
      echo "[PATCH] Already patched: $file"
    else
      # Patch the buildPairingReply function
      # Add safe mode check at the beginning of the function
      sed -i 's/function buildPairingReply(params) {/function buildPairingReply(params) { if(process.env.COMMS_SAFE_MODE==="true")return null;/g' "$file"
      echo "[PATCH] Patched: $file"
    fi
  else
    echo "[PATCH] File not found: $file"
  fi
done

echo "[ATLAS-COMMS-SAFETY] Patching complete."
echo "[ATLAS-COMMS-SAFETY] Set COMMS_SAFE_MODE=true to enable safe mode."
