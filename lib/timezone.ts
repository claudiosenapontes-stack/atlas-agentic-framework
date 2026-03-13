/**
 * ATLAS-Timezone Standardization
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * 
 * Centralized timezone configuration for all Atlas agents and services.
 * Primary timezone: America/New_York (Miami/New York)
 * Storage: UTC (database)
 * Display: America/New_York
 */

// Primary timezone for all Atlas operations
export const ATLAS_TIMEZONE = 'America/New_York';

// Storage timezone (database)
export const STORAGE_TIMEZONE = 'UTC';

// Format options for display
export const DISPLAY_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: ATLAS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

/**
 * Get current date in Atlas timezone (America/New_York)
 */
export function getAtlasDate(): Date {
  const now = new Date();
  const nyString = now.toLocaleString('en-US', { timeZone: ATLAS_TIMEZONE });
  return new Date(nyString);
}

/**
 * Format date for Atlas display (NY time)
 */
export function formatAtlasDate(date: Date = new Date()): string {
  return date.toLocaleString('en-US', DISPLAY_FORMAT_OPTIONS);
}

/**
 * Format date for Atlas display with timezone indicator
 * Format: 2026-03-13 14:15:03 ET
 */
export function formatAtlasDateWithZone(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ATLAS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second} ET`;
}

/**
 * Format date for UTC storage
 * Format: 2026-03-13T18:15:03Z
 */
export function formatUTCDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Get dual timestamp for logging
 * Returns both UTC and NY timestamps
 */
export function getDualTimestamp(): { utc: string; ny: string } {
  const now = new Date();
  return {
    utc: formatUTCDate(now),
    ny: formatAtlasDateWithZone(now),
  };
}

/**
 * Format log timestamp with both UTC and NY
 * Format: UTC: 2026-03-13T18:15:03Z | NY: 2026-03-13 14:15:03 ET
 */
export function formatLogTimestamp(): string {
  const { utc, ny } = getDualTimestamp();
  return `UTC: ${utc} | NY: ${ny}`;
}

/**
 * Agent timezone context
 * All agents use this configuration
 */
export const AGENT_TIMEZONE_CONTEXT = {
  system_time: ATLAS_TIMEZONE,
  display_time: ATLAS_TIMEZONE,
  storage_time: STORAGE_TIMEZONE,
  location: 'Miami/New York',
  utc_offset: '-5/-4 DST',
};

/**
 * Check if current environment has TZ set correctly
 */
export function validateTimezone(): boolean {
  const envTz = process.env.TZ;
  if (envTz !== ATLAS_TIMEZONE) {
    console.warn(`[ATLAS-TZ] Warning: TZ environment variable is ${envTz}, expected ${ATLAS_TIMEZONE}`);
    return false;
  }
  return true;
}

/**
 * Initialize timezone for a service or agent
 */
export function initAtlasTimezone(): void {
  process.env.TZ = ATLAS_TIMEZONE;
  const { utc, ny } = getDualTimestamp();
  console.log(`[ATLAS-TZ] Timezone initialized: ${ATLAS_TIMEZONE}`);
  console.log(`[ATLAS-TZ] Current time - UTC: ${utc} | NY: ${ny}`);
}
