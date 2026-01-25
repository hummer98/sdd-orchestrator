/**
 * LLM Engine Registry Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.5
 */

import { describe, it, expect } from 'vitest';
import {
  type LLMEngineId,
  type BuildArgsOptions,
  type ParsedOutput,
  type LLMEngine,
  LLM_ENGINES,
  getLLMEngine,
  getAvailableLLMEngines,
  DEFAULT_LLM_ENGINE,
} from './llmEngineRegistry';

// ============================================================
// Task 1.1: Interface and Type Tests
// Requirements: 1.1, 2.1, 3.1
// ============================================================

describe('LLM Engine Types', () => {
  describe('LLMEngineId', () => {
    it('should accept valid engine IDs', () => {
      const claudeId: LLMEngineId = 'claude';
      const geminiId: LLMEngineId = 'gemini';
      expect(claudeId).toBe('claude');
      expect(geminiId).toBe('gemini');
    });
  });

  describe('BuildArgsOptions', () => {
    it('should require prompt field', () => {
      const options: BuildArgsOptions = {
        prompt: '/kiro:spec-requirements my-feature',
      };
      expect(options.prompt).toBeDefined();
    });

    it('should accept optional fields', () => {
      const options: BuildArgsOptions = {
        prompt: '/kiro:spec-requirements my-feature',
        skipPermissions: true,
        outputFormat: 'stream-json',
        allowedTools: ['Read', 'Write'],
        disallowedTools: ['Bash'],
      };
      expect(options.skipPermissions).toBe(true);
      expect(options.outputFormat).toBe('stream-json');
      expect(options.allowedTools).toEqual(['Read', 'Write']);
      expect(options.disallowedTools).toEqual(['Bash']);
    });
  });

  describe('ParsedOutput', () => {
    it('should accept success type', () => {
      const output: ParsedOutput = {
        type: 'success',
        sessionId: 'session-123',
        stats: {
          numTurns: 5,
          durationMs: 10000,
          totalCostUsd: 0.05,
        },
      };
      expect(output.type).toBe('success');
      expect(output.stats?.numTurns).toBe(5);
    });

    it('should accept error type with message', () => {
      const output: ParsedOutput = {
        type: 'error',
        errorMessage: 'Something went wrong',
      };
      expect(output.type).toBe('error');
      expect(output.errorMessage).toBe('Something went wrong');
    });

    it('should accept max_turns type', () => {
      const output: ParsedOutput = {
        type: 'max_turns',
        sessionId: 'session-456',
      };
      expect(output.type).toBe('max_turns');
    });

    it('should accept interrupted type', () => {
      const output: ParsedOutput = {
        type: 'interrupted',
      };
      expect(output.type).toBe('interrupted');
    });
  });

  describe('LLMEngine interface', () => {
    it('should have all required properties', () => {
      const engine: LLMEngine = {
        id: 'claude',
        label: 'Claude',
        command: 'claude',
        buildArgs: (options) => ['-p', options.prompt],
        parseOutput: () => ({ type: 'success' }),
      };
      expect(engine.id).toBe('claude');
      expect(engine.label).toBe('Claude');
      expect(engine.command).toBe('claude');
      expect(typeof engine.buildArgs).toBe('function');
      expect(typeof engine.parseOutput).toBe('function');
    });
  });
});

// ============================================================
// Task 1.2: Claude Engine Tests
// Requirements: 2.2, 2.4, 2.5, 3.2
// ============================================================

describe('Claude Engine', () => {
  const claudeEngine = LLM_ENGINES['claude'];

  describe('properties', () => {
    it('should have correct id', () => {
      expect(claudeEngine.id).toBe('claude');
    });

    it('should have correct label', () => {
      expect(claudeEngine.label).toBe('Claude');
    });

    it('should have correct command', () => {
      expect(claudeEngine.command).toBe('claude');
    });
  });

  describe('buildArgs', () => {
    it('should include base flags: -p, --verbose, --output-format stream-json', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args).toContain('-p');
      expect(args).toContain('--verbose');
      expect(args).toContain('--output-format');
      expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
    });

    it('should include prompt as last argument', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args[args.length - 1]).toBe('/kiro:spec-requirements my-feature');
    });

    it('should include --dangerously-skip-permissions when skipPermissions is true (Req 2.2)', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        skipPermissions: true,
      });
      expect(args).toContain('--dangerously-skip-permissions');
    });

    it('should NOT include --dangerously-skip-permissions when skipPermissions is false', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        skipPermissions: false,
      });
      expect(args).not.toContain('--dangerously-skip-permissions');
    });

    it('should include --disallowedTools=AskUserQuestion', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args).toContain('--disallowedTools=AskUserQuestion');
    });

    it('should include allowedTools when provided', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        allowedTools: ['Read', 'Write'],
      });
      expect(args).toContain('--allowedTools=Read,Write');
    });

    it('should NOT include allowedTools when empty array', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        allowedTools: [],
      });
      const hasAllowedTools = args.some(arg => arg.startsWith('--allowedTools='));
      expect(hasAllowedTools).toBe(false);
    });

    it('should use stream-json as default output format (Req 2.4)', () => {
      const args = claudeEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args).toContain('--output-format');
      const formatIndex = args.indexOf('--output-format');
      expect(args[formatIndex + 1]).toBe('stream-json');
    });
  });

  describe('parseOutput', () => {
    it('should parse success result from JSONL', () => {
      const jsonl = '{"type":"result","subtype":"success","session_id":"abc123","num_turns":5,"duration_ms":10000,"total_cost_usd":0.05}\n';
      const output = claudeEngine.parseOutput(jsonl);
      expect(output.type).toBe('success');
      expect(output.sessionId).toBe('abc123');
      expect(output.stats?.numTurns).toBe(5);
      expect(output.stats?.durationMs).toBe(10000);
      expect(output.stats?.totalCostUsd).toBe(0.05);
    });

    it('should parse error result from JSONL', () => {
      const jsonl = '{"type":"result","subtype":"error_max_turns","session_id":"abc123"}\n';
      const output = claudeEngine.parseOutput(jsonl);
      expect(output.type).toBe('max_turns');
      expect(output.sessionId).toBe('abc123');
    });

    it('should handle parse errors gracefully (Req 3.5)', () => {
      const invalidJson = 'not valid json';
      const output = claudeEngine.parseOutput(invalidJson);
      expect(output.type).toBe('error');
      expect(output.errorMessage).toBeDefined();
    });

    it('should handle empty input', () => {
      const output = claudeEngine.parseOutput('');
      expect(output.type).toBe('error');
      expect(output.errorMessage).toBeDefined();
    });
  });
});

// ============================================================
// Task 1.3: Gemini Engine Tests
// Requirements: 2.3, 2.4, 2.5, 3.3, 3.4
// ============================================================

describe('Gemini Engine', () => {
  const geminiEngine = LLM_ENGINES['gemini'];

  describe('properties', () => {
    it('should have correct id', () => {
      expect(geminiEngine.id).toBe('gemini');
    });

    it('should have correct label', () => {
      expect(geminiEngine.label).toBe('Gemini');
    });

    it('should have correct command', () => {
      expect(geminiEngine.command).toBe('gemini');
    });
  });

  describe('buildArgs', () => {
    it('should include -p flag', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args).toContain('-p');
    });

    it('should include --output-format stream-json (Req 2.4)', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args).toContain('--output-format');
      const formatIndex = args.indexOf('--output-format');
      expect(args[formatIndex + 1]).toBe('stream-json');
    });

    it('should include --yolo when skipPermissions is true (Req 2.3)', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        skipPermissions: true,
      });
      expect(args).toContain('--yolo');
    });

    it('should NOT include --yolo when skipPermissions is false', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        skipPermissions: false,
      });
      expect(args).not.toContain('--yolo');
    });

    it('should include prompt', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
      });
      expect(args).toContain('/kiro:spec-requirements my-feature');
    });

    it('should silently ignore allowedTools (not supported by Gemini CLI) (Req 2.5)', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        allowedTools: ['Read', 'Write'],
      });
      // Should not throw error, and should not include allowedTools
      const hasAllowedTools = args.some(arg => arg.includes('allowedTools'));
      expect(hasAllowedTools).toBe(false);
    });

    it('should silently ignore disallowedTools (not supported by Gemini CLI) (Req 2.5)', () => {
      const args = geminiEngine.buildArgs({
        prompt: '/kiro:spec-requirements my-feature',
        disallowedTools: ['Bash'],
      });
      // Should not throw error, and should not include disallowedTools
      const hasDisallowedTools = args.some(arg => arg.includes('disallowedTools'));
      expect(hasDisallowedTools).toBe(false);
    });
  });

  describe('parseOutput', () => {
    it('should parse success result (assuming Claude-compatible format)', () => {
      const jsonl = '{"type":"result","subtype":"success","session_id":"gem123","num_turns":3,"duration_ms":5000,"total_cost_usd":0.02}\n';
      const output = geminiEngine.parseOutput(jsonl);
      expect(output.type).toBe('success');
      expect(output.sessionId).toBe('gem123');
    });

    it('should handle parse errors gracefully', () => {
      const invalidJson = 'not valid json';
      const output = geminiEngine.parseOutput(invalidJson);
      expect(output.type).toBe('error');
      expect(output.errorMessage).toBeDefined();
    });
  });
});

// ============================================================
// Task 1.4: LLM Engine Registry Tests
// Requirements: 1.2, 1.3, 1.4
// ============================================================

describe('LLM Engine Registry', () => {
  describe('LLM_ENGINES', () => {
    it('should contain claude engine (Req 1.4)', () => {
      expect(LLM_ENGINES['claude']).toBeDefined();
    });

    it('should contain gemini engine (Req 1.4)', () => {
      expect(LLM_ENGINES['gemini']).toBeDefined();
    });

    it('should have all engines implement LLMEngine interface (Req 1.3)', () => {
      for (const [id, engine] of Object.entries(LLM_ENGINES)) {
        expect(engine.id).toBe(id);
        expect(typeof engine.label).toBe('string');
        expect(typeof engine.command).toBe('string');
        expect(typeof engine.buildArgs).toBe('function');
        expect(typeof engine.parseOutput).toBe('function');
      }
    });
  });

  describe('getLLMEngine', () => {
    it('should return claude engine for id "claude"', () => {
      const engine = getLLMEngine('claude');
      expect(engine.id).toBe('claude');
    });

    it('should return gemini engine for id "gemini"', () => {
      const engine = getLLMEngine('gemini');
      expect(engine.id).toBe('gemini');
    });

    it('should fallback to claude for undefined id', () => {
      const engine = getLLMEngine(undefined);
      expect(engine.id).toBe('claude');
    });

    it('should fallback to claude for unknown id', () => {
      const engine = getLLMEngine('unknown' as LLMEngineId);
      expect(engine.id).toBe('claude');
    });
  });

  describe('getAvailableLLMEngines', () => {
    it('should return list of available engines', () => {
      const engines = getAvailableLLMEngines();
      expect(engines.length).toBeGreaterThan(0);
    });

    it('should include claude in the list', () => {
      const engines = getAvailableLLMEngines();
      const claude = engines.find(e => e.id === 'claude');
      expect(claude).toBeDefined();
      expect(claude?.label).toBe('Claude');
    });

    it('should include gemini in the list', () => {
      const engines = getAvailableLLMEngines();
      const gemini = engines.find(e => e.id === 'gemini');
      expect(gemini).toBeDefined();
      expect(gemini?.label).toBe('Gemini');
    });
  });

  describe('DEFAULT_LLM_ENGINE', () => {
    it('should be claude', () => {
      expect(DEFAULT_LLM_ENGINE).toBe('claude');
    });
  });
});
