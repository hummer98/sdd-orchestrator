/**
 * RemoteBugArtifactEditor Component
 *
 * Task 6.4: BugDetailPageのArtifactタブを実装する
 * - SpecArtifactTabと同等のアーティファクト表示
 * - RemoteArtifactEditorを使用した編集/閲覧機能
 *
 * Requirements: 4.5 (Artifactタブ構成)
 *
 * This component provides artifact viewing/editing for Bug entities,
 * similar to RemoteArtifactEditor for Specs but with bug-specific tabs:
 * - report.md
 * - analysis.md
 * - fix.md
 * - verification.md
 *
 * Uses the same ApiClient.getArtifactContent with entityType='bug'
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Eye, Edit, Loader2, Circle, AlertCircle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { clsx } from 'clsx';
import type {
  ApiClient,
  BugMetadataWithPath,
  BugDetail,
} from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/** Bug artifact type for bug documents */
type BugArtifactType = 'report' | 'analysis' | 'fix' | 'verification';

/** Tab configuration */
interface TabInfo {
  key: BugArtifactType;
  label: string;
}

/** Component props */
export interface RemoteBugArtifactEditorProps {
  /** Selected bug metadata */
  bug: BugMetadataWithPath | null;
  /** Bug detail (for determining available tabs) */
  bugDetail: BugDetail | null;
  /** API client instance */
  apiClient: ApiClient;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Test ID for testing */
  testId?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Bug artifact tabs */
const BUG_ARTIFACT_TABS: TabInfo[] = [
  { key: 'report', label: 'report.md' },
  { key: 'analysis', label: 'analysis.md' },
  { key: 'fix', label: 'fix.md' },
  { key: 'verification', label: 'verification.md' },
];

// =============================================================================
// Component
// =============================================================================

export function RemoteBugArtifactEditor({
  bug,
  bugDetail: _bugDetail, // Currently unused, but kept for future artifact existence checks
  apiClient,
  placeholder = 'Bugを選択してドキュメントを表示',
  testId,
}: RemoteBugArtifactEditorProps): React.ReactElement {
  // Note: _bugDetail could be used in the future to conditionally show tabs
  // based on artifact existence (bugDetail.artifacts.report?.exists, etc.)
  // For now, we show all tabs similar to RemoteArtifactEditor behavior
  void _bugDetail;
  // State
  const [activeTab, setActiveTab] = useState<BugArtifactType>('report');
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const isDirty = content !== originalContent;

  // Build available tabs from bugDetail artifacts
  const availableTabs = useMemo((): TabInfo[] => {
    // Always show all bug artifact tabs
    // Similar to RemoteArtifactEditor, we show all tabs and let getArtifactContent
    // return empty for non-existent files
    return BUG_ARTIFACT_TABS;
  }, []);

  // Load artifact content
  const loadArtifact = useCallback(async (bugId: string, artifactType: BugArtifactType) => {
    if (!apiClient.getArtifactContent) {
      setError('Artifact loading not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use entityType='bug' for bug artifacts
      const result = await apiClient.getArtifactContent(bugId, artifactType, 'bug');

      if (result.ok) {
        setContent(result.value);
        setOriginalContent(result.value);
      } else {
        setError(result.error.message || 'Failed to load artifact');
        setContent('');
        setOriginalContent('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setContent('');
      setOriginalContent('');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  // Save artifact content
  const handleSave = useCallback(async () => {
    if (!bug || !isDirty) return;

    setIsSaving(true);
    setError(null);

    try {
      // Construct file path for bug artifacts
      const artifactFileName = `${activeTab}.md`;
      const filePath = `${bug.path}/${artifactFileName}`;

      const result = await apiClient.saveFile(filePath, content);

      if (result.ok) {
        setOriginalContent(content);
      } else {
        setError(result.error.message || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [apiClient, bug, activeTab, content, isDirty]);

  // Handle tab change
  const handleTabChange = useCallback(async (tab: BugArtifactType) => {
    if (isDirty) {
      const confirmed = window.confirm(
        '未保存の変更があります。変更を破棄して切り替えますか？'
      );
      if (!confirmed) return;
    }
    setActiveTab(tab);
  }, [isDirty]);

  // Load artifact when bug or tab changes
  useEffect(() => {
    if (bug) {
      loadArtifact(bug.name, activeTab);
    } else {
      setContent('');
      setOriginalContent('');
      setError(null);
    }
  }, [bug?.name, activeTab, loadArtifact]);

  // Reset to first available tab when available tabs change
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // Render placeholder when no bug selected
  if (!bug) {
    return (
      <div
        data-testid={testId}
        className="flex items-center justify-center h-full text-gray-400"
      >
        {placeholder}
      </div>
    );
  }

  // Render when no available tabs
  if (availableTabs.length === 0) {
    return (
      <div
        data-testid={testId}
        className="flex items-center justify-center h-full text-gray-400"
      >
        表示可能なアーティファクトがありません
      </div>
    );
  }

  // Get display label for current tab
  const getTabDisplayName = (tab: BugArtifactType): string => {
    const tabInfo = availableTabs.find(t => t.key === tab);
    return tabInfo?.label ?? `${tab}.md`;
  };

  return (
    <div data-testid={testId} className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex flex-wrap items-center border-b border-gray-200 dark:border-gray-700">
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            data-testid={testId ? `${testId}-tab-${tab.key}` : undefined}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
            {activeTab === tab.key && isDirty && (
              <Circle className="inline w-2 h-2 ml-1 fill-current text-orange-500" />
            )}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1 min-w-[100px]" />

        {/* Mode toggle */}
        <div className="flex items-center mr-4">
          <button
            onClick={() => setMode('edit')}
            className={clsx(
              'px-3 py-1 text-sm rounded-l-md border',
              mode === 'edit'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            )}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode('preview')}
            className={clsx(
              'px-3 py-1 text-sm rounded-r-md border-t border-r border-b',
              mode === 'preview'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            )}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 mr-4 rounded-md text-sm',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">読み込み中...</span>
        </div>
      )}

      {/* Editor */}
      {!isLoading && (
        <div className="flex-1 overflow-hidden">
          <MDEditor
            value={content}
            onChange={value => setContent(value || '')}
            preview={mode === 'preview' ? 'preview' : 'edit'}
            height="100%"
            data-color-mode="dark"
            hideToolbar={mode === 'preview'}
            visibleDragbar={false}
            textareaProps={{
              style: {
                fontFamily: '"Noto Sans Mono CJK JP", "Noto Sans Mono", "Source Han Code JP", "BIZ UDGothic", "Osaka-Mono", "MS Gothic", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              },
            }}
          />
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
        <span>
          {isDirty && (
            <span className="text-orange-500 mr-2">未保存の変更あり</span>
          )}
          {getTabDisplayName(activeTab)}
        </span>
        <span>
          {(content || '').length} 文字 | {(content || '').split('\n').length} 行
        </span>
      </div>
    </div>
  );
}

export default RemoteBugArtifactEditor;
