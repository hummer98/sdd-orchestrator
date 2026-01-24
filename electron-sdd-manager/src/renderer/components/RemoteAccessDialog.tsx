/**
 * RemoteAccessDialog Component
 * Modal dialog for displaying remote access server info (QR code, URL)
 * Requirements: 1.4, 1.5, 2.2
 * Task 15.1.1: CloudflareSettingsPanel integration
 * Task 15.1.2: InstallCloudflaredDialog integration
 * Task 7.4: McpSettingsPanel integration (mcp-server-integration)
 */

import { clsx } from 'clsx';
import { RemoteAccessPanel } from './RemoteAccessPanel';
import { CloudflareSettingsPanel } from './CloudflareSettingsPanel';
import { McpSettingsPanel } from './McpSettingsPanel';
import { InstallCloudflaredDialog } from './InstallCloudflaredDialog';
import { useRemoteAccessStore } from '../stores/remoteAccessStore';

export interface RemoteAccessDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
}

/**
 * RemoteAccessDialog Component
 *
 * A modal dialog that displays the RemoteAccessPanel with Cloudflare and MCP settings.
 * Used when server is started from the menu to show QR code and URL.
 * Includes:
 * - RemoteAccessPanel for server control and QR code display
 * - CloudflareSettingsPanel for Tunnel Token configuration
 * - McpSettingsPanel for MCP Server configuration (Task 7.4)
 * - InstallCloudflaredDialog for cloudflared installation guidance
 *
 * @example
 * <RemoteAccessDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
 */
export function RemoteAccessDialog({ isOpen, onClose }: RemoteAccessDialogProps) {
  const { showInstallCloudflaredDialog, dismissInstallDialog } = useRemoteAccessStore();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remote-access-dialog-title"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog Content */}
        <div
          className={clsx(
            'relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto',
            'bg-white dark:bg-gray-800',
            'rounded-lg shadow-xl',
            'animate-in fade-in zoom-in-95 duration-200'
          )}
        >
          {/* RemoteAccessPanel */}
          <RemoteAccessPanel className="border-0 shadow-none" />

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 mx-4" />

          {/* CloudflareSettingsPanel - Task 15.1.1 */}
          <CloudflareSettingsPanel className="border-0 shadow-none m-4" />

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 mx-4" />

          {/* McpSettingsPanel - Task 7.4 */}
          <McpSettingsPanel className="border-0 shadow-none m-4" />
        </div>
      </div>

      {/* InstallCloudflaredDialog - Task 15.1.2 */}
      <InstallCloudflaredDialog
        isOpen={showInstallCloudflaredDialog}
        onClose={dismissInstallDialog}
      />
    </>
  );
}
