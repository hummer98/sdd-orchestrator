/**
 * BugArtifactEditor Component
 * Displays bug document tabs with Markdown preview
 * Task 4: bugs-pane-integration
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import MDEditor from '@uiw/react-md-editor';
import { useBugStore } from '../stores/bugStore';
import type { BugDocumentTab, BugDetail } from '../types/bug';

interface TabConfig {
  key: BugDocumentTab;
  label: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { key: 'report', label: 'report.md' },
  { key: 'analysis', label: 'analysis.md' },
  { key: 'fix', label: 'fix.md' },
  { key: 'verification', label: 'verification.md' },
];

/**
 * Get artifact content for a given tab
 */
function getArtifactContent(
  bugDetail: BugDetail,
  tab: BugDocumentTab
): string | null {
  const artifact = bugDetail.artifacts[tab];
  if (!artifact || !artifact.exists || !artifact.content) {
    return null;
  }
  return artifact.content;
}

export function BugArtifactEditor() {
  const { selectedBug, bugDetail } = useBugStore();
  const [activeTab, setActiveTab] = useState<BugDocumentTab>('report');

  // Filter tabs to only show existing artifacts (matching ArtifactEditor behavior)
  const availableTabs = useMemo((): TabConfig[] => {
    if (!bugDetail?.artifacts) {
      return [];
    }
    return TAB_CONFIGS.filter((tab) => {
      const artifact = bugDetail.artifacts[tab.key];
      return artifact !== null && artifact.exists;
    });
  }, [bugDetail?.artifacts]);

  // If current activeTab doesn't exist, switch to first available tab
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // Get content for active tab
  const content = useMemo(() => {
    if (!bugDetail) return null;
    return getArtifactContent(bugDetail, activeTab);
  }, [bugDetail, activeTab]);

  // If no bug is selected, show placeholder
  if (!selectedBug) {
    return (
      <div
        data-testid="bug-artifact-editor"
        className="flex items-center justify-center h-full text-gray-400"
      >
        バグを選択してエディターを開始
      </div>
    );
  }

  // If no artifacts exist, show placeholder
  if (availableTabs.length === 0) {
    return (
      <div
        data-testid="bug-artifact-editor"
        className="flex items-center justify-center h-full text-gray-400"
      >
        表示可能なドキュメントがありません
      </div>
    );
  }

  return (
    <div data-testid="bug-artifact-editor" className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
            data-testid={`bug-tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {content ? (
          <MDEditor
            value={content}
            preview="preview"
            height="100%"
            data-color-mode="dark"
            hideToolbar
            visibleDragbar={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            ドキュメント未生成
          </div>
        )}
      </div>
    </div>
  );
}
