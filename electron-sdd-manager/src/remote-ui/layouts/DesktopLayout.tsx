/**
 * DesktopLayout - Desktop-optimized layout for Remote UI
 *
 * Features:
 * - Multi-pane layout (sidebar, main content, log panel)
 * - Mouse-optimized interactions
 * - Horizontal space utilization
 * - Similar structure to Electron renderer layout
 *
 * Design Decision: DD-003 in design.md
 *
 * header-profile-badge feature: ProfileBadge added to sidebar header
 * Requirements: 4.1, 4.2, 4.3
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { ProfileBadge } from '../../shared/components/ui';
import { useApi } from '../../shared';
import type { ProfileName } from '../../shared/components/ui/ProfileBadge';

// =============================================================================
// Types
// =============================================================================

interface DesktopLayoutProps {
  /**
   * Sidebar content (spec/bug list)
   */
  sidebar?: ReactNode;

  /**
   * Main content area (workflow view, document tabs)
   */
  children?: ReactNode;

  /**
   * Log panel content
   */
  logPanel?: ReactNode;

  /**
   * Initial sidebar width in pixels
   */
  sidebarWidth?: number;

  /**
   * Initial log panel height ratio (0-1)
   */
  logPanelRatio?: number;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_SIDEBAR_WIDTH = 280;
const DEFAULT_LOG_PANEL_RATIO = 0.3;
// Reserved for future resize functionality
// const MIN_SIDEBAR_WIDTH = 200;
// const MAX_SIDEBAR_WIDTH = 400;

// =============================================================================
// Component
// =============================================================================

/**
 * DesktopLayout - Desktop-optimized multi-pane layout
 */
export function DesktopLayout({
  sidebar,
  children,
  logPanel,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  logPanelRatio = DEFAULT_LOG_PANEL_RATIO,
}: DesktopLayoutProps): React.ReactElement {
  const [currentSidebarWidth] = useState(sidebarWidth);
  const [currentLogRatio] = useState(logPanelRatio);
  const [isLogPanelCollapsed, setLogPanelCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        style={{ width: currentSidebarWidth }}
        className="flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
      >
        {/* Sidebar Header with ProfileBadge */}
        <SidebarHeader />

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebar || <SidebarPlaceholder />}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <DesktopHeader />

        {/* Content + Log Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main Content */}
          <main
            className="flex-1 overflow-y-auto"
            style={{
              flexBasis: isLogPanelCollapsed ? '100%' : `${(1 - currentLogRatio) * 100}%`,
            }}
          >
            {children || <ContentPlaceholder />}
          </main>

          {/* Log Panel */}
          {!isLogPanelCollapsed && (
            <div
              className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-900"
              style={{ height: `${currentLogRatio * 100}%` }}
            >
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between bg-gray-800 text-gray-300">
                  <span className="text-sm font-medium">Agent Logs</span>
                  <button
                    onClick={() => setLogPanelCollapsed(true)}
                    className="text-xs px-2 py-1 hover:bg-gray-700 rounded"
                  >
                    Collapse
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {logPanel || <LogPlaceholder />}
                </div>
              </div>
            </div>
          )}

          {/* Collapsed Log Panel Toggle */}
          {isLogPanelCollapsed && (
            <button
              onClick={() => setLogPanelCollapsed(false)}
              className="flex-shrink-0 h-8 flex items-center justify-center bg-gray-800 text-gray-400 hover:text-gray-200"
            >
              <span className="text-xs">Show Logs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * SidebarHeader - Sidebar header with ProfileBadge
 * header-profile-badge feature: ProfileBadge added
 * Requirements: 4.1, 4.2, 4.3
 */
function SidebarHeader(): React.ReactElement {
  const apiClient = useApi();
  const [profile, setProfile] = useState<{ name: string } | null>(null);

  useEffect(() => {
    // Load profile on mount (only if getProfile is available)
    if (apiClient.getProfile) {
      apiClient.getProfile().then(result => {
        if (result.ok) {
          setProfile(result.value);
        }
      });
    }
  }, [apiClient]);

  return (
    <div className="flex-shrink-0 h-12 px-4 flex items-center border-b border-gray-200 dark:border-gray-700">
      <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
        SDD Orchestrator
      </h1>
      <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
        Remote
      </span>
      {/* header-profile-badge feature: ProfileBadge */}
      <ProfileBadge
        profile={(profile?.name as ProfileName) ?? null}
        className="ml-2"
      />
    </div>
  );
}

/**
 * DesktopHeader - Fixed header for desktop layout
 */
function DesktopHeader(): React.ReactElement {
  return (
    <header className="flex-shrink-0 h-10 px-4 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {/* Breadcrumb or context info will go here */}
        Remote UI Connected
      </div>
    </header>
  );
}

/**
 * SidebarPlaceholder - Placeholder content for sidebar
 */
function SidebarPlaceholder(): React.ReactElement {
  return (
    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
      <p>Loading specs...</p>
    </div>
  );
}

/**
 * ContentPlaceholder - Placeholder content for main area
 */
function ContentPlaceholder(): React.ReactElement {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg">Select a spec or bug</p>
        <p className="text-sm mt-2">to view workflow and documents</p>
      </div>
    </div>
  );
}

/**
 * LogPlaceholder - Placeholder content for log panel
 */
function LogPlaceholder(): React.ReactElement {
  return (
    <div className="h-full p-4 font-mono text-xs text-gray-500">
      No agent logs yet...
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default DesktopLayout;
