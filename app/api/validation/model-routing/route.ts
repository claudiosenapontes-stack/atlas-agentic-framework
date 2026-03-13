/**
 * Model Routing Validation Endpoint
 * ATLAS-MODEL-ROUTING-HEARTBEAT-503
 * 
 * GET /api/validation/model-routing
 * Returns model routing configuration for verification
 */

import { NextRequest, NextResponse } from "next/server";
import { routeModel, getHeartbeatModel, MODELS, requiresKimiK2 } from "@/lib/model-router";

export async function GET(request: NextRequest) {
  const heartbeatConfig = getHeartbeatModel();
  
  // Test all workload types
  const routingConfigs = {
    heartbeat: routeModel("heartbeat"),
    cron: routeModel("cron"),
    report: routeModel("report"),
    interactive: routeModel("interactive"),
    background: routeModel("background"),
    default: routeModel("default"),
  };

  // Validation checks
  const validations = {
    heartbeat_uses_k2: heartbeatConfig.model === MODELS.KIMI_K2,
    cron_uses_k2: routingConfigs.cron.model === MODELS.KIMI_K2,
    report_uses_k2: routingConfigs.report.model === MODELS.KIMI_K2,
    interactive_uses_k2_5: routingConfigs.interactive.model === MODELS.KIMI_K2_5,
    requires_k2_check: requiresKimiK2("heartbeat") === true,
  };

  const allValid = Object.values(validations).every(v => v === true);

  return NextResponse.json({
    success: allValid,
    timestamp: new Date().toISOString(),
    routing: {
      heartbeat: heartbeatConfig,
      all_configs: routingConfigs,
    },
    validations,
    models: MODELS,
    compliance: {
      heartbeat_model_verified: validations.heartbeat_uses_k2,
      cron_jobs_compliant: validations.cron_uses_k2,
      all_heartbeat_workloads_k2: validations.heartbeat_uses_k2 && validations.cron_uses_k2 && validations.report_uses_k2,
    },
  });
}
