/**
 * Log Buffer Service
 * Ring buffer for storing recent log entries
 * Requirements: 4.2 - ログ履歴の保持と配信
 */

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Unix timestamp in milliseconds */
  readonly timestamp: number;
  /** ID of the agent that produced this log */
  readonly agentId: string;
  /** Output stream (stdout or stderr) */
  readonly stream: 'stdout' | 'stderr';
  /** Log message content */
  readonly data: string;
  /** Log type for UI display */
  readonly type: 'info' | 'warning' | 'error' | 'agent';
}

/**
 * Configuration options for the log buffer
 */
export interface LogBufferConfig {
  /** Maximum number of entries to store */
  maxEntries: number;
}

/**
 * Ring buffer for storing log entries
 *
 * Maintains a fixed-size buffer of log entries using FIFO (First-In-First-Out)
 * semantics. When the buffer is full, the oldest entries are discarded to
 * make room for new ones.
 *
 * @example
 * const buffer = new LogBuffer({ maxEntries: 100 });
 * buffer.add({
 *   timestamp: Date.now(),
 *   agentId: 'agent-1',
 *   stream: 'stdout',
 *   data: 'Hello, world!',
 *   type: 'info'
 * });
 * const entries = buffer.getAll();
 */
export class LogBuffer {
  private readonly config: LogBufferConfig;
  private entries: LogEntry[];

  constructor(config: LogBufferConfig) {
    this.config = config;
    this.entries = [];
  }

  /**
   * Add a log entry to the buffer
   *
   * If the buffer is at capacity, the oldest entry is removed
   * to make room for the new one.
   *
   * @param entry The log entry to add
   */
  add(entry: LogEntry): void {
    // If at capacity, remove the oldest entry
    if (this.entries.length >= this.config.maxEntries) {
      this.entries.shift();
    }

    this.entries.push(entry);
  }

  /**
   * Get all log entries in the buffer
   *
   * Returns a copy of the entries array to prevent external modification.
   * Entries are ordered from oldest to newest.
   *
   * @returns A read-only array of log entries
   */
  getAll(): readonly LogEntry[] {
    // Return a copy to prevent external modification
    return [...this.entries];
  }

  /**
   * Clear all entries from the buffer
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get the current number of entries in the buffer
   *
   * @returns The number of entries currently stored
   */
  size(): number {
    return this.entries.length;
  }
}

/**
 * Default log buffer instance for remote access
 * Configured for 100 entries as per requirements
 */
export const defaultLogBuffer = new LogBuffer({
  maxEntries: 100,
});
