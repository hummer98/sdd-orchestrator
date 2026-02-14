/**
 * ToolSettingsPanel Component
 * Settings panel for Tool Path configuration
 * well-known-tool-paths feature
 * Task 5.1: ToolSettingsPanelコンポーネントを作成する
 * Requirements: 2.2, 2.3, 3.2
 */

import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { Wrench, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useToolPathStore } from '../../shared/stores/toolPathStore';

/**
 * ToolSettingsPanel Props
 */
export interface ToolSettingsPanelProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * ToolSettingsPanel Component
 *
 * Provides UI for configuring tool paths:
 * - Display tool statuses (name, path, resolved state)
 * - Warning style for unresolved tools
 * - Manual path input for each tool
 * - Source indicator (well-known, manual, not-found)
 *
 * Requirements:
 * - 2.2: ToolSettingsPanel追加
 * - 2.3: ツール情報表示（名前、パス、ステータス）
 * - 3.2: 未検出ツールハイライト表示
 *
 * @example
 * <ToolSettingsPanel />
 */
export function ToolSettingsPanel({ className }: ToolSettingsPanelProps) {
  // zustand-selector-optimization: useShallow for state + action fields
  const { statuses, isLoading, error, fetchStatuses, setToolPath } =
    useToolPathStore(
      useShallow(s => ({
        statuses: s.statuses,
        isLoading: s.isLoading,
        error: s.error,
        fetchStatuses: s.fetchStatuses,
        setToolPath: s.setToolPath,
      }))
    );

  // Input state for each tool's path
  const [pathInputs, setPathInputs] = useState<Record<string, string>>({});
  const [savingTool, setSavingTool] = useState<string | null>(null);

  // Fetch statuses on mount
  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Initialize path inputs from statuses
  useEffect(() => {
    const inputs: Record<string, string> = {};
    for (const status of statuses) {
      if (status.resolution.source === 'manual' && status.resolution.path) {
        inputs[status.definition.name] = status.resolution.path;
      } else {
        inputs[status.definition.name] = '';
      }
    }
    setPathInputs(inputs);
  }, [statuses]);

  // Handle path input change
  const handlePathChange = useCallback(
    (toolName: string, value: string) => {
      setPathInputs((prev) => ({ ...prev, [toolName]: value }));
    },
    []
  );

  // Handle path submit (on blur)
  const handlePathSubmit = useCallback(
    async (toolName: string) => {
      const path = pathInputs[toolName]?.trim();
      if (!path) return;

      setSavingTool(toolName);
      try {
        await setToolPath(toolName, path);
      } finally {
        setSavingTool(null);
      }
    },
    [pathInputs, setToolPath]
  );

  // Handle clear path
  const handleClearPath = useCallback(
    async (toolName: string) => {
      setSavingTool(toolName);
      try {
        await setToolPath(toolName, null);
        setPathInputs((prev) => ({ ...prev, [toolName]: '' }));
      } finally {
        setSavingTool(null);
      }
    },
    [setToolPath]
  );

  // Get source label
  const getSourceLabel = (source?: 'manual' | 'well-known' | 'not-found') => {
    switch (source) {
      case 'manual':
        return '手動設定';
      case 'well-known':
        return '自動検出';
      case 'not-found':
      default:
        return '未検出';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={clsx(
          'p-4 rounded-lg border bg-white dark:bg-gray-800',
          'border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <div className="flex items-center justify-center py-4" data-testid="tool-loading">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
        <Wrench className="w-5 h-5 text-blue-500" />
        ツールパス設定
      </h2>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tool list */}
      <div className="space-y-4">
        {statuses.map((status) => {
          const { definition, resolution } = status;
          const isResolved = resolution.resolved;
          const isManual = resolution.source === 'manual';
          const isSaving = savingTool === definition.name;

          return (
            <div
              key={definition.name}
              data-testid={`tool-row-${definition.name}`}
              className={clsx(
                'p-3 rounded-md border',
                isResolved
                  ? 'resolved border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                  : 'unresolved warning border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
              )}
            >
              {/* Tool name and status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isResolved ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {definition.name}
                  </span>
                  {definition.required && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      必須
                    </span>
                  )}
                </div>
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded',
                    isResolved
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  )}
                >
                  {getSourceLabel(resolution.source)}
                </span>
              </div>

              {/* Resolved path */}
              {resolution.path && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-mono truncate">
                  {resolution.path}
                </div>
              )}

              {/* Error message for unresolved tools */}
              {!isResolved && resolution.error && (
                <div className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                  {resolution.error}
                </div>
              )}

              {/* Install guidance for unresolved tools */}
              {!isResolved && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                  インストール: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{definition.installGuidance}</code>
                </div>
              )}

              {/* Manual path input */}
              <div className="mt-2">
                <label
                  htmlFor={`tool-path-${definition.name}`}
                  className="block text-xs text-gray-500 dark:text-gray-500 mb-1"
                >
                  {definition.name} パスを手動で設定
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`tool-path-${definition.name}`}
                    type="text"
                    value={pathInputs[definition.name] || ''}
                    onChange={(e) =>
                      handlePathChange(definition.name, e.target.value)
                    }
                    onBlur={() => handlePathSubmit(definition.name)}
                    disabled={isSaving}
                    placeholder={`/path/to/${definition.name}`}
                    className={clsx(
                      'flex-1 px-3 py-1.5 rounded-md text-sm',
                      'border border-gray-300 dark:border-gray-600',
                      'bg-white dark:bg-gray-900',
                      'text-gray-800 dark:text-gray-200',
                      'placeholder-gray-400 dark:placeholder-gray-500',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      isSaving && 'opacity-50'
                    )}
                  />
                  {isManual && (
                    <button
                      onClick={() => handleClearPath(definition.name)}
                      disabled={isSaving}
                      aria-label="クリア"
                      className={clsx(
                        'p-1.5 rounded-md transition-colors',
                        'text-gray-500 hover:text-red-500',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        isSaving && 'opacity-50'
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
        <p>
          ツールが自動検出されない場合は、手動でパスを設定してください。
        </p>
        <p className="mt-1">
          検索パス: /opt/homebrew/bin, /usr/local/bin, ~/.local/bin, /usr/bin
        </p>
      </div>
    </div>
  );
}
