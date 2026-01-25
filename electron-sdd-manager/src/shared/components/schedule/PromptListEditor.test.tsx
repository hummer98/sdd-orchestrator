/**
 * PromptListEditor Component Tests
 *
 * Task 6.3: PromptListEditorを作成
 * - 複数プロンプトの登録UI
 * - プロンプトの追加・編集・削除
 * - 順序変更（ドラッグ&ドロップまたは上下ボタン）
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PromptListEditor } from './PromptListEditor';
import type { Prompt } from '../../types/scheduleTask';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockPrompt = (order: number, content: string = ''): Prompt => ({
  order,
  content,
});

// =============================================================================
// Tests
// =============================================================================

describe('PromptListEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ===========================================================================
  // Requirement 5.1: 複数プロンプト登録
  // ===========================================================================

  describe('Multiple Prompt Registration (Requirement 5.1)', () => {
    it('should render the component with correct structure', () => {
      render(
        <PromptListEditor
          prompts={[createMockPrompt(0, 'test prompt')]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('prompt-list-editor')).toBeInTheDocument();
    });

    it('should display existing prompts', () => {
      const prompts = [
        createMockPrompt(0, 'First prompt'),
        createMockPrompt(1, 'Second prompt'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('prompt-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('prompt-item-1')).toBeInTheDocument();
    });

    it('should have add prompt button', () => {
      render(
        <PromptListEditor
          prompts={[createMockPrompt(0, '')]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('add-prompt-button')).toBeInTheDocument();
    });

    it('should add new prompt when add button is clicked', () => {
      const initialPrompts = [createMockPrompt(0, 'Initial prompt')];

      render(
        <PromptListEditor
          prompts={initialPrompts}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByTestId('add-prompt-button');
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: 'Initial prompt' },
        { order: 1, content: '' },
      ]);
    });

    it('should display prompt order numbers', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      // Should show order numbers (1-indexed for display)
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Requirement 5.2: プロンプト個別編集・削除
  // ===========================================================================

  describe('Prompt Edit and Delete (Requirement 5.2)', () => {
    it('should have textarea for editing prompt content', () => {
      render(
        <PromptListEditor
          prompts={[createMockPrompt(0, 'test content')]}
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByTestId('prompt-content-0');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('test content');
    });

    it('should call onChange when prompt content is edited', () => {
      const prompts = [createMockPrompt(0, 'original')];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByTestId('prompt-content-0');
      fireEvent.change(textarea, { target: { value: 'updated content' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: 'updated content' },
      ]);
    });

    it('should have delete button for each prompt', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('delete-prompt-0')).toBeInTheDocument();
      expect(screen.getByTestId('delete-prompt-1')).toBeInTheDocument();
    });

    it('should delete prompt when delete button is clicked', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      const deleteButton = screen.getByTestId('delete-prompt-1');
      fireEvent.click(deleteButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: 'First' },
        { order: 1, content: 'Third' },
      ]);
    });

    it('should disable delete button when only one prompt exists', () => {
      render(
        <PromptListEditor
          prompts={[createMockPrompt(0, 'Only one')]}
          onChange={mockOnChange}
        />
      );

      const deleteButton = screen.getByTestId('delete-prompt-0');
      expect(deleteButton).toBeDisabled();
    });

    it('should update order numbers after deletion', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      // Delete the first prompt
      const deleteButton = screen.getByTestId('delete-prompt-0');
      fireEvent.click(deleteButton);

      // After deletion, orders should be renumbered
      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: 'Second' },
        { order: 1, content: 'Third' },
      ]);
    });
  });

  // ===========================================================================
  // Requirement 5.3: プロンプト順序変更
  // ===========================================================================

  describe('Prompt Reordering (Requirement 5.3)', () => {
    it('should have move up button for each prompt except first', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      // First item should have disabled or no move up button
      const moveUpFirst = screen.getByTestId('move-up-0');
      expect(moveUpFirst).toBeDisabled();

      // Other items should have enabled move up buttons
      expect(screen.getByTestId('move-up-1')).not.toBeDisabled();
      expect(screen.getByTestId('move-up-2')).not.toBeDisabled();
    });

    it('should have move down button for each prompt except last', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      // Other items should have enabled move down buttons
      expect(screen.getByTestId('move-down-0')).not.toBeDisabled();
      expect(screen.getByTestId('move-down-1')).not.toBeDisabled();

      // Last item should have disabled move down button
      const moveDownLast = screen.getByTestId('move-down-2');
      expect(moveDownLast).toBeDisabled();
    });

    it('should move prompt up when move up button is clicked', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      const moveUpButton = screen.getByTestId('move-up-1');
      fireEvent.click(moveUpButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: 'Second' },
        { order: 1, content: 'First' },
        { order: 2, content: 'Third' },
      ]);
    });

    it('should move prompt down when move down button is clicked', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
        createMockPrompt(2, 'Third'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      const moveDownButton = screen.getByTestId('move-down-0');
      fireEvent.click(moveDownButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: 'Second' },
        { order: 1, content: 'First' },
        { order: 2, content: 'Third' },
      ]);
    });

    it('should disable all reorder buttons when only one prompt', () => {
      render(
        <PromptListEditor
          prompts={[createMockPrompt(0, 'Only one')]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('move-up-0')).toBeDisabled();
      expect(screen.getByTestId('move-down-0')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Disabled State
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      // Textarea should be disabled
      expect(screen.getByTestId('prompt-content-0')).toBeDisabled();
      expect(screen.getByTestId('prompt-content-1')).toBeDisabled();

      // Add button should be disabled
      expect(screen.getByTestId('add-prompt-button')).toBeDisabled();

      // Delete buttons should be disabled
      expect(screen.getByTestId('delete-prompt-0')).toBeDisabled();
      expect(screen.getByTestId('delete-prompt-1')).toBeDisabled();

      // Move buttons should be disabled
      expect(screen.getByTestId('move-up-0')).toBeDisabled();
      expect(screen.getByTestId('move-up-1')).toBeDisabled();
      expect(screen.getByTestId('move-down-0')).toBeDisabled();
      expect(screen.getByTestId('move-down-1')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('should handle empty prompts array gracefully', () => {
      render(
        <PromptListEditor
          prompts={[]}
          onChange={mockOnChange}
        />
      );

      // Should still show add button
      expect(screen.getByTestId('add-prompt-button')).toBeInTheDocument();

      // Click add should add first prompt
      const addButton = screen.getByTestId('add-prompt-button');
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        { order: 0, content: '' },
      ]);
    });
  });

  // ===========================================================================
  // Label and Accessibility
  // ===========================================================================

  describe('Label and Accessibility', () => {
    it('should display section label', () => {
      render(
        <PromptListEditor
          prompts={[createMockPrompt(0, 'test')]}
          onChange={mockOnChange}
        />
      );

      // Get the label element specifically (not the button which also contains the word)
      const labels = screen.getAllByText(/プロンプト/);
      // Should have at least one label element
      expect(labels.length).toBeGreaterThan(0);
      // The first one should be the section label
      expect(labels[0].tagName).toBe('LABEL');
    });

    it('should have accessible labels for buttons', () => {
      const prompts = [
        createMockPrompt(0, 'First'),
        createMockPrompt(1, 'Second'),
      ];

      render(
        <PromptListEditor
          prompts={prompts}
          onChange={mockOnChange}
        />
      );

      // Move buttons should have aria-label
      const moveUpButton = screen.getByTestId('move-up-1');
      expect(moveUpButton).toHaveAttribute('aria-label');

      const moveDownButton = screen.getByTestId('move-down-0');
      expect(moveDownButton).toHaveAttribute('aria-label');

      const deleteButton = screen.getByTestId('delete-prompt-0');
      expect(deleteButton).toHaveAttribute('aria-label');
    });
  });
});
