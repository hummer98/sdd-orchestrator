/**
 * CreateSpecDialog Component
 * Dialog for creating new specifications via spec-manager:init
 * Task 5.1, 5.2, 5.3 (sidebar-refactor)
 * spec-worktree-early-creation: Task 4.1 - worktreeモードスイッチ追加
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState } from 'react';
import { X, Loader2, AlertCircle, GitBranch } from 'lucide-react';
import { useProjectStore, useAgentStore, useWorkflowStore, notify } from '../stores';
import { clsx } from 'clsx';
// create-spec-dialog-simplify: Task 1.3 - AgentIcon/AgentBranchIconインポート
import { AgentIcon, AgentBranchIcon } from '@shared/components/ui/AgentIcon';
// submit-shortcut-key: Task 2.2 - Keyboard shortcut hook
import { useSubmitShortcut } from '@shared/hooks';

interface CreateSpecDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSpecDialog({ isOpen, onClose }: CreateSpecDialogProps) {
  const { currentProject } = useProjectStore();
  const { selectForProjectAgents, selectAgent, addAgent } = useAgentStore();
  const { commandPrefix } = useWorkflowStore();

  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // spec-worktree-early-creation: Task 4.1 - worktreeモード状態管理
  const [worktreeMode, setWorktreeMode] = useState(false);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setError(null);
  };

  // create-spec-dialog-simplify: Task 1.2 - handleCreate関数を削除（spec-planに統合）

  /**
   * Handle "Plan Start" button click
   * Launches spec-plan agent for interactive requirements generation
   * spec-plan-ui-integration feature (Task 4)
   */
  const handlePlanStart = async () => {
    if (!currentProject) return;

    // Validate description: just check if not empty
    const trimmed = description.trim();
    if (!trimmed) {
      setError('説明を入力してください');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Call spec-plan via IPC (uses /kiro:spec-plan based on commandPrefix)
      // spec-worktree-early-creation: Pass worktreeMode to IPC
      // Don't wait for completion - just start the agent and close dialog
      const agentInfo = await window.electronAPI.executeSpecPlan(currentProject, trimmed, commandPrefix, worktreeMode);

      // Add agent to store and navigate to project agents panel
      addAgent('', agentInfo);
      selectForProjectAgents();
      selectAgent(agentInfo.agentId);

      notify.success('プランニングを開始しました（プロジェクトAgentパネルで対話を続けてください）');
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プランニングの開始に失敗しました';
      setError(errorMessage);
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setError(null);
    setIsCreating(false);
    setWorktreeMode(false); // spec-worktree-early-creation: reset worktree mode
    onClose();
  };

  // Validation: just check if description is not empty
  const isValid = description.trim().length > 0;

  // submit-shortcut-key: Task 2.2 - Keyboard shortcut for form submission
  // Note: Hook must be called before early return to comply with React rules of hooks
  const { handleKeyDown } = useSubmitShortcut({
    onSubmit: handlePlanStart,
    disabled: isCreating || !isValid,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      {/* create-spec-dialog-simplify: Task 1.1 - max-w-mdからmax-w-xlに拡大 */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-xl p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            新規仕様を作成
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Description field only */}
          <div>
            <label
              htmlFor="spec-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              説明
            </label>
            <textarea
              id="spec-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="機能の概要を入力してください。spec-manager:initが仕様名を自動生成します..."
              rows={5}
              disabled={isCreating}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                'focus:outline-none focus:ring-2',
                'disabled:opacity-50'
              )}
            />
          </div>

          {/* spec-worktree-early-creation: Task 4.1 - Worktreeモードスイッチ */}
          <div className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <GitBranch className={clsx(
                'w-4 h-4',
                worktreeMode ? 'text-violet-500' : 'text-gray-400'
              )} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Worktreeモードで作成
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={worktreeMode}
              data-testid="worktree-mode-switch"
              onClick={() => setWorktreeMode(!worktreeMode)}
              disabled={isCreating}
              className={clsx(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
                'border-2 border-transparent transition-colors duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                worktreeMode ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-600'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 rounded-full',
                  'bg-white shadow transform ring-0 transition duration-200 ease-in-out',
                  worktreeMode ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Worktreeモードの説明 */}
          {worktreeMode && (
            <p className="text-xs text-violet-600 dark:text-violet-400">
              ブランチとWorktreeを作成し、分離された環境で開発を行います。mainブランチで実行する必要があります。
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {/* create-spec-dialog-simplify: Task 1.4 - 統合ボタンの実装 */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className={clsx(
              'px-4 py-2 rounded-md',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'disabled:opacity-50'
            )}
          >
            キャンセル
          </button>
          {/* Integrated button: spec-plan only with worktree-aware styling */}
          {/* Requirements: 2.3, 2.4, 3.1, 3.2, 4.1, 4.2 */}
          <button
            onClick={handlePlanStart}
            disabled={isCreating || !isValid}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              worktreeMode
                ? 'bg-violet-500 hover:bg-violet-600'
                : 'bg-blue-500 hover:bg-blue-600'
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                開始中...
              </>
            ) : (
              <>
                {worktreeMode ? (
                  <AgentBranchIcon data-testid="agent-branch-icon" />
                ) : (
                  <AgentIcon data-testid="agent-icon" />
                )}
                spec-planで作成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
