/**
 * ScheduleTaskListItem Component Tests
 * TDD: Testing schedule task list item with all interactive features
 *
 * Task 5.2: ScheduleTaskListItemを作成
 * - タスク名、スケジュール種別、次回実行予定、最終実行日時の表示
 * - 有効/無効トグル（インライン）
 * - 削除アイコン
 * - 即時実行ボタン
 * - クリックで編集画面へ遷移
 *
 * Requirements: 1.3, 1.5, 1.6, 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleTaskListItem } from './ScheduleTaskListItem';
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

// =============================================================================
// Test Setup
// =============================================================================

describe('ScheduleTaskListItem', () => {
  const mockOnClick = vi.fn();
  const mockOnToggleEnabled = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnExecuteImmediately = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Requirement 1.3: ScheduleTaskListItem情報表示
  // ===========================================================================
  describe('Requirement 1.3: Task information display', () => {
    it('should render task name', () => {
      const task = createMockTask({ name: 'My Schedule Task' });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      expect(screen.getByText('My Schedule Task')).toBeInTheDocument();
    });

    it('should render schedule type for interval schedule', () => {
      const task = createMockTask({
        schedule: { type: 'interval', hoursInterval: 24, waitForIdle: false },
      });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Should show something like "24時間ごと"
      expect(screen.getByText(/24時間ごと/)).toBeInTheDocument();
    });

    it('should render schedule type for weekly schedule', () => {
      const task = createMockTask({
        schedule: { type: 'weekly', weekdays: [1, 3, 5], hourOfDay: 9, waitForIdle: false },
      });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Should show weekdays and hour
      expect(screen.getByText(/毎週.*月.*水.*金.*9時/)).toBeInTheDocument();
    });

    it('should render schedule type for idle schedule', () => {
      const task = createMockTask({
        schedule: { type: 'idle', idleMinutes: 30 },
      });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Should show idle minutes
      expect(screen.getByText(/アイドル30分後/)).toBeInTheDocument();
    });

    it('should render last executed time when available', () => {
      const oneHourAgo = Date.now() - 1000 * 60 * 60;
      const task = createMockTask({ lastExecutedAt: oneHourAgo });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Should show relative time (e.g., "1時間前")
      expect(screen.getByText(/最終実行:/)).toBeInTheDocument();
    });

    it('should render "未実行" when never executed', () => {
      const task = createMockTask({ lastExecutedAt: null });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      expect(screen.getByText(/未実行/)).toBeInTheDocument();
    });

    it('should render next execution time when calculable', () => {
      // For interval-based tasks, we can calculate next execution
      const oneHourAgo = Date.now() - 1000 * 60 * 60;
      const task = createMockTask({
        schedule: { type: 'interval', hoursInterval: 2, waitForIdle: false },
        lastExecutedAt: oneHourAgo,
      });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Should show next execution info
      expect(screen.getByText(/次回:/)).toBeInTheDocument();
    });

    it('should show disabled visual state when task is disabled', () => {
      const task = createMockTask({ enabled: false, name: 'Disabled Task' });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Task name should have disabled styling or badge
      const taskName = screen.getByText('Disabled Task');
      // Check for grayed out text or disabled badge
      expect(
        taskName.className.includes('text-gray') ||
        screen.queryByText(/無効/) !== null
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Requirement 1.6: 有効/無効トグル即時更新
  // ===========================================================================
  describe('Requirement 1.6: Enable/disable toggle', () => {
    it('should render toggle switch', () => {
      const task = createMockTask({ enabled: true });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const toggle = screen.getByRole('switch') || screen.getByTestId('enabled-toggle');
      expect(toggle).toBeInTheDocument();
    });

    it('should show toggle as ON when task is enabled', () => {
      const task = createMockTask({ enabled: true });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const toggle = screen.getByRole('switch') || screen.getByTestId('enabled-toggle');
      expect(toggle.getAttribute('aria-checked') === 'true' || toggle.getAttribute('data-checked') === 'true').toBe(true);
    });

    it('should show toggle as OFF when task is disabled', () => {
      const task = createMockTask({ enabled: false });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const toggle = screen.getByRole('switch') || screen.getByTestId('enabled-toggle');
      expect(toggle.getAttribute('aria-checked') === 'false' || toggle.getAttribute('data-checked') === 'false').toBe(true);
    });

    it('should call onToggleEnabled when toggle is clicked', () => {
      const task = createMockTask({ enabled: true });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const toggle = screen.getByRole('switch') || screen.getByTestId('enabled-toggle');
      fireEvent.click(toggle);
      expect(mockOnToggleEnabled).toHaveBeenCalledWith(task.id);
    });

    it('should not trigger onClick when toggle is clicked', () => {
      const task = createMockTask({ enabled: true });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const toggle = screen.getByRole('switch') || screen.getByTestId('enabled-toggle');
      fireEvent.click(toggle);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Requirement 1.5: 削除確認ダイアログ
  // ===========================================================================
  describe('Requirement 1.5: Delete button', () => {
    it('should render delete button', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const deleteButton = screen.getByTestId('delete-button') || screen.getByLabelText(/削除/);
      expect(deleteButton).toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const deleteButton = screen.getByTestId('delete-button') || screen.getByLabelText(/削除/);
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith(task.id);
    });

    it('should not trigger onClick when delete button is clicked', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const deleteButton = screen.getByTestId('delete-button') || screen.getByLabelText(/削除/);
      fireEvent.click(deleteButton);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Requirement 7.1: 即時実行ボタン
  // ===========================================================================
  describe('Requirement 7.1: Immediate execution button', () => {
    it('should render immediate execution button', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const execButton = screen.getByTestId('execute-button') || screen.getByLabelText(/即時実行|今すぐ実行/);
      expect(execButton).toBeInTheDocument();
    });

    it('should call onExecuteImmediately when button is clicked', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const execButton = screen.getByTestId('execute-button') || screen.getByLabelText(/即時実行|今すぐ実行/);
      fireEvent.click(execButton);
      expect(mockOnExecuteImmediately).toHaveBeenCalledWith(task.id);
    });

    it('should not trigger onClick when execute button is clicked', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const execButton = screen.getByTestId('execute-button') || screen.getByLabelText(/即時実行|今すぐ実行/);
      fireEvent.click(execButton);
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should disable execution button when task is disabled', () => {
      const task = createMockTask({ enabled: false });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const execButton = screen.getByTestId('execute-button') || screen.getByLabelText(/即時実行|今すぐ実行/);
      expect(execButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Click behavior - navigation to edit screen
  // ===========================================================================
  describe('Click to edit navigation', () => {
    it('should call onClick when item body is clicked', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const listItem = screen.getByTestId('schedule-task-list-item');
      fireEvent.click(listItem);
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should be keyboard accessible', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const listItem = screen.getByTestId('schedule-task-list-item');
      fireEvent.keyDown(listItem, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Visual states
  // ===========================================================================
  describe('Visual states', () => {
    it('should have hover styles', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const listItem = screen.getByTestId('schedule-task-list-item');
      expect(listItem.className).toContain('hover:');
    });

    it('should show schedule type badge', () => {
      const task = createMockTask({
        schedule: { type: 'interval', hoursInterval: 168, waitForIdle: false },
      });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      // Should show type badge (fixed schedule indicator)
      const typeBadge = screen.getByTestId('schedule-type-badge');
      expect(typeBadge).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================
  describe('Accessibility', () => {
    it('should have proper role', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const listItem = screen.getByTestId('schedule-task-list-item');
      expect(listItem).toHaveAttribute('role', 'button');
    });

    it('should have tabIndex for keyboard navigation', () => {
      const task = createMockTask();
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const listItem = screen.getByTestId('schedule-task-list-item');
      expect(listItem).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-label for toggle', () => {
      const task = createMockTask({ enabled: true, name: 'My Task' });
      render(
        <ScheduleTaskListItem
          task={task}
          onClick={mockOnClick}
          onToggleEnabled={mockOnToggleEnabled}
          onDelete={mockOnDelete}
          onExecuteImmediately={mockOnExecuteImmediately}
        />
      );
      const toggle = screen.getByRole('switch') || screen.getByTestId('enabled-toggle');
      expect(toggle).toHaveAttribute('aria-label');
    });
  });
});
