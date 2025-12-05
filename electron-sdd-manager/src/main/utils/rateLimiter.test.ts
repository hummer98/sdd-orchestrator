/**
 * RateLimiter Unit Tests
 * TDD: Testing rate limiting functionality
 * Requirements: 9.3, 9.4 - リクエストレート制限
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    // Default: 100 requests per minute
    rateLimiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('consume', () => {
    it('should allow requests within the limit', async () => {
      const clientId = '192.168.1.1';

      // First request should be allowed
      const result = await rateLimiter.consume(clientId);
      expect(result).toBe(true);
    });

    it('should allow up to maxRequests within the time window', async () => {
      const clientId = '192.168.1.1';

      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        const result = await rateLimiter.consume(clientId);
        expect(result).toBe(true);
      }
    });

    it('should deny requests when limit is exceeded', async () => {
      const clientId = '192.168.1.1';

      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        await rateLimiter.consume(clientId);
      }

      // 101st request should be denied
      const result = await rateLimiter.consume(clientId);
      expect(result).toBe(false);
    });

    it('should track different clients separately', async () => {
      const client1 = '192.168.1.1';
      const client2 = '192.168.1.2';

      // Exhaust client1's limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter.consume(client1);
      }

      // client2 should still be allowed
      const result = await rateLimiter.consume(client2);
      expect(result).toBe(true);

      // client1 should be denied
      const result2 = await rateLimiter.consume(client1);
      expect(result2).toBe(false);
    });

    it('should reset after the time window passes', async () => {
      const clientId = '192.168.1.1';

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter.consume(clientId);
      }

      // Should be denied
      expect(await rateLimiter.consume(clientId)).toBe(false);

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000);

      // Should be allowed again
      expect(await rateLimiter.consume(clientId)).toBe(true);
    });

    it('should use sliding window for gradual reset', async () => {
      const clientId = '192.168.1.1';

      // Make 50 requests at t=0
      for (let i = 0; i < 50; i++) {
        await rateLimiter.consume(clientId);
      }

      // Advance 30 seconds
      vi.advanceTimersByTime(30000);

      // Make 50 more requests (total should still be under 100 for the sliding window)
      for (let i = 0; i < 50; i++) {
        const result = await rateLimiter.consume(clientId);
        expect(result).toBe(true);
      }
    });
  });

  describe('getRemainingPoints', () => {
    it('should return full points for new client', async () => {
      const clientId = '192.168.1.1';
      const remaining = await rateLimiter.getRemainingPoints(clientId);
      expect(remaining).toBe(100);
    });

    it('should decrease as requests are made', async () => {
      const clientId = '192.168.1.1';

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await rateLimiter.consume(clientId);
      }

      const remaining = await rateLimiter.getRemainingPoints(clientId);
      expect(remaining).toBe(90);
    });

    it('should return 0 when limit is exhausted', async () => {
      const clientId = '192.168.1.1';

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter.consume(clientId);
      }

      const remaining = await rateLimiter.getRemainingPoints(clientId);
      expect(remaining).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('should return 0 for new client', async () => {
      const clientId = '192.168.1.1';
      const resetTime = await rateLimiter.getResetTime(clientId);
      expect(resetTime).toBe(0);
    });

    it('should return time until reset when requests have been made', async () => {
      const clientId = '192.168.1.1';

      // Make a request
      await rateLimiter.consume(clientId);

      const resetTime = await rateLimiter.getResetTime(clientId);
      // Should be close to 60 seconds (within a small margin)
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60);
    });

    it('should return remaining time until reset for exhausted client', async () => {
      const clientId = '192.168.1.1';

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter.consume(clientId);
      }

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      const resetTime = await rateLimiter.getResetTime(clientId);
      // Should be approximately 30 seconds remaining
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(30);
    });
  });

  describe('clear', () => {
    it('should clear all client data', async () => {
      const client1 = '192.168.1.1';
      const client2 = '192.168.1.2';

      // Make some requests
      for (let i = 0; i < 50; i++) {
        await rateLimiter.consume(client1);
      }
      for (let i = 0; i < 30; i++) {
        await rateLimiter.consume(client2);
      }

      // Clear all data
      rateLimiter.clear();

      // Both clients should have full points again
      expect(await rateLimiter.getRemainingPoints(client1)).toBe(100);
      expect(await rateLimiter.getRemainingPoints(client2)).toBe(100);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom maxRequests', async () => {
      const customLimiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });
      const clientId = '192.168.1.1';

      // Make 5 requests (custom limit)
      for (let i = 0; i < 5; i++) {
        expect(await customLimiter.consume(clientId)).toBe(true);
      }

      // 6th request should be denied
      expect(await customLimiter.consume(clientId)).toBe(false);
    });

    it('should respect custom windowMs', async () => {
      const customLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 10000, // 10 seconds
      });
      const clientId = '192.168.1.1';

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await customLimiter.consume(clientId);
      }

      expect(await customLimiter.consume(clientId)).toBe(false);

      // Advance 10 seconds
      vi.advanceTimersByTime(10000);

      // Should be allowed again
      expect(await customLimiter.consume(clientId)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty clientId', async () => {
      const result = await rateLimiter.consume('');
      expect(result).toBe(true);
    });

    it('should handle concurrent requests from same client', async () => {
      const clientId = '192.168.1.1';

      // Make 100 concurrent requests
      const promises = Array(100)
        .fill(null)
        .map(() => rateLimiter.consume(clientId));

      const results = await Promise.all(promises);

      // All 100 should succeed
      expect(results.filter((r) => r === true).length).toBe(100);

      // Next request should fail
      expect(await rateLimiter.consume(clientId)).toBe(false);
    });
  });
});
