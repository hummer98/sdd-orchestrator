/**
 * CreateSpecDialog Component
 * Dialog for creating new specifications via spec-manager:init
 * Task 5.1, 5.2, 5.3 (sidebar-refactor)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState } from 'react';
import { X, Plus, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { useProjectStore, useAgentStore, useWorkflowStore, notify } from '../stores';
import { clsx } from 'clsx';

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

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setError(null);
  };

  const handleCreate = async () => {
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
      // Call spec-init via IPC (uses /kiro:spec-init or /spec-manager:init based on commandPrefix)
      // Don't wait for completion - just start the agent and close dialog
      const agentInfo = await window.electronAPI.executeSpecInit(currentProject, trimmed, commandPrefix);

      // Task 5.2.4: エージェントをストアに追加し、プロジェクトエージェントパネルに遷移
      addAgent('', agentInfo);
      selectForProjectAgents();
      selectAgent(agentInfo.agentId);

      notify.success('仕様作成を開始しました（プロジェクトAgentパネルで進捗を確認できます）');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '仕様の作成に失敗しました');
      setIsCreating(false);
    }
  };

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
      // Don't wait for completion - just start the agent and close dialog
      const agentInfo = await window.electronAPI.executeSpecPlan(currentProject, trimmed, commandPrefix);

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
    onClose();
  };

  if (!isOpen) return null;

  // Validation: just check if description is not empty
  const isValid = description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
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
          {/* Plan Start button - spec-plan-ui-integration feature (Task 4) */}
          <button
            onClick={handlePlanStart}
            disabled={isCreating || !isValid}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-purple-500 hover:bg-purple-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="対話形式でプランニングを開始（Decision Log付き）"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                開始中...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                プランニングで開始
              </>
            )}
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !isValid}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                作成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
