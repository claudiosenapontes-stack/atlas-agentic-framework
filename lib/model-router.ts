/**
 * ATLAS Model Router
 * ATLAS-MODEL-ROUTING-HEARTBEAT-503
 * 
 * Centralized model selection based on workload type.
 * Ensures heartbeat workloads always use Kimi K2.
 */

export interface ModelRoutingConfig {
  model: string;
  reasoning?: "low" | "medium" | "high";
  temperature?: number;
}

// Model aliases for clarity
export const MODELS = {
  KIMI_K2: "openrouter/moonshotai/kimi-k2",
  KIMI_K2_5: "openrouter/moonshotai/kimi-k2.5",
} as const;

// Workload types
export type WorkloadType = 
  | "heartbeat" 
  | "cron" 
  | "report" 
  | "interactive" 
  | "background" 
  | "default";

/**
 * Route workload to appropriate model
 * ATLAS-MODEL-ROUTING-HEARTBEAT-503: Heartbeat workloads always use Kimi K2
 */
export function routeModel(workloadType: WorkloadType): ModelRoutingConfig {
  switch (workloadType) {
    case "heartbeat":
      // ATLAS-MODEL-ROUTING-HEARTBEAT-503: Heartbeat workloads use Kimi K2
      return {
        model: MODELS.KIMI_K2,
        reasoning: "low",
        temperature: 0.1,
      };

    case "cron":
      // Cron jobs also use K2 for efficiency
      return {
        model: MODELS.KIMI_K2,
        reasoning: "low",
        temperature: 0.1,
      };

    case "report":
      // Reports use K2 for cost efficiency
      return {
        model: MODELS.KIMI_K2,
        reasoning: "low",
        temperature: 0.2,
      };

    case "interactive":
      // Interactive sessions use K2.5 for better quality
      return {
        model: MODELS.KIMI_K2_5,
        reasoning: "medium",
        temperature: 0.7,
      };

    case "background":
      // Background tasks use K2 for efficiency
      return {
        model: MODELS.KIMI_K2,
        reasoning: "low",
        temperature: 0.3,
      };

    case "default":
    default:
      // Default to K2 for efficiency
      return {
        model: MODELS.KIMI_K2,
        reasoning: "low",
        temperature: 0.5,
      };
  }
}

/**
 * Check if a workload should use Kimi K2 (for validation)
 */
export function requiresKimiK2(workloadType: WorkloadType): boolean {
  return ["heartbeat", "cron", "report"].includes(workloadType);
}

/**
 * Get model for heartbeat job (convenience function)
 * ATLAS-MODEL-ROUTING-HEARTBEAT-503
 */
export function getHeartbeatModel(): ModelRoutingConfig {
  return routeModel("heartbeat");
}
