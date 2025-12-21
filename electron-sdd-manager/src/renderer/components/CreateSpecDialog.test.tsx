/**
 * CreateSpecDialog Component Tests
 * TDD: Testing simplified create spec dialog with spec-manager:init integration
 * Task 5.1, 5.2, 5.3 (sidebar-refactor)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateSpecDialog } from './CreateSpecDialog';
import { useProjectStore } from '../stores/projectStore';
import { useSpecStore } from '../stores/specStore';
import { useAgentStore } from '../stores/agentStore';
import { useWorkflowStore } from '../stores/workflowStore';

describe('CreateSpecDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up project store state
    useProjectStore.setState({
      currentProject: '/test/project',
    });

    // Reset spec store
    useSpecStore.setState({
      selectedSpec: null,
    });

    // Reset agent store
    useAgentStore.setState({
      selectedAgent: null,
      selectedSpecForAgents: null,
    });

    // Reset workflow store with default command prefix
    useWorkflowStore.setState({
      commandPrefix: 'kiro',
    });

    // Mock electronAPI
    window.electronAPI = {
      ...window.electronAPI,
      executeSpecInit: vi.fn().mockResolvedValue({ agentId: 'agent-123', specId: '', phase: 'spec-init', status: 'running' }),
      createSpec: vi.fn(),
    };
  });

  // ============================================================
  // Task 5.1: ダイアログUIの簡略化
  // Requirements: 5.1, 5.2
  // ============================================================
  describe('Task 5.1: Simplified dialog UI', () => {
    it('should not render when isOpen is false', () => {
      render(<CreateSpecDialog isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByText('新規仕様を作成')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('新規仕様を作成')).toBeInTheDocument();
    });

    it('should NOT render name input field', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);
      // 仕様名フィールドは削除されている
      expect(screen.queryByLabelText('仕様名')).not.toBeInTheDocument();
    });

    it('should render description input field only', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);
      // 説明フィールドのみ存在
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
    });

  });

  // ============================================================
  // Task 5.2: spec-manager:init連携の実装
  // Requirements: 5.3
  // ============================================================
  describe('Task 5.2: spec-manager:init integration', () => {
    it('should call executeSpecInit with commandPrefix when create button is clicked', async () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(window.electronAPI.executeSpecInit).toHaveBeenCalledWith(
          '/test/project',
          'これは新しい機能の説明です',
          'kiro' // default commandPrefix
        );
      });
    });

    it('should use spec-manager prefix when commandPrefix is spec-manager', async () => {
      // Set workflow store to use spec-manager prefix
      useWorkflowStore.setState({
        commandPrefix: 'spec-manager',
      });

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(window.electronAPI.executeSpecInit).toHaveBeenCalledWith(
          '/test/project',
          'これは新しい機能の説明です',
          'spec-manager'
        );
      });
    });

    it('should NOT call old createSpec API', async () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(window.electronAPI.executeSpecInit).toHaveBeenCalled();
      });

      expect(window.electronAPI.createSpec).not.toHaveBeenCalled();
    });

    // 5.2.4 CreateSpecDialogの修正: ダイアログを閉じてプロジェクトエージェントパネルに遷移
    it('should close dialog immediately after starting agent (not wait for completion)', async () => {
      // Mock a slow response to ensure dialog closes before completion
      window.electronAPI.executeSpecInit = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ agentId: 'agent-123', specId: '', phase: 'spec-init', status: 'running' }), 500))
      );

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      // Wait for dialog to close (should happen after agent starts, not after completion)
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should select project agent panel after creating spec', async () => {
      const selectForProjectAgents = vi.fn();
      useAgentStore.setState({ selectForProjectAgents });

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        // Should navigate to project agent panel (specId='')
        expect(selectForProjectAgents).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // Task 5.2.5: CreateSpecDialogのUI修正
  // placeholder色修正、10文字バリデーション削除
  // ============================================================
  describe('Task 5.2.5: CreateSpecDialog UI improvements', () => {
    it('should have gray placeholder text (not black)', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      // Check that textarea has placeholder:text-gray-400 class
      expect(textarea.className).toContain('placeholder:text-gray-400');
    });

    it('should NOT show 10 character validation message', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      // Should not display character count validation message
      expect(screen.queryByText(/10文字以上/)).not.toBeInTheDocument();
    });

    it('should enable create button when description is not empty (regardless of length)', async () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      // Enter just 3 characters
      fireEvent.change(textarea, { target: { value: 'abc' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      // Button should be enabled (no 10 character minimum)
      expect(createButton).not.toBeDisabled();
    });

    it('should disable create button when description is empty', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const createButton = screen.getByRole('button', { name: /作成$/i });
      // Button should be disabled when empty
      expect(createButton).toBeDisabled();
    });
  });

  // ============================================================
  // Task 5.3: ダイアログの状態管理とフィードバック
  // Requirements: 5.4, 5.5, 5.6
  // ============================================================
  describe('Task 5.3: Dialog state management and feedback', () => {
    it('should show loading state while creating', async () => {
      // Slow down the mock to see loading state
      window.electronAPI.executeSpecInit = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ agentId: 'agent-123' }), 100))
      );

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: '新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/作成中/i)).toBeInTheDocument();
      });
    });

    it('should close dialog on success', async () => {
      window.electronAPI.executeSpecInit = vi.fn().mockResolvedValue({ agentId: 'agent-123' });

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: '新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error message on failure', async () => {
      window.electronAPI.executeSpecInit = vi.fn().mockRejectedValue(new Error('spec-manager:init failed'));

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: '新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        // エラーメッセージが表示される
        expect(screen.getByText(/spec-manager:init failed/i)).toBeInTheDocument();
      });
    });

    it('should disable create button while loading', async () => {
      window.electronAPI.executeSpecInit = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ agentId: 'agent-123' }), 200))
      );

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: '新しい機能の説明です' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(createButton).toBeDisabled();
      });
    });

    it('should clear form and close when cancel is clicked', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'some description' } });

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
