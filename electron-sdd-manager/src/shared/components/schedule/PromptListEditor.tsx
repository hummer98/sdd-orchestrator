/**
 * PromptListEditor Component
 * Editor for managing multiple prompts in a schedule task
 *
 * Task 6.3: PromptListEditorを作成
 * - 複数プロンプトの登録UI
 * - プロンプトの追加・編集・削除
 * - 順序変更（上下ボタン）
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { Prompt } from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface PromptListEditorProps {
  /** List of prompts to display and edit */
  prompts: readonly Prompt[];
  /** Called when prompts are modified */
  onChange: (prompts: Prompt[]) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// =============================================================================
// PromptListEditor Component
// =============================================================================

export function PromptListEditor({
  prompts,
  onChange,
  disabled = false,
}: PromptListEditorProps) {
  // ===========================================================================
  // Handlers
  // ===========================================================================

  /**
   * Add a new empty prompt at the end
   * Requirement 5.1: 複数プロンプト登録
   */
  const handleAddPrompt = useCallback(() => {
    const newPrompt: Prompt = {
      order: prompts.length,
      content: '',
    };
    onChange([...prompts, newPrompt]);
  }, [prompts, onChange]);

  /**
   * Update a prompt's content
   * Requirement 5.2: プロンプト個別編集
   */
  const handleContentChange = useCallback(
    (index: number, content: string) => {
      const updatedPrompts = prompts.map((prompt, i) =>
        i === index ? { ...prompt, content } : prompt
      );
      onChange(updatedPrompts as Prompt[]);
    },
    [prompts, onChange]
  );

  /**
   * Delete a prompt and renumber remaining prompts
   * Requirement 5.2: プロンプト個別削除
   */
  const handleDeletePrompt = useCallback(
    (index: number) => {
      const updatedPrompts = prompts
        .filter((_, i) => i !== index)
        .map((prompt, i) => ({ ...prompt, order: i }));
      onChange(updatedPrompts);
    },
    [prompts, onChange]
  );

  /**
   * Move a prompt up in the list
   * Requirement 5.3: プロンプト順序変更
   */
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;

      const updatedPrompts = [...prompts];
      const temp = updatedPrompts[index];
      updatedPrompts[index] = updatedPrompts[index - 1];
      updatedPrompts[index - 1] = temp;

      // Renumber orders
      const renumbered = updatedPrompts.map((prompt, i) => ({
        ...prompt,
        order: i,
      }));

      onChange(renumbered);
    },
    [prompts, onChange]
  );

  /**
   * Move a prompt down in the list
   * Requirement 5.3: プロンプト順序変更
   */
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= prompts.length - 1) return;

      const updatedPrompts = [...prompts];
      const temp = updatedPrompts[index];
      updatedPrompts[index] = updatedPrompts[index + 1];
      updatedPrompts[index + 1] = temp;

      // Renumber orders
      const renumbered = updatedPrompts.map((prompt, i) => ({
        ...prompt,
        order: i,
      }));

      onChange(renumbered);
    },
    [prompts, onChange]
  );

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div data-testid="prompt-list-editor" className="space-y-4">
      {/* Section Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          プロンプト
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {prompts.length}件
        </span>
      </div>

      {/* Prompt List */}
      <div className="space-y-3">
        {prompts.map((prompt, index) => (
          <PromptItem
            key={index}
            index={index}
            prompt={prompt}
            isFirst={index === 0}
            isLast={index === prompts.length - 1}
            isOnlyOne={prompts.length === 1}
            disabled={disabled}
            onContentChange={handleContentChange}
            onDelete={handleDeletePrompt}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        ))}
      </div>

      {/* Add Button */}
      <button
        type="button"
        data-testid="add-prompt-button"
        onClick={handleAddPrompt}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-md',
          'border border-dashed',
          disabled
            ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
        )}
      >
        <Plus className="w-4 h-4" />
        プロンプトを追加
      </button>
    </div>
  );
}

// =============================================================================
// PromptItem Component
// =============================================================================

interface PromptItemProps {
  index: number;
  prompt: Prompt;
  isFirst: boolean;
  isLast: boolean;
  isOnlyOne: boolean;
  disabled: boolean;
  onContentChange: (index: number, content: string) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function PromptItem({
  index,
  prompt,
  isFirst,
  isLast,
  isOnlyOne,
  disabled,
  onContentChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: PromptItemProps) {
  const displayOrder = index + 1; // 1-indexed for display

  return (
    <div
      data-testid={`prompt-item-${index}`}
      className="flex gap-2 items-start"
    >
      {/* Order Number */}
      <div className="flex flex-col items-center gap-1 pt-2">
        <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
          {displayOrder}
        </span>

        {/* Reorder Buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            data-testid={`move-up-${index}`}
            onClick={() => onMoveUp(index)}
            disabled={disabled || isFirst}
            aria-label={`プロンプト${displayOrder}を上に移動`}
            className={clsx(
              'p-0.5 rounded',
              disabled || isFirst
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid={`move-down-${index}`}
            onClick={() => onMoveDown(index)}
            disabled={disabled || isLast}
            aria-label={`プロンプト${displayOrder}を下に移動`}
            className={clsx(
              'p-0.5 rounded',
              disabled || isLast
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Textarea */}
      <div className="flex-1">
        <textarea
          data-testid={`prompt-content-${index}`}
          value={prompt.content}
          onChange={(e) => onContentChange(index, e.target.value)}
          disabled={disabled}
          placeholder="プロンプトを入力..."
          rows={3}
          className={clsx(
            'w-full px-3 py-2 rounded-md',
            'bg-gray-50 dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'border border-gray-200 dark:border-gray-700',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-y'
          )}
        />
      </div>

      {/* Delete Button */}
      <button
        type="button"
        data-testid={`delete-prompt-${index}`}
        onClick={() => onDelete(index)}
        disabled={disabled || isOnlyOne}
        aria-label={`プロンプト${displayOrder}を削除`}
        className={clsx(
          'p-2 rounded mt-1',
          disabled || isOnlyOne
            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            : 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default PromptListEditor;
