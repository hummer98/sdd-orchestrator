/**
 * ArtifactEditor Component
 * Markdown editor for specification artifacts
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { useEffect, useMemo } from 'react';
import { Save, Eye, Edit, Loader2, Circle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useEditorStore, useSpecStore, notify } from '../stores';
import type { ArtifactType } from '../stores/editorStore';
import { clsx } from 'clsx';

type BaseArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

interface TabInfo {
  key: ArtifactType;
  label: string;
}

const BASE_TABS: TabInfo[] = [
  { key: 'requirements', label: 'requirements.md' },
  { key: 'design', label: 'design.md' },
  { key: 'tasks', label: 'tasks.md' },
  { key: 'research', label: 'research.md' },
];

export function ArtifactEditor() {
  const { selectedSpec, specDetail } = useSpecStore();
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

  // Load artifact when spec or tab changes
  useEffect(() => {
    if (selectedSpec) {
      loadArtifact(selectedSpec.path, activeTab);
    } else {
      clearEditor();
    }
  }, [selectedSpec, activeTab, loadArtifact, clearEditor]);

  // Build document review tabs from roundDetails
  const documentReviewTabs = useMemo((): TabInfo[] => {
    const reviewState = specDetail?.specJson?.documentReview;
    if (!reviewState?.roundDetails || reviewState.roundDetails.length === 0) {
      return [];
    }

    const tabs: TabInfo[] = [];
    // Sort by roundNumber and add tabs in order
    const sortedDetails = [...reviewState.roundDetails].sort(
      (a, b) => a.roundNumber - b.roundNumber
    );

    for (const detail of sortedDetails) {
      const n = detail.roundNumber;
      // Always add review tab if we have a roundDetail
      tabs.push({
        key: `document-review-${n}` as ArtifactType,
        label: `Review-${n}`,
      });
      // Add reply tab if reply is complete
      if (detail.status === 'reply_complete') {
        tabs.push({
          key: `document-review-${n}-reply` as ArtifactType,
          label: `Reply-${n}`,
        });
      }
    }

    return tabs;
  }, [specDetail?.specJson?.documentReview]);

  // Build inspection tabs from spec.json inspection field (REQ-12.1, REQ-12.2)
  const inspectionTabs = useMemo((): TabInfo[] => {
    const inspection = specDetail?.specJson?.inspection;
    if (!inspection?.report_file) {
      return [];
    }

    // Extract number from report_file (e.g., "inspection-1.md" -> 1)
    const match = inspection.report_file.match(/inspection-(\d+)\.md/);
    if (!match) {
      return [];
    }

    const n = parseInt(match[1], 10);
    return [{
      key: `inspection-${n}` as ArtifactType,
      label: `Inspection-${n}`,
    }];
  }, [specDetail?.specJson?.inspection]);

  // Filter base tabs to only show existing artifacts, then add review and inspection tabs
  const availableTabs = useMemo((): TabInfo[] => {
    let baseTabs = BASE_TABS;
    if (specDetail?.artifacts) {
      baseTabs = BASE_TABS.filter((tab) => {
        const artifact = specDetail.artifacts[tab.key as BaseArtifactType];
        return artifact !== null && artifact.exists;
      });
    }
    // Append document review tabs after tasks, then inspection tabs (REQ-12.4)
    return [...baseTabs, ...documentReviewTabs, ...inspectionTabs];
  }, [specDetail?.artifacts, documentReviewTabs, inspectionTabs]);

  // If current activeTab doesn't exist, switch to first available tab
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab, setActiveTab]);

  if (!selectedSpec) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        仕様を選択してエディターを開始
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
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
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
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
          {content.length} 文字 | {content.split('\n').length} 行
        </span>
      </div>
    </div>
  );
}
