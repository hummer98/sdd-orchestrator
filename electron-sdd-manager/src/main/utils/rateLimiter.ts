/**
 * Rate Limiter Utility
 * Implements sliding window rate limiting for API requests
 * Requirements: 9.3, 9.4 - リクエストレート制限
 */

/**
 * Configuration options for the rate limiter
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Internal record of a client's request history
 */
interface ClientRecord {
  /** Array of request timestamps within the current window */
  timestamps: number[];
  /** Start time of the current window */
  windowStart: number;
}

/**
 * Rate limiter using sliding window algorithm
 *
 * Tracks requests per client using a sliding time window.
 * When the limit is exceeded, new requests are rejected until
 * older requests fall outside the time window.
 *
 * @example
 * const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
 * if (await limiter.consume(clientIp)) {
 *   // Request allowed
 * } else {
 *   // Rate limited
 * }
 */
export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly clients: Map<string, ClientRecord>;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.clients = new Map();
  }

  /**
   * Attempt to consume a rate limit point for a client
   *
   * @param clientId Unique identifier for the client (typically IP address)
   * @returns true if the request is allowed, false if rate limited
   */
  async consume(clientId: string): Promise<boolean> {
    const now = Date.now();
    const record = this.getOrCreateRecord(clientId, now);

    // Clean up old timestamps outside the window
    this.cleanupOldTimestamps(record, now);

    // Check if we're at the limit
    if (record.timestamps.length >= this.config.maxRequests) {
      return false;
    }

    // Add this request's timestamp
    record.timestamps.push(now);
    return true;
  }

  /**
   * Get the remaining number of requests allowed for a client
   *
   * @param clientId Unique identifier for the client
   * @returns Number of remaining requests in the current window
   */
  async getRemainingPoints(clientId: string): Promise<number> {
    const record = this.clients.get(clientId);

    if (!record) {
      return this.config.maxRequests;
    }

    const now = Date.now();
    this.cleanupOldTimestamps(record, now);

    return Math.max(0, this.config.maxRequests - record.timestamps.length);
  }

  /**
   * Get the time in seconds until the rate limit resets for a client
   *
   * @param clientId Unique identifier for the client
   * @returns Seconds until the oldest request expires, or 0 if no active requests
   */
  async getResetTime(clientId: string): Promise<number> {
    const record = this.clients.get(clientId);

    if (!record || record.timestamps.length === 0) {
      return 0;
    }

    const now = Date.now();
    this.cleanupOldTimestamps(record, now);

    if (record.timestamps.length === 0) {
      return 0;
    }

    // Find the oldest timestamp and calculate when it will expire
    const oldestTimestamp = record.timestamps[0];
    const expiresAt = oldestTimestamp + this.config.windowMs;
    const remainingMs = Math.max(0, expiresAt - now);

    return Math.ceil(remainingMs / 1000);
  }

  /**
   * Clear all rate limiting data for all clients
   */
  clear(): void {
    this.clients.clear();
  }

  /**
   * Clear rate limiting data for a specific client
   *
   * @param clientId Unique identifier for the client
   */
  clearClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Get or create a record for a client
   */
  private getOrCreateRecord(clientId: string, now: number): ClientRecord {
    let record = this.clients.get(clientId);

    if (!record) {
      record = {
        timestamps: [],
        windowStart: now,
      };
      this.clients.set(clientId, record);
    }

    return record;
  }

  /**
   * Remove timestamps that are outside the sliding window
   */
  private cleanupOldTimestamps(record: ClientRecord, now: number): void {
    const cutoff = now - this.config.windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
  }
}

/**
 * Default rate limiter instance for remote access
 * Configured for 100 requests per minute as per requirements
 */
export const defaultRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});
