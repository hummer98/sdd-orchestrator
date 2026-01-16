/**
 * NoiseFilter Module
 * renderer-unified-logging feature
 * Requirements: 2.1, 2.2, 2.3
 *
 * Filters HMR, Vite, and React DevTools related log messages
 * to prevent noise from reaching the main process log files.
 */

/**
 * Default filter patterns for noise messages
 * Requirements: 2.1, 2.2, 2.3
 * - [HMR]: Hot Module Replacement messages
 * - [vite]: Vite dev server messages
 * - React DevTools: React DevTools related messages
 * - Download the React DevTools: Specific React DevTools prompt
 */
export const FILTER_PATTERNS: readonly string[] = [
  '[HMR]',
  '[vite]',
  'React DevTools',
  'Download the React DevTools',
] as const;

/**
 * Check if a message should be filtered (not sent to Main process)
 * Requirements: 2.1, 2.2, 2.3
 *
 * @param message - Log message (first argument of console.*)
 * @returns true if message should be skipped (filtered), false if it should be sent
 */
export function shouldFilter(message: unknown): boolean {
  // Only process string messages
  if (typeof message !== 'string') {
    return false;
  }

  // Empty strings should not be filtered
  if (message === '') {
    return false;
  }

  // Check if message contains any of the filter patterns
  for (const pattern of FILTER_PATTERNS) {
    if (message.includes(pattern)) {
      return true;
    }
  }

  return false;
}
