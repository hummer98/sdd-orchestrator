/**
 * Clipboard Handlers
 * IPC handlers for clipboard operations
 */

import { ipcMain, clipboard } from 'electron';
import { IPC_CHANNELS } from './channels';
// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from '../services/projectLogger';

/**
 * Register all clipboard-related IPC handlers
 */
export function registerClipboardHandlers(): void {
  // ============================================================
  // Clipboard Operations
  // ============================================================

  ipcMain.handle(
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

  logger.info('[clipboardHandlers] Clipboard handlers registered');
}
