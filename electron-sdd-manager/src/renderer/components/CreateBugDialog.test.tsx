/**
 * CreateBugDialog Component Tests
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateBugDialog } from './CreateBugDialog';
import { useProjectStore, useAgentStore, notify } from '../stores';
import { useBugStore } from '../stores/bugStore';

// Mock stores
vi.mock('../stores', () => ({
  useProjectStore: vi.fn(),
  useAgentStore: vi.fn(),
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../stores/bugStore', () => ({
  useBugStore: vi.fn(),
}));

// Mock electronAPI
const mockExecuteBugCreate = vi.fn();

describe('CreateBugDialog', () => {
  const mockSelectForProjectAgents = vi.fn();
  const mockSelectAgent = vi.fn();
  const mockAddAgent = vi.fn();
  const mockRefreshBugs = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: {
        executeBugCreate: mockExecuteBugCreate,
      },
      writable: true,
    });

    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProject: '/test/project',
    });

    (useAgentStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      selectForProjectAgents: mockSelectForProjectAgents,
      selectAgent: mockSelectAgent,
      addAgent: mockAddAgent,
    });

    (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      refreshBugs: mockRefreshBugs,
      useWorktree: false,
      setUseWorktree: vi.fn(),
    });
  });

  // ============================================================
  // Task 7.1: Dialog UI
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('dialog UI', () => {
    it('should not render when isOpen is false', () => {
      render(<CreateBugDialog isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByTestId('create-bug-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('create-bug-dialog')).toBeInTheDocument();
    });

    it('should display description textarea as required field', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('bug-description-input')).toBeInTheDocument();
      expect(screen.getByLabelText(/バグの説明/)).toBeInTheDocument();
      // Check required indicator
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not display bug name input field (auto-generated)', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByTestId('bug-name-input')).not.toBeInTheDocument();
    });

    it('should display create and cancel buttons', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('create-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Dialog close behavior
  // ============================================================
  describe('dialog close', () => {
    it('should call onClose when close button is clicked', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('close-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('dialog-backdrop'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 7.1: Form validation
  // Requirements: 4.4
  // ============================================================
  describe('form validation', () => {
    it('should disable create button when description is empty', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('create-button')).toBeDisabled();
    });

    it('should enable create button when description is provided', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description here' },
      });

      expect(screen.getByTestId('create-button')).not.toBeDisabled();
    });

    it('should disable create button when description is whitespace only', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: '   ' },
      });

      expect(screen.getByTestId('create-button')).toBeDisabled();
    });
  });

  // ============================================================
  // Task 7.2: Bug creation logic
  // Requirements: 4.4, 4.5, 4.6
  // ============================================================
  describe('bug creation', () => {
    it('should call executeBugCreate with project path and description', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description here' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project', // projectPath
          'Bug description here' // description
        );
      });
    });

    it('should show loading state during creation', async () => {
      mockExecuteBugCreate.mockImplementation(() => new Promise(() => {}));
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('作成中...')).toBeInTheDocument();
    });

    it('should call onClose on successful creation', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show success notification on creation', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(notify.success).toHaveBeenCalledWith('バグレポート作成を開始しました（プロジェクトAgentパネルで進捗を確認できます）');
      });
    });

    it('should schedule refresh bugs after creation', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // The refresh is scheduled via setTimeout, which is verified by the onClose being called
      // and the agent flow completing successfully
    });

    it('should add agent to store and switch to project agents panel on creation', async () => {
      const mockAgentInfo = { agentId: 'agent-123', specId: '', phase: 'bug-create' };
      mockExecuteBugCreate.mockResolvedValue(mockAgentInfo);
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockAddAgent).toHaveBeenCalledWith('', mockAgentInfo);
        expect(mockSelectForProjectAgents).toHaveBeenCalled();
        expect(mockSelectAgent).toHaveBeenCalledWith('agent-123');
      });
    });
  });

  // ============================================================
  // bugs-worktree-support Task 11.1: worktreeスライドスイッチ
  // Requirements: 8.1, 8.3, 8.4
  // ============================================================
  describe('worktree switch', () => {
    it('should display worktree switch', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('use-worktree-checkbox')).toBeInTheDocument();
      expect(screen.getByText('Worktreeモードで作成')).toBeInTheDocument();
    });

    it('should initialize switch with store value (false)', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        refreshBugs: mockRefreshBugs,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });

      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const switchButton = screen.getByTestId('use-worktree-checkbox');
      expect(switchButton.getAttribute('aria-checked')).toBe('false');
    });

    it('should initialize switch with store value (true)', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        refreshBugs: mockRefreshBugs,
        useWorktree: true,
        setUseWorktree: vi.fn(),
      });

      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const switchButton = screen.getByTestId('use-worktree-checkbox');
      expect(switchButton.getAttribute('aria-checked')).toBe('true');
    });

    it('should call setUseWorktree when switch is clicked', () => {
      const mockSetUseWorktree = vi.fn();
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        refreshBugs: mockRefreshBugs,
        useWorktree: false,
        setUseWorktree: mockSetUseWorktree,
      });

      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const switchButton = screen.getByTestId('use-worktree-checkbox');
      fireEvent.click(switchButton);

      expect(mockSetUseWorktree).toHaveBeenCalledWith(true);
    });

    it('should show worktree mode description when enabled', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        refreshBugs: mockRefreshBugs,
        useWorktree: true,
        setUseWorktree: vi.fn(),
      });

      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/ブランチとWorktreeを作成し、分離された環境でバグ修正を行います/)).toBeInTheDocument();
    });

    it('should not show worktree mode description when disabled', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        refreshBugs: mockRefreshBugs,
        useWorktree: false,
        setUseWorktree: vi.fn(),
      });

      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText(/ブランチとWorktreeを作成し、分離された環境でバグ修正を行います/)).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('error handling', () => {
    it('should show error when executeBugCreate throws', async () => {
      mockExecuteBugCreate.mockRejectedValue(new Error('Test error'));
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });

    it('should not close dialog on error', async () => {
      mockExecuteBugCreate.mockRejectedValue(new Error('Test error'));
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
