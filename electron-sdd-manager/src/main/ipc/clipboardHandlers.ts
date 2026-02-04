/**
 * Clipboard Handlers
 * IPC handlers for clipboard operations
 * E2E-fix: Use safeHandle for idempotent registration
 */

import { clipboard } from 'electron';
import { IPC_CHANNELS } from './channels';
import { safeHandle } from './ipcUtils';
// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from '../services/projectLogger';

/**
 * Track if handlers are already registered to prevent duplicate registration
 * E2E-fix: Prevents "Attempted to register a second handler" errors in test environments
 */
let handlersRegistered = false;

/**
 * Register all clipboard-related IPC handlers
 * E2E-fix: Use safeHandle for idempotent registration
 */
export function registerClipboardHandlers(): void {
  // E2E-fix: Prevent duplicate registration in test environments
  if (handlersRegistered) {
    logger.warn('[clipboardHandlers] Handlers already registered, skipping');
    return;
  }

  // ============================================================
  // Clipboard Operations
  // ============================================================

  safeHandle(
    IPC_CHANNELS.COPY_TO_CLIPBOARD,
    async (_event, text: string) => {
      logger.debug('[clipboardHandlers] COPY_TO_CLIPBOARD called', { textLength: text.length });

      try {
        clipboard.writeText(text);
        logger.debug('[clipboardHandlers] Text copied to clipboard successfully');
      } catch (error) {
        logger.error('[clipboardHandlers] Failed to copy to clipboard', { error });
        throw new Error(`クリップボードへのコピーに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  );

  handlersRegistered = true;
  logger.info('[clipboardHandlers] Clipboard handlers registered');
}
