/**
 * ReviewEngineRegistry Tests
 * TDD: Testing review engine registry
 * gemini-document-review Requirements: 9.1, 9.2, 9.3, 9.5
 */

import { describe, it, expect } from 'vitest';
import {
  REVIEW_ENGINES,
  getReviewEngine,
  getAvailableEngines,
  type ReviewerScheme,
  type ReviewEngineConfig,
  DEFAULT_REVIEWER_SCHEME,
  DEBATEX_ERRORS,
  isDebatexNotInstalledError,
  getDebatexErrorInfo,
} from './reviewEngineRegistry';

describe('ReviewEngineRegistry', () => {
  // ============================================================
  // Task 1.2: REVIEW_ENGINES constant
  // Requirements: 9.1, 9.2
  // ============================================================
  describe('REVIEW_ENGINES constant', () => {
    it('should define claude-code engine', () => {
      expect(REVIEW_ENGINES['claude-code']).toBeDefined();
      expect(REVIEW_ENGINES['claude-code'].label).toBe('Claude');
      expect(REVIEW_ENGINES['claude-code'].command).toBe('claude');
      expect(REVIEW_ENGINES['claude-code'].outputFormat).toBe('jsonl');
    });

    it('should define gemini-cli engine', () => {
      expect(REVIEW_ENGINES['gemini-cli']).toBeDefined();
      expect(REVIEW_ENGINES['gemini-cli'].label).toBe('Gemini');
      expect(REVIEW_ENGINES['gemini-cli'].command).toBe('gemini');
      expect(REVIEW_ENGINES['gemini-cli'].outputFormat).toBe('jsonl');
    });

    it('should define debatex engine', () => {
      expect(REVIEW_ENGINES['debatex']).toBeDefined();
      expect(REVIEW_ENGINES['debatex'].label).toBe('Debatex');
      expect(REVIEW_ENGINES['debatex'].command).toEqual(['npx', 'debatex']);
      expect(REVIEW_ENGINES['debatex'].outputFormat).toBe('text');
    });

    it('should have colorClass for each engine', () => {
      expect(REVIEW_ENGINES['claude-code'].colorClass).toContain('blue');
      expect(REVIEW_ENGINES['gemini-cli'].colorClass).toContain('purple');
      expect(REVIEW_ENGINES['debatex'].colorClass).toContain('green');
    });

    it('should have buildArgs function for each engine', () => {
      expect(typeof REVIEW_ENGINES['claude-code'].buildArgs).toBe('function');
      expect(typeof REVIEW_ENGINES['gemini-cli'].buildArgs).toBe('function');
      expect(typeof REVIEW_ENGINES['debatex'].buildArgs).toBe('function');
    });
  });

  // ============================================================
  // Task 1.2: buildArgs functions
  // Requirements: 6.4, 6.5
  // ============================================================
  describe('buildArgs functions', () => {
    it('should build correct args for claude-code', () => {
      const args = REVIEW_ENGINES['claude-code'].buildArgs('my-feature');
      expect(args).toContain('/kiro:document-review my-feature');
    });

    it('should build correct args for gemini-cli with --yolo flag', () => {
      const args = REVIEW_ENGINES['gemini-cli'].buildArgs('my-feature');
      expect(args).toContain('--yolo');
    });

    it('should build correct args for gemini-cli with --output-format stream-json', () => {
      const args = REVIEW_ENGINES['gemini-cli'].buildArgs('my-feature');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
    });

    it('should build correct args for debatex', () => {
      const args = REVIEW_ENGINES['debatex'].buildArgs('my-feature');
      expect(args).toContain('sdd-document-review');
      expect(args).toContain('my-feature');
    });
  });

  // ============================================================
  // Task 1.2: getReviewEngine function
  // Requirements: 9.5
  // ============================================================
  describe('getReviewEngine function', () => {
    it('should return claude-code engine config', () => {
      const engine = getReviewEngine('claude-code');
      expect(engine.label).toBe('Claude');
    });

    it('should return gemini-cli engine config', () => {
      const engine = getReviewEngine('gemini-cli');
      expect(engine.label).toBe('Gemini');
    });

    it('should return debatex engine config', () => {
      const engine = getReviewEngine('debatex');
      expect(engine.label).toBe('Debatex');
    });

    it('should fallback to claude-code for undefined scheme', () => {
      const engine = getReviewEngine(undefined);
      expect(engine.label).toBe('Claude');
    });

    it('should fallback to claude-code for unknown scheme', () => {
      const engine = getReviewEngine('unknown' as ReviewerScheme);
      expect(engine.label).toBe('Claude');
    });
  });

  // ============================================================
  // Task 1.2: getAvailableEngines function
  // Requirements: 9.4
  // ============================================================
  describe('getAvailableEngines function', () => {
    it('should return all three engines', () => {
      const engines = getAvailableEngines();
      expect(engines).toHaveLength(3);
    });

    it('should include scheme, label, and colorClass for each engine', () => {
      const engines = getAvailableEngines();
      engines.forEach((engine) => {
        expect(engine.scheme).toBeDefined();
        expect(engine.label).toBeDefined();
        expect(engine.colorClass).toBeDefined();
      });
    });

    it('should include claude-code engine', () => {
      const engines = getAvailableEngines();
      const claudeEngine = engines.find((e) => e.scheme === 'claude-code');
      expect(claudeEngine).toBeDefined();
      expect(claudeEngine?.label).toBe('Claude');
    });

    it('should include gemini-cli engine', () => {
      const engines = getAvailableEngines();
      const geminiEngine = engines.find((e) => e.scheme === 'gemini-cli');
      expect(geminiEngine).toBeDefined();
      expect(geminiEngine?.label).toBe('Gemini');
    });

    it('should include debatex engine', () => {
      const engines = getAvailableEngines();
      const debatexEngine = engines.find((e) => e.scheme === 'debatex');
      expect(debatexEngine).toBeDefined();
      expect(debatexEngine?.label).toBe('Debatex');
    });
  });

  // ============================================================
  // Task 1.2: DEFAULT_REVIEWER_SCHEME constant
  // Requirements: 3.3
  // ============================================================
  describe('DEFAULT_REVIEWER_SCHEME constant', () => {
    it('should default to claude-code', () => {
      expect(DEFAULT_REVIEWER_SCHEME).toBe('claude-code');
    });
  });

  // ============================================================
  // debatex-document-review Task 6.1: BuildArgsContext support
  // Requirements: 1.1, 1.3 (debatex-document-review)
  // ============================================================
  describe('BuildArgsContext support for debatex', () => {
    it('should accept string argument for backward compatibility', () => {
      const args = REVIEW_ENGINES['debatex'].buildArgs('my-feature');
      expect(args).toContain('sdd-document-review');
      expect(args).toContain('my-feature');
      expect(args).not.toContain('--output');
    });

    it('should accept BuildArgsContext with specPath and roundNumber', () => {
      const args = REVIEW_ENGINES['debatex'].buildArgs({
        featureName: 'my-feature',
        specPath: '/path/to/.kiro/specs/my-feature',
        roundNumber: 1,
      });
      expect(args).toContain('sdd-document-review');
      expect(args).toContain('my-feature');
      expect(args).toContain('--output');
      expect(args).toContain('/path/to/.kiro/specs/my-feature/document-review-1.md');
    });

    it('should build correct output path format', () => {
      const args = REVIEW_ENGINES['debatex'].buildArgs({
        featureName: 'test-feature',
        specPath: '/project/.kiro/specs/test-feature',
        roundNumber: 3,
      });
      expect(args).toContain('--output');
      expect(args).toContain('/project/.kiro/specs/test-feature/document-review-3.md');
    });

    it('should not include --output when specPath is missing in context', () => {
      const args = REVIEW_ENGINES['debatex'].buildArgs({
        featureName: 'my-feature',
      });
      expect(args).toContain('sdd-document-review');
      expect(args).toContain('my-feature');
      expect(args).not.toContain('--output');
    });

    it('should not include --output when roundNumber is missing in context', () => {
      const args = REVIEW_ENGINES['debatex'].buildArgs({
        featureName: 'my-feature',
        specPath: '/path/to/spec',
      });
      expect(args).toContain('sdd-document-review');
      expect(args).toContain('my-feature');
      expect(args).not.toContain('--output');
    });

    // Backward compatibility: string arguments for claude-code and gemini-cli should still work
    it('should maintain backward compatibility for claude-code with string arg', () => {
      const args = REVIEW_ENGINES['claude-code'].buildArgs('my-feature');
      expect(args).toContain('/kiro:document-review my-feature');
    });

    it('should maintain backward compatibility for gemini-cli with string arg', () => {
      const args = REVIEW_ENGINES['gemini-cli'].buildArgs('my-feature');
      expect(args).toContain('/kiro:document-review my-feature');
      expect(args).toContain('--yolo');
    });
  });

  // ============================================================
  // debatex-document-review Task 2.2: DEBATEX_ERRORS
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================
  describe('DEBATEX_ERRORS', () => {
    it('should define NOT_INSTALLED error with code, message, and hint', () => {
      expect(DEBATEX_ERRORS.NOT_INSTALLED).toBeDefined();
      expect(DEBATEX_ERRORS.NOT_INSTALLED.code).toBe('DEBATEX_NOT_INSTALLED');
      expect(DEBATEX_ERRORS.NOT_INSTALLED.message).toContain('インストール');
      expect(DEBATEX_ERRORS.NOT_INSTALLED.hint).toContain('npm install');
    });

    it('should define TIMEOUT error with code, message, and hint', () => {
      expect(DEBATEX_ERRORS.TIMEOUT).toBeDefined();
      expect(DEBATEX_ERRORS.TIMEOUT.code).toBe('DEBATEX_TIMEOUT');
      expect(DEBATEX_ERRORS.TIMEOUT.message).toContain('タイムアウト');
    });

    it('should define EXECUTION_FAILED error with code, message, and hint', () => {
      expect(DEBATEX_ERRORS.EXECUTION_FAILED).toBeDefined();
      expect(DEBATEX_ERRORS.EXECUTION_FAILED.code).toBe('DEBATEX_EXECUTION_FAILED');
      expect(DEBATEX_ERRORS.EXECUTION_FAILED.message).toContain('失敗');
    });
  });

  describe('isDebatexNotInstalledError', () => {
    it('should return true for ENOENT error', () => {
      const error = new Error('spawn npx ENOENT');
      expect(isDebatexNotInstalledError(error)).toBe(true);
    });

    it('should return true for enoent error (lowercase)', () => {
      const error = new Error('Error: enoent');
      expect(isDebatexNotInstalledError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('Connection timeout');
      expect(isDebatexNotInstalledError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isDebatexNotInstalledError('string error')).toBe(false);
      expect(isDebatexNotInstalledError(null)).toBe(false);
      expect(isDebatexNotInstalledError(undefined)).toBe(false);
    });
  });

  describe('getDebatexErrorInfo', () => {
    it('should return NOT_INSTALLED for ENOENT error', () => {
      const error = new Error('spawn npx ENOENT');
      const info = getDebatexErrorInfo(error);
      expect(info).toEqual(DEBATEX_ERRORS.NOT_INSTALLED);
    });

    it('should return TIMEOUT for timeout error', () => {
      const error = new Error('Request timeout exceeded');
      const info = getDebatexErrorInfo(error);
      expect(info).toEqual(DEBATEX_ERRORS.TIMEOUT);
    });

    it('should return null for unknown errors', () => {
      const error = new Error('Some other error');
      const info = getDebatexErrorInfo(error);
      expect(info).toBeNull();
    });
  });
});
