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

    // Mock electronAPI
    window.electronAPI = {
      ...window.electronAPI,
      executeSpecInit: vi.fn().mockResolvedValue('new-feature'),
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

    it('should show character count for description', () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText(/文字以上で入力してください/)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.2: spec-manager:init連携の実装
  // Requirements: 5.3
  // ============================================================
  describe('Task 5.2: spec-manager:init integration', () => {
    it('should call executeSpecInit when create button is clicked', async () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です。とても重要な機能です。' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(window.electronAPI.executeSpecInit).toHaveBeenCalledWith(
          '/test/project',
          'これは新しい機能の説明です。とても重要な機能です。'
        );
      });
    });

    it('should NOT call old createSpec API', async () => {
      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です。十分な長さがあります。' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(window.electronAPI.executeSpecInit).toHaveBeenCalled();
      });

      expect(window.electronAPI.createSpec).not.toHaveBeenCalled();
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
        () => new Promise((resolve) => setTimeout(() => resolve('new-feature'), 100))
      );

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です。十分な長さがあります。' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/作成中/i)).toBeInTheDocument();
      });
    });

    it('should close dialog on success', async () => {
      window.electronAPI.executeSpecInit = vi.fn().mockResolvedValue('new-feature');

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です。十分な長さがあります。' } });

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
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です。十分な長さがあります。' } });

      const createButton = screen.getByRole('button', { name: /作成$/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        // エラーメッセージが表示される
        expect(screen.getByText(/spec-manager:init failed/i)).toBeInTheDocument();
      });
    });

    it('should disable create button while loading', async () => {
      window.electronAPI.executeSpecInit = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('new-feature'), 200))
      );

      render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

      const textarea = screen.getByLabelText('説明');
      fireEvent.change(textarea, { target: { value: 'これは新しい機能の説明です。十分な長さがあります。' } });

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
