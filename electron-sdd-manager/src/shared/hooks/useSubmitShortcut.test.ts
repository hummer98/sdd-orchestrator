/**
 * Tests for useSubmitShortcut hook
 *
 * TDD: RED Phase - Write failing tests first
 * Requirements: 1.1-1.4, 3.1-3.2, 4.1-4.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubmitShortcut } from './useSubmitShortcut';
import type { UseSubmitShortcutOptions } from './useSubmitShortcut';

/**
 * Helper to create a mock keyboard event
 */
function createKeyboardEvent(options: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  isComposing?: boolean;
}): React.KeyboardEvent<HTMLTextAreaElement> {
  const { key, metaKey = false, ctrlKey = false, isComposing = false } = options;

  return {
    key,
    metaKey,
    ctrlKey,
    nativeEvent: {
      isComposing,
    },
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;
}

describe('useSubmitShortcut', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn();
    vi.clearAllMocks();
  });

  // =============================================================================
  // Requirement 4.1, 4.2, 4.3: Hook structure and interface
  // =============================================================================
  describe('hook structure', () => {
    it('should return handleKeyDown function', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      expect(typeof result.current.handleKeyDown).toBe('function');
    });

    it('should accept onSubmit callback', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept optional disabled flag', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit, disabled: true })
      );

      expect(result.current).toBeDefined();
    });
  });

  // =============================================================================
  // Requirement 1.1: macOSでCmd+Enterでフォーム送信
  // =============================================================================
  describe('Cmd+Enter (macOS)', () => {
    it('should call onSubmit when Cmd+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Enter', metaKey: true });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should prevent default when Cmd+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Enter', metaKey: true });
      result.current.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Requirement 1.2: Windows/LinuxでCtrl+Enterで送信
  // =============================================================================
  describe('Ctrl+Enter (Windows/Linux)', () => {
    it('should call onSubmit when Ctrl+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Enter', ctrlKey: true });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should prevent default when Ctrl+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Enter', ctrlKey: true });
      result.current.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Requirement 1.3: Enterのみで改行挿入（送信しない）
  // =============================================================================
  describe('Enter only (newline)', () => {
    it('should NOT call onSubmit when only Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Enter' });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should NOT prevent default when only Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Enter' });
      result.current.handleKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Requirement 1.4: disabled時はショートカット無視
  // =============================================================================
  describe('disabled state', () => {
    it('should NOT call onSubmit when disabled=true and Cmd+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit, disabled: true })
      );

      const event = createKeyboardEvent({ key: 'Enter', metaKey: true });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should NOT call onSubmit when disabled=true and Ctrl+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit, disabled: true })
      );

      const event = createKeyboardEvent({ key: 'Enter', ctrlKey: true });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should call onSubmit when disabled=false and Cmd+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit, disabled: false })
      );

      const event = createKeyboardEvent({ key: 'Enter', metaKey: true });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Requirement 3.1: IME変換中はショートカット無視
  // =============================================================================
  describe('IME composing', () => {
    it('should NOT call onSubmit when isComposing=true and Cmd+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({
        key: 'Enter',
        metaKey: true,
        isComposing: true,
      });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should NOT call onSubmit when isComposing=true and Ctrl+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({
        key: 'Enter',
        ctrlKey: true,
        isComposing: true,
      });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Requirement 3.2: IME確定後はショートカット有効
  // =============================================================================
  describe('IME confirmed', () => {
    it('should call onSubmit when isComposing=false and Cmd+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({
        key: 'Enter',
        metaKey: true,
        isComposing: false,
      });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmit when isComposing=false and Ctrl+Enter is pressed', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({
        key: 'Enter',
        ctrlKey: true,
        isComposing: false,
      });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Other keys (should not trigger submit)
  // =============================================================================
  describe('other keys', () => {
    it('should NOT call onSubmit for other keys', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'a', metaKey: true });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should NOT call onSubmit for Escape key', () => {
      const { result } = renderHook(() =>
        useSubmitShortcut({ onSubmit: mockOnSubmit })
      );

      const event = createKeyboardEvent({ key: 'Escape' });
      result.current.handleKeyDown(event);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
