/**
 * Agent Heartbeat API Endpoint
 * GET /api/agents/heartbeats
 * ATLAS-MODEL-ROUTING-HEARTBEAT-503: Uses Kimi K2 for heartbeat workloads
 * 
 * Returns fleet heartbeat status and metrics
 */

import { Router } from 'express';
import { getHeartbeatSummary } from './agent-heartbeat.js';
import { getHeartbeatModel, MODELS } from '@/lib/model-router';

const router = Router();

// ATLAS-MODEL-ROUTING-HEARTBEAT-503: Verify heartbeat endpoint uses Kimi K2
const HEARTBEAT_MODEL_CONFIG = getHeartbeatModel();
console.log(`[HeartbeatAPI] Model routing: ${HEARTBEAT_MODEL_CONFIG.model}`);

router.get('/heartbeats', async (req, res) => {
  try {
    const summary = await getHeartbeatSummary();
    res.json({
      ...summary,
      model_routing: {
        workload_type: 'heartbeat',
        model: HEARTBEAT_MODEL_CONFIG.model,
        k2_verified: HEARTBEAT_MODEL_CONFIG.model === MODELS.KIMI_K2,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch heartbeat data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
