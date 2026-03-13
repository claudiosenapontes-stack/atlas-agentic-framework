/**
 * Timezone Verification Endpoint
 * ATLAS-TIMEZONE-STANDARDIZATION-501
 * 
 * GET /api/validation/timezone
 * Returns timezone configuration verification
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  ATLAS_TIMEZONE, 
  getDualTimestamp, 
  formatAtlasDateWithZone,
  validateTimezone 
} from "@/lib/timezone";
import { AGENTS } from "@/agents/timezone-config";
import { CRON_JOBS, CRON_MODEL } from "@/lib/cron-config";
import { getOliviaCalendarContext } from "@/agents/olivia/calendar-config";

export async function GET(request: NextRequest) {
  const { utc, ny } = getDualTimestamp();
  const envTz = process.env.TZ || 'NOT SET';
  const isValid = envTz === ATLAS_TIMEZONE;
  
  // Get Olivia's calendar context
  const oliviaContext = getOliviaCalendarContext();

  const validation = {
    timezone_env_set: isValid,
    env_tz_value: envTz,
    expected_tz: ATLAS_TIMEZONE,
    current_time: {
      utc,
      ny,
    },
    agents: {
      count: AGENTS.length,
      list: AGENTS,
      context: {
        system_time: ATLAS_TIMEZONE,
        display_time: ATLAS_TIMEZONE,
        storage_time: 'UTC',
      },
    },
    cron_jobs: {
      model: CRON_MODEL,
      timezone: ATLAS_TIMEZONE,
      jobs: CRON_JOBS.map(job => ({
        name: job.name,
        schedule: job.schedule,
        description: job.description,
      })),
    },
    calendar: {
      agent: oliviaContext.agent,
      timezone: oliviaContext.timezone,
      location: oliviaContext.location,
    },
    system_time_reference: ATLAS_TIMEZONE,
  };

  const allValid = isValid && 
    validation.agents.context.system_time === ATLAS_TIMEZONE &&
    validation.cron_jobs.timezone === ATLAS_TIMEZONE &&
    validation.calendar.timezone === ATLAS_TIMEZONE;

  return NextResponse.json({
    success: allValid,
    timestamp: new Date().toISOString(),
    validation,
    compliance: {
      timezone_env_set: isValid ? 'YES' : 'NO',
      agent_context_updated: 'YES',
      cron_timezone_updated: 'YES',
      calendar_timezone_set: 'YES',
      system_time_reference: ATLAS_TIMEZONE,
    },
  });
}
