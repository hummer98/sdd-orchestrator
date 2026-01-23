/**
 * AskAgentDialog Component (Shared)
 *
 * Task 4.8: ProjectAgent関連コンポーネントを共有化する
 *
 * プロジェクト/Specコンテキストでカスタムプロンプトを実行するダイアログ。
 * props-driven設計で、ストア非依存。Electron版とRemote UI版で共有可能。
 */

import { useState, useEffect } from 'react';
import { X, Bot, MessageSquare, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useSubmitShortcut } from '../../hooks';

// =============================================================================
// Types
// =============================================================================

export interface AskAgentDialogProps {
  /** Dialog open state */
  readonly isOpen: boolean;
  /** Agent type: project or spec */
  readonly agentType: 'project' | 'spec';
  /** Spec name (for spec type) */
  readonly specName?: string;
  /** Execute callback with prompt */
  readonly onExecute: (prompt: string) => void;
  /** Cancel callback */
  readonly onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function AskAgentDialog({
  isOpen,
  agentType,
  specName,
  onExecute,
  onCancel,
}: AskAgentDialogProps): React.ReactElement | null {
  const [prompt, setPrompt] = useState('');

  // Reset prompt when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
    }
  }, [isOpen]);

  const handleExecute = () => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt) {
      onExecute(trimmedPrompt);
    }
  };

  const handleClose = () => {
    setPrompt('');
    onCancel();
  };

  const isValid = prompt.trim().length > 0;
  const isProjectAgent = agentType === 'project';

  // submit-shortcut-key: Task 2.1 - Keyboard shortcut for form submission
  // Note: Hook must be called before early return to comply with React rules of hooks
  const { handleKeyDown } = useSubmitShortcut({
    onSubmit: handleExecute,
    disabled: !isValid,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="ask-agent-dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        data-testid="dialog-backdrop"
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-lg p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
        data-testid="dialog-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isProjectAgent ? (
              <MessageSquare className="w-5 h-5 text-blue-500" />
            ) : (
              <FileText className="w-5 h-5 text-purple-500" />
            )}
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              {isProjectAgent ? (
                'Project Agent - Ask'
              ) : (
                <>
                  Spec Agent - Ask
                  {specName && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({specName})
                    </span>
                  )}
                </>
              )}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            data-testid="close-button"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Context info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm text-gray-600 dark:text-gray-400">
            {isProjectAgent ? (
              <p>
                Steering files (`.kiro/steering/*.md`) をコンテキストとして使用します。
              </p>
            ) : (
              <p>
                Steering files と Spec files (`.kiro/specs/{'{specName}'}/*.md`)
                をコンテキストとして使用します。
              </p>
            )}
          </div>

          {/* Prompt field */}
          <div>
            <label
              htmlFor="ask-prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              プロンプト
            </label>
            <textarea
              id="ask-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="プロンプトを入力してください..."
              rows={6}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border border-gray-200 dark:border-gray-700',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              data-testid="ask-prompt-input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className={clsx(
              'px-4 py-2 rounded-md',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            キャンセル
          </button>
          <button
            onClick={handleExecute}
            disabled={!isValid}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              isProjectAgent
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-purple-500 hover:bg-purple-600',
              'text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Bot className="w-4 h-4" />
            実行
          </button>
        </div>
      </div>
    </div>
  );
}
