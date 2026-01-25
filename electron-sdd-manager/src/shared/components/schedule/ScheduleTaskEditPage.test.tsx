/**
 * ScheduleTaskEditPage Component Tests
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ScheduleTaskEditPage } from './ScheduleTaskEditPage';
import type { ScheduleTask } from '../../types/scheduleTask';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockTask = (overrides?: Partial<ScheduleTask>): ScheduleTask => ({
  id: 'test-task-id-123',
  name: 'テストタスク',
  enabled: true,
  schedule: { type: 'interval', hoursInterval: 24, waitForIdle: false },
  prompts: [{ order: 0, content: 'test prompt' }],
  avoidance: { targets: [], behavior: 'skip' },
  workflow: { enabled: false },
  behavior: 'wait',
  lastExecutedAt: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('ScheduleTaskEditPage', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ===========================================================================
  // Requirement 2.1: Spec/Bug新規作成と同様のレイアウト
  // ===========================================================================

  describe('Layout (Requirement 2.1)', () => {
    it('should render with similar layout to CreateSpecDialog/CreateBugDialog', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Form container should exist
      expect(screen.getByTestId('schedule-task-edit-page')).toBeInTheDocument();

      // Should have form fields section
      expect(screen.getByTestId('schedule-task-form')).toBeInTheDocument();

      // Should have actions section (save/cancel buttons)
      expect(screen.getByTestId('schedule-task-actions')).toBeInTheDocument();
    });

    it('should have task name input field', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should have required indicator on task name label', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Task name is required per Requirement 2.2
      const label = screen.getByText(/タスク名/);
      expect(label).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Requirement 2.3: 新規作成時の空フォーム表示
  // ===========================================================================

  describe('New Task Mode (Requirement 2.3)', () => {
    it('should render empty form for new task', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      expect(nameInput).toHaveValue('');
    });

    it('should show "新規作成" in save button for new task', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toHaveTextContent('作成');
    });
  });

  // ===========================================================================
  // Edit Mode
  // ===========================================================================

  describe('Edit Mode', () => {
    it('should populate form with existing task data in edit mode', () => {
      const task = createMockTask({ name: '既存タスク' });

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      expect(nameInput).toHaveValue('既存タスク');
    });

    it('should show "更新" in save button for existing task', () => {
      const task = createMockTask();

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toHaveTextContent('更新');
    });
  });

  // ===========================================================================
  // Requirement 2.4: バリデーションと保存
  // ===========================================================================

  describe('Validation and Save (Requirement 2.4)', () => {
    it('should disable save button when task name is empty', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when task name is provided', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();
    });

    it('should call onSave with form data when save button is clicked', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新しいタスク',
        })
      );
    });

    it('should call onSave with updated data in edit mode', () => {
      const task = createMockTask({ name: '既存タスク' });

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '更新されたタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '更新されたタスク',
        })
      );
    });

    it('should show validation error when trying to save with empty name', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Type something then clear it
      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: 'test' } });
      fireEvent.change(nameInput, { target: { value: '' } });

      // Trigger validation by blur
      fireEvent.blur(nameInput);

      // Error message should appear
      expect(screen.getByTestId('name-error')).toBeInTheDocument();
      expect(screen.getByTestId('name-error')).toHaveTextContent('タスク名を入力してください');
    });
  });

  // ===========================================================================
  // Cancel Operation
  // ===========================================================================

  describe('Cancel Operation', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should not call onSave when cancel button is clicked', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('should disable form when isSaving is true', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={true}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      expect(nameInput).toBeDisabled();

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('should show loading indicator when isSaving is true', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={true}
        />
      );

      expect(screen.getByTestId('saving-indicator')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          error="保存に失敗しました"
        />
      );

      const errorMessage = screen.getByTestId('save-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('保存に失敗しました');
    });
  });

  // ===========================================================================
  // Default Values (for integration with Task 6.2+)
  // ===========================================================================

  describe('Default Values for New Task', () => {
    it('should include default values when creating new task', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include default values for required fields
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新しいタスク',
          enabled: true, // Default enabled
          // Other fields will have defaults set by the component
        })
      );
    });
  });

  // ===========================================================================
  // Workflow Mode Integration (Task 6.5, Requirements 8.1, 8.4)
  // ===========================================================================

  describe('Workflow Mode Integration (Requirements 8.1, 8.4)', () => {
    it('should render WorkflowModeEditor component', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // WorkflowModeEditor should be rendered
      expect(screen.getByTestId('workflow-mode-editor')).toBeInTheDocument();
    });

    it('should include default workflow config in saved data for new task', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include default workflow config
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: expect.objectContaining({
            enabled: false,
            suffixMode: 'auto',
          }),
        })
      );
    });

    it('should preserve workflow config from existing task in edit mode', () => {
      const task = createMockTask({
        workflow: {
          enabled: true,
          suffixMode: 'custom',
          customSuffix: 'my-suffix',
        },
      });

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should preserve the existing workflow config
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: {
            enabled: true,
            suffixMode: 'custom',
            customSuffix: 'my-suffix',
          },
        })
      );
    });

    it('should update workflow config when WorkflowModeEditor changes', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Enable workflow mode
      const workflowToggle = screen.getByTestId('workflow-mode-toggle');
      fireEvent.click(workflowToggle);

      // Fill in name and save
      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include updated workflow config with enabled: true
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it('should disable WorkflowModeEditor when saving', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={true}
        />
      );

      // WorkflowModeEditor toggle should be disabled
      const workflowToggle = screen.getByTestId('workflow-mode-toggle');
      expect(workflowToggle).toBeDisabled();
    });
  });

  // ===========================================================================
  // Schedule Type Integration (Task 6.2, Requirements 3.1, 3.2, 3.3, 4.1, 4.2)
  // ===========================================================================

  describe('Schedule Type Integration (Requirements 3.1, 3.2, 3.3, 4.1, 4.2)', () => {
    it('should render ScheduleTypeSelector component', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // ScheduleTypeSelector should be rendered
      expect(screen.getByTestId('schedule-type-selector')).toBeInTheDocument();
    });

    it('should include default schedule in saved data for new task', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include default schedule (interval 24 hours)
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: expect.objectContaining({
            type: 'interval',
            hoursInterval: 24,
            waitForIdle: false,
          }),
        })
      );
    });

    it('should preserve schedule from existing task in edit mode', () => {
      const task = createMockTask({
        schedule: {
          type: 'weekly',
          weekdays: [1, 3, 5],
          hourOfDay: 10,
          waitForIdle: true,
        },
      });

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should preserve the existing schedule
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: {
            type: 'weekly',
            weekdays: [1, 3, 5],
            hourOfDay: 10,
            waitForIdle: true,
          },
        })
      );
    });

    it('should update schedule when ScheduleTypeSelector changes', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Change to conditional (idle) schedule
      const conditionalTab = screen.getByTestId('category-conditional');
      fireEvent.click(conditionalTab);

      // Fill in name and save
      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include idle schedule
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: expect.objectContaining({
            type: 'idle',
          }),
        })
      );
    });

    it('should disable ScheduleTypeSelector when saving', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={true}
        />
      );

      // Category buttons should be disabled
      expect(screen.getByTestId('category-fixed')).toBeDisabled();
      expect(screen.getByTestId('category-conditional')).toBeDisabled();
    });

    it('should update hours interval and include in saved data', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Change hours interval
      const hoursInput = screen.getByTestId('hours-interval-input');
      fireEvent.change(hoursInput, { target: { value: '48' } });

      // Fill in name and save
      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include updated hours interval
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: expect.objectContaining({
            type: 'interval',
            hoursInterval: 48,
          }),
        })
      );
    });

    it('should use shortcut button and include in saved data', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Click weekly shortcut
      const weeklyShortcut = screen.getByTestId('shortcut-weekly');
      fireEvent.click(weeklyShortcut);

      // Fill in name and save
      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include 168 hours (weekly)
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: expect.objectContaining({
            type: 'interval',
            hoursInterval: 168,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // Agent Behavior Integration (Task 6.6, Requirement 2.2)
  // ===========================================================================

  describe('Agent Behavior Integration (Requirement 2.2)', () => {
    it('should render AgentBehaviorEditor component', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // AgentBehaviorEditor should be rendered
      expect(screen.getByTestId('agent-behavior-editor')).toBeInTheDocument();
    });

    it('should include default behavior in saved data for new task', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include default behavior ('wait')
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'wait',
        })
      );
    });

    it('should preserve behavior from existing task in edit mode', () => {
      const task = createMockTask({
        behavior: 'skip',
      });

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should preserve the existing behavior
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'skip',
        })
      );
    });

    it('should update behavior when AgentBehaviorEditor changes', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Change behavior to skip
      const skipRadio = screen.getByTestId('agent-behavior-skip');
      fireEvent.click(skipRadio);

      // Fill in name and save
      const nameInput = screen.getByTestId('task-name-input');
      fireEvent.change(nameInput, { target: { value: '新しいタスク' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      // Should include updated behavior
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'skip',
        })
      );
    });

    it('should disable AgentBehaviorEditor when saving', () => {
      render(
        <ScheduleTaskEditPage
          task={null}
          isNew={true}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSaving={true}
        />
      );

      // AgentBehaviorEditor radios should be disabled
      expect(screen.getByTestId('agent-behavior-wait')).toBeDisabled();
      expect(screen.getByTestId('agent-behavior-skip')).toBeDisabled();
    });

    it('should reflect initial behavior value from existing task', () => {
      const task = createMockTask({
        behavior: 'skip',
      });

      render(
        <ScheduleTaskEditPage
          task={task}
          isNew={false}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Skip should be selected
      const skipRadio = screen.getByTestId('agent-behavior-skip');
      const waitRadio = screen.getByTestId('agent-behavior-wait');

      expect(skipRadio).toBeChecked();
      expect(waitRadio).not.toBeChecked();
    });
  });
});
