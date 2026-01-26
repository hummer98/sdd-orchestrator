/**
 * Tests for geminiParser.ts
 * Task 3.1: Gemini Parser Unit Tests
 * Requirements: 1.2, 1.4, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect } from 'vitest';
import { geminiParser } from './geminiParser';
import type { ParsedLogEntry } from './parserTypes';

describe('geminiParser', () => {
  describe('parseLine', () => {
    it('should parse init event and map to system type (Requirements: 5.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'init',
        session_id: 'gemini-session-123',
        model: 'gemini-pro',
        cwd: '/home/user/project',
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('system');
      expect(entries[0].session?.model).toBe('gemini-pro');
      expect(entries[0].session?.cwd).toBe('/home/user/project');
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse message event with assistant role (Requirements: 5.2)', () => {
      const jsonLine = JSON.stringify({
        type: 'message',
        role: 'assistant',
        content: 'Hello from Gemini!',
        delta: false,
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Hello from Gemini!');
      expect(entries[0].text?.role).toBe('assistant');
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse message event with user role (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'message',
        role: 'user',
        content: 'User input here',
        delta: false,
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('input');
      expect(entries[0].text?.content).toBe('User input here');
      expect(entries[0].text?.role).toBe('user');
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse tool_use event with field mapping (Requirements: 5.3)', () => {
      const jsonLine = JSON.stringify({
        type: 'tool_use',
        tool_name: 'read_file',
        tool_id: 'tool-gemini-123',
        parameters: { path: '/test.txt', encoding: 'utf-8' },
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('tool_use');
      expect(entries[0].tool?.name).toBe('read_file');
      expect(entries[0].tool?.toolUseId).toBe('tool-gemini-123');
      expect(entries[0].tool?.input).toEqual({ path: '/test.txt', encoding: 'utf-8' });
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse tool_result event with output mapping (Requirements: 5.3)', () => {
      const jsonLine = JSON.stringify({
        type: 'tool_result',
        tool_id: 'tool-gemini-123',
        output: 'File content here',
        status: 'success',
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('tool_result');
      expect(entries[0].toolResult?.toolUseId).toBe('tool-gemini-123');
      expect(entries[0].toolResult?.content).toBe('File content here');
      expect(entries[0].toolResult?.isError).toBe(false);
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse tool_result error event', () => {
      const jsonLine = JSON.stringify({
        type: 'tool_result',
        tool_id: 'tool-gemini-456',
        output: 'File not found',
        status: 'error',
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].toolResult?.isError).toBe(true);
    });

    it('should parse error event (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'error',
        message: 'Something went wrong',
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('error');
      expect(entries[0].result?.content).toBe('Something went wrong');
      expect(entries[0].result?.isError).toBe(true);
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse result event with stats (Requirements: 5.5)', () => {
      const jsonLine = JSON.stringify({
        type: 'result',
        message: 'Task completed',
        status: 'success',
        stats: {
          total_tokens: 500,
          input_tokens: 200,
          output_tokens: 300,
          duration_ms: 5000,
          tool_calls: 3,
        },
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('result');
      expect(entries[0].result?.content).toBe('Task completed');
      expect(entries[0].result?.isError).toBe(false);
      expect(entries[0].result?.inputTokens).toBe(200);
      expect(entries[0].result?.outputTokens).toBe(300);
      expect(entries[0].result?.durationMs).toBe(5000);
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should parse result event with error status', () => {
      const jsonLine = JSON.stringify({
        type: 'result',
        message: 'Failed',
        status: 'error',
      });

      const entries = geminiParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('error');
      expect(entries[0].result?.isError).toBe(true);
    });

    it('should handle invalid JSON gracefully', () => {
      const entries = geminiParser.parseLine('not valid json');

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('not valid json');
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should add engineId: gemini to all entries (Requirements: 1.2)', () => {
      const events = [
        { type: 'init', model: 'gemini-pro' },
        { type: 'message', role: 'assistant', content: 'Hi' },
        { type: 'result', message: 'Done', status: 'success' },
      ];

      events.forEach((event) => {
        const entries = geminiParser.parseLine(JSON.stringify(event));
        entries.forEach((entry) => {
          expect(entry.engineId).toBe('gemini');
        });
      });
    });
  });

  describe('parseData', () => {
    it('should parse multiple JSONL lines', () => {
      const data = [
        JSON.stringify({ type: 'init', model: 'gemini-pro' }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Hello' }),
        JSON.stringify({ type: 'result', message: 'Done', status: 'success' }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe('system');
      expect(entries[1].type).toBe('text');
      expect(entries[2].type).toBe('result');
    });

    it('should skip empty lines', () => {
      const data = [
        JSON.stringify({ type: 'init', model: 'gemini-pro' }),
        '',
        '   ',
        JSON.stringify({ type: 'result', message: 'Done', status: 'success' }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(2);
    });

    it('should add engineId to all entries', () => {
      const data = [
        JSON.stringify({ type: 'init', model: 'gemini-pro' }),
        JSON.stringify({ type: 'result', message: 'Done', status: 'success' }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      entries.forEach((entry) => {
        expect(entry.engineId).toBe('gemini');
      });
    });
  });

  describe('LogStreamParser interface compliance', () => {
    it('should implement LogStreamParser interface', () => {
      expect(typeof geminiParser.parseLine).toBe('function');
      expect(typeof geminiParser.parseData).toBe('function');
    });
  });

  /**
   * Task 3.2: Delta Integration Tests
   * Requirements: 3.1, 3.2
   */
  describe('delta integration', () => {
    it('should consolidate consecutive delta: true messages (Requirements: 3.1)', () => {
      const data = [
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Hello ', delta: true }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'world!', delta: true }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Hello world!');
      expect(entries[0].engineId).toBe('gemini');
    });

    it('should emit accumulated text when delta: false arrives', () => {
      const data = [
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Part 1 ', delta: true }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Part 2', delta: false }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      // Should consolidate even with delta:false at end
      expect(entries).toHaveLength(1);
      expect(entries[0].text?.content).toBe('Part 1 Part 2');
    });

    it('should emit accumulated text when non-message event arrives', () => {
      const data = [
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Working ', delta: true }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'on it...', delta: true }),
        JSON.stringify({ type: 'tool_use', tool_name: 'read_file', tool_id: 't1', parameters: {} }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Working on it...');
      expect(entries[1].type).toBe('tool_use');
    });

    it('should not consolidate across different roles', () => {
      const data = [
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Hello', delta: true }),
        JSON.stringify({ type: 'message', role: 'user', content: 'Hi', delta: true }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'There', delta: true }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(3);
      expect(entries[0].text?.role).toBe('assistant');
      expect(entries[1].text?.role).toBe('user');
      expect(entries[2].text?.role).toBe('assistant');
    });

    it('should consolidate user input messages', () => {
      const data = [
        JSON.stringify({ type: 'message', role: 'user', content: 'Help ', delta: true }),
        JSON.stringify({ type: 'message', role: 'user', content: 'me', delta: true }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('input');
      expect(entries[0].text?.content).toBe('Help me');
      expect(entries[0].text?.role).toBe('user');
    });

    it('should emit accumulated text when result event arrives', () => {
      const data = [
        JSON.stringify({ type: 'message', role: 'assistant', content: 'Done ', delta: true }),
        JSON.stringify({ type: 'message', role: 'assistant', content: 'processing', delta: true }),
        JSON.stringify({ type: 'result', message: 'Success', status: 'success' }),
      ].join('\n');

      const entries = geminiParser.parseData(data);

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Done processing');
      expect(entries[1].type).toBe('result');
    });
  });
});
