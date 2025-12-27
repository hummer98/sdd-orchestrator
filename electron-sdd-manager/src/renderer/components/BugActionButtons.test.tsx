/**
 * BugActionButtons Component Tests
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BugActionButtons, getNextActionLabel } from './BugActionButtons';
import type { BugMetadata } from '../types';
import { useAgentStore } from '../stores/agentStore';
import { useNotificationStore } from '../stores/notificationStore';

// Mock stores
vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(),
}));

vi.mock('../stores/notificationStore', () => ({
  useNotificationStore: vi.fn(),
}));

describe('BugActionButtons', () => {
  const mockStartAgent = vi.fn();
  const mockAddNotification = vi.fn();

  const mockBug: BugMetadata = {
    name: 'test-bug',
    path: '/project/.kiro/bugs/test-bug',
    phase: 'reported',
    updatedAt: new Date().toISOString(),
    reportedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAgentStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      startAgent: mockStartAgent,
    });
    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      addNotification: mockAddNotification,
    });
  });

  // ============================================================
  // Task 5.1: Button display
  // Requirements: 5.1, 5.5, 5.6
  // ============================================================
  describe('button display', () => {
    it('should display all three action buttons', () => {
      render(<BugActionButtons bug={mockBug} />);

      expect(screen.getByTestId('action-analyze')).toBeInTheDocument();
      expect(screen.getByTestId('action-fix')).toBeInTheDocument();
      expect(screen.getByTestId('action-verify')).toBeInTheDocument();
    });

    it('should display button labels in normal mode', () => {
      render(<BugActionButtons bug={mockBug} />);

      expect(screen.getByText('Analyze')).toBeInTheDocument();
      expect(screen.getByText('Fix')).toBeInTheDocument();
      expect(screen.getByText('Verify')).toBeInTheDocument();
    });

    it('should hide labels in compact mode', () => {
      render(<BugActionButtons bug={mockBug} compact />);

      // In compact mode, labels are not rendered (only icons)
      expect(screen.queryByText('Analyze')).not.toBeInTheDocument();
      expect(screen.queryByText('Fix')).not.toBeInTheDocument();
      expect(screen.queryByText('Verify')).not.toBeInTheDocument();
    });

    it('should show completed message for verified bugs', () => {
      const verifiedBug = { ...mockBug, phase: 'verified' as const };
      render(<BugActionButtons bug={verifiedBug} />);

      expect(screen.getByTestId('bug-completed')).toBeInTheDocument();
      expect(screen.getByText('完了')).toBeInTheDocument();
      expect(screen.queryByTestId('action-analyze')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.1: Button enable/disable based on phase
  // Requirements: 5.1, 5.6
  // ============================================================
  describe('button enable/disable', () => {
    it('should enable only Analyze button for reported phase', () => {
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      expect(screen.getByTestId('action-analyze')).not.toBeDisabled();
      expect(screen.getByTestId('action-fix')).toBeDisabled();
      expect(screen.getByTestId('action-verify')).toBeDisabled();
    });

    it('should enable only Fix button for analyzed phase', () => {
      const bug = { ...mockBug, phase: 'analyzed' as const };
      render(<BugActionButtons bug={bug} />);

      expect(screen.getByTestId('action-analyze')).toBeDisabled();
      expect(screen.getByTestId('action-fix')).not.toBeDisabled();
      expect(screen.getByTestId('action-verify')).toBeDisabled();
    });

    it('should enable only Verify button for fixed phase', () => {
      const bug = { ...mockBug, phase: 'fixed' as const };
      render(<BugActionButtons bug={bug} />);

      expect(screen.getByTestId('action-analyze')).toBeDisabled();
      expect(screen.getByTestId('action-fix')).toBeDisabled();
      expect(screen.getByTestId('action-verify')).not.toBeDisabled();
    });
  });

  // ============================================================
  // Task 5.2: Action execution
  // Requirements: 5.2, 5.3, 5.4
  // ============================================================
  describe('action execution', () => {
    it('should call startAgent with correct parameters for Analyze', async () => {
      mockStartAgent.mockResolvedValue('agent-123');
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      await waitFor(() => {
        expect(mockStartAgent).toHaveBeenCalledWith(
          'bug:test-bug', // specId (bug:{name} format)
          'bug-analyze', // phase
          '/kiro:bug-analyze', // command
          ['test-bug'], // args
          undefined, // group
          undefined // sessionId
        );
      });
    });

    it('should call startAgent with correct parameters for Fix', async () => {
      mockStartAgent.mockResolvedValue('agent-123');
      const bug = { ...mockBug, phase: 'analyzed' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-fix'));

      await waitFor(() => {
        expect(mockStartAgent).toHaveBeenCalledWith(
          'bug:test-bug', // specId (bug:{name} format)
          'bug-fix',
          '/kiro:bug-fix',
          ['test-bug'],
          undefined,
          undefined
        );
      });
    });

    it('should call startAgent with correct parameters for Verify', async () => {
      mockStartAgent.mockResolvedValue('agent-123');
      const bug = { ...mockBug, phase: 'fixed' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-verify'));

      await waitFor(() => {
        expect(mockStartAgent).toHaveBeenCalledWith(
          'bug:test-bug', // specId (bug:{name} format)
          'bug-verify',
          '/kiro:bug-verify',
          ['test-bug'],
          undefined,
          undefined
        );
      });
    });

    it('should call onActionStarted callback', async () => {
      mockStartAgent.mockResolvedValue('agent-123');
      const onActionStarted = vi.fn();
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} onActionStarted={onActionStarted} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      expect(onActionStarted).toHaveBeenCalledWith('analyze');
    });

    it('should call onActionCompleted callback on success', async () => {
      mockStartAgent.mockResolvedValue('agent-123');
      const onActionCompleted = vi.fn();
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} onActionCompleted={onActionCompleted} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      await waitFor(() => {
        expect(onActionCompleted).toHaveBeenCalledWith('analyze');
      });
    });
  });

  // ============================================================
  // Task 5.1: Loading state
  // Requirements: 5.5
  // ============================================================
  describe('loading state', () => {
    it('should show loading spinner when action is executing', async () => {
      // Make startAgent return a promise that doesn't resolve immediately
      mockStartAgent.mockImplementation(() => new Promise(() => {}));
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      expect(screen.getByTestId('action-analyze-loading')).toBeInTheDocument();
    });

    it('should disable all buttons during execution', async () => {
      mockStartAgent.mockImplementation(() => new Promise(() => {}));
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      await waitFor(() => {
        expect(screen.getByTestId('action-analyze')).toBeDisabled();
        expect(screen.getByTestId('action-fix')).toBeDisabled();
        expect(screen.getByTestId('action-verify')).toBeDisabled();
      });
    });
  });

  // ============================================================
  // Notification handling
  // Requirements: 7.1, 7.2, 7.3, 7.4
  // ============================================================
  describe('notifications', () => {
    it('should show success notification on action start', async () => {
      mockStartAgent.mockResolvedValue('agent-123');
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            message: 'test-bugのAnalyzeを開始しました',
          })
        );
      });
    });

    it('should show error notification when startAgent returns null', async () => {
      mockStartAgent.mockResolvedValue(null);
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Analyzeエラー: アクションの開始に失敗しました',
          })
        );
      });
    });

    it('should show error notification on exception', async () => {
      mockStartAgent.mockRejectedValue(new Error('Test error'));
      const bug = { ...mockBug, phase: 'reported' as const };
      render(<BugActionButtons bug={bug} />);

      fireEvent.click(screen.getByTestId('action-analyze'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Analyzeエラー: Test error',
          })
        );
      });
    });
  });
});

describe('getNextActionLabel', () => {
  it('should return "Analyze" for reported phase', () => {
    expect(getNextActionLabel('reported')).toBe('Analyze');
  });

  it('should return "Fix" for analyzed phase', () => {
    expect(getNextActionLabel('analyzed')).toBe('Fix');
  });

  it('should return "Verify" for fixed phase', () => {
    expect(getNextActionLabel('fixed')).toBe('Verify');
  });

  it('should return null for verified phase', () => {
    expect(getNextActionLabel('verified')).toBeNull();
  });
});
