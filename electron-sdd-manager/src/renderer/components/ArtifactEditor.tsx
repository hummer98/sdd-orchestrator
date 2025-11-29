/**
 * ArtifactEditor Component
 * Markdown editor for specification artifacts
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { useEffect, useMemo } from 'react';
import { Save, Eye, Edit, Loader2, Circle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useEditorStore, useSpecStore, notify } from '../stores';
import { clsx } from 'clsx';

type ArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

const ALL_TABS: { key: ArtifactType; label: string }[] = [
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

  // Filter tabs to only show existing artifacts
  const availableTabs = useMemo(() => {
    if (!specDetail?.artifacts) return ALL_TABS;
    return ALL_TABS.filter((tab) => {
      const artifact = specDetail.artifacts[tab.key];
      return artifact !== null && artifact.exists;
    });
  }, [specDetail?.artifacts]);

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
          {activeTab}.md
        </span>
        <span>
          {content.length} 文字 | {content.split('\n').length} 行
        </span>
      </div>
    </div>
  );
}
