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

import { useCallback, useState } from 'react';
import { X, Plus, ArrowLeft, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useScheduleTaskStore } from '../../stores/scheduleTaskStore';
import { ScheduleTaskListItem } from './ScheduleTaskListItem';
import { ScheduleTaskEditPage } from './ScheduleTaskEditPage';
import type { ScheduleTask, ScheduleTaskInput } from '../../types/scheduleTask';

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
  onTaskClick: (task: ScheduleTask) => void;
  onToggleEnabled: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onExecuteImmediately: (taskId: string) => void;
}

function ScheduleTaskList({
  tasks,
  onTaskClick,
  onToggleEnabled,
  onDelete,
  onExecuteImmediately,
}: ScheduleTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
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
    startEditing,
    startNewTask,
    cancelEditing,
  } = useScheduleTaskStore();

  // Local state for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ScheduleTask | null>(null);

  // Local state for save operation
  // Task 6.1: Save/cancel operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Handle toggle enabled - placeholder (requires API integration)
  const handleToggleEnabled = useCallback((taskId: string) => {
    // TODO: Integrate with scheduleTaskStore.toggleTaskEnabled when API is connected
    console.log('[ScheduleTaskSettingView] Toggle enabled:', taskId);
  }, []);

  // Handle delete request - show confirmation dialog
  // Requirement 1.5: 削除確認ダイアログ
  const handleDeleteRequest = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setDeleteTarget(task);
    }
  }, [tasks]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      // TODO: Integrate with scheduleTaskStore.deleteTask when API is connected
      console.log('[ScheduleTaskSettingView] Delete confirmed:', deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // Handle immediate execution - placeholder (requires API integration)
  // Requirement 7.1: 即時実行ボタン
  const handleExecuteImmediately = useCallback((taskId: string) => {
    // TODO: Integrate with scheduleTaskStore.executeImmediately when API is connected
    // This will need ImmediateExecutionWarningDialog integration (Task 5.3)
    console.log('[ScheduleTaskSettingView] Execute immediately:', taskId);
  }, []);

  // Handle save from edit page
  // Task 6.1: Requirement 2.4 - Save operation
  const handleSave = useCallback((data: ScheduleTaskInput) => {
    setIsSaving(true);
    setSaveError(null);

    // TODO: Integrate with scheduleTaskStore.createTask/updateTask when API is connected
    // For now, just log and close
    console.log('[ScheduleTaskSettingView] Save:', isCreatingNew ? 'create' : 'update', data);

    // Simulate async operation
    setTimeout(() => {
      setIsSaving(false);
      cancelEditing();
    }, 100);
  }, [isCreatingNew, cancelEditing]);

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
