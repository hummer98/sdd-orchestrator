/**
 * ContextProvider Unit Tests
 * renderer-unified-logging feature
 * Requirements: 4.1, 4.2, 4.3
 *
 * Tests for automatic context extraction from stores for logging
 * github-issue-integration: bugStore removed, only specDetailStore used
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the stores before importing the module
vi.mock('../stores/spec/specDetailStore', () => ({
  useSpecDetailStore: {
    getState: vi.fn(() => ({
      specDetail: null,
    })),
  },
}));

// Now import the module under test and the mocked stores
import { getAutoContext, type LogContext } from './contextProvider';
import { useSpecDetailStore } from '../stores/spec/specDetailStore';

describe('ContextProvider', () => {
  beforeEach(() => {
    // Reset mock implementations before each test
    vi.mocked(useSpecDetailStore.getState).mockReturnValue({
      specDetail: null,
    } as ReturnType<typeof useSpecDetailStore.getState>);
  });

  describe('getAutoContext', () => {
    // Requirement 4.1: specId in context when selected
    describe('specId context', () => {
      it('should include specId when spec is selected', () => {
        vi.mocked(useSpecDetailStore.getState).mockReturnValue({
          specDetail: {
            metadata: { name: 'test-feature' },
          },
        } as ReturnType<typeof useSpecDetailStore.getState>);

        const context = getAutoContext();

        expect(context.specId).toBe('test-feature');
      });

      it('should not include specId when specDetail is null', () => {
        vi.mocked(useSpecDetailStore.getState).mockReturnValue({
          specDetail: null,
        } as ReturnType<typeof useSpecDetailStore.getState>);

        const context = getAutoContext();

        expect(context.specId).toBeUndefined();
      });

      it('should not include specId when metadata.name is undefined', () => {
        vi.mocked(useSpecDetailStore.getState).mockReturnValue({
          specDetail: {
            metadata: {},
          },
        } as ReturnType<typeof useSpecDetailStore.getState>);

        const context = getAutoContext();

        expect(context.specId).toBeUndefined();
      });

      it('should not include specId when metadata is undefined', () => {
        vi.mocked(useSpecDetailStore.getState).mockReturnValue({
          specDetail: {},
        } as ReturnType<typeof useSpecDetailStore.getState>);

        const context = getAutoContext();

        expect(context.specId).toBeUndefined();
      });
    });

    // bugStore removed (github-issue-integration)
    // bugName context tests removed

    // Requirement 4.3: Empty object when nothing selected
    describe('empty context', () => {
      it('should return empty object when no spec is selected', () => {
        const context = getAutoContext();

        expect(context).toEqual({});
        expect(Object.keys(context)).toHaveLength(0);
      });
    });

    // Store error handling (fallback)
    describe('store error handling', () => {
      it('should return empty object if specDetailStore throws', () => {
        vi.mocked(useSpecDetailStore.getState).mockImplementation(() => {
          throw new Error('Store not initialized');
        });

        const context = getAutoContext();

        expect(context).toEqual({});
      });
    });

    // Type validation
    describe('return type', () => {
      it('should return a plain object (not null or undefined)', () => {
        const context = getAutoContext();

        expect(context).toBeDefined();
        expect(context).not.toBeNull();
        expect(typeof context).toBe('object');
      });

      it('should be safe to pass to JSON.stringify', () => {
        vi.mocked(useSpecDetailStore.getState).mockReturnValue({
          specDetail: {
            metadata: { name: 'feature-test' },
          },
        } as ReturnType<typeof useSpecDetailStore.getState>);

        const context = getAutoContext();

        expect(() => JSON.stringify(context)).not.toThrow();
      });
    });
  });

  describe('LogContext type', () => {
    it('should allow optional specId', () => {
      const context: LogContext = {};
      expect(context.specId).toBeUndefined();
    });

    it('should allow optional bugName', () => {
      const context: LogContext = {};
      expect(context.bugName).toBeUndefined();
    });

    it('should allow both specId and bugName', () => {
      const context: LogContext = {
        specId: 'test',
        bugName: 'bug',
      };
      expect(context.specId).toBe('test');
      expect(context.bugName).toBe('bug');
    });

    it('should allow additional properties', () => {
      const context: LogContext = {
        specId: 'test',
        customKey: 'customValue',
      };
      expect(context.customKey).toBe('customValue');
    });
  });
});
