/**
 * RemoteAccessDialog Component
 * Modal dialog for displaying remote access server info (QR code, URL)
 * Requirements: 1.4, 1.5, 2.2
 * Task 15.1.1: CloudflareSettingsPanel integration
 * Task 15.1.2: InstallCloudflaredDialog integration
 * Task 7.4: McpSettingsPanel integration (mcp-server-integration)
 * Feature: remote-dialog-tab-layout - Tab UI implementation
 */

import { useState, useCallback, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { RemoteAccessPanel } from './RemoteAccessPanel';
import { CloudflareSettingsPanel } from './CloudflareSettingsPanel';
import { McpSettingsPanel } from './McpSettingsPanel';
import { InstallCloudflaredDialog } from './InstallCloudflaredDialog';
import { useRemoteAccessStore } from '../stores/remoteAccessStore';

// Task 1.1: Tab identifier type definition
type RemoteDialogTab = 'web-server' | 'mcp';

// Task 1.1: Tab configuration
interface TabConfig {
  id: RemoteDialogTab;
  label: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { id: 'web-server', label: 'Webサーバー' },
  { id: 'mcp', label: 'MCP' },
];

export interface RemoteAccessDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
}

/**
 * RemoteAccessDialog Component
 *
 * A modal dialog that displays the RemoteAccessPanel with Cloudflare and MCP settings
 * organized in a tabbed interface.
 * Used when server is started from the menu to show QR code and URL.
 *
 * Tabs:
 * - Webサーバー tab: RemoteAccessPanel + CloudflareSettingsPanel
 * - MCP tab: McpSettingsPanel
 *
 * Includes:
 * - InstallCloudflaredDialog for cloudflared installation guidance
 *
 * @example
 * <RemoteAccessDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
 */
export function RemoteAccessDialog({ isOpen, onClose }: RemoteAccessDialogProps) {
  const { showInstallCloudflaredDialog, dismissInstallDialog } = useRemoteAccessStore();

  // Task 1.2: Tab state with useState, default to 'web-server'
  const [activeTab, setActiveTab] = useState<RemoteDialogTab>('web-server');

  // Task 4.1: Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = TAB_CONFIGS.findIndex((tab) => tab.id === activeTab);

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % TAB_CONFIGS.length;
        setActiveTab(TAB_CONFIGS[nextIndex].id);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + TAB_CONFIGS.length) % TAB_CONFIGS.length;
        setActiveTab(TAB_CONFIGS[prevIndex].id);
      }
    },
    [activeTab]
  );

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
          {/* Task 2.1: Tab list */}
          <div
            role="tablist"
            className="flex border-b border-gray-200 dark:border-gray-700"
          >
            {TAB_CONFIGS.map((tab) => (
              // Task 2.2: Tab buttons
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleKeyDown}
                className={clsx(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
                  // Task 2.3: Active tab styling
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Task 3.1: Webサーバー tab panel */}
          {activeTab === 'web-server' && (
            <div
              role="tabpanel"
              id="tabpanel-web-server"
              aria-labelledby="tab-web-server"
            >
              {/* RemoteAccessPanel */}
              <RemoteAccessPanel className="border-0 shadow-none" />

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 mx-4" />

              {/* CloudflareSettingsPanel */}
              <CloudflareSettingsPanel className="border-0 shadow-none m-4" />
            </div>
          )}

          {/* Task 3.2: MCP tab panel */}
          {activeTab === 'mcp' && (
            <div
              role="tabpanel"
              id="tabpanel-mcp"
              aria-labelledby="tab-mcp"
            >
              {/* McpSettingsPanel */}
              <McpSettingsPanel className="border-0 shadow-none m-4" />
            </div>
          )}
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
