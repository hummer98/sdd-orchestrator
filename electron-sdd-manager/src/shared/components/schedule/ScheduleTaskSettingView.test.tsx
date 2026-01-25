/**
 * ScheduleTaskSettingView Component Tests
 * TDD: Testing schedule task setting dialog view
 *
 * Task 5.1: ScheduleTaskSettingViewを作成
 * - ダイアログ全体のレイアウト
 * - ヘッダー（タスク追加ボタン）、リスト、フッターの構成
 * - スライドナビゲーションの管理
 *
 * Requirements: 1.1, 1.2, 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ScheduleTaskSettingView } from './ScheduleTaskSettingView';
import { useScheduleTaskStore, resetScheduleTaskStore } from '../../stores/scheduleTaskStore';
import type { ScheduleTask } from '../../types/scheduleTask';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockTask = (overrides: Partial<ScheduleTask> = {}): ScheduleTask => ({
  id: 'task-1',
  name: 'Test Task',
  enabled: true,
  schedule: {
    type: 'interval',
    hoursInterval: 24,
    waitForIdle: false,
  },
  prompts: [{ order: 0, content: '/kiro:steering' }],
  avoidance: {
    targets: [],
    behavior: 'wait',
  },
  workflow: {
    enabled: false,
  },
  behavior: 'wait',
  lastExecutedAt: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const mockTasks: ScheduleTask[] = [
  createMockTask({ id: 'task-1', name: 'Task One' }),
  createMockTask({ id: 'task-2', name: 'Task Two', enabled: false }),
  createMockTask({
    id: 'task-3',
    name: 'Task Three',
    schedule: { type: 'weekly', weekdays: [1, 3, 5], hourOfDay: 9, waitForIdle: true },
  }),
];

// =============================================================================
// Test Setup
// =============================================================================

describe('ScheduleTaskSettingView', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resetScheduleTaskStore();
  });

  // ===========================================================================
  // Requirement 1.1: ダイアログ表示
  // ===========================================================================
  describe('Requirement 1.1: Dialog visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<ScheduleTaskSettingView isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render dialog title "スケジュールタスク"', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('スケジュールタスク')).toBeInTheDocument();
    });

    it('should close dialog when backdrop is clicked', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close dialog when close button is clicked', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('閉じる');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Requirement 1.2: ScheduleTaskSettingView構成
  // ===========================================================================
  describe('Requirement 1.2: ScheduleTaskSettingView structure', () => {
    it('should render ScheduleTaskHeader with add button', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      // Header should contain "タスク追加" or "+" button
      expect(screen.getByRole('button', { name: /タスク追加|新規タスク/i })).toBeInTheDocument();
    });

    it('should render ScheduleTaskList area', () => {
      useScheduleTaskStore.setState({ tasks: mockTasks });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      // Should display task list with task names
      expect(screen.getByText('Task One')).toBeInTheDocument();
      expect(screen.getByText('Task Two')).toBeInTheDocument();
      expect(screen.getByText('Task Three')).toBeInTheDocument();
    });

    it('should render empty state message when no tasks exist', () => {
      useScheduleTaskStore.setState({ tasks: [] });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText(/スケジュールタスクがありません/i)).toBeInTheDocument();
    });

    it('should render ScheduleTaskFooter with close button', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      // Footer should have close button (text button, not icon)
      // The header has an icon close button (aria-label="閉じる") and footer has text "閉じる"
      const closeButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('閉じる')
      );
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Requirement 1.4: スライドナビゲーション
  // ===========================================================================
  describe('Requirement 1.4: Slide navigation', () => {
    it('should show list view by default', () => {
      useScheduleTaskStore.setState({ tasks: mockTasks });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      // List view should be visible
      expect(screen.getByText('Task One')).toBeInTheDocument();
      // Edit page should not be visible
      expect(screen.queryByTestId('schedule-task-edit-page')).not.toBeInTheDocument();
    });

    it('should navigate to edit page when task item is clicked', () => {
      useScheduleTaskStore.setState({ tasks: mockTasks });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Click on a task
      const taskItem = screen.getByText('Task One').closest('[data-testid="schedule-task-list-item"]');
      expect(taskItem).toBeInTheDocument();
      fireEvent.click(taskItem!);

      // Should start editing
      const { editingTask } = useScheduleTaskStore.getState();
      expect(editingTask).not.toBeNull();
      expect(editingTask?.name).toBe('Task One');
    });

    it('should navigate to edit page when add button is clicked', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Click add button
      const addButton = screen.getByRole('button', { name: /タスク追加|新規タスク/i });
      fireEvent.click(addButton);

      // Should be in new task creation mode
      const { isCreatingNew, editingTask } = useScheduleTaskStore.getState();
      expect(isCreatingNew).toBe(true);
      expect(editingTask).toBeNull();
    });

    it('should show back button when in edit mode', () => {
      useScheduleTaskStore.setState({
        tasks: mockTasks,
        editingTask: mockTasks[0],
        isCreatingNew: false,
      });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Back button should be visible in edit mode
      expect(screen.getByLabelText(/戻る/i)).toBeInTheDocument();
    });

    it('should return to list view when back button is clicked', () => {
      useScheduleTaskStore.setState({
        tasks: mockTasks,
        editingTask: mockTasks[0],
        isCreatingNew: false,
      });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Click back button
      const backButton = screen.getByLabelText(/戻る/i);
      fireEvent.click(backButton);

      // Should return to list view
      const { editingTask, isCreatingNew } = useScheduleTaskStore.getState();
      expect(editingTask).toBeNull();
      expect(isCreatingNew).toBe(false);
    });

    it('should show back button when in new task creation mode', () => {
      useScheduleTaskStore.setState({
        tasks: mockTasks,
        editingTask: null,
        isCreatingNew: true,
      });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Back button should be visible in creation mode
      expect(screen.getByLabelText(/戻る/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // State Management Integration
  // ===========================================================================
  describe('State management integration', () => {
    it('should read tasks from scheduleTaskStore', () => {
      useScheduleTaskStore.setState({ tasks: mockTasks });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // All tasks should be rendered
      expect(screen.getByText('Task One')).toBeInTheDocument();
      expect(screen.getByText('Task Two')).toBeInTheDocument();
      expect(screen.getByText('Task Three')).toBeInTheDocument();
    });

    it('should update when store state changes', () => {
      const { rerender } = render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Initially no tasks
      expect(screen.getByText(/スケジュールタスクがありません/i)).toBeInTheDocument();

      // Add tasks to store - wrap in act() to avoid React warning
      act(() => {
        useScheduleTaskStore.setState({ tasks: mockTasks });
      });
      rerender(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Tasks should appear
      expect(screen.getByText('Task One')).toBeInTheDocument();
    });

    it('should call cancelEditing when dialog is closed while editing', () => {
      useScheduleTaskStore.setState({
        tasks: mockTasks,
        editingTask: mockTasks[0],
        isCreatingNew: false,
      });
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Close the dialog via close button
      const closeButton = screen.getByLabelText('閉じる');
      fireEvent.click(closeButton);

      // Editing state should be cleared
      const { editingTask, isCreatingNew } = useScheduleTaskStore.getState();
      expect(editingTask).toBeNull();
      expect(isCreatingNew).toBe(false);
    });
  });

  // ===========================================================================
  // Dialog Layout & Styling
  // ===========================================================================
  describe('Dialog layout and styling', () => {
    it('should have appropriate max-width for dialog', () => {
      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);
      const dialogContainer = screen.getByTestId('modal-container');
      // Should have reasonable max-width (not too narrow)
      expect(dialogContainer.className).toMatch(/max-w-(lg|xl|2xl)/);
    });

    it('should have proper overflow handling for task list', () => {
      // Create many tasks to test scrolling
      const manyTasks = Array.from({ length: 20 }, (_, i) =>
        createMockTask({ id: `task-${i}`, name: `Task ${i}` })
      );
      useScheduleTaskStore.setState({ tasks: manyTasks });

      render(<ScheduleTaskSettingView isOpen={true} onClose={mockOnClose} />);

      // Task list container should have overflow handling
      const listContainer = screen.getByTestId('schedule-task-list');
      expect(listContainer.className).toContain('overflow');
    });
  });
});
