// UI Safe Mode Configuration
// ATLAS-PRIME-UI-SAFE-MODE-001

export const UI_SAFE_MODE = {
  ACTIVE: true,
  BANNER_TEXT: "Fleet maintenance in progress.",
  DISABLED_FEATURES: {
    boostRestart: true,
    fleetCommands: true,
    pauseAll: true,
    resumeAll: true,
  },
  ALLOWED_OPERATIONS: {
    readAgents: true,
    readTasks: true,
    readHealth: true,
    readEvents: true,
  },
  BLOCKED_OPERATIONS: {
    writeAgents: true,
    writeTasks: true,
    boostRestart: true,
    fleetAudit: false, // Allow audits (read-only)
  }
};

export type SafeModeStatus = typeof UI_SAFE_MODE;
