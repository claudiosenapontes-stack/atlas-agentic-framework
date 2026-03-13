/**
 * Message Safety Filter
 * ATLAS-COMMS-SAFETY-HOTFIX-602
 * 
 * Blocks internal infrastructure/debug messages from reaching external contacts
 */

const BLOCKED_PATTERNS = [
  /pairing code/i,
  /access not configured/i,
  /OpenClaw/i,
  /infrastructure pairing/i,
  /gateway token/i,
  /session key/i,
  /system event/i,
  /heartbeat.*failed/i,
  /cron.*error/i,
  /subagent.*spawn/i,
  /workspace.*path/i,
  /SUPABASE_.*KEY/i,
  /apikey.*[a-zA-Z0-9]{20,}/i,
];

const INTERNAL_ONLY_CHANNELS = [
  'system',
  'internal',
  'debug',
  'admin',
];

/**
 * Check if message contains blocked internal patterns
 */
function containsInternalPatterns(message) {
  if (!message || typeof message !== 'string') return false;
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return { blocked: true, matched: pattern.toString() };
    }
  }
  return { blocked: false };
}

/**
 * Determine if target is external contact
 */
function isExternalTarget(target) {
  if (!target) return false;
  
  // Internal channels/systems
  const internalPatterns = [
    /system/i,
    /internal/i,
    /admin/i,
    /debug/i,
    /log/i,
    /file:.*/i,
    /memory/i,
  ];
  
  for (const pattern of internalPatterns) {
    if (pattern.test(target)) return false;
  }
  
  // External channels
  const externalPatterns = [
    /telegram:/i,
    /whatsapp:/i,
    /sms:/i,
    /email:/i,
    /slack:/i,
    /discord:/i,
    /\d{10,}/,  // Phone numbers
  ];
  
  for (const pattern of externalPatterns) {
    if (pattern.test(target)) return true;
  }
  
  return false;
}

/**
 * Main filter function - blocks internal messages to external targets
 */
function blockInternalDebugMessages(message, target, context = {}) {
  // Always allow if explicitly marked as safe
  if (context.allowInternal === true) {
    return { allowed: true, reason: 'explicit_allow' };
  }
  
  // Check if target is external
  const external = isExternalTarget(target);
  if (!external) {
    return { allowed: true, reason: 'internal_target' };
  }
  
  // Check for blocked patterns
  const patternCheck = containsInternalPatterns(message);
  if (patternCheck.blocked) {
    console.error(`[SAFETY-FILTER] BLOCKED: Message to ${target} contains internal pattern: ${patternCheck.matched}`);
    return { 
      allowed: false, 
      reason: 'internal_pattern_detected',
      pattern: patternCheck.matched,
      target
    };
  }
  
  return { allowed: true, reason: 'passed_filter' };
}

/**
 * Wrapper for message sending functions
 */
function createSafeSend(originalSend, defaultTarget) {
  return function safeSend(message, target = defaultTarget, context = {}) {
    const filterResult = blockInternalDebugMessages(message, target, context);
    
    if (!filterResult.allowed) {
      // Log blocked attempt
      console.error(`[SAFETY-FILTER] Message blocked: ${filterResult.reason}`, {
        pattern: filterResult.pattern,
        target: filterResult.target,
        timestamp: new Date().toISOString()
      });
      
      // Return blocked response instead of sending
      return Promise.resolve({
        blocked: true,
        reason: filterResult.reason,
        message: 'Internal message filtered - not sent to external contact'
      });
    }
    
    // Pass through to original send
    return originalSend(message, target, context);
  };
}

// Export for use in message processors
module.exports = {
  blockInternalDebugMessages,
  containsInternalPatterns,
  isExternalTarget,
  createSafeSend,
  BLOCKED_PATTERNS
};
