/**
 * useSearchKeyboard Hook
 * Keyboard shortcut handling for search functionality
 * Requirements: artifact-editor-search 1.1, 1.2, 3.1, 3.2
 */

import { useEffect, useCallback } from 'react';

interface UseSearchKeyboardOptions {
  enabled: boolean;
  searchVisible: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Hook for handling search-related keyboard shortcuts
 *
 * Shortcuts:
 * - Ctrl+F / Cmd+F: Toggle search bar
 * - Escape: Close search bar
 * - Enter: Navigate to next match
 * - Shift+Enter: Navigate to previous match
 */
export function useSearchKeyboard(options: UseSearchKeyboardOptions): void {
  const { enabled, searchVisible, onToggle, onClose, onNext, onPrev } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey;

      // Ctrl+F / Cmd+F: Toggle search bar
      if (isModifierPressed && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        onToggle();
        return;
      }

      // Only handle navigation keys when search is visible
      if (!searchVisible) {
        return;
      }

      // Escape: Close search bar
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Enter / Shift+Enter: Navigate matches
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) {
          onPrev();
        } else {
          onNext();
        }
        return;
      }
    },
    [enabled, searchVisible, onToggle, onClose, onNext, onPrev]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
