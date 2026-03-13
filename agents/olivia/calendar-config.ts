/**
 * Olivia Calendar Configuration
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * 
 * Olivia's Google Calendar integration uses America/New_York as default.
 */

import { ATLAS_TIMEZONE, formatAtlasDateWithZone } from '@/lib/timezone';

// Olivia's timezone settings
export const OLIVIA_TIMEZONE = {
  primary: ATLAS_TIMEZONE,
  display: 'America/New_York',
  location: 'Miami/New York',
  utcOffset: '-5/-4 DST',
};

// Calendar integration settings
export const CALENDAR_CONFIG = {
  // Default timezone for all calendar operations
  defaultTimezone: ATLAS_TIMEZONE,
  
  // Timezone for meeting reminders
  reminderTimezone: ATLAS_TIMEZONE,
  
  // Timezone for agenda briefings
  agendaTimezone: ATLAS_TIMEZONE,
  
  // Timezone for meeting summaries
  summaryTimezone: ATLAS_TIMEZONE,
  
  // Timezone for follow-ups
  followupTimezone: ATLAS_TIMEZONE,
};

// Meeting defaults
export const MEETING_DEFAULTS = {
  // Default meeting duration in minutes
  defaultDuration: 30,
  
  // Default reminder time (minutes before meeting)
  defaultReminder: 15,
  
  // Buffer time between meetings (minutes)
  bufferTime: 5,
  
  // Working hours (NY time)
  workingHours: {
    start: '09:00',
    end: '18:00',
    timezone: ATLAS_TIMEZONE,
  },
};

/**
 * Format meeting time for display
 */
export function formatMeetingTime(date: Date): string {
  return formatAtlasDateWithZone(date);
}

/**
 * Get Olivia's calendar context
 */
export function getOliviaCalendarContext() {
  return {
    agent: 'olivia',
    timezone: OLIVIA_TIMEZONE.primary,
    location: OLIVIA_TIMEZONE.location,
    config: CALENDAR_CONFIG,
    defaults: MEETING_DEFAULTS,
  };
}

/**
 * Initialize Olivia's calendar with NY timezone
 */
export function initOliviaCalendar(): void {
  console.log(`[Olivia-Calendar] Timezone initialized: ${ATLAS_TIMEZONE}`);
  console.log(`[Olivia-Calendar] Location: ${OLIVIA_TIMEZONE.location}`);
  console.log(`[Olivia-Calendar] Working hours: ${MEETING_DEFAULTS.workingHours.start} - ${MEETING_DEFAULTS.workingHours.end} ET`);
}

// Default export
export default {
  OLIVIA_TIMEZONE,
  CALENDAR_CONFIG,
  MEETING_DEFAULTS,
  formatMeetingTime,
  getOliviaCalendarContext,
  initOliviaCalendar,
};
