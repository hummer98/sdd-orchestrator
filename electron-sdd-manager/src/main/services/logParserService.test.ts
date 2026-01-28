/**
 * LogParserService Tests
 * Requirements: 2.1-2.3, 2.5-2.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LogParserService, ResultSubtype, ParseError } from './logParserService';

describe('LogParserService', () => {
  let service: LogParserService;
  let tempDir: string;

  beforeEach(async () => {
    service = new LogParserService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logparser-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a log file with wrapped JSON entries
   */
  async function createLogFile(entries: Array<{ type: string; subtype?: string; is_error?: boolean; [key: string]: unknown }>): Promise<string> {
    const logPath = path.join(tempDir, 'test.log');
    const lines = entries.map(entry => {
      const wrapper = {
        timestamp: new Date().toISOString(),
        stream: 'stdout',
        data: JSON.stringify(entry),
      };
      return JSON.stringify(wrapper);
    });
    await fs.writeFile(logPath, lines.join('\n'), 'utf-8');
    return logPath;
  }

  describe('parseResultSubtype', () => {
    it('should return "success" when result line has subtype "success"', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init', session_id: 'test-123' },
        { type: 'assistant', message: 'Working...' },
        { type: 'result', subtype: 'success', is_error: false },
      ]);

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should return "error_max_turns" when result has that subtype', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        { type: 'result', subtype: 'error_max_turns', is_error: true },
      ]);

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('error_max_turns');
      }
    });

    it('should return "error_during_execution" when result has that subtype', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        { type: 'result', subtype: 'error_during_execution', is_error: true },
      ]);

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('error_during_execution');
      }
    });

    it('should return "no_result" when no result line exists', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        { type: 'assistant', message: 'Working...' },
      ]);

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('no_result');
      }
    });

    it('should fallback to is_error when subtype is missing', async () => {
      const logPath = await createLogFile([
        { type: 'result', is_error: true },
      ]);

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('error_during_execution');
      }
    });

    it('should fallback to success when subtype is missing and is_error is false', async () => {
      const logPath = await createLogFile([
        { type: 'result', is_error: false },
      ]);

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should return FILE_READ_ERROR for non-existent file', async () => {
      const result = await service.parseResultSubtype('/nonexistent/path.log');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('FILE_READ_ERROR');
      }
    });

    it('should handle empty log file', async () => {
      const logPath = path.join(tempDir, 'empty.log');
      await fs.writeFile(logPath, '', 'utf-8');

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('no_result');
      }
    });

    it('should handle malformed JSON lines gracefully', async () => {
      const logPath = path.join(tempDir, 'malformed.log');
      const validLine = JSON.stringify({
        timestamp: new Date().toISOString(),
        stream: 'stdout',
        data: JSON.stringify({ type: 'result', subtype: 'success' }),
      });
      await fs.writeFile(logPath, `not valid json\n${validLine}\n`, 'utf-8');

      const result = await service.parseResultSubtype(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });
  });

  describe('getResultLine', () => {
    it('should return the result line as JSON string', async () => {
      const resultData = { type: 'result', subtype: 'success', is_error: false, num_turns: 5 };
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        resultData,
      ]);

      const result = await service.getResultLine(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = JSON.parse(result.value);
        expect(parsed.type).toBe('result');
        expect(parsed.subtype).toBe('success');
        expect(parsed.num_turns).toBe(5);
      }
    });

    it('should return NO_RESULT_FOUND when no result line exists', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        { type: 'assistant', message: 'Working...' },
      ]);

      const result = await service.getResultLine(logPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NO_RESULT_FOUND');
      }
    });
  });

  describe('getLastAssistantMessage', () => {
    it('should return the last assistant message', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'First message' }] } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Second message' }] } },
        { type: 'result', subtype: 'success' },
      ]);

      const result = await service.getLastAssistantMessage(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Second message');
      }
    });

    it('should return NO_ASSISTANT_FOUND when no assistant message exists', async () => {
      const logPath = await createLogFile([
        { type: 'system', subtype: 'init' },
        { type: 'result', subtype: 'success' },
      ]);

      const result = await service.getLastAssistantMessage(logPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NO_ASSISTANT_FOUND');
      }
    });

    // main-process-log-parser Task 10.6: Updated tests to use proper Claude CLI format
    // The unified parser expects message.content to be an array with typed blocks
    it('should handle assistant message with text content array', async () => {
      const logPath = await createLogFile([
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Part 1' }, { type: 'text', text: 'Part 2' }] } },
      ]);

      const result = await service.getLastAssistantMessage(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Unified parser creates separate entries for each text block, then combines them
        expect(result.value).toContain('Part 1');
        expect(result.value).toContain('Part 2');
      }
    });

    it('should handle single text block in assistant message', async () => {
      // Claude CLI format: message is always an object with content array
      const logPath = await createLogFile([
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Single text message' }] } },
      ]);

      const result = await service.getLastAssistantMessage(logPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Single text message');
      }
    });
  });
});
