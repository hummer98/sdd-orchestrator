/**
 * ArtifactEditor Component
 * Shared Markdown editor for Spec and Bug artifacts with search functionality
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 * Requirements: artifact-editor-search 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4
 * Bug fix: bugs-tab-spec-editing-feature
 */

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { Save, Eye, Edit, Loader2, Circle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useEditorStore, notify } from '../stores';
import type { ArtifactType } from '../stores/editorStore';
import { clsx } from 'clsx';
import { SearchBar } from './SearchBar';
import { SearchHighlightLayer } from './SearchHighlightLayer';
import { PreviewHighlightLayer } from './PreviewHighlightLayer';
import { useTextSearch } from '../hooks/useTextSearch';
import { useSearchKeyboard } from '../hooks/useSearchKeyboard';
import { useHumanActivity } from '../hooks/useHumanActivity';
import { throttle } from '@shared/utils';

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
  /** Base name for artifacts (spec or bug name) - spec-path-ssot-refactor */
  baseName: string | null;
  /** Placeholder text when nothing is selected */
  placeholder: string;
  /** Dynamic tabs (e.g., document review, inspection) */
  dynamicTabs?: TabInfo[];
  /** Artifact existence map for filtering tabs */
  artifacts?: Record<string, ArtifactInfo | null>;
  /** Test ID for testing */
  testId?: string;
  /** Entity type for path resolution - bug-artifact-content-not-displayed */
  entityType?: 'spec' | 'bug';
}

// spec-path-ssot-refactor: Changed baseName to baseName
// bug-artifact-content-not-displayed: Add entityType prop
export function ArtifactEditor({
  tabs,
  baseName,
  placeholder,
  dynamicTabs = [],
  artifacts,
  testId,
  entityType = 'spec',
}: ArtifactEditorProps) {
  const {
    activeTab,
    content,
    isDirty,
    isSaving,
    mode,
    error,
    searchVisible,
    searchQuery,
    caseSensitive,
    matches,
    activeMatchIndex,
    setActiveTab,
    setContent,
    setMode,
    save,
    loadArtifact,
    clearEditor,
    setSearchVisible,
    clearSearch,
    navigateNext,
    navigatePrev,
  } = useEditorStore();

  // Ref for preview container (used by PreviewHighlightLayer)
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Human activity tracking
  const { recordActivity } = useHumanActivity();

  // Throttled scroll handler for document-scroll event (250ms)
  const handleScroll = useMemo(
    () => throttle(() => recordActivity('document-scroll'), 250),
    [recordActivity]
  );

  // Initialize text search hook to calculate matches
  useTextSearch();

  // Handle search toggle
  const handleSearchToggle = useCallback(() => {
    setSearchVisible(!searchVisible);
  }, [searchVisible, setSearchVisible]);

  // Handle search close
  const handleSearchClose = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  // Setup keyboard shortcuts for search
  useSearchKeyboard({
    enabled: !!baseName,
    searchVisible,
    onToggle: handleSearchToggle,
    onClose: handleSearchClose,
    onNext: navigateNext,
    onPrev: navigatePrev,
  });

  // Load artifact when baseName or tab changes
  // bug-artifact-content-not-displayed: Pass entityType to use correct path resolver
  useEffect(() => {
    if (baseName) {
      loadArtifact(baseName, activeTab, entityType);
    } else {
      clearEditor();
    }
  }, [baseName, activeTab, entityType, loadArtifact, clearEditor]);

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

  if (!baseName) {
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
    recordActivity('artifact-tab-change');
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
      <div className="flex flex-wrap items-center border-b border-gray-200 dark:border-gray-700">
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

        {/* Spacer - min-width ensures it stays on the last row */}
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

      {/* Search bar */}
      <SearchBar visible={searchVisible} onClose={handleSearchClose} />

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Editor */}
      <div
        className="flex-1 overflow-hidden relative"
        ref={previewContainerRef}
        onScroll={handleScroll}
      >
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
        {/* Edit mode: SearchHighlightLayer overlay */}
        {searchVisible && mode === 'edit' && (
          <SearchHighlightLayer
            content={content}
            matches={matches}
            activeIndex={activeMatchIndex}
          />
        )}
        {/* Preview mode: PreviewHighlightLayer using CSS Custom Highlight API */}
        {searchVisible && mode === 'preview' && (
          <PreviewHighlightLayer
            containerRef={previewContainerRef}
            query={searchQuery}
            caseSensitive={caseSensitive}
            activeIndex={activeMatchIndex}
          />
        )}
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
