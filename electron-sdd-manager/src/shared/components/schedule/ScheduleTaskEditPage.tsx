/**
 * ScheduleTaskEditPage Component
 * Edit page for creating and editing schedule tasks
 *
 * Task 6.1: ScheduleTaskEditPageの基本構造を作成
 * - Spec/Bug新規作成と同様のレイアウト
 * - タスク名入力
 * - 新規作成モードと編集モードの切り替え
 * - 保存・キャンセル操作
 *
 * Task 6.2: スケジュール種別選択UIを追加
 * - 固定/条件の切り替え
 * - 間隔ベース（n時間経過）の設定UI
 * - 曜日ベース（毎週n曜日のn時）の設定UI
 * - アイドルベース（n分経過）の設定UI
 * - 「アイドル後に実行」オプション
 *
 * Task 6.5: workflowモード設定UIを追加
 * - 有効/無効トグル
 * - suffixモード選択（自動/カスタム）
 * - カスタムsuffix入力
 *
 * Task 6.6: 他Agent動作中の挙動設定UIを追加
 * - 待機/スキップの選択
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 8.1, 8.4
 */

import { useState, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { ScheduleTypeSelector } from './ScheduleTypeSelector';
import { WorkflowModeEditor } from './WorkflowModeEditor';
import { AgentBehaviorEditor } from './AgentBehaviorEditor';
import type {
  ScheduleTask,
  ScheduleTaskInput,
  ScheduleWorkflowConfig,
  ScheduleCondition,
  AgentBehavior,
} from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface ScheduleTaskEditPageProps {
  /** Task to edit (null for new task) */
  task: ScheduleTask | null;
  /** Whether this is a new task */
  isNew: boolean;
  /** Called when save button is clicked with valid data */
  onSave: (data: ScheduleTaskInput) => void;
  /** Called when cancel button is clicked */
  onCancel: () => void;
  /** Whether save operation is in progress */
  isSaving?: boolean;
  /** Error message to display */
  error?: string | null;
}

interface FormState {
  name: string;
  schedule: ScheduleCondition;
  workflow: ScheduleWorkflowConfig;
  behavior: AgentBehavior;
}

interface FormErrors {
  name?: string;
}

// =============================================================================
// Default Values
// =============================================================================

/** Default schedule condition */
const DEFAULT_SCHEDULE: ScheduleCondition = {
  type: 'interval',
  hoursInterval: 24,
  waitForIdle: false,
};

/** Default workflow configuration */
const DEFAULT_WORKFLOW_CONFIG: ScheduleWorkflowConfig = {
  enabled: false,
  suffixMode: 'auto',
  customSuffix: undefined,
};

/** Default agent behavior */
const DEFAULT_AGENT_BEHAVIOR: AgentBehavior = 'wait';

/**
 * Create default schedule task input for new tasks
 */
function createDefaultTaskInput(
  name: string,
  schedule: ScheduleCondition,
  workflow: ScheduleWorkflowConfig,
  behavior: AgentBehavior
): ScheduleTaskInput {
  return {
    name,
    enabled: true,
    schedule,
    prompts: [{ order: 0, content: '' }],
    avoidance: { targets: [], behavior: 'skip' },
    workflow,
    behavior,
  };
}

// =============================================================================
// ScheduleTaskEditPage Component
// =============================================================================

export function ScheduleTaskEditPage({
  task,
  isNew,
  onSave,
  onCancel,
  isSaving = false,
  error = null,
}: ScheduleTaskEditPageProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    name: task?.name ?? '',
    schedule: task?.schedule ?? DEFAULT_SCHEDULE,
    workflow: task?.workflow ?? DEFAULT_WORKFLOW_CONFIG,
    behavior: task?.behavior ?? DEFAULT_AGENT_BEHAVIOR,
  });

  // Validation errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Track if fields have been touched (for validation display)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when task changes
  useEffect(() => {
    setFormState({
      name: task?.name ?? '',
      schedule: task?.schedule ?? DEFAULT_SCHEDULE,
      workflow: task?.workflow ?? DEFAULT_WORKFLOW_CONFIG,
      behavior: task?.behavior ?? DEFAULT_AGENT_BEHAVIOR,
    });
    setFormErrors({});
    setTouched({});
  }, [task]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!formState.name.trim()) {
      errors.name = 'タスク名を入力してください';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formState.name]);

  // Handle name change
  const handleNameChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, name: value }));
    // Clear error when user types
    if (formErrors.name) {
      setFormErrors((prev) => ({ ...prev, name: undefined }));
    }
  }, [formErrors.name]);

  // Handle field blur (for validation)
  const handleNameBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, name: true }));
    if (!formState.name.trim()) {
      setFormErrors((prev) => ({ ...prev, name: 'タスク名を入力してください' }));
    }
  }, [formState.name]);

  // Handle schedule change
  const handleScheduleChange = useCallback((schedule: ScheduleCondition) => {
    setFormState((prev) => ({ ...prev, schedule }));
  }, []);

  // Handle workflow config change
  const handleWorkflowChange = useCallback((workflow: ScheduleWorkflowConfig) => {
    setFormState((prev) => ({ ...prev, workflow }));
  }, []);

  // Handle agent behavior change
  const handleBehaviorChange = useCallback((behavior: AgentBehavior) => {
    setFormState((prev) => ({ ...prev, behavior }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateForm()) return;

    if (isNew) {
      // Create new task with default values
      const newTask = createDefaultTaskInput(
        formState.name.trim(),
        formState.schedule,
        formState.workflow,
        formState.behavior
      );
      onSave(newTask);
    } else if (task) {
      // Update existing task
      const updatedTask: ScheduleTaskInput = {
        name: formState.name.trim(),
        enabled: task.enabled,
        schedule: formState.schedule,
        prompts: [...task.prompts],
        avoidance: task.avoidance,
        workflow: formState.workflow,
        behavior: formState.behavior,
      };
      onSave(updatedTask);
    }
  }, [validateForm, isNew, task, formState.name, formState.schedule, formState.workflow, formState.behavior, onSave]);

  // Check if form is valid
  const isFormValid = formState.name.trim().length > 0;

  // Determine button text
  const saveButtonText = isNew ? '作成' : '更新';

  return (
    <div data-testid="schedule-task-edit-page" className="space-y-6">
      {/* Form Section */}
      <div data-testid="schedule-task-form" className="space-y-4">
        {/* Task Name Field */}
        <div>
          <label
            htmlFor="task-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            タスク名 <span className="text-red-500">*</span>
          </label>
          <input
            id="task-name"
            type="text"
            data-testid="task-name-input"
            value={formState.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={handleNameBlur}
            disabled={isSaving}
            placeholder="タスク名を入力..."
            className={clsx(
              'w-full px-3 py-2 rounded-md',
              'bg-gray-50 dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'border',
              formErrors.name && touched.name
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50'
            )}
          />
          {formErrors.name && touched.name && (
            <p
              data-testid="name-error"
              className="mt-1 text-sm text-red-500"
            >
              {formErrors.name}
            </p>
          )}
        </div>

        {/* Schedule Type Settings (Task 6.2) */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <ScheduleTypeSelector
            value={formState.schedule}
            onChange={handleScheduleChange}
            disabled={isSaving}
          />
        </div>

        {/* Placeholder for future form fields (Tasks 6.3-6.4) */}
        <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            プロンプト、回避ルール等はTask 6.3-6.4で実装予定
          </p>
        </div>

        {/* Agent Behavior Settings (Task 6.6) */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <AgentBehaviorEditor
            value={formState.behavior}
            onChange={handleBehaviorChange}
            disabled={isSaving}
          />
        </div>

        {/* Workflow Mode Settings (Task 6.5) */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <WorkflowModeEditor
            value={formState.workflow}
            onChange={handleWorkflowChange}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          data-testid="save-error"
          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Actions Section */}
      <div data-testid="schedule-task-actions" className="flex justify-end gap-3">
        <Button
          data-testid="cancel-button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          キャンセル
        </Button>
        <Button
          data-testid="save-button"
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || !isFormValid}
          className="flex items-center gap-2"
        >
          {isSaving && (
            <Loader2
              data-testid="saving-indicator"
              className="w-4 h-4 animate-spin"
            />
          )}
          {isSaving ? '保存中...' : saveButtonText}
        </Button>
      </div>
    </div>
  );
}

export default ScheduleTaskEditPage;
