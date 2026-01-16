/**
 * DocsTabs Component
 * Parent component for Specs/Bugs tab switching
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { useState } from 'react';
import { FileText, Bug, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { SpecList } from './SpecList';
import { BugList } from './BugList';
import { CreateSpecDialog } from './CreateSpecDialog';
import { CreateBugDialog } from './CreateBugDialog';
import { useProjectStore, useAgentStore } from '../stores';

export type DocsTab = 'specs' | 'bugs';

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
  createLabel: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { id: 'specs', label: 'Specs', icon: FileText, createLabel: 'Spec' },
  { id: 'bugs', label: 'Bugs', icon: Bug, createLabel: 'Bug' },
];

/**
 * DocsTabs - Parent component for Specs/Bugs tab switching
 * - Shows Specs/Bugs tabs
 * - Switches between SpecList and BugList
 * - Shows create button for current tab type
 */
export function DocsTabs({ className, activeTab, onTabChange }: DocsTabsProps): React.ReactElement {
  const [isCreateSpecDialogOpen, setIsCreateSpecDialogOpen] = useState(false);
  const [isCreateBugDialogOpen, setIsCreateBugDialogOpen] = useState(false);
  const { currentProject } = useProjectStore();
  const { selectAgent } = useAgentStore();

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
    } else {
      setIsCreateBugDialogOpen(true);
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

        {/* Create button */}
        {currentProject && (
          <button
            onClick={handleCreateClick}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-sm',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            title={activeConfig?.createLabel}
            data-testid="create-button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{activeConfig?.createLabel}</span>
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'specs' ? (
          <div
            role="tabpanel"
            id="tabpanel-specs"
            aria-labelledby="tab-specs"
            className="h-full"
            data-testid="tabpanel-specs"
          >
            <SpecList />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="tabpanel-bugs"
            aria-labelledby="tab-bugs"
            className="h-full"
            data-testid="tabpanel-bugs"
          >
            <BugList />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateSpecDialog
        isOpen={isCreateSpecDialogOpen}
        onClose={() => setIsCreateSpecDialogOpen(false)}
      />
      <CreateBugDialog
        isOpen={isCreateBugDialogOpen}
        onClose={() => setIsCreateBugDialogOpen(false)}
      />
    </div>
  );
}

export default DocsTabs;
