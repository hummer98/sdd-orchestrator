/**
 * SSH Status Indicator
 * Displays SSH connection status in the UI status bar
 * Requirements: 6.1, 6.6
 */

import type { JSX } from 'react';
import { useConnectionStore, type ConnectionStatus } from '../stores/connectionStore';

/**
 * Get status indicator color based on connection status
 */
function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
    case 'authenticating':
    case 'host-verifying':
    case 'reconnecting':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'disconnected':
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get human-readable status text
 */
function getStatusText(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'authenticating':
      return 'Authenticating...';
    case 'host-verifying':
      return 'Verifying host...';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'error':
      return 'Connection Error';
    case 'disconnected':
    default:
      return 'Disconnected';
  }
}

/**
 * SSH Status Indicator Component
 * Shows the current SSH connection status in the status bar
 */
export function SSHStatusIndicator(): JSX.Element | null {
  const status = useConnectionStore((state) => state.status);
  const projectType = useConnectionStore((state) => state.projectType);
  const connectionInfo = useConnectionStore((state) => state.connectionInfo);

  // Don't render for local projects
  if (projectType === 'local') {
    return null;
  }

  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status);

  return (
    <div className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
      <span
        data-testid="ssh-status-indicator"
        className={`w-2 h-2 rounded-full ${statusColor}`}
        aria-label={`SSH status: ${statusText}`}
      />
      <span className="font-medium">SSH:</span>
      {status === 'connected' && connectionInfo ? (
        <span>
          {connectionInfo.user}@{connectionInfo.host}
        </span>
      ) : (
        <span>{statusText}</span>
      )}
    </div>
  );
}
