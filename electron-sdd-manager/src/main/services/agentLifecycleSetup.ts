/**
 * Agent Lifecycle Setup Module
 * Task 7.4: Initialize and provide access to Agent Lifecycle components
 *
 * This module centralizes the initialization of:
 * - AgentRegistry
 * - ProcessUtils
 * - AgentLifecycleManager
 * - AgentWatchdog
 *
 * Requirements: 7.5 (Watchdog lifecycle linked to app)
 */

import { AgentLifecycleManager, type IAgentRecordStore } from './agentLifecycleManager';
import { AgentRegistry } from './agentRegistry';
import { getProcessUtils, type ProcessUtils } from './processUtils';
import { AgentWatchdog } from './agentWatchdog';
import { getDefaultAgentRecordService } from './agentRecordService';
import { logger } from './logger';

// Singleton instances
let agentRegistry: AgentRegistry | null = null;
let processUtils: ProcessUtils | null = null;
let lifecycleManager: AgentLifecycleManager | null = null;
let watchdog: AgentWatchdog | null = null;

/**
 * Adapter to convert AgentRecordService to IAgentRecordStore interface
 */
function createRecordStoreAdapter(): IAgentRecordStore {
  const recordService = getDefaultAgentRecordService();

  return {
    readAllRecords: () => recordService.readAllRecords(),
    createRecord: (record) => recordService.writeRecord(record),
    updateRecord: (agentId, updates) => {
      // AgentRecordService.updateRecord requires specId, but IAgentRecordStore doesn't
      // We need to find the record first to get its specId
      return recordService.readAllRecords().then((records) => {
        const existing = records.find((r) => r.agentId === agentId);
        if (existing) {
          return recordService.updateRecord(existing.specId, agentId, updates);
        }
        // If record not found, just log warning (record might have been cleaned up)
        logger.warn('[AgentLifecycleSetup] Cannot update record: agentId not found', { agentId });
        return Promise.resolve();
      });
    },
  };
}

/**
 * Initialize Agent Lifecycle Management components
 * Called once during app startup
 *
 * Returns the initialized components for immediate use
 */
export async function initializeAgentLifecycleManager(): Promise<{
  lifecycleManager: AgentLifecycleManager;
  watchdog: AgentWatchdog;
  registry: AgentRegistry;
}> {
  logger.info('[AgentLifecycleSetup] Initializing agent lifecycle management');

  // Create singleton instances
  if (!agentRegistry) {
    agentRegistry = new AgentRegistry();
    logger.debug('[AgentLifecycleSetup] AgentRegistry created');
  }

  if (!processUtils) {
    processUtils = getProcessUtils();
    logger.debug('[AgentLifecycleSetup] ProcessUtils created');
  }

  if (!lifecycleManager) {
    const recordStore = createRecordStoreAdapter();
    lifecycleManager = new AgentLifecycleManager(agentRegistry, processUtils, recordStore);
    logger.debug('[AgentLifecycleSetup] AgentLifecycleManager created');
  }

  if (!watchdog) {
    watchdog = new AgentWatchdog(agentRegistry, processUtils, lifecycleManager);
    logger.debug('[AgentLifecycleSetup] AgentWatchdog created');
  }

  logger.info('[AgentLifecycleSetup] Agent lifecycle management initialized');

  return {
    lifecycleManager,
    watchdog,
    registry: agentRegistry,
  };
}

/**
 * Get the singleton AgentLifecycleManager instance
 * Returns null if not yet initialized
 */
export function getAgentLifecycleManager(): AgentLifecycleManager | null {
  return lifecycleManager;
}

/**
 * Get the singleton AgentWatchdog instance
 * Returns null if not yet initialized
 */
export function getAgentWatchdog(): AgentWatchdog | null {
  return watchdog;
}

/**
 * Get the singleton AgentRegistry instance
 * Returns null if not yet initialized
 */
export function getAgentRegistry(): AgentRegistry | null {
  return agentRegistry;
}

/**
 * Reset all singletons (for testing only)
 */
export function resetAgentLifecycleComponents(): void {
  if (watchdog) {
    watchdog.stop();
  }
  if (lifecycleManager) {
    lifecycleManager.dispose();
  }
  agentRegistry = null;
  processUtils = null;
  lifecycleManager = null;
  watchdog = null;
}
