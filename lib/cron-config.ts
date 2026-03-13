/**
 * ATLAS Cron Job Configuration
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * 
 * All cron jobs execute in America/New_York timezone.
 * Model: openrouter/moonshotai/kimi-k2 (Tier-2 automation workload)
 */

import { ATLAS_TIMEZONE } from './timezone';

// Cron expression presets (in NY time)
export const CRON_SCHEDULES = {
  // Daily briefing: 07:00 ET
  DAILY_BRIEFING: '0 7 * * *',
  
  // Evening wrap: 18:00 ET  
  EVENING_WRAP: '0 18 * * *',
  
  // Weekly agent report: 02:00 ET Sunday
  WEEKLY_REPORT: '0 2 * * 0',
  
  // Hourly heartbeat: Every hour
  HOURLY_HEARTBEAT: '0 * * * *',
  
  // 30-minute heartbeat
  HALF_HOUR_HEARTBEAT: '*/30 * * * *',
  
  // Every 5 minutes (for testing)
  EVERY_5_MIN: '*/5 * * * *',
  
  // Every 15 minutes
  EVERY_15_MIN: '*/15 * * * *',
} as const;

// Default model for all cron jobs (Kimi K2)
export const CRON_MODEL = 'openrouter/moonshotai/kimi-k2';

// Cron job definitions
export interface CronJobDef {
  name: string;
  schedule: string;
  model: string;
  timezone: string;
  description: string;
}

export const CRON_JOBS: CronJobDef[] = [
  {
    name: 'daily-briefing',
    schedule: CRON_SCHEDULES.DAILY_BRIEFING,
    model: CRON_MODEL,
    timezone: ATLAS_TIMEZONE,
    description: 'Daily morning briefing at 07:00 ET',
  },
  {
    name: 'evening-wrap',
    schedule: CRON_SCHEDULES.EVENING_WRAP,
    model: CRON_MODEL,
    timezone: ATLAS_TIMEZONE,
    description: 'Evening wrap-up at 18:00 ET',
  },
  {
    name: 'weekly-agent-report',
    schedule: CRON_SCHEDULES.WEEKLY_REPORT,
    model: CRON_MODEL,
    timezone: ATLAS_TIMEZONE,
    description: 'Weekly agent report at 02:00 ET Sunday',
  },
  {
    name: 'hourly-heartbeat',
    schedule: CRON_SCHEDULES.HOURLY_HEARTBEAT,
    model: CRON_MODEL,
    timezone: ATLAS_TIMEZONE,
    description: 'Hourly system heartbeat',
  },
];

/**
 * Get cron job by name
 */
export function getCronJob(name: string): CronJobDef | undefined {
  return CRON_JOBS.find(job => job.name === name);
}

/**
 * Get all cron jobs for a specific timezone
 */
export function getCronJobsByTimezone(timezone: string): CronJobDef[] {
  return CRON_JOBS.filter(job => job.timezone === timezone);
}

/**
 * Format cron schedule with timezone info
 */
export function formatCronInfo(job: CronJobDef): string {
  return `${job.name}: "${job.schedule}" (${job.timezone}) - ${job.description}`;
}

// Re-export timezone for cron modules
export { ATLAS_TIMEZONE };
