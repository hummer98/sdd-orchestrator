/**
 * useSubmitShortcut - Hook for dialog form submission shortcut
 *
 * This hook provides a keyboard event handler for submitting forms
 * using Cmd+Enter (macOS) or Ctrl+Enter (Windows/Linux).
 *
 * Features:
 * - Platform-aware shortcut detection (Cmd for macOS, Ctrl for Windows/Linux)
 * - IME composition handling (prevents submission during Japanese input)
 * - Disabled state support
 * - Enter key passes through for newlines
 *
 * Requirements: 1.1-1.4, 3.1-3.2, 4.1-4.3
 */

import { useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useSubmitShortcut hook
 */
export interface UseSubmitShortcutOptions {
  /**
   * Callback to be called when the submit shortcut is triggered
   */
  readonly onSubmit: () => void;

  /**
   * Whether the submit action is disabled
   * When true, the shortcut will not trigger onSubmit
   * @default false
   */
  readonly disabled?: boolean;
}

/**
 * Return value of useSubmitShortcut hook
 */
export interface UseSubmitShortcutReturn {
  /**
   * Event handler to be attached to textarea's onKeyDown
   */
  readonly handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useSubmitShortcut - Provides keyboard shortcut handling for form submission
 *
 * @param options - Hook options containing onSubmit callback and disabled flag
 * @returns Object containing handleKeyDown event handler
 *
 * @example
 * ```tsx
 * function MyDialog() {
 *   const { handleKeyDown } = useSubmitShortcut({
 *     onSubmit: handleFormSubmit,
 *     disabled: !isValid,
 *   });
 *
 *   return (
 *     <textarea
 *       value={value}
 *       onChange={(e) => setValue(e.target.value)}
 *       onKeyDown={handleKeyDown}
 *     />
 *   );
 * }
 * ```
 */
export function useSubmitShortcut(
  options: UseSubmitShortcutOptions
): UseSubmitShortcutReturn {
  const { onSubmit, disabled = false } = options;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Requirement 3.1: IME変換中はショートカット無視
      if (event.nativeEvent.isComposing) {
        return;
      }

      // Check if Enter key is pressed
      if (event.key !== 'Enter') {
        return;
      }

      // Check if modifier key is pressed (Cmd for macOS, Ctrl for Windows/Linux)
      // Requirement 1.1: macOSでCmd+Enterでフォーム送信
      // Requirement 1.2: Windows/LinuxでCtrl+Enterで送信
      const isSubmitShortcut = event.metaKey || event.ctrlKey;

      if (!isSubmitShortcut) {
        // Requirement 1.3: Enterのみで改行挿入（送信しない）
        // Let the default behavior (newline) happen
        return;
      }

      // Requirement 1.4: disabled時はショートカット無視
      if (disabled) {
        return;
      }

      // Prevent default behavior and trigger submit
      event.preventDefault();
      onSubmit();
    },
    [onSubmit, disabled]
  );

  return { handleKeyDown };
}
