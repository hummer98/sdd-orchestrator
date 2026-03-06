/**
 * DocsTabs Component
 * Parent component for Specs/Issues tab switching
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * github-issue-integration: Bugs tab replaced with Issues
 */

import { useState } from 'react';
import { FileText, CircleDot, Plus, FolderOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { SpecList } from './SpecList';
import { CreateSpecDialog } from './CreateSpecDialog';
import { useProjectStore, useAgentStore } from '../stores';

// project-config-editor Task 1.1: Add 'project' tab type
// github-issue-integration: 'bugs' replaced with 'issues'
export type DocsTab = 'specs' | 'issues' | 'project';

interface DocsTabsProps {
  className?: string;
  /** Active tab (controlled mode) */
  activeTab: DocsTab;
  /** Callback when tab changes */
  onTabChange: (tab: DocsTab) => void;
}

interface TabConfig {
  id: DocsTab;
  label: string;
  icon: typeof FileText;
  /** Create button label, null if no create button for this tab */
  createLabel: string | null;
}

// project-config-editor Task 4.1: Add Project tab
// github-issue-integration: Bugs tab replaced with Issues
const TAB_CONFIGS: TabConfig[] = [
  { id: 'specs', label: 'Specs', icon: FileText, createLabel: 'Spec' },
  { id: 'issues', label: 'Issues', icon: CircleDot, createLabel: null },
  { id: 'project', label: 'Project', icon: FolderOpen, createLabel: null },
];

/**
 * DocsTabs - Parent component for Specs/Issues tab switching
 * - Shows Specs/Issues tabs
 * - Switches between SpecList and IssuePane (rendered by App.tsx)
 * - Shows create button for current tab type
 */
export function DocsTabs({ className, activeTab, onTabChange }: DocsTabsProps): React.ReactElement {
  const [isCreateSpecDialogOpen, setIsCreateSpecDialogOpen] = useState(false);
  // zustand-selector-optimization: individual selectors for 1 state field each
  const currentProject = useProjectStore(s => s.currentProject);
  const selectAgent = useAgentStore(s => s.selectAgent);

  /**
   * Handle tab change - preserve selection state per tab
   *
   * App.tsxがactiveTabベースで条件分岐するようになったため、
   * タブ切り替え時に選択状態をクリアする必要がなくなった。
   * これにより、タブを戻したときに以前の選択状態が復元される。
   *
   * Bug fix: agent-log-shows-selection-without-spec
   * エージェント選択のみクリアして、古いログ表示を防ぐ
   */
  const handleTabChange = (tabId: DocsTab) => {
    selectAgent(null);
    onTabChange(tabId);
  };

  const handleCreateClick = () => {
    if (activeTab === 'specs') {
      setIsCreateSpecDialogOpen(true);
    }
  };

  const activeConfig = TAB_CONFIGS.find((c) => c.id === activeTab);

  return (
    <div className={clsx('flex flex-col h-full', className)} data-testid="docs-tabs">
      {/* Tab header with create button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {/* Tab buttons */}
        <div className="flex gap-1" role="tablist">
          {TAB_CONFIGS.map((config) => {
            const Icon = config.icon;
            const isActive = activeTab === config.id;

            return (
              <button
                key={config.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${config.id}`}
                onClick={() => handleTabChange(config.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                data-testid={`tab-${config.id}`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Create button - only for tabs with createLabel */}
        {currentProject && activeConfig?.createLabel && (
          <button
            onClick={handleCreateClick}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-sm',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            title={activeConfig.createLabel}
            data-testid="create-button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{activeConfig.createLabel}</span>
          </button>
        )}
      </div>

      {/* Tab content - only show Specs content, Issues/Project handled by App.tsx */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'specs' && (
          <div
            role="tabpanel"
            id="tabpanel-specs"
            aria-labelledby="tab-specs"
            className="h-full"
            data-testid="tabpanel-specs"
          >
            <SpecList />
          </div>
        )}
        {/* Note: activeTab === 'issues' content is rendered in App.tsx as IssuePane */}
        {/* Note: activeTab === 'project' content is rendered in App.tsx as ProjectPane */}
      </div>

      {/* Dialogs */}
      <CreateSpecDialog
        isOpen={isCreateSpecDialogOpen}
        onClose={() => setIsCreateSpecDialogOpen(false)}
      />
    </div>
  );
}

export default DocsTabs;
