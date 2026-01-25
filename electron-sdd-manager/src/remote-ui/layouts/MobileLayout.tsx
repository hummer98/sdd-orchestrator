/**
 * MobileLayout - Mobile-optimized layout for Remote UI
 *
 * Features:
 * - Tab-based navigation at bottom
 * - Touch-optimized button sizes (min 44x44px)
 * - Vertical scrolling focused layout
 * - Full screen width content areas
 *
 * Design Decision: DD-003 in design.md
 *
 * header-profile-badge feature: ProfileBadge added to MobileHeader
 * Requirements: 4.1, 4.2, 4.3
 *
 * remote-ui-vanilla-removal: Added data-testid attributes for E2E testing
 * - remote-status-dot, remote-status-text, remote-project-path for E2E compatibility
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { FileText, Bug, Bot } from 'lucide-react';
import { ProfileBadge } from '../../shared/components/ui';
import { useApi } from '../../shared';
import type { ProfileName } from '../../shared/components/ui/ProfileBadge';
import type { WebSocketApiClient } from '../../shared/api/WebSocketApiClient';

// =============================================================================
// Types
// =============================================================================

export type MobileTab = 'specs' | 'bugs' | 'agents' | 'settings' | 'agent' | 'project';

export interface MobileLayoutProps {
  /**
   * Current active tab
   */
  activeTab?: MobileTab;

  /**
   * Callback when tab changes
   */
  onTabChange?: (tab: MobileTab) => void;

  /**
   * Content for each tab
   */
  children?: ReactNode;

  /**
   * Whether to show the bottom tab bar
   * Task 2.3: showTabBar prop for DetailPage visibility control
   * Requirements: 1.4, 2.5
   * Default: true (show tab bar)
   */
  showTabBar?: boolean;
}

// =============================================================================
// Tab Configuration
// =============================================================================

/**
 * TAB_CONFIG - 3-tab configuration for mobile navigation
 *
 * Task 2.2: MobileTabBar 3-tab configuration
 * Requirements:
 * - 1.1: Display bottom tab bar with three tabs: Specs, Bugs, and Agents
 * - 1.3: Visual indication of active tab (handled in MobileTabBar)
 * - 1.5: 44x44px touch target (handled by touch-target class)
 */
const TAB_CONFIG: { id: MobileTab; label: string; icon: 'specs' | 'bugs' | 'agents' }[] = [
  { id: 'specs', label: 'Specs', icon: 'specs' },
  { id: 'bugs', label: 'Bugs', icon: 'bugs' },
  { id: 'agents', label: 'Agents', icon: 'agents' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * MobileLayout - Mobile-optimized layout with bottom tab navigation
 *
 * Tab state is now controlled by parent component (AppContent).
 * This allows tab changes from the bottom bar to update content in MainContent.
 *
 * Task 2.3: Added showTabBar prop for controlling tab bar visibility
 * Requirements: 1.4, 2.5 - Hide tab bar when DetailPage is displayed
 */
export function MobileLayout({
  activeTab = 'specs',
  onTabChange,
  children,
  showTabBar = true,
}: MobileLayoutProps): React.ReactElement {
  // Use prop value directly instead of internal state
  // Tab state is controlled by parent (AppContent)
  const handleTabChange = (tab: MobileTab) => {
    onTabChange?.(tab);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <MobileHeader />

      {/* Main Content Area
          Task 2.3: Adjust bottom padding based on tab bar visibility
          - pb-16 when tab bar is visible (space for tab bar)
          - pb-0 when tab bar is hidden (full height content)
      */}
      {/* pb-[calc(4rem+env(safe-area-inset-bottom))] = h-16 (4rem) + safe-area */}
      <main className={`flex-1 overflow-y-auto ${showTabBar ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]'}`}>
        {children}
      </main>

      {/* Bottom Tab Bar
          Task 2.3: Conditional visibility with transition animation
          Requirements: 1.4, 2.5 - Hide when DetailPage is displayed
          Animation: 200ms ease-in-out slide transition (per task spec)
      */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showTabBar={showTabBar}
      />
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * MobileHeader - Fixed header for mobile layout
 * header-profile-badge feature: ProfileBadge added
 * remote-ui-vanilla-removal: Added data-testid attributes for E2E testing
 * Requirements: 4.1, 4.2, 4.3
 */
function MobileHeader(): React.ReactElement {
  const apiClient = useApi();
  const [projectPath, setProjectPath] = useState<string>('');
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check connection status and get project path
    const wsClient = apiClient as WebSocketApiClient;
    if ('isConnected' in wsClient && typeof wsClient.isConnected === 'function') {
      setIsConnected(wsClient.isConnected());
      // Poll connection status and project path
      const interval = setInterval(() => {
        if ('isConnected' in wsClient && typeof wsClient.isConnected === 'function') {
          setIsConnected(wsClient.isConnected());
        }
        if ('getProjectPath' in wsClient && typeof wsClient.getProjectPath === 'function') {
          const path = wsClient.getProjectPath();
          if (path) setProjectPath(path);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // IpcApiClient doesn't have isConnected, assume connected
      setIsConnected(true);
    }
  }, [apiClient]);

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

  // Extract directory name from project path for display
  const projectName = projectPath ? projectPath.split('/').pop() || projectPath : 'Loading...';

  return (
    <header className="flex-shrink-0 px-4 py-2 flex flex-col bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Row 1: Title and connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            SDD Orchestrator
          </h1>
          {/* header-profile-badge feature: ProfileBadge */}
          <ProfileBadge
            profile={(profile?.name as ProfileName) ?? null}
          />
        </div>
        {/* remote-ui-vanilla-removal: Status display for E2E testing */}
        <div className="flex items-center gap-2">
          <span
            data-testid="remote-status-dot"
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span
            data-testid="remote-status-text"
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>
      {/* Row 2: Project path */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Project:</span>
        <span
          data-testid="remote-project-path"
          className="text-xs text-gray-600 dark:text-gray-300 truncate"
          title={projectPath || undefined}
        >
          {projectName}
        </span>
      </div>
    </header>
  );
}

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  /**
   * Whether to show the tab bar
   * Task 2.3: Controls visibility with transition animation
   * Default: true
   */
  showTabBar?: boolean;
}

/**
 * MobileTabBar - Bottom tab navigation
 *
 * Task 2.2: 3-tab configuration (Specs/Bugs/Agents)
 * Task 2.3: showTabBar visibility control with transition animation
 *
 * Requirements:
 * - 1.1: Display bottom tab bar with three tabs
 * - 1.3: Visual indication of active tab with distinct styling (blue for active)
 * - 1.4, 2.5: Hide tab bar when DetailPage is displayed
 * - 1.5: 44x44px touch target size (touch-target class ensures min 44x44px)
 *
 * Animation:
 * - 200ms duration (per task spec: 200-300ms)
 * - ease-in-out timing function
 * - Slide transition (translate-y)
 *
 * remote-ui-vanilla-removal: Added data-testid and aria attributes for E2E testing
 */
function MobileTabBar({
  activeTab,
  onTabChange,
  showTabBar = true,
}: MobileTabBarProps): React.ReactElement {
  return (
    <nav
      data-testid="mobile-bottom-tabs"
      className={`
        fixed bottom-0 left-0 right-0 min-h-16
        bg-white dark:bg-gray-800
        border-t border-gray-200 dark:border-gray-700
        flex items-stretch
        pb-[env(safe-area-inset-bottom)]
        transition-transform duration-200 ease-in-out
        ${showTabBar ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
          data-testid={`remote-tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 flex flex-col items-center justify-center gap-1
            touch-target
            transition-colors
            ${activeTab === tab.id
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
        >
          <TabIcon name={tab.icon} active={activeTab === tab.id} />
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

interface TabIconProps {
  name: 'specs' | 'bugs' | 'agents';
  active: boolean;
}

/**
 * TabIcon - Lucide icon component for tab bar
 *
 * Task 2.2: Uses Lucide React icons for consistency with the project.
 * Icons: FileText (Specs), Bug (Bugs), Bot (Agents)
 */
function TabIcon({ name, active }: TabIconProps): React.ReactElement {
  const iconSize = active ? 24 : 20;
  const iconClassName = `transition-all duration-200 ${active ? 'scale-110' : ''}`;

  switch (name) {
    case 'specs':
      return <FileText size={iconSize} className={iconClassName} />;
    case 'bugs':
      return <Bug size={iconSize} className={iconClassName} />;
    case 'agents':
      return <Bot size={iconSize} className={iconClassName} />;
    default:
      // Exhaustive check - should never reach here
      return <FileText size={iconSize} className={iconClassName} />;
  }
}

// =============================================================================
// Exports
// =============================================================================

export { TAB_CONFIG };
export default MobileLayout;
