/**
 * Unified Parser Facade Unit Tests
 * Task 1.2: Unit tests for Unified Parser Facade
 * Requirements: 1.2, 1.3, 2.1, 2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedParser } from './unifiedParser';

describe('unifiedParser', () => {
  describe('parseData', () => {
    it('should parse Claude logs when engineId is claude', () => {
      // Claude init event
      const claudeInit = '{"type":"system","subtype":"init","cwd":"/project","version":"1.0"}';

      const result = unifiedParser.parseData(claudeInit, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].engineId).toBe('claude');
      expect(result[0].session?.cwd).toBe('/project');
    });

    it('should parse Gemini logs when engineId is gemini', () => {
      // Gemini init event
      const geminiInit = '{"type":"init","cwd":"/project","model":"gemini-2.0-flash"}';

      const result = unifiedParser.parseData(geminiInit, 'gemini');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].engineId).toBe('gemini');
      expect(result[0].session?.cwd).toBe('/project');
      expect(result[0].session?.model).toBe('gemini-2.0-flash');
    });

    it('should default to Claude parser when engineId is undefined', () => {
      // Claude format without engineId specified
      const claudeInit = '{"type":"system","subtype":"init","cwd":"/project"}';

      const result = unifiedParser.parseData(claudeInit);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].engineId).toBe('claude');
    });

    it('should handle multiple JSONL lines with delta consolidation', () => {
      // Multiple Claude text delta events
      const multipleLines = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
        '{"type":"assistant","message":{"content":[{"type":"text","text":" World"}]}}',
      ].join('\n');

      const result = unifiedParser.parseData(multipleLines, 'claude');

      // Delta consolidation should merge consecutive text entries
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].text?.content).toBe('Hello World');
    });

    it('should handle empty string input', () => {
      const result = unifiedParser.parseData('', 'claude');

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON gracefully by returning raw text entry', () => {
      const invalidJson = 'not a json string';

      const result = unifiedParser.parseData(invalidJson, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].text?.content).toBe('not a json string');
    });

    it('should log warning when engineId is undefined', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      unifiedParser.parseData('{"type":"system"}');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('engineId not specified, falling back to Claude parser')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('parseLine', () => {
    it('should parse single Claude line', () => {
      const line = '{"type":"system","subtype":"init"}';

      const result = unifiedParser.parseLine(line, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].engineId).toBe('claude');
    });

    it('should parse single Gemini line', () => {
      const line = '{"type":"init","model":"gemini-2.0"}';

      const result = unifiedParser.parseLine(line, 'gemini');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].engineId).toBe('gemini');
    });

    it('should return empty array for empty line', () => {
      const result = unifiedParser.parseLine('', 'claude');

      expect(result).toEqual([]);
    });

    it('should default to Claude parser when engineId is undefined', () => {
      const line = '{"type":"system","subtype":"init"}';

      const result = unifiedParser.parseLine(line);

      expect(result).toHaveLength(1);
      expect(result[0].engineId).toBe('claude');
    });
  });

  describe('error handling', () => {
    it('should handle parse failure and return raw text entry', () => {
      const invalidLine = '{invalid json}';

      const result = unifiedParser.parseLine(invalidLine, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].text?.content).toContain('invalid json');
    });

    it('should handle unknown engineId by falling back to Claude', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const line = '{"type":"system","subtype":"init"}';

      // @ts-expect-error - testing invalid engineId
      const result = unifiedParser.parseData(line, 'unknown-engine');

      expect(result).toHaveLength(1);
      expect(result[0].engineId).toBe('claude');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('delta consolidation', () => {
    it('should consolidate Claude delta text messages', () => {
      const deltaLines = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Part 1"}]}}',
        '{"type":"assistant","message":{"content":[{"type":"text","text":" Part 2"}]}}',
        '{"type":"assistant","message":{"content":[{"type":"text","text":" Part 3"}]}}',
      ].join('\n');

      const result = unifiedParser.parseData(deltaLines, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].text?.content).toBe('Part 1 Part 2 Part 3');
    });

    it('should consolidate Gemini delta text messages', () => {
      const deltaLines = [
        '{"type":"message","role":"assistant","content":"Part 1"}',
        '{"type":"message","role":"assistant","content":" Part 2"}',
        '{"type":"message","role":"assistant","content":" Part 3"}',
      ].join('\n');

      const result = unifiedParser.parseData(deltaLines, 'gemini');

      expect(result).toHaveLength(1);
      expect(result[0].text?.content).toBe('Part 1 Part 2 Part 3');
    });

    it('should flush delta when encountering non-text entry', () => {
      const mixedLines = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","id":"tool-1"}]}}',
      ].join('\n');

      const result = unifiedParser.parseData(mixedLines, 'claude');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('text');
      expect(result[0].text?.content).toBe('Hello');
      expect(result[1].type).toBe('tool_use');
      expect(result[1].tool?.name).toBe('Read');
    });
  });
});
