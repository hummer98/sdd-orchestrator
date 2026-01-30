/**
 * BugPane Component
 * Main + Right pane container for Bug workflow
 * Bug fix: bugs-tab-agent-list-missing
 * Bug fix: bugs-tab-spec-editing-feature (shared ArtifactEditor)
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore } from '../../shared/stores/bugStore';
import { useProjectStore } from '../stores/projectStore';
import {
  AgentListPanel,
  BugWorkflowView,
  ResizeHandle,
} from './index';
import { CenterPaneContainer } from './CenterPaneContainer';
import type { TabInfo, ArtifactInfo } from './ArtifactEditor';

/** Bug artifact tabs */
const BUG_TABS: TabInfo[] = [
  { key: 'report', label: 'report.md' },
  { key: 'analysis', label: 'analysis.md' },
  { key: 'fix', label: 'fix.md' },
  { key: 'verification', label: 'verification.md' },
];

interface BugPaneProps {
  /** Right pane width */
  rightPaneWidth: number;
  /** Agent list panel height */
  agentListHeight: number;
  /** Callback for right pane resize */
  onRightResize: (delta: number) => void;
  /** Callback for agent list resize */
  onAgentListResize: (delta: number) => void;
  /** Callback when resize ends (for saving layout) */
  onResizeEnd: () => void;
}

/**
 * BugPane - Container for Bug workflow (Main + Right pane)
 * Renders ArtifactEditor + BugAgentListPanel + BugWorkflowView when a bug is selected,
 * or a placeholder when no bug is selected.
 */
export function BugPane({
  rightPaneWidth,
  agentListHeight,
  onRightResize,
  onAgentListResize,
  onResizeEnd,
}: BugPaneProps): React.ReactElement {
  // bugs-view-unification Task 6.1: Use shared bugStore
  // Compute selectedBug from bugs + selectedBugId
  const { bugs, selectedBugId, bugDetail } = useSharedBugStore();
  const selectedBug = selectedBugId ? bugs.find(b => b.name === selectedBugId) : null;

  // Bug fix: git-view-bugs-tab - View mode state (artifacts or git-diff)
  const [viewMode, setViewMode] = useState<'artifacts' | 'git-diff'>('artifacts');

  // Handle view mode change with layout persistence
  const handleViewModeChange = useCallback(async (mode: 'artifacts' | 'git-diff') => {
    setViewMode(mode);
    // Save to layout config (fire-and-forget for UX)
    // Read current config first, then update viewMode
    try {
      const currentConfig = await window.electronAPI?.loadLayoutConfig?.();
      if (currentConfig) {
        await window.electronAPI?.saveLayoutConfig?.({ ...currentConfig, viewMode: mode });
      }
    } catch (err) {
      console.error('[BugPane] Failed to save viewMode:', err);
    }
  }, []);

  // Load view mode from layout config on mount
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const config = await window.electronAPI?.loadLayoutConfig?.();
        if (config?.viewMode) {
          setViewMode(config.viewMode);
        }
      } catch (err) {
        console.error('[BugPane] Failed to load viewMode:', err);
      }
    };
    loadViewMode();
  }, []);

  // Convert artifacts to ArtifactInfo format
  const artifacts = useMemo((): Record<string, ArtifactInfo | null> | undefined => {
    if (!bugDetail?.artifacts) return undefined;
    return bugDetail.artifacts as Record<string, ArtifactInfo | null>;
  }, [bugDetail?.artifacts]);

  // Bug fix: git-view-bugs-tab - Resolve worktree path for GitView
  const worktreePath = useMemo((): string | undefined => {
    const metadata = bugDetail?.metadata;
    if (!metadata?.worktree) {
      return undefined;
    }

    const projectPath = useProjectStore.getState().currentProject;
    if (!projectPath) {
      return undefined;
    }

    // Resolve relative worktree path to absolute path
    const relativePath = metadata.worktree.path;
    if (!relativePath) {
      return undefined;
    }

    return `${projectPath}/${relativePath}`;
  }, [bugDetail?.metadata]);

  if (!selectedBug) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        バグを選択するか、新規作成してください
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center - CenterPaneContainer (ArtifactEditor / GitView switch) */}
      {/* Bug fix: git-view-bugs-tab - Replace direct ArtifactEditor with CenterPaneContainer */}
      <CenterPaneContainer
        tabs={BUG_TABS}
        dynamicTabs={[]}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        baseName={selectedBug.name}
        placeholder="バグを選択してエディターを開始"
        artifacts={artifacts}
        entityType="bug"
        worktreePath={worktreePath}
      />

      {/* Right resize handle */}
      <ResizeHandle direction="horizontal" onResize={onRightResize} onResizeEnd={onResizeEnd} />

      {/* Right sidebar - Bug Workflow View */}
      <aside
        style={{ width: rightPaneWidth }}
        className="shrink-0 flex flex-col overflow-hidden"
      >
        {/* Agent list panel for bugs */}
        <div style={{ height: agentListHeight }} className="shrink-0 overflow-hidden">
          <AgentListPanel
            specId={selectedBug ? `bug:${selectedBug.name}` : ''}
            testId="bug-agent-list-panel"
          />
        </div>
        {/* Agent一覧とワークフロー間のリサイズハンドル */}
        <ResizeHandle direction="vertical" onResize={onAgentListResize} onResizeEnd={onResizeEnd} />
        {/* Bug Workflow: 5フェーズワークフロービュー */}
        <div className="flex-1 overflow-hidden">
          <BugWorkflowView />
        </div>
      </aside>
    </div>
  );
}

export default BugPane;
