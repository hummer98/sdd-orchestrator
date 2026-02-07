/**
 * SSH Setup Utilities
 * trpc-full-migration Task 10.7: sshHandlers.tsからユーティリティ関数を分離
 *
 * Contains non-IPC utility functions previously in sshHandlers.ts:
 * - setupSSHStatusNotifications: SSH status change broadcasting
 */

import {
  sshConnectionService,
  type ConnectionStatus,
} from './ssh';
import { projectLogger as logger } from './projectLogger';
import { getGlobalEventBus } from '../trpc/services/globalEventBus';
import { EVENT_NAMES } from '../trpc/services/eventBus';

/**
 * Set up SSH status change notifications to renderer
 * Forwards connection status changes via EventBus for tRPC Subscription
 */
export function setupSSHStatusNotifications(): void {
  sshConnectionService.onStatusChange((status: ConnectionStatus) => {
    logger.debug('[sshSetup] SSH status changed', { status });

    // Emit to EventBus for tRPC Subscription (primary path after IPC removal)
    getGlobalEventBus().emit(EVENT_NAMES.SSH_STATUS_CHANGED, status);
  });

  logger.info('[sshSetup] SSH status notifications set up');
}
