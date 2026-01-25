/**
 * ImplMode Types Unit Tests
 * impl-mode-toggle: Task 1.1
 *
 * TDD: Testing ImplMode type definitions and helper functions
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';
import {
  isImplMode,
  getImplMode,
  DEFAULT_IMPL_MODE,
  type ImplMode,
  type ImplConfig,
} from './implMode';

describe('ImplMode type', () => {
  // =============================================================================
  // Requirement 1.2: impl.mode が 'sequential' または 'parallel' を持つ
  // =============================================================================
  describe('ImplMode values', () => {
    it('should accept "sequential" as valid ImplMode', () => {
      const mode: ImplMode = 'sequential';
      expect(mode).toBe('sequential');
    });

    it('should accept "parallel" as valid ImplMode', () => {
      const mode: ImplMode = 'parallel';
      expect(mode).toBe('parallel');
    });
  });

  // =============================================================================
  // Requirement 1.1: spec.json に impl オブジェクトを追加
  // =============================================================================
  describe('ImplConfig interface', () => {
    it('should create valid ImplConfig with sequential mode', () => {
      const config: ImplConfig = {
        mode: 'sequential',
      };
      expect(config.mode).toBe('sequential');
    });

    it('should create valid ImplConfig with parallel mode', () => {
      const config: ImplConfig = {
        mode: 'parallel',
      };
      expect(config.mode).toBe('parallel');
    });
  });
});

describe('isImplMode type guard', () => {
  // =============================================================================
  // Type guard for runtime validation
  // =============================================================================
  it('should return true for "sequential"', () => {
    expect(isImplMode('sequential')).toBe(true);
  });

  it('should return true for "parallel"', () => {
    expect(isImplMode('parallel')).toBe(true);
  });

  it('should return false for invalid string values', () => {
    expect(isImplMode('invalid')).toBe(false);
    expect(isImplMode('auto')).toBe(false);
    expect(isImplMode('batch')).toBe(false);
    expect(isImplMode('')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(isImplMode(null)).toBe(false);
    expect(isImplMode(undefined)).toBe(false);
    expect(isImplMode(123)).toBe(false);
    expect(isImplMode(true)).toBe(false);
    expect(isImplMode({})).toBe(false);
    expect(isImplMode([])).toBe(false);
  });
});

describe('getImplMode helper', () => {
  // =============================================================================
  // Requirement 1.3: フィールド未存在時のデフォルト 'sequential'
  // =============================================================================
  describe('default value handling', () => {
    it('should return "sequential" as default when impl is undefined', () => {
      const specJson = {};
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should return "sequential" as default when impl.mode is undefined', () => {
      const specJson = { impl: {} };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should return "sequential" as default when impl.mode is invalid', () => {
      const specJson = { impl: { mode: 'invalid' } };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should return "sequential" as default when impl.mode is null', () => {
      const specJson = { impl: { mode: null } };
      expect(getImplMode(specJson)).toBe('sequential');
    });
  });

  describe('valid mode retrieval', () => {
    it('should return "sequential" when impl.mode is "sequential"', () => {
      const specJson = { impl: { mode: 'sequential' } };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should return "parallel" when impl.mode is "parallel"', () => {
      const specJson = { impl: { mode: 'parallel' } };
      expect(getImplMode(specJson)).toBe('parallel');
    });
  });
});

describe('DEFAULT_IMPL_MODE constant', () => {
  // =============================================================================
  // Requirement 1.3: デフォルト値 'sequential'
  // =============================================================================
  it('should be "sequential"', () => {
    expect(DEFAULT_IMPL_MODE).toBe('sequential');
  });
});
