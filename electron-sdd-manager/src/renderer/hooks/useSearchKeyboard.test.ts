/**
 * useSearchKeyboard Hook Tests
 * TDD: Testing keyboard shortcut handling
 * Requirements: artifact-editor-search 1.1, 1.2, 3.1, 3.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchKeyboard } from './useSearchKeyboard';

describe('useSearchKeyboard', () => {
  let mockOnToggle: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnNext: ReturnType<typeof vi.fn>;
  let mockOnPrev: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnToggle = vi.fn();
    mockOnClose = vi.fn();
    mockOnNext = vi.fn();
    mockOnPrev = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultOptions = {
    enabled: true,
    searchVisible: false,
    onToggle: () => mockOnToggle(),
    onClose: () => mockOnClose(),
    onNext: () => mockOnNext(),
    onPrev: () => mockOnPrev(),
  };

  describe('Ctrl+F / Cmd+F toggle', () => {
    it('should call onToggle when Ctrl+F is pressed (Windows/Linux)', () => {
      renderHook(() => useSearchKeyboard(defaultOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle when Cmd+F is pressed (macOS)', () => {
      renderHook(() => useSearchKeyboard(defaultOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        metaKey: true,
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should not call onToggle when only F is pressed without modifier', () => {
      renderHook(() => useSearchKeyboard(defaultOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Escape to close', () => {
    it('should call onClose when Escape is pressed and search is visible', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          searchVisible: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when Escape is pressed and search is hidden', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          searchVisible: false,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Enter for next match', () => {
    it('should call onNext when Enter is pressed and search is visible', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          searchVisible: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('should not call onNext when Enter is pressed and search is hidden', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          searchVisible: false,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });
  });

  describe('Shift+Enter for previous match', () => {
    it('should call onPrev when Shift+Enter is pressed and search is visible', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          searchVisible: true,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnPrev).toHaveBeenCalledTimes(1);
    });

    it('should not call onPrev when Shift+Enter is pressed and search is hidden', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          searchVisible: false,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      });
      act(() => {
        document.dispatchEvent(event);
      });

      expect(mockOnPrev).not.toHaveBeenCalled();
    });
  });

  describe('enabled flag', () => {
    it('should not respond to any keys when disabled', () => {
      renderHook(() =>
        useSearchKeyboard({
          ...defaultOptions,
          enabled: false,
          searchVisible: true,
        })
      );

      // Try Ctrl+F
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: true,
            bubbles: true,
          })
        );
      });

      // Try Escape
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
          })
        );
      });

      // Try Enter
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
          })
        );
      });

      expect(mockOnToggle).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnNext).not.toHaveBeenCalled();
    });
  });

  describe('event prevention', () => {
    it('should prevent default browser behavior for Ctrl+F', () => {
      renderHook(() => useSearchKeyboard(defaultOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useSearchKeyboard(defaultOptions));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
