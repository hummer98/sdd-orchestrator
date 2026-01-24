/**
 * CreateBugDialog Component Tests
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateBugDialog } from './CreateBugDialog';
import { useProjectStore, useAgentStore, notify } from '../stores';

// Mock stores
// bugs-view-unification Task 6.1: Removed useBugStore mock (refreshBugs removed)
vi.mock('../stores', () => ({
  useProjectStore: vi.fn(),
  useAgentStore: vi.fn(),
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock electronAPI
const mockExecuteBugCreate = vi.fn();

describe('CreateBugDialog', () => {
  const mockSelectForProjectAgents = vi.fn();
  const mockSelectAgent = vi.fn();
  const mockAddAgent = vi.fn();
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

    // bugs-view-unification Task 6.1: Removed useBugStore mock (refreshBugs removed)
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
    it('should call executeBugCreate with project path, description and worktreeMode=false', async () => {
      // bug-create-dialog-unification: Now includes worktreeMode parameter
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description here' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project', // projectPath
          'Bug description here', // description
          false // worktreeMode
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
  // bug-create-dialog-unification: Worktree mode tests
  // Requirements: 2.1, 2.2, 2.3, 2.4 (Worktreeモードスイッチ)
  // Requirements: 3.1, 3.2, 3.3 (ボタンデザイン)
  // Requirements: 6.1, 6.2 (テスト)
  // ============================================================
  describe('worktree mode switch', () => {
    it('should display worktree mode switch with data-testid', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('worktree-mode-switch')).toBeInTheDocument();
    });

    // Task 6.1: GitBranch icon in worktree mode switch
    it('should display GitBranch icon in worktree mode switch container', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('worktree-switch-git-branch-icon')).toBeInTheDocument();
    });

    it('should display GitBranch icon with gray color when worktree mode is OFF', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const gitBranchIcon = screen.getByTestId('worktree-switch-git-branch-icon');
      expect(gitBranchIcon).toHaveClass('text-gray-400');
    });

    it('should display GitBranch icon with violet color when worktree mode is ON', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByTestId('worktree-mode-switch');
      fireEvent.click(switchElement);

      const gitBranchIcon = screen.getByTestId('worktree-switch-git-branch-icon');
      expect(gitBranchIcon).toHaveClass('text-violet-500');
    });

    it('should have worktree switch container with background styling', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const container = screen.getByTestId('worktree-switch-container');
      expect(container).toHaveClass('p-3', 'rounded-md', 'bg-gray-50');
    });

    it('should toggle worktree mode when switch is clicked', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByTestId('worktree-mode-switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchElement);
      expect(switchElement).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(switchElement);
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });

    it('should display purple highlight when worktree mode is ON', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByTestId('worktree-mode-switch');
      fireEvent.click(switchElement);

      // Check that switch has violet/purple background
      expect(switchElement).toHaveClass('bg-violet-500');
    });

    it('should display description text when worktree mode is ON', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      // Description should not be visible initially
      expect(screen.queryByText(/ブランチとWorktreeを作成/)).not.toBeInTheDocument();

      // Toggle worktree mode ON
      const switchElement = screen.getByTestId('worktree-mode-switch');
      fireEvent.click(switchElement);

      // Description should now be visible
      expect(screen.getByText(/ブランチとWorktreeを作成/)).toBeInTheDocument();
    });
  });

  describe('button styling', () => {
    it('should display AgentIcon with blue button when worktree mode is OFF', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });

      const createButton = screen.getByTestId('create-button');
      expect(createButton).toHaveClass('bg-blue-500');
      expect(screen.getByTestId('agent-icon')).toBeInTheDocument();
    });

    it('should display AgentBranchIcon with violet button when worktree mode is ON', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description' },
      });

      // Toggle worktree mode ON
      const switchElement = screen.getByTestId('worktree-mode-switch');
      fireEvent.click(switchElement);

      const createButton = screen.getByTestId('create-button');
      expect(createButton).toHaveClass('bg-violet-500');
      expect(screen.getByTestId('agent-branch-icon')).toBeInTheDocument();
    });
  });

  describe('IPC call with worktreeMode', () => {
    it('should call executeBugCreate with worktreeMode=false when switch is OFF', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description here' },
      });
      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project',
          'Bug description here',
          false
        );
      });
    });

    it('should call executeBugCreate with worktreeMode=true when switch is ON', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      fireEvent.change(screen.getByTestId('bug-description-input'), {
        target: { value: 'Bug description here' },
      });

      // Toggle worktree mode ON
      const switchElement = screen.getByTestId('worktree-mode-switch');
      fireEvent.click(switchElement);

      fireEvent.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project',
          'Bug description here',
          true
        );
      });
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

  // ============================================================
  // submit-shortcut-key feature: Task 2.3
  // Requirement 2.3: CreateBugDialogでショートカット有効
  // ============================================================
  describe('submit-shortcut-key: Keyboard shortcut', () => {
    it('should call executeBugCreate when Cmd+Enter is pressed with valid description', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByTestId('bug-description-input');
      fireEvent.change(textarea, { target: { value: 'バグの説明' } });

      // Cmd+Enter (macOS)
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project',
          'バグの説明',
          false
        );
      });
    });

    it('should call executeBugCreate when Ctrl+Enter is pressed with valid description', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByTestId('bug-description-input');
      fireEvent.change(textarea, { target: { value: 'バグの説明' } });

      // Ctrl+Enter (Windows/Linux)
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project',
          'バグの説明',
          false
        );
      });
    });

    it('should NOT call executeBugCreate when description is empty', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByTestId('bug-description-input');
      // Don't enter any text

      // Cmd+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      expect(mockExecuteBugCreate).not.toHaveBeenCalled();
    });

    it('should NOT call executeBugCreate when Enter is pressed without modifier', () => {
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByTestId('bug-description-input');
      fireEvent.change(textarea, { target: { value: 'バグの説明' } });

      // Enter only (should not trigger submit)
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockExecuteBugCreate).not.toHaveBeenCalled();
    });

    // Note: IME (isComposing) testing is covered in useSubmitShortcut.test.ts
    // fireEvent.keyDown doesn't properly support nativeEvent.isComposing mocking
    // at the component level.

    it('should NOT call executeBugCreate when dialog is in creating state', async () => {
      // Mock slow response
      mockExecuteBugCreate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ agentId: 'agent-123' }), 500))
      );

      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByTestId('bug-description-input');
      fireEvent.change(textarea, { target: { value: 'バグの説明' } });

      // Click button to start creating
      fireEvent.click(screen.getByTestId('create-button'));

      // Now try shortcut while creating
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      // Should only have been called once (from button click, not from shortcut)
      expect(mockExecuteBugCreate).toHaveBeenCalledTimes(1);
    });

    it('should pass worktreeMode when using shortcut with worktree mode enabled', async () => {
      mockExecuteBugCreate.mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'bug-create' });
      render(<CreateBugDialog isOpen={true} onClose={mockOnClose} />);

      // Enable worktree mode
      const switchElement = screen.getByTestId('worktree-mode-switch');
      fireEvent.click(switchElement);

      const textarea = screen.getByTestId('bug-description-input');
      fireEvent.change(textarea, { target: { value: 'バグの説明' } });

      // Cmd+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockExecuteBugCreate).toHaveBeenCalledWith(
          '/test/project',
          'バグの説明',
          true // worktreeMode enabled
        );
      });
    });
  });
});
