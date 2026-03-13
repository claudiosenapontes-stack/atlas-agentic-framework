#!/bin/bash
# ATLAS Timezone Initialization
# ATLAS-TIMEZONE-STANDARDIZATION-501

export TZ=America/New_York
echo "[ATLAS-TZ] Timezone set to: $TZ"
echo "[ATLAS-TZ] Current time (NY): $(date)"
echo "[ATLAS-TZ] Current time (UTC): $(date -u)"
