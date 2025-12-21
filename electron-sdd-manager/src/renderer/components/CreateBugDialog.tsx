/**
 * CreateBugDialog Component
 * Dialog for creating new bug reports via /kiro:bug-create
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { useState } from 'react';
import { X, Plus, Loader2, AlertCircle, Bug } from 'lucide-react';
import { useProjectStore, useAgentStore, notify } from '../stores';
import { useBugStore } from '../stores/bugStore';
import { clsx } from 'clsx';

interface CreateBugDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * CreateBugDialog - Dialog for creating new bug reports
 * - Bug description textarea (required)
 * - Create/Cancel buttons
 * - Loading state during creation
 * - Bug name is auto-generated from timestamp
 */
export function CreateBugDialog({ isOpen, onClose }: CreateBugDialogProps): React.ReactElement | null {
  const { currentProject } = useProjectStore();
  const { startAgent, selectForProjectAgents, selectAgent } = useAgentStore();
  const { refreshBugs } = useBugStore();

  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setError(null);
  };

  /**
   * Generate bug name from timestamp
   * Format: bug-YYYYMMDD-HHmmss
   */
  const generateBugName = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `bug-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  const handleCreate = async () => {
    if (!currentProject) return;

    // Validate description
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setError('バグの説明を入力してください');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Generate bug name automatically
      const bugName = generateBugName();

      // Build command args for /kiro:bug-create
      const command = '/kiro:bug-create';
      const args: string[] = [bugName, `"${trimmedDescription}"`];

      // Start agent with bug-create command
      const agentId = await startAgent(
        '', // Global agent (not spec-specific)
        'bug-create',
        command,
        args,
        undefined,
        undefined
      );

      if (agentId) {
        // Switch to project agents panel
        selectForProjectAgents();
        selectAgent(agentId);

        notify.success('バグレポート作成を開始しました');

        // Refresh bugs list after a short delay to allow file creation
        setTimeout(() => refreshBugs(), 2000);

        handleClose();
      } else {
        setError('バグレポートの作成に失敗しました');
        setIsCreating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'バグレポートの作成に失敗しました');
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

  // Validation: description is required
  const isValid = description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="create-bug-dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        data-testid="dialog-backdrop"
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
        data-testid="dialog-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              新規バグレポート
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
          {/* Description field */}
          <div>
            <label
              htmlFor="bug-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              バグの説明 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="発生した問題や再現手順を入力してください..."
              rows={4}
              disabled={isCreating}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'border',
                error && !description.trim()
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2',
                'disabled:opacity-50'
              )}
              data-testid="bug-description-input"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md" data-testid="error-message">
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
            data-testid="cancel-button"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !isValid}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-red-500 hover:bg-red-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="create-button"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" data-testid="loading-indicator" />
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

export default CreateBugDialog;
