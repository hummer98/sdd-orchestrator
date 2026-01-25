/**
 * SubTabBar - Sub-tab navigation for DetailPage
 *
 * Task 4.1: SubTabBarコンポーネントを作成する
 * - DetailPage内下部のサブタブ表示
 * - 2つのタブ（Spec/Artifact または Bug/Artifact）のレンダリング
 * - アクティブタブの視覚的強調
 * - タブ変更コールバック
 *
 * Requirements: 3.1, 4.1
 * Design: SubTabBar component in design.md
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

export interface SubTabBarProps {
  /**
   * Tab configuration - array of tab items with id and label
   */
  tabs: { id: string; label: string }[];

  /**
   * Currently active tab ID
   */
  activeTab: string;

  /**
   * Callback when tab changes
   */
  onTabChange: (tabId: string) => void;

  /**
   * Test ID for E2E testing
   */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * SubTabBar - Bottom sub-tab navigation for DetailPage
 *
 * Displays 2 tabs (Spec/Artifact or Bug/Artifact) at the bottom of DetailPage.
 * Provides visual highlighting for the active tab and calls onTabChange on click.
 */
export function SubTabBar({
  tabs,
  activeTab,
  onTabChange,
  testId,
}: SubTabBarProps): React.ReactElement {
  return (
    <nav
      data-testid={testId}
      className="flex items-stretch min-h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            data-testid={testId ? `${testId}-${tab.id}` : undefined}
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center
              font-medium text-sm
              transition-colors
              border-b-2
              ${isActive
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 border-transparent'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default SubTabBar;
