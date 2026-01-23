/**
 * Throttle utility function
 * Limits the rate at which a function can be called
 */

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per every `wait` milliseconds.
 *
 * @param fn - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      // Enough time has passed, call immediately
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // Schedule a call for when the wait period ends
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };

  return throttled as T;
}
