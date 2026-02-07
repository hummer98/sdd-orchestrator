/**
 * ScheduleTaskSettingView Component
 * Dialog for managing schedule tasks - list view with slide navigation to edit
 *
 * Task 5.1: ScheduleTaskSettingViewを作成
 * - ダイアログ全体のレイアウト
 * - ヘッダー（タスク追加ボタン）、リスト、フッターの構成
 * - スライドナビゲーションの管理
 *
 * Task 5.2: ScheduleTaskListItem統合
 * - 完全な機能を持つリストアイテムの統合
 *
 * Requirements: 1.1, 1.2, 1.4
 */

import { useCallback, useState, useEffect } from 'react';
import { X, Plus, ArrowLeft, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useScheduleTaskStore, type ScheduleTaskElectronAPI } from '../../stores/scheduleTaskStore';
import { ScheduleTaskListItem } from './ScheduleTaskListItem';
import { ScheduleTaskEditPage } from './ScheduleTaskEditPage';
import type { ScheduleTask, ScheduleTaskInput, ScheduleTaskServiceError, QueuedTask, RunningTaskInfo } from '../../types/scheduleTask';

// =============================================================================
// Error Message Helper
// =============================================================================

/**
 * Convert ScheduleTaskServiceError to user-friendly message
 */
function getErrorMessage(error: ScheduleTaskServiceError): string {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return error.errors.map(e => `${e.field}: ${e.message}`).join(', ');
    case 'TASK_NOT_FOUND':
      return `タスクが見つかりません: ${error.taskId}`;
    case 'DUPLICATE_TASK_NAME':
      return `タスク名が重複しています: ${error.taskName}`;
    default:
      return '不明なエラーが発生しました';
  }
}

// =============================================================================
// tRPC Schedule Task API Helper
// trpc-full-migration Task 11.4: Replaced window.electronAPI bridge with tRPC vanilla client
// =============================================================================

import { getVanillaClient } from '../../trpc/vanillaClient';

/**
 * Get schedule task API backed by tRPC vanilla client
 * This function bridges shared component with tRPC schedule router
 */
function getScheduleTaskAPI(): ScheduleTaskElectronAPI | null {
  try {
    const client = getVanillaClient();
    return {
      scheduleTaskGetAll: (projectPath: string) =>
        client.schedule.getAll.query({ projectPath }) as unknown as Promise<ScheduleTask[]>,
      scheduleTaskGet: (projectPath: string, taskId: string) =>
        client.schedule.get.query({ projectPath, taskId }) as unknown as Promise<ScheduleTask | null>,
      scheduleTaskCreate: (projectPath: string, task: ScheduleTaskInput) =>
        client.schedule.create.mutate({ projectPath, task }) as any,
      scheduleTaskUpdate: (projectPath: string, taskId: string, updates: Partial<ScheduleTaskInput>) =>
        client.schedule.update.mutate({ projectPath, taskId, updates }) as any,
      scheduleTaskDelete: (projectPath: string, taskId: string) =>
        client.schedule.delete.mutate({ projectPath, taskId }) as any,
      scheduleTaskExecuteImmediately: (projectPath: string, taskId: string, force?: boolean) =>
        client.schedule.executeImmediately.mutate({ projectPath, taskId, force }) as any,
      scheduleTaskGetQueue: (projectPath: string) =>
        client.schedule.getQueue.query({ projectPath }) as unknown as Promise<QueuedTask[]>,
      scheduleTaskGetRunning: (projectPath: string) =>
        client.schedule.getRunning.query({ projectPath }) as unknown as Promise<RunningTaskInfo[]>,
      onScheduleTaskStatusChanged: () => () => {
        // tRPC Subscriptionに移行済み (Task 9.2)
        // この関数はnoop - イベントリスナーはtRPC Subscription経由
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get current project path from projectStore via window.__STORES__
 */
function getCurrentProjectPath(): string | null {
  if (typeof window !== 'undefined' && '__STORES__' in window) {
    const stores = (window as any).__STORES__;
    return stores?.project?.getState()?.currentProject ?? null;
  }
  return null;
}

// =============================================================================
// Types
// =============================================================================

export interface ScheduleTaskSettingViewProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
}


// =============================================================================
// ScheduleTaskHeader Component
// =============================================================================

interface ScheduleTaskHeaderProps {
  isEditMode: boolean;
  onAddClick: () => void;
  onBackClick: () => void;
  onCloseClick: () => void;
}

function ScheduleTaskHeader({
  isEditMode,
  onAddClick,
  onBackClick,
  onCloseClick,
}: ScheduleTaskHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isEditMode && (
          <button
            onClick={onBackClick}
            aria-label="戻る"
            className={clsx(
              'p-1 rounded-md',
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <ModalTitle id="schedule-task-dialog-title">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            スケジュールタスク
          </div>
        </ModalTitle>
      </div>
      <div className="flex items-center gap-2">
        {!isEditMode && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddClick}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            タスク追加
          </Button>
        )}
        <button
          onClick={onCloseClick}
          aria-label="閉じる"
          className={clsx(
            'p-1 rounded-md',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors'
          )}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}


// =============================================================================
// ScheduleTaskList Component
// =============================================================================

interface ScheduleTaskListProps {
  tasks: ScheduleTask[];
  isLoading: boolean;
  onTaskClick: (task: ScheduleTask) => void;
  onToggleEnabled: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onExecuteImmediately: (taskId: string) => void;
}

function ScheduleTaskList({
  tasks,
  isLoading,
  onTaskClick,
  onToggleEnabled,
  onDelete,
  onExecuteImmediately,
}: ScheduleTaskListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
        <p className="text-gray-500 dark:text-gray-400">
          読み込み中...
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        data-testid="schedule-task-list"
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          スケジュールタスクがありません
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          「タスク追加」ボタンから新しいタスクを作成してください
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="schedule-task-list"
      className="space-y-3 overflow-y-auto max-h-[60vh]"
    >
      {tasks.map((task) => (
        <ScheduleTaskListItem
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task)}
          onToggleEnabled={onToggleEnabled}
          onDelete={onDelete}
          onExecuteImmediately={onExecuteImmediately}
        />
      ))}
    </div>
  );
}

// =============================================================================
// ScheduleTaskFooter Component
// =============================================================================

interface ScheduleTaskFooterProps {
  onClose: () => void;
}

function ScheduleTaskFooter({ onClose }: ScheduleTaskFooterProps) {
  return (
    <div className="flex justify-end">
      <Button variant="secondary" onClick={onClose}>
        閉じる
      </Button>
    </div>
  );
}

// =============================================================================
// DeleteConfirmDialog Component
// Requirement 1.5: 削除確認ダイアログ
// =============================================================================

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  taskName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({ isOpen, taskName, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="delete-confirm-dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          タスクを削除しますか?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          「{taskName}」を削除します。この操作は取り消せません。
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            削除
          </Button>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// ScheduleTaskSettingView Component
// =============================================================================

export function ScheduleTaskSettingView({
  isOpen,
  onClose,
}: ScheduleTaskSettingViewProps) {
  const {
    tasks,
    editingTask,
    isCreatingNew,
    isLoading,
    startEditing,
    startNewTask,
    cancelEditing,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskEnabled,
    executeImmediately,
  } = useScheduleTaskStore();

  // Local state for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ScheduleTask | null>(null);

  // Local state for save operation
  // Task 6.1: Save/cancel operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load tasks when dialog opens
  useEffect(() => {
    if (isOpen) {
      const api = getScheduleTaskAPI();
      const projectPath = getCurrentProjectPath();
      if (api && projectPath) {
        loadTasks(api, projectPath);
      }
    }
  }, [isOpen, loadTasks]);

  // Determine if we're in edit mode (editing existing or creating new)
  const isEditMode = editingTask !== null || isCreatingNew;

  // Handle task item click
  const handleTaskClick = useCallback(
    (task: ScheduleTask) => {
      startEditing(task);
    },
    [startEditing]
  );

  // Handle add button click
  const handleAddClick = useCallback(() => {
    startNewTask();
  }, [startNewTask]);

  // Handle back button click
  const handleBackClick = useCallback(() => {
    setSaveError(null);
    cancelEditing();
  }, [cancelEditing]);

  // Handle close - cancel editing if in edit mode
  const handleClose = useCallback(() => {
    if (isEditMode) {
      cancelEditing();
    }
    setSaveError(null);
    onClose();
  }, [isEditMode, cancelEditing, onClose]);

  // Handle toggle enabled
  const handleToggleEnabled = useCallback(async (taskId: string) => {
    const api = getScheduleTaskAPI();
    if (!api) {
      console.error('[ScheduleTaskSettingView] API not available');
      return;
    }
    await toggleTaskEnabled(api, taskId);
  }, [toggleTaskEnabled]);

  // Handle delete request - show confirmation dialog
  // Requirement 1.5: 削除確認ダイアログ
  const handleDeleteRequest = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setDeleteTarget(task);
    }
  }, [tasks]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) {
      const api = getScheduleTaskAPI();
      if (!api) {
        console.error('[ScheduleTaskSettingView] API not available');
        setDeleteTarget(null);
        return;
      }
      const result = await deleteTask(api, deleteTarget.id);
      if (!result.ok) {
        console.error('[ScheduleTaskSettingView] Delete failed:', result.error);
      }
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteTask]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // Handle immediate execution
  // Requirement 7.1: 即時実行ボタン
  const handleExecuteImmediately = useCallback(async (taskId: string) => {
    const api = getScheduleTaskAPI();
    if (!api) {
      console.error('[ScheduleTaskSettingView] API not available');
      return;
    }
    // TODO: ImmediateExecutionWarningDialog integration (Task 5.3)
    const result = await executeImmediately(api, taskId, false);
    if (!result.ok) {
      console.error('[ScheduleTaskSettingView] Execute immediately failed:', result.error);
    }
  }, [executeImmediately]);

  // Handle save from edit page
  // Task 6.1: Requirement 2.4 - Save operation
  const handleSave = useCallback(async (data: ScheduleTaskInput) => {
    setIsSaving(true);
    setSaveError(null);

    const api = getScheduleTaskAPI();
    if (!api) {
      setSaveError('API not available');
      setIsSaving(false);
      return;
    }

    try {
      if (isCreatingNew) {
        const result = await createTask(api, data);
        if (!result.ok) {
          setSaveError(getErrorMessage(result.error));
          setIsSaving(false);
          return;
        }
      } else if (editingTask) {
        const result = await updateTask(api, editingTask.id, data);
        if (!result.ok) {
          setSaveError(getErrorMessage(result.error));
          setIsSaving(false);
          return;
        }
      }
      setIsSaving(false);
      // Note: cancelEditing is called inside createTask/updateTask on success
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      setIsSaving(false);
    }
  }, [isCreatingNew, editingTask, createTask, updateTask]);

  // Handle cancel from edit page
  const handleEditCancel = useCallback(() => {
    setSaveError(null);
    cancelEditing();
  }, [cancelEditing]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="4xl"
        aria-labelledby="schedule-task-dialog-title"
      >
        <ModalHeader>
          <ScheduleTaskHeader
            isEditMode={isEditMode}
            onAddClick={handleAddClick}
            onBackClick={handleBackClick}
            onCloseClick={handleClose}
          />
        </ModalHeader>

        <ModalContent>
          {isEditMode ? (
            <ScheduleTaskEditPage
              task={editingTask}
              isNew={isCreatingNew}
              onSave={handleSave}
              onCancel={handleEditCancel}
              isSaving={isSaving}
              error={saveError}
            />
          ) : (
            <ScheduleTaskList
              tasks={tasks}
              isLoading={isLoading}
              onTaskClick={handleTaskClick}
              onToggleEnabled={handleToggleEnabled}
              onDelete={handleDeleteRequest}
              onExecuteImmediately={handleExecuteImmediately}
            />
          )}
        </ModalContent>

        {!isEditMode && (
          <ModalFooter>
            <ScheduleTaskFooter onClose={handleClose} />
          </ModalFooter>
        )}
      </Modal>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        taskName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
