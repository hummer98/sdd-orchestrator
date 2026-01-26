/**
 * Tests for claudeParser.ts
 * Task 2.1: Claude Parser Unit Tests
 * Requirements: 1.1, 1.4, 5.1
 */

import { describe, it, expect } from 'vitest';
import { claudeParser } from './claudeParser';
import type { ParsedLogEntry } from './parserTypes';

describe('claudeParser', () => {
  describe('parseLine', () => {
    it('should parse system/init event (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'system',
        subtype: 'init',
        session_id: 'session-123',
        cwd: '/home/user/project',
        version: '1.0.0',
        message: {
          model: 'claude-3-opus',
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('system');
      expect(entries[0].session?.cwd).toBe('/home/user/project');
      expect(entries[0].session?.model).toBe('claude-3-opus');
      expect(entries[0].session?.version).toBe('1.0.0');
      expect(entries[0].engineId).toBe('claude');
    });

    it('should parse assistant text event with nested structure (Requirements: 5.1)', () => {
      const jsonLine = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello, I am Claude.' },
          ],
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Hello, I am Claude.');
      expect(entries[0].text?.role).toBe('assistant');
      expect(entries[0].engineId).toBe('claude');
    });

    it('should parse tool_use event from assistant message (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tool-123',
              name: 'read_file',
              input: { path: '/test.txt' },
            },
          ],
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('tool_use');
      expect(entries[0].tool?.name).toBe('read_file');
      expect(entries[0].tool?.toolUseId).toBe('tool-123');
      expect(entries[0].tool?.input).toEqual({ path: '/test.txt' });
      expect(entries[0].engineId).toBe('claude');
    });

    it('should parse tool_result event from user message (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-123',
              content: 'File content here',
              is_error: false,
            },
          ],
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('tool_result');
      expect(entries[0].toolResult?.toolUseId).toBe('tool-123');
      expect(entries[0].toolResult?.content).toBe('File content here');
      expect(entries[0].toolResult?.isError).toBe(false);
      expect(entries[0].engineId).toBe('claude');
    });

    it('should parse user input text (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'Please help me' },
          ],
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('input');
      expect(entries[0].text?.content).toBe('Please help me');
      expect(entries[0].text?.role).toBe('user');
      expect(entries[0].engineId).toBe('claude');
    });

    it('should parse result event (Requirements: 1.4)', () => {
      const jsonLine = JSON.stringify({
        type: 'result',
        result: 'Task completed successfully',
        is_error: false,
        cost_usd: 0.05,
        duration_ms: 1234,
        num_turns: 3,
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('result');
      expect(entries[0].result?.content).toBe('Task completed successfully');
      expect(entries[0].result?.isError).toBe(false);
      expect(entries[0].result?.costUsd).toBe(0.05);
      expect(entries[0].result?.durationMs).toBe(1234);
      expect(entries[0].result?.numTurns).toBe(3);
      expect(entries[0].result?.inputTokens).toBe(100);
      expect(entries[0].result?.outputTokens).toBe(200);
      expect(entries[0].engineId).toBe('claude');
    });

    it('should parse error result event', () => {
      const jsonLine = JSON.stringify({
        type: 'result',
        result: 'Something went wrong',
        is_error: true,
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('error');
      expect(entries[0].result?.isError).toBe(true);
      expect(entries[0].engineId).toBe('claude');
    });

    it('should handle multiple content blocks in one event', () => {
      const jsonLine = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me read the file.' },
            { type: 'tool_use', id: 'tool-1', name: 'read_file', input: { path: '/test' } },
          ],
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('text');
      expect(entries[1].type).toBe('tool_use');
    });

    it('should handle invalid JSON gracefully', () => {
      const entries = claudeParser.parseLine('not valid json');

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('not valid json');
    });

    it('should normalize escaped newlines', () => {
      const jsonLine = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Line1\\nLine2' },
          ],
        },
      });

      const entries = claudeParser.parseLine(jsonLine);

      expect(entries[0].text?.content).toBe('Line1\nLine2');
    });

    it('should add engineId: claude to all entries (Requirements: 1.1)', () => {
      const events = [
        { type: 'system', subtype: 'init', cwd: '/home' },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Hi' }] } },
        { type: 'result', result: 'Done' },
      ];

      events.forEach((event) => {
        const entries = claudeParser.parseLine(JSON.stringify(event));
        entries.forEach((entry) => {
          expect(entry.engineId).toBe('claude');
        });
      });
    });
  });

  describe('parseData', () => {
    it('should parse multiple JSONL lines', () => {
      const data = [
        JSON.stringify({ type: 'system', subtype: 'init', cwd: '/home' }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello' }] } }),
        JSON.stringify({ type: 'result', result: 'Done' }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe('system');
      expect(entries[1].type).toBe('text');
      expect(entries[2].type).toBe('result');
    });

    it('should skip empty lines', () => {
      const data = [
        JSON.stringify({ type: 'system', subtype: 'init' }),
        '',
        '   ',
        JSON.stringify({ type: 'result', result: 'Done' }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(2);
    });

    it('should add engineId to all entries', () => {
      const data = [
        JSON.stringify({ type: 'system', subtype: 'init' }),
        JSON.stringify({ type: 'result', result: 'Done' }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      entries.forEach((entry) => {
        expect(entry.engineId).toBe('claude');
      });
    });
  });

  describe('LogStreamParser interface compliance', () => {
    it('should implement LogStreamParser interface', () => {
      // Verify claudeParser has the required methods
      expect(typeof claudeParser.parseLine).toBe('function');
      expect(typeof claudeParser.parseData).toBe('function');
    });
  });

  /**
   * Task 2.2: Delta Integration Tests
   * Requirements: 3.1, 3.2
   */
  describe('delta integration', () => {
    it('should consolidate consecutive assistant text messages (Requirements: 3.1)', () => {
      // Claude CLI may send multiple assistant events for one logical message
      const data = [
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello ' }] } }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'world!' }] } }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      // Should be consolidated into a single entry
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Hello world!');
      expect(entries[0].engineId).toBe('claude');
    });

    it('should not consolidate when non-text event interrupts', () => {
      const data = [
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'First ' }] } }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'read_file', input: {} }] } }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Second' }] } }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('First ');
      expect(entries[1].type).toBe('tool_use');
      expect(entries[2].type).toBe('text');
      expect(entries[2].text?.content).toBe('Second');
    });

    it('should emit accumulated text when result event arrives', () => {
      const data = [
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Working...' }] } }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: ' Done!' }] } }),
        JSON.stringify({ type: 'result', result: 'Completed' }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('text');
      expect(entries[0].text?.content).toBe('Working... Done!');
      expect(entries[1].type).toBe('result');
    });

    it('should handle mixed text and tool_use in same message without consolidation', () => {
      // When text and tool_use are in the same message, they should be separate entries
      const data = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: 'Reading file...' },
              { type: 'tool_use', id: 't1', name: 'read_file', input: {} },
            ],
          },
        }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('text');
      expect(entries[1].type).toBe('tool_use');
    });

    it('should consolidate user input text messages', () => {
      const data = [
        JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'Hello ' }] } }),
        JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'there!' }] } }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('input');
      expect(entries[0].text?.content).toBe('Hello there!');
      expect(entries[0].text?.role).toBe('user');
    });

    it('should not consolidate across different roles', () => {
      const data = [
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello' }] } }),
        JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'Hi' }] } }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'There' }] } }),
      ].join('\n');

      const entries = claudeParser.parseData(data);

      expect(entries).toHaveLength(3);
      expect(entries[0].text?.role).toBe('assistant');
      expect(entries[1].text?.role).toBe('user');
      expect(entries[2].text?.role).toBe('assistant');
    });
  });
});
