/**
 * RemoteArtifactEditor Component
 *
 * remote-ui-artifact-editor: Remote UI版のArtifact表示/編集コンポーネント
 * Electron版のArtifactEditorと同じUIデザインを提供するが、
 * WebSocket API経由でArtifactを取得・保存する。
 *
 * 主な違い:
 * - editorStoreを使用せず、ローカルstateで管理
 * - apiClient.getArtifactContent/saveFile経由でファイル操作
 * - 検索機能は将来対応（現在は省略）
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Eye, Edit, Loader2, Circle, AlertCircle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { clsx } from 'clsx';
import type {
  ApiClient,
  SpecMetadataWithPath,
  SpecDetail,
} from '@shared/api/types';
import { normalizeInspectionState } from '@renderer/types/inspection';
import { SPEC_ARTIFACT_TABS } from '@shared/constants/artifacts';

// =============================================================================
// Types
// =============================================================================

/** Artifact type for spec documents */
type SpecArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

/** Dynamic artifact types for document review and inspection files */
type DynamicArtifactType =
  | `document-review-${number}`
  | `document-review-${number}-reply`
  | `inspection-${number}`;

/** All artifact types */
type ArtifactType = SpecArtifactType | DynamicArtifactType;

/** Tab configuration */
interface TabInfo {
  key: ArtifactType;
  label: string;
}

/** Component props */
export interface RemoteArtifactEditorProps {
  /** Selected spec metadata */
  spec: SpecMetadataWithPath | null;
  /** Spec detail (for determining available tabs) */
  specDetail: SpecDetail | null;
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

/** Base tabs for spec artifacts - use shared constant */
const SPEC_TABS: TabInfo[] = SPEC_ARTIFACT_TABS as unknown as TabInfo[];

// =============================================================================
// Component
// =============================================================================

export function RemoteArtifactEditor({
  spec,
  specDetail,
  apiClient,
  placeholder = 'Select a spec to view documents',
  testId,
}: RemoteArtifactEditorProps): React.ReactElement {
  // State
  const [activeTab, setActiveTab] = useState<ArtifactType>('requirements');
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const isDirty = content !== originalContent;

  // Build document review tabs from specDetail
  const documentReviewTabs = useMemo((): TabInfo[] => {
    const reviewState = specDetail?.specJson?.documentReview;
    if (!reviewState?.roundDetails || reviewState.roundDetails.length === 0) {
      return [];
    }

    const tabs: TabInfo[] = [];
    const sortedDetails = [...reviewState.roundDetails].sort(
      (a, b) => a.roundNumber - b.roundNumber
    );

    for (const detail of sortedDetails) {
      const n = detail.roundNumber;
      tabs.push({
        key: `document-review-${n}` as ArtifactType,
        label: `Review-${n}`,
      });
      if (detail.status === 'reply_complete') {
        tabs.push({
          key: `document-review-${n}-reply` as ArtifactType,
          label: `Reply-${n}`,
        });
      }
    }

    return tabs;
  }, [specDetail?.specJson?.documentReview]);

  // Build inspection tabs from specDetail
  const inspectionTabs = useMemo((): TabInfo[] => {
    const inspection = normalizeInspectionState(specDetail?.specJson?.inspection);
    if (!inspection?.rounds || inspection.rounds.length === 0) {
      return [];
    }

    const sortedRounds = [...inspection.rounds].sort((a, b) => a.number - b.number);
    return sortedRounds.map(round => ({
      key: `inspection-${round.number}` as ArtifactType,
      label: `Inspection-${round.number}`,
    }));
  }, [specDetail?.specJson?.inspection]);

  // Build available tabs
  // Note: Remote UI's SpecDetailProvider doesn't provide artifact existence info,
  // so we show all base tabs and let getArtifactContent return empty string for non-existent files
  const availableTabs = useMemo((): TabInfo[] => {
    // Always show base tabs for specs
    // Dynamic tabs (document review, inspection) are added based on specDetail state
    return [...SPEC_TABS, ...documentReviewTabs, ...inspectionTabs];
  }, [documentReviewTabs, inspectionTabs]);

  // Load artifact content
  const loadArtifact = useCallback(async (specId: string, artifactType: ArtifactType) => {
    if (!apiClient.getArtifactContent) {
      setError('Artifact loading not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.getArtifactContent(specId, artifactType, 'spec');

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
    if (!spec || !isDirty) return;

    setIsSaving(true);
    setError(null);

    try {
      // Construct file path
      const artifactFileName = activeTab.endsWith('.md') ? activeTab : `${activeTab}.md`;
      const filePath = `${spec.path}/${artifactFileName}`;

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
  }, [apiClient, spec, activeTab, content, isDirty]);

  // Handle tab change
  const handleTabChange = useCallback(async (tab: ArtifactType) => {
    if (isDirty) {
      const confirmed = window.confirm(
        '未保存の変更があります。変更を破棄して切り替えますか？'
      );
      if (!confirmed) return;
    }
    setActiveTab(tab);
  }, [isDirty]);

  // Load artifact when spec or tab changes
  useEffect(() => {
    if (spec) {
      loadArtifact(spec.name, activeTab);
    } else {
      setContent('');
      setOriginalContent('');
      setError(null);
    }
  }, [spec?.name, activeTab, loadArtifact]);

  // Reset to first available tab when available tabs change
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // Render placeholder when no spec selected
  if (!spec) {
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
  const getTabDisplayName = (tab: ArtifactType): string => {
    const tabInfo = availableTabs.find(t => t.key === tab);
    if (tabInfo) {
      if (tab.startsWith('document-review-')) {
        return `${tab}.md`;
      }
      return tabInfo.label;
    }
    return `${tab}.md`;
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
        <div className="flex items-center mr-2">
          <button
            onClick={() => setMode('edit')}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-l-md border',
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
              'px-3 py-1.5 text-sm rounded-r-md border-t border-r border-b',
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
            'flex items-center gap-1.5 px-3 py-1.5 mr-4 rounded-md text-sm',
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

export default RemoteArtifactEditor;
