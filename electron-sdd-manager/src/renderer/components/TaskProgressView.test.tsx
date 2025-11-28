/**
 * TaskProgressView Component Tests
 * TDD: Testing task progress display
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskProgressView, type TaskItem, type TaskProgress } from './TaskProgressView';

describe('TaskProgressView', () => {
  const mockTasks: TaskItem[] = [
    { id: '1.1', title: 'ワークフロー型定義の作成', status: 'completed' },
    { id: '1.2', title: 'Extended SpecJsonの型定義', status: 'completed' },
    { id: '2.1', title: '自動実行許可状態の管理', status: 'running' },
    { id: '2.2', title: 'バリデーションオプション状態の管理', status: 'pending' },
  ];

  const mockProgress: TaskProgress = {
    total: 4,
    completed: 2,
    percentage: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 5.1: Task list display
  // Requirements: 7.1, 7.2
  // ============================================================
  describe('Task 5.1: Task list display', () => {
    it('should display task list from tasks', () => {
      render(<TaskProgressView tasks={mockTasks} progress={mockProgress} />);

      expect(screen.getByText('ワークフロー型定義の作成')).toBeInTheDocument();
      expect(screen.getByText('Extended SpecJsonの型定義')).toBeInTheDocument();
      expect(screen.getByText('自動実行許可状態の管理')).toBeInTheDocument();
      expect(screen.getByText('バリデーションオプション状態の管理')).toBeInTheDocument();
    });

    it('should display task IDs', () => {
      render(<TaskProgressView tasks={mockTasks} progress={mockProgress} />);

      expect(screen.getByText('1.1')).toBeInTheDocument();
      expect(screen.getByText('1.2')).toBeInTheDocument();
      expect(screen.getByText('2.1')).toBeInTheDocument();
      expect(screen.getByText('2.2')).toBeInTheDocument();
    });

    it('should display pending status for pending tasks', () => {
      const pendingTasks: TaskItem[] = [
        { id: '1', title: 'Pending Task', status: 'pending' },
      ];
      render(
        <TaskProgressView
          tasks={pendingTasks}
          progress={{ total: 1, completed: 0, percentage: 0 }}
        />
      );

      expect(screen.getByTestId('task-status-pending')).toBeInTheDocument();
    });

    it('should display running status for running tasks', () => {
      const runningTasks: TaskItem[] = [
        { id: '1', title: 'Running Task', status: 'running' },
      ];
      render(
        <TaskProgressView
          tasks={runningTasks}
          progress={{ total: 1, completed: 0, percentage: 0 }}
        />
      );

      expect(screen.getByTestId('task-status-running')).toBeInTheDocument();
    });

    it('should display completed status for completed tasks', () => {
      const completedTasks: TaskItem[] = [
        { id: '1', title: 'Completed Task', status: 'completed' },
      ];
      render(
        <TaskProgressView
          tasks={completedTasks}
          progress={{ total: 1, completed: 1, percentage: 100 }}
        />
      );

      expect(screen.getByTestId('task-status-completed')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.2: Task progress update
  // Requirements: 7.3, 7.4, 7.5
  // ============================================================
  describe('Task 5.2: Task progress update', () => {
    it('should display progress bar', () => {
      render(<TaskProgressView tasks={mockTasks} progress={mockProgress} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      render(<TaskProgressView tasks={mockTasks} progress={mockProgress} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display completed count', () => {
      render(<TaskProgressView tasks={mockTasks} progress={mockProgress} />);

      expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
    });

    it('should display full progress when all tasks complete', () => {
      const allComplete: TaskProgress = {
        total: 4,
        completed: 4,
        percentage: 100,
      };
      render(<TaskProgressView tasks={mockTasks} progress={allComplete} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should display completion message when all tasks complete', () => {
      const allCompleteTasks: TaskItem[] = mockTasks.map((t) => ({
        ...t,
        status: 'completed' as const,
      }));
      const allComplete: TaskProgress = {
        total: 4,
        completed: 4,
        percentage: 100,
      };
      render(<TaskProgressView tasks={allCompleteTasks} progress={allComplete} />);

      expect(screen.getByText(/すべてのタスクが完了しました/)).toBeInTheDocument();
    });

    it('should not display completion message when tasks are incomplete', () => {
      render(<TaskProgressView tasks={mockTasks} progress={mockProgress} />);

      expect(
        screen.queryByText(/すべてのタスクが完了しました/)
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Empty state
  // ============================================================
  describe('Empty state', () => {
    it('should display empty message when no tasks', () => {
      render(
        <TaskProgressView
          tasks={[]}
          progress={{ total: 0, completed: 0, percentage: 0 }}
        />
      );

      expect(screen.getByText(/タスクがありません/)).toBeInTheDocument();
    });
  });
});
