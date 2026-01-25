/**
 * ImplMode Auto-Execution Tests
 * impl-mode-toggle: Task 5.3
 *
 * Tests for auto-execution flow that verifies execute-next-phase reads impl.mode
 * from spec.json and executes with the correct type.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getImplMode, isImplMode, DEFAULT_IMPL_MODE, type ImplMode } from '@renderer/types/implMode';

// =============================================================================
// Test getImplMode function (used by execute-next-phase handler)
// Requirements: 4.1, 4.4
// =============================================================================
describe('getImplMode for auto-execution (impl-mode-toggle Task 5.3)', () => {
  // ---------------------------------------------------------------------------
  // Requirement 4.1: Auto execution reads impl.mode
  // ---------------------------------------------------------------------------
  describe('impl.mode reading (Requirement 4.1)', () => {
    it('should read sequential mode from spec.json', () => {
      const specJson = {
        impl: { mode: 'sequential' },
      };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should read parallel mode from spec.json', () => {
      const specJson = {
        impl: { mode: 'parallel' },
      };
      expect(getImplMode(specJson)).toBe('parallel');
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 4.2: sequential mode uses type: 'impl'
  // Requirement 4.3: parallel mode uses type: 'auto-impl'
  // ---------------------------------------------------------------------------
  describe('execution type determination (Requirements 4.2, 4.3)', () => {
    it('should determine type: impl for sequential mode', () => {
      const specJson = { impl: { mode: 'sequential' } };
      const implMode = getImplMode(specJson);
      const executeType = implMode === 'parallel' ? 'auto-impl' : 'impl';
      expect(executeType).toBe('impl');
    });

    it('should determine type: auto-impl for parallel mode', () => {
      const specJson = { impl: { mode: 'parallel' } };
      const implMode = getImplMode(specJson);
      const executeType = implMode === 'parallel' ? 'auto-impl' : 'impl';
      expect(executeType).toBe('auto-impl');
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 4.4: Default to sequential when impl.mode is not set
  // ---------------------------------------------------------------------------
  describe('default fallback (Requirement 4.4)', () => {
    it('should default to sequential when impl field is missing', () => {
      const specJson = {};
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should default to sequential when impl.mode is missing', () => {
      const specJson = { impl: {} };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should default to sequential when impl.mode is invalid', () => {
      const specJson = { impl: { mode: 'invalid-mode' } };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should default to sequential when impl.mode is null', () => {
      const specJson = { impl: { mode: null } };
      expect(getImplMode(specJson)).toBe('sequential');
    });

    it('should default to sequential when impl.mode is undefined', () => {
      const specJson = { impl: { mode: undefined } };
      expect(getImplMode(specJson)).toBe('sequential');
    });
  });
});

// =============================================================================
// Test isImplMode type guard (used for validation)
// =============================================================================
describe('isImplMode type guard (impl-mode-toggle Task 5.3)', () => {
  it('should validate sequential as valid ImplMode', () => {
    expect(isImplMode('sequential')).toBe(true);
  });

  it('should validate parallel as valid ImplMode', () => {
    expect(isImplMode('parallel')).toBe(true);
  });

  it('should reject invalid mode strings', () => {
    expect(isImplMode('batch')).toBe(false);
    expect(isImplMode('auto')).toBe(false);
    expect(isImplMode('')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(isImplMode(null)).toBe(false);
    expect(isImplMode(undefined)).toBe(false);
    expect(isImplMode(123)).toBe(false);
  });
});

// =============================================================================
// Test DEFAULT_IMPL_MODE constant
// =============================================================================
describe('DEFAULT_IMPL_MODE constant (impl-mode-toggle Task 5.3)', () => {
  it('should be sequential', () => {
    expect(DEFAULT_IMPL_MODE).toBe('sequential');
  });
});

// =============================================================================
// Simulated execute-next-phase logic test
// This tests the logic that will be used in handlers.ts
// =============================================================================
describe('execute-next-phase impl phase logic (impl-mode-toggle Task 5.3)', () => {
  interface MockSpecJson {
    impl?: {
      mode?: unknown;
    };
  }

  interface ExecuteOptions {
    type: 'impl' | 'auto-impl';
    specId: string;
    featureName: string;
    commandPrefix: string;
  }

  function determineExecuteOptions(specJson: MockSpecJson, specId: string): ExecuteOptions {
    // Logic from handlers.ts execute-next-phase for impl phase
    let implMode: ImplMode = 'sequential'; // Default (Req 4.4)
    if (specJson.impl?.mode) {
      const mode = specJson.impl.mode;
      if (mode === 'parallel' || mode === 'sequential') {
        implMode = mode;
      }
    }

    // Req 4.2: sequential -> type: 'impl'
    // Req 4.3: parallel -> type: 'auto-impl'
    const executeType = implMode === 'parallel' ? 'auto-impl' : 'impl';

    return {
      type: executeType,
      specId,
      featureName: specId,
      commandPrefix: 'kiro',
    };
  }

  it('should return type: impl for sequential mode', () => {
    const options = determineExecuteOptions({ impl: { mode: 'sequential' } }, 'test-spec');
    expect(options.type).toBe('impl');
  });

  it('should return type: auto-impl for parallel mode', () => {
    const options = determineExecuteOptions({ impl: { mode: 'parallel' } }, 'test-spec');
    expect(options.type).toBe('auto-impl');
  });

  it('should return type: impl for missing impl.mode (default)', () => {
    const options = determineExecuteOptions({}, 'test-spec');
    expect(options.type).toBe('impl');
  });

  it('should return type: impl for invalid impl.mode (fallback to default)', () => {
    const options = determineExecuteOptions({ impl: { mode: 'invalid' } }, 'test-spec');
    expect(options.type).toBe('impl');
  });
});
