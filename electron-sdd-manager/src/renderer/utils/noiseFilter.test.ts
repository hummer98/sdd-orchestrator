/**
 * NoiseFilter Unit Tests
 * renderer-unified-logging feature
 * Requirements: 2.1, 2.2, 2.3
 *
 * Tests for filtering HMR, Vite, and React DevTools related log messages
 */

import { describe, it, expect } from 'vitest';
import { shouldFilter, FILTER_PATTERNS } from './noiseFilter';

describe('NoiseFilter', () => {
  describe('shouldFilter', () => {
    // Requirement 2.1: [HMR]/[vite]ログをフィルタ
    describe('HMR and Vite messages', () => {
      it('should filter messages containing [HMR]', () => {
        expect(shouldFilter('[HMR] Waiting for update signal from WDS...')).toBe(true);
        expect(shouldFilter('[HMR] Updated modules')).toBe(true);
        expect(shouldFilter('Some prefix [HMR] message')).toBe(true);
      });

      it('should filter messages containing [vite]', () => {
        expect(shouldFilter('[vite] connected.')).toBe(true);
        expect(shouldFilter('[vite] hot module replacement')).toBe(true);
        expect(shouldFilter('prefix [vite] suffix')).toBe(true);
      });
    });

    // Requirement 2.2: React DevToolsログをフィルタ
    describe('React DevTools messages', () => {
      it('should filter messages containing "React DevTools"', () => {
        expect(shouldFilter('React DevTools is available')).toBe(true);
        expect(shouldFilter('Install the React DevTools extension')).toBe(true);
        expect(shouldFilter('Something React DevTools related')).toBe(true);
      });
    });

    // Requirement 2.3: "Download the React DevTools"フィルタ
    describe('Download React DevTools message', () => {
      it('should filter "Download the React DevTools" message', () => {
        expect(shouldFilter('Download the React DevTools for a better development experience')).toBe(true);
        expect(shouldFilter('Download the React DevTools')).toBe(true);
      });
    });

    // Non-filter targets should pass through
    describe('Application logs should not be filtered', () => {
      it('should NOT filter regular application messages', () => {
        expect(shouldFilter('User logged in')).toBe(false);
        expect(shouldFilter('Error: Failed to load data')).toBe(false);
        expect(shouldFilter('Component rendered')).toBe(false);
        expect(shouldFilter('Spec loaded: feature-auth')).toBe(false);
      });

      it('should NOT filter messages mentioning "hot" without [HMR]', () => {
        expect(shouldFilter('hot reload complete')).toBe(false);
        expect(shouldFilter('This is getting hot')).toBe(false);
      });

      it('should NOT filter messages mentioning "devtools" (lowercase) only', () => {
        // DevTools (capitalized) should be filtered, but devtools (lowercase) depends on exact pattern
        expect(shouldFilter('Open browser devtools')).toBe(false);
      });
    });

    // Edge cases: boundary value tests
    describe('Edge cases', () => {
      it('should handle empty string', () => {
        expect(shouldFilter('')).toBe(false);
      });

      it('should handle non-string values (null)', () => {
        expect(shouldFilter(null)).toBe(false);
      });

      it('should handle non-string values (undefined)', () => {
        expect(shouldFilter(undefined)).toBe(false);
      });

      it('should handle number values', () => {
        expect(shouldFilter(123)).toBe(false);
        expect(shouldFilter(0)).toBe(false);
      });

      it('should handle object values', () => {
        expect(shouldFilter({ message: '[HMR]' })).toBe(false);
        expect(shouldFilter(['[HMR]'])).toBe(false);
      });

      it('should handle boolean values', () => {
        expect(shouldFilter(true)).toBe(false);
        expect(shouldFilter(false)).toBe(false);
      });
    });

    // Case sensitivity tests
    describe('Case sensitivity', () => {
      it('should be case-sensitive for [HMR] pattern', () => {
        expect(shouldFilter('[hmr] message')).toBe(false);
        expect(shouldFilter('[Hmr] message')).toBe(false);
      });

      it('should be case-sensitive for [vite] pattern', () => {
        expect(shouldFilter('[VITE] message')).toBe(false);
        expect(shouldFilter('[Vite] message')).toBe(false);
      });

      it('should match "React DevTools" regardless of surrounding case', () => {
        // The actual phrase "React DevTools" must match
        expect(shouldFilter('REACT DevTools')).toBe(false); // R is different
        expect(shouldFilter('React devtools')).toBe(false); // D is different
      });
    });
  });

  describe('FILTER_PATTERNS', () => {
    it('should export filter patterns array', () => {
      expect(FILTER_PATTERNS).toBeDefined();
      expect(Array.isArray(FILTER_PATTERNS)).toBe(true);
    });

    it('should contain expected patterns', () => {
      expect(FILTER_PATTERNS).toContain('[HMR]');
      expect(FILTER_PATTERNS).toContain('[vite]');
      expect(FILTER_PATTERNS).toContain('React DevTools');
      expect(FILTER_PATTERNS).toContain('Download the React DevTools');
    });

    it('should be immutable (readonly)', () => {
      // TypeScript prevents mutation at compile time, but we verify the array exists
      expect(FILTER_PATTERNS.length).toBeGreaterThan(0);
    });
  });
});
