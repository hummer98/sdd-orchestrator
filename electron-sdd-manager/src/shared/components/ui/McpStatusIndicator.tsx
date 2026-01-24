/**
 * McpStatusIndicator
 * mcp-server-integration: Task 7.3
 *
 * MCP server status indicator component for header display.
 * - Shows running/stopped status with color-coded indicator
 * - Clickable on Desktop to open MCP settings (via onClick prop)
 * - Read-only on Remote UI (status display only)
 * Requirements: 6.9, 6.10
 */

import type { JSX } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { usePlatform } from '../../providers/PlatformProvider';

// =============================================================================
// Types
// =============================================================================

export interface McpStatusIndicatorProps {
  /**
   * Click handler - called when indicator is clicked on Desktop platform
   * On Remote UI, this prop is ignored (status display only)
   */
  onClick?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * McpStatusIndicator - Shows MCP server running status
 *
 * Requirements: 6.9 (status indicator), 6.10 (Remote UI read-only)
 *
 * Usage:
 * ```tsx
 * // Desktop (Electron) - clickable
 * <McpStatusIndicator onClick={() => openMcpSettingsDialog()} />
 *
 * // Remote UI - status display only (onClick ignored)
 * <McpStatusIndicator onClick={undefined} />
 * ```
 */
export function McpStatusIndicator({ onClick }: McpStatusIndicatorProps): JSX.Element {
  const isRunning = useMcpStore((state) => state.isRunning);
  const port = useMcpStore((state) => state.port);
  const platform = usePlatform();

  // Status-based styling
  const statusColor = isRunning ? 'bg-green-500' : 'bg-gray-500';
  const statusText = isRunning ? 'Running' : 'Stopped';
  const portDisplay = isRunning && port ? `:${port}` : 'Stopped';

  // Platform-specific behavior (Requirement 6.10)
  const isClickable = platform.platform === 'electron' && onClick !== undefined;

  // Common content
  const content = (
    <>
      <span
        data-testid="mcp-status-indicator"
        className={`w-2 h-2 rounded-full ${statusColor}`}
        aria-label={`MCP status: ${statusText}`}
      />
      <span className="font-medium">MCP:</span>
      <span>{portDisplay}</span>
    </>
  );

  // Base styles
  const baseStyles = 'flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400';

  // Render clickable button on Desktop (Requirement 6.9)
  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseStyles} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors`}
      >
        {content}
      </button>
    );
  }

  // Render read-only display on Remote UI (Requirement 6.10)
  return (
    <div className={baseStyles}>
      {content}
    </div>
  );
}
