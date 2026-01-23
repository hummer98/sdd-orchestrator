/**
 * Time Format Utilities
 * Task 7.3: Time format utility for human-readable durations
 * Requirements: 5.6
 */

/**
 * Format milliseconds to human-readable duration with all components
 * Format: "Xh Ym Zs" where X, Y, Z are always shown
 * Examples: "0s", "30s", "5m 30s", "1h 23m 0s", "4h 35m 0s"
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  // Handle negative values and very small values
  if (ms < 1000) {
    return '0s';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Format milliseconds to compact human-readable duration
 * Omits trailing zero components for cleaner display
 * Examples: "0s", "30s", "5m", "5m 30s", "1h 23m", "4h 35m"
 *
 * @param ms - Duration in milliseconds
 * @returns Compact formatted duration string
 */
export function formatDurationCompact(ms: number): string {
  // Handle negative values and very small values
  if (ms < 1000) {
    return '0s';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  // Show minutes if there are hours, or if minutes > 0
  if (hours > 0 || minutes > 0) {
    // If we have hours, always show minutes (even if 0) when there are seconds
    if (hours > 0 && minutes === 0 && seconds > 0) {
      parts.push('0m');
    } else if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
  }

  // Show seconds only if it's the only component or if there are non-zero seconds
  if (seconds > 0 || (hours === 0 && minutes === 0)) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}
