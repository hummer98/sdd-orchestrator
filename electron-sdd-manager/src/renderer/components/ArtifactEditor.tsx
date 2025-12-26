/**
 * ArtifactEditor Component
 * Shared Markdown editor for Spec and Bug artifacts
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 * Bug fix: bugs-tab-spec-editing-feature
 */

import { useEffect, useMemo } from 'react';
import { Save, Eye, Edit, Loader2, Circle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useEditorStore, notify } from '../stores';
import type { ArtifactType } from '../stores/editorStore';
import { clsx } from 'clsx';

/** Tab configuration for artifact editor */
export interface TabInfo {
  key: ArtifactType;
  label: string;
}

/** Artifact existence info for filtering tabs */
export interface ArtifactInfo {
  exists: boolean;
}

export interface ArtifactEditorProps {
  /** Base tabs configuration */
  tabs: TabInfo[];
  /** Base path for artifacts (spec or bug directory path) */
  basePath: string | null;
  /** Placeholder text when nothing is selected */
  placeholder: string;
  /** Dynamic tabs (e.g., document review, inspection) */
  dynamicTabs?: TabInfo[];
  /** Artifact existence map for filtering tabs */
  artifacts?: Record<string, ArtifactInfo | null>;
  /** Test ID for testing */
  testId?: string;
}

export function ArtifactEditor({
  tabs,
  basePath,
  placeholder,
  dynamicTabs = [],
  artifacts,
  testId,
}: ArtifactEditorProps) {
  const {
    activeTab,
    content,
    isDirty,
    isSaving,
    mode,
    error,
    setActiveTab,
    setContent,
    setMode,
    save,
    loadArtifact,
    clearEditor,
  } = useEditorStore();

  // Load artifact when basePath or tab changes
  useEffect(() => {
    if (basePath) {
      loadArtifact(basePath, activeTab);
    } else {
      clearEditor();
    }
  }, [basePath, activeTab, loadArtifact, clearEditor]);

  // Filter base tabs to only show existing artifacts, then add dynamic tabs
  const availableTabs = useMemo((): TabInfo[] => {
    if (!tabs || tabs.length === 0) {
      return dynamicTabs;
    }
    let filteredTabs = tabs;
    if (artifacts) {
      filteredTabs = tabs.filter((tab) => {
        const artifact = artifacts[tab.key];
        return artifact !== null && artifact?.exists;
      });
    }
    // Append dynamic tabs (document review, inspection, etc.)
    return [...filteredTabs, ...dynamicTabs];
  }, [tabs, artifacts, dynamicTabs]);

  // If current activeTab doesn't exist, switch to first available tab
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab, setActiveTab]);

  if (!basePath) {
    return (
      <div
        data-testid={testId}
        className="flex items-center justify-center h-full text-gray-400"
      >
        {placeholder}
      </div>
    );
  }

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

  const handleSave = async () => {
    await save();
    notify.success('保存しました');
  };

  const handleTabChange = async (tab: ArtifactType) => {
    if (isDirty) {
      const confirmed = window.confirm(
        '未保存の変更があります。変更を破棄して切り替えますか？'
      );
      if (!confirmed) return;
    }
    setActiveTab(tab);
  };

  // Get display label for current tab in status bar
  const getTabDisplayName = (tab: ArtifactType): string => {
    const tabInfo = availableTabs.find((t) => t.key === tab);
    if (tabInfo) {
      // For review tabs, append .md
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
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
        {availableTabs.map((tab) => (
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
        <div className="flex-1" />

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
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={content}
          onChange={(value) => setContent(value || '')}
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
