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
 */

import React, { ReactNode, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export type MobileTab = 'specs' | 'bugs' | 'agents' | 'settings' | 'agent' | 'project';

interface MobileLayoutProps {
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
}

// =============================================================================
// Tab Configuration
// =============================================================================

const TAB_CONFIG: { id: MobileTab; label: string; icon: string }[] = [
  { id: 'specs', label: 'Specs', icon: 'file-text' },
  { id: 'bugs', label: 'Bugs', icon: 'bug' },
  { id: 'agents', label: 'Agents', icon: 'terminal' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * MobileLayout - Mobile-optimized layout with bottom tab navigation
 */
export function MobileLayout({
  activeTab = 'specs',
  onTabChange,
  children,
}: MobileLayoutProps): React.ReactElement {
  const [currentTab, setCurrentTab] = useState<MobileTab>(activeTab);

  const handleTabChange = (tab: MobileTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <MobileHeader />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <MobileTabBar
        activeTab={currentTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * MobileHeader - Fixed header for mobile layout
 */
function MobileHeader(): React.ReactElement {
  return (
    <header className="flex-shrink-0 h-14 px-4 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        SDD Orchestrator
      </h1>
      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
        Remote
      </span>
    </header>
  );
}

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

/**
 * MobileTabBar - Bottom tab navigation
 */
function MobileTabBar({
  activeTab,
  onTabChange,
}: MobileTabBarProps): React.ReactElement {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-stretch">
      {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
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
  name: string;
  active: boolean;
}

/**
 * TabIcon - Simple icon placeholder (will be replaced with actual icons)
 */
function TabIcon({ name, active }: TabIconProps): React.ReactElement {
  // Placeholder icons using Unicode symbols
  const icons: Record<string, string> = {
    'file-text': '\u{1F4C4}', // Document
    'bug': '\u{1F41B}', // Bug
    'terminal': '\u{1F4BB}', // Computer
    'settings': '\u2699', // Gear
  };

  return (
    <span className={`text-xl ${active ? 'scale-110' : ''} transition-transform`}>
      {icons[name] || '\u2753'}
    </span>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default MobileLayout;
