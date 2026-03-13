/**
 * Message Processor with Safety Filter
 * ATLAS-COMMS-SAFETY-HOTFIX-602
 * 
 * Processes outgoing messages with internal content filtering
 */

const { blockInternalDebugMessages } = require('./message-safety-filter');

// Statistics for reporting
const filterStats = {
  messagesChecked: 0,
  messagesBlocked: 0,
  lastBlocked: null,
  blockLog: []
};

/**
 * Process outgoing message with safety filter
 */
async function processOutgoingMessage(message, target, metadata = {}) {
  filterStats.messagesChecked++;
  
  const result = blockInternalDebugMessages(message, target, metadata);
  
  if (!result.allowed) {
    filterStats.messagesBlocked++;
    filterStats.lastBlocked = new Date().toISOString();
    
    // Keep last 100 blocks
    filterStats.blockLog.push({
      timestamp: filterStats.lastBlocked,
      pattern: result.pattern,
      target: result.target,
      reason: result.reason
    });
    
    if (filterStats.blockLog.length > 100) {
      filterStats.blockLog.shift();
    }
    
    console.error(`[MessageProcessor] BLOCKED: ${result.reason}`, {
      target: result.target,
      pattern: result.pattern
    });
    
    return {
      sent: false,
      blocked: true,
      reason: result.reason,
      filter_version: 'ATLAS-COMMS-SAFETY-HOTFIX-602'
    };
  }
  
  // Message passed filter - proceed with sending
  return {
    sent: true,
    blocked: false,
    target,
    filter_version: 'ATLAS-COMMS-SAFETY-HOTFIX-602'
  };
}

/**
 * Get filter statistics
 */
function getFilterStats() {
  return {
    ...filterStats,
    filter_active: true,
    origin_service: 'message-processor',
    hotfix_version: 'ATLAS-COMMS-SAFETY-HOTFIX-602'
  };
}

/**
 * Reset statistics (for testing)
 */
function resetStats() {
  filterStats.messagesChecked = 0;
  filterStats.messagesBlocked = 0;
  filterStats.lastBlocked = null;
  filterStats.blockLog = [];
}

module.exports = {
  processOutgoingMessage,
  getFilterStats,
  resetStats
};
