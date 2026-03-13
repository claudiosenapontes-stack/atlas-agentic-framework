/**
 * ATLAS Logging Utility
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * 
 * Standardized logging with dual timestamps (UTC + NY)
 */

import { formatLogTimestamp, ATLAS_TIMEZONE, AGENT_TIMEZONE_CONTEXT } from './timezone';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  agent?: string;
  service?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Format a log line with dual timestamps
 * Format: [UTC: 2026-03-13T18:15:03Z | NY: 2026-03-13 14:15:03 ET] [LEVEL] [Agent/Service] Message
 */
function formatLogLine(
  level: LogLevel,
  message: string,
  agentOrService?: string,
  metadata?: Record<string, unknown>
): string {
  const timestamp = formatLogTimestamp();
  const source = agentOrService ? `[${agentOrService}] ` : '';
  const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
  
  return `[${timestamp}] [${level}] ${source}${message}${meta}`;
}

/**
 * Log at DEBUG level
 */
export function logDebug(
  message: string,
  agentOrService?: string,
  metadata?: Record<string, unknown>
): void {
  console.log(formatLogLine('DEBUG', message, agentOrService, metadata));
}

/**
 * Log at INFO level
 */
export function logInfo(
  message: string,
  agentOrService?: string,
  metadata?: Record<string, unknown>
): void {
  console.log(formatLogLine('INFO', message, agentOrService, metadata));
}

/**
 * Log at WARN level
 */
export function logWarn(
  message: string,
  agentOrService?: string,
  metadata?: Record<string, unknown>
): void {
  console.warn(formatLogLine('WARN', message, agentOrService, metadata));
}

/**
 * Log at ERROR level
 */
export function logError(
  message: string,
  agentOrService?: string,
  metadata?: Record<string, unknown>
): void {
  console.error(formatLogLine('ERROR', message, agentOrService, metadata));
}

/**
 * Agent logger factory
 * Creates a logger instance for a specific agent
 */
export function createAgentLogger(agentName: string) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => 
      logDebug(message, agentName, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => 
      logInfo(message, agentName, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => 
      logWarn(message, agentName, metadata),
    error: (message: string, metadata?: Record<string, unknown>) => 
      logError(message, agentName, metadata),
  };
}

/**
 * Service logger factory
 * Creates a logger instance for a specific service
 */
export function createServiceLogger(serviceName: string) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => 
      logDebug(message, serviceName, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => 
      logInfo(message, serviceName, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => 
      logWarn(message, serviceName, metadata),
    error: (message: string, metadata?: Record<string, unknown>) => 
      logError(message, serviceName, metadata),
  };
}

/**
 * Get timezone context for agents
 */
export function getAgentTimezoneContext() {
  return AGENT_TIMEZONE_CONTEXT;
}

/**
 * Log agent timezone initialization
 */
export function logAgentTimezoneInit(agentName: string): void {
  const context = getAgentTimezoneContext();
  logInfo(
    `Agent timezone initialized`,
    agentName,
    {
      system_time: context.system_time,
      display_time: context.display_time,
      storage_time: context.storage_time,
      location: context.location,
    }
  );
}

export { ATLAS_TIMEZONE, AGENT_TIMEZONE_CONTEXT };
