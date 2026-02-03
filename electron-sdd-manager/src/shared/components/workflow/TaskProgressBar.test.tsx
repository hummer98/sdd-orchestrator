/**
 * Unit Tests for TaskProgressBar Component
 *
 * remote-ui-task-display Task 6.2: Unit tests for TaskProgressBar
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskProgressBar } from './TaskProgressBar';
import type { TaskProgress } from '@shared/utils/taskProgressParser';

describe('TaskProgressBar', () => {
  // Requirement 3.1, 4.1: Display progress bar with count and percentage
  describe('progress display', () => {
    it('should display completed count and total count', () => {
      const taskProgress: TaskProgress = {
        total: 10,
        completed: 3,
        percentage: 30,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} />);

      expect(screen.getByText('3 / 10 タスク完了')).toBeInTheDocument();
    });

    it('should display percentage', () => {
      const taskProgress: TaskProgress = {
        total: 10,
        completed: 5,
        percentage: 50,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render progress bar with correct width', () => {
      const taskProgress: TaskProgress = {
        total: 100,
        completed: 75,
        percentage: 75,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} testId="test-bar" />);

      const progressBar = screen.getByTestId('test-bar-progress');
      expect(progressBar).toHaveStyle('width: 75%');
    });

    it('should show green color when 100% complete', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 5,
        percentage: 100,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} testId="test-bar" />);

      const percentageText = screen.getByText('100%');
      expect(percentageText).toHaveClass('text-green-600');
    });

    it('should show completion message when 100% complete', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 5,
        percentage: 100,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} />);

      expect(screen.getByText('すべてのタスクが完了しました')).toBeInTheDocument();
    });
  });

  // Requirement 3.3, 4.3: Display "no tasks" message when taskProgress is null
  describe('no tasks state', () => {
    it('should display "no tasks" message when taskProgress is null', () => {
      render(<TaskProgressBar taskProgress={null} tasksContent={null} />);

      expect(screen.getByText('タスクなし')).toBeInTheDocument();
    });
  });

  // Requirement 3.2, 4.2: Expandable tasks.md content section
  describe('expandable content', () => {
    it('should show expand button when tasksContent is provided', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 2,
        percentage: 40,
      };
      const tasksContent = '# Tasks\n\n- [x] Task 1\n- [ ] Task 2';

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={tasksContent} />);

      expect(screen.getByRole('button', { name: /tasks\.md/i })).toBeInTheDocument();
    });

    it('should not show expand button when tasksContent is null', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 2,
        percentage: 40,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} />);

      expect(screen.queryByRole('button', { name: /tasks\.md/i })).not.toBeInTheDocument();
    });

    it('should expand content when clicking expand button', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 2,
        percentage: 40,
      };
      const tasksContent = '# Tasks\n\n- [x] Task 1';

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={tasksContent} testId="test-bar" />);

      // Initially collapsed
      expect(screen.queryByTestId('test-bar-content')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByRole('button', { name: /tasks\.md/i }));

      // Content should be visible
      expect(screen.getByTestId('test-bar-content')).toBeInTheDocument();
    });

    it('should collapse content when clicking expand button again', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 2,
        percentage: 40,
      };
      const tasksContent = '# Tasks';

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={tasksContent} testId="test-bar" />);

      // Click to expand
      fireEvent.click(screen.getByRole('button', { name: /tasks\.md/i }));
      expect(screen.getByTestId('test-bar-content')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByRole('button', { name: /tasks\.md/i }));
      expect(screen.queryByTestId('test-bar-content')).not.toBeInTheDocument();
    });
  });

  // Loading state
  describe('loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<TaskProgressBar taskProgress={null} tasksContent={null} isLoading={true} testId="test-bar" />);

      expect(screen.getByTestId('test-bar-loading')).toBeInTheDocument();
    });

    it('should not show loading indicator when isLoading is false', () => {
      const taskProgress: TaskProgress = {
        total: 5,
        completed: 2,
        percentage: 40,
      };

      render(<TaskProgressBar taskProgress={taskProgress} tasksContent={null} isLoading={false} testId="test-bar" />);

      expect(screen.queryByTestId('test-bar-loading')).not.toBeInTheDocument();
    });
  });
});
