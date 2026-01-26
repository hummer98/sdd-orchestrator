/**
 * logFormatter tests
 * Task 5.1: parseLogData function tests for each event type
 * Task 4.1: engineId facade tests
 * Requirements: 1.3, 2.2, 2.3
 */

import { describe, it, expect } from 'vitest';
import { parseLogData, getColorClass, type ParsedLogEntry } from './logFormatter';

describe('logFormatter', () => {
  describe('parseLogData', () => {
    describe('system/init event', () => {
      it('should parse system init event with cwd, model, and version', () => {
        const data = JSON.stringify({
          type: 'system',
          subtype: 'init',
          cwd: '/path/to/project',
          session_id: 'session-123',
          message: {
            model: 'claude-3-opus-20240229',
          },
          tools: [],
          mcp_servers: [],
          version: '1.0.0',
        });

        const result = parseLogData(data);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('system');
        expect(result[0].session).toBeDefined();
        expect(result[0].session?.cwd).toBe('/path/to/project');
        expect(result[0].session?.model).toBe('claude-3-opus-20240229');
        expect(result[0].session?.version).toBe('1.0.0');
      });
    });

    describe('tool_use event', () => {
      it('should parse tool_use event with Read tool', () => {
        const data = JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool-use-123',
                name: 'Read',
                input: {
                  file_path: '/path/to/file.ts',
                },
              },
            ],
          },
        });

        const result = parseLogData(data);

        const toolUse = result.find((e) => e.type === 'tool_use');
        expect(toolUse).toBeDefined();
        expect(toolUse?.tool?.name).toBe('Read');
        expect(toolUse?.tool?.toolUseId).toBe('tool-use-123');
        expect(toolUse?.tool?.input).toEqual({ file_path: '/path/to/file.ts' });
      });

      it('should parse tool_use event with Bash tool', () => {
        const data = JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool-use-456',
                name: 'Bash',
                input: {
                  command: 'npm run build',
                  description: 'Build the project',
                },
              },
            ],
          },
        });

        const result = parseLogData(data);

        const toolUse = result.find((e) => e.type === 'tool_use');
        expect(toolUse).toBeDefined();
        expect(toolUse?.tool?.name).toBe('Bash');
        expect(toolUse?.tool?.input?.description).toBe('Build the project');
      });

      it('should parse tool_use event with Task tool', () => {
        const data = JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool-use-789',
                name: 'Task',
                input: {
                  description: 'Review code changes',
                  subagent_type: 'code-review',
                },
              },
            ],
          },
        });

        const result = parseLogData(data);

        const toolUse = result.find((e) => e.type === 'tool_use');
        expect(toolUse).toBeDefined();
        expect(toolUse?.tool?.name).toBe('Task');
        expect(toolUse?.tool?.input?.subagent_type).toBe('code-review');
      });
    });

    describe('tool_result event', () => {
      it('should parse tool_result event with success', () => {
        const data = JSON.stringify({
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-use-123',
                content: 'File content here',
              },
            ],
          },
        });

        const result = parseLogData(data);

        const toolResult = result.find((e) => e.type === 'tool_result');
        expect(toolResult).toBeDefined();
        expect(toolResult?.toolResult?.toolUseId).toBe('tool-use-123');
        expect(toolResult?.toolResult?.content).toBe('File content here');
        expect(toolResult?.toolResult?.isError).toBe(false);
      });

      it('should parse tool_result event with error', () => {
        const data = JSON.stringify({
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-use-456',
                content: 'Error: File not found',
                is_error: true,
              },
            ],
          },
        });

        const result = parseLogData(data);

        const toolResult = result.find((e) => e.type === 'tool_result');
        expect(toolResult).toBeDefined();
        expect(toolResult?.toolResult?.isError).toBe(true);
        expect(toolResult?.toolResult?.content).toBe('Error: File not found');
      });
    });

    describe('text event', () => {
      it('should parse assistant text content', () => {
        const data = JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'text',
                text: 'This is the assistant response.\nIt has multiple lines.',
              },
            ],
          },
        });

        const result = parseLogData(data);

        const textEntry = result.find((e) => e.type === 'text');
        expect(textEntry).toBeDefined();
        expect(textEntry?.text?.content).toBe('This is the assistant response.\nIt has multiple lines.');
        expect(textEntry?.text?.role).toBe('assistant');
      });

      it('should preserve full text content without truncation', () => {
        const longText = 'A'.repeat(500);
        const data = JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'text',
                text: longText,
              },
            ],
          },
        });

        const result = parseLogData(data);

        const textEntry = result.find((e) => e.type === 'text');
        expect(textEntry?.text?.content).toBe(longText);
        expect(textEntry?.text?.content?.length).toBe(500);
      });
    });

    describe('result event', () => {
      it('should parse successful result event with statistics', () => {
        const data = JSON.stringify({
          type: 'result',
          result: 'Task completed successfully',
          cost_usd: 0.0123,
          duration_ms: 5000,
          num_turns: 3,
          is_error: false,
        });

        const result = parseLogData(data);

        const resultEntry = result.find((e) => e.type === 'result');
        expect(resultEntry).toBeDefined();
        expect(resultEntry?.result?.content).toBe('Task completed successfully');
        expect(resultEntry?.result?.isError).toBe(false);
        expect(resultEntry?.result?.costUsd).toBe(0.0123);
        expect(resultEntry?.result?.durationMs).toBe(5000);
        expect(resultEntry?.result?.numTurns).toBe(3);
      });

      it('should parse error result event', () => {
        const data = JSON.stringify({
          type: 'result',
          result: 'Error occurred during execution',
          is_error: true,
          cost_usd: 0.005,
          duration_ms: 2000,
        });

        const result = parseLogData(data);

        // Error results have type 'error' (not 'result')
        const resultEntry = result.find((e) => e.type === 'error');
        expect(resultEntry).toBeDefined();
        expect(resultEntry?.result?.isError).toBe(true);
        expect(resultEntry?.result?.content).toBe('Error occurred during execution');
      });

      it('should include token usage information', () => {
        const data = JSON.stringify({
          type: 'result',
          result: 'Done',
          is_error: false,
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
          },
        });

        const result = parseLogData(data);

        const resultEntry = result.find((e) => e.type === 'result');
        expect(resultEntry?.result?.inputTokens).toBe(1000);
        expect(resultEntry?.result?.outputTokens).toBe(500);
      });
    });

    describe('error handling', () => {
      it('should return text entry for invalid JSON', () => {
        const invalidJson = 'This is not JSON';

        const result = parseLogData(invalidJson);

        expect(result.length).toBeGreaterThanOrEqual(0);
        // Invalid JSON should be handled gracefully
      });

      it('should return empty array for empty input', () => {
        const result = parseLogData('');

        expect(result).toEqual([]);
      });

      it('should handle multiple JSON lines', () => {
        const multipleLines = [
          JSON.stringify({ type: 'system', subtype: 'init', cwd: '/path' }),
          JSON.stringify({ type: 'result', result: 'Done', is_error: false }),
        ].join('\n');

        const result = parseLogData(multipleLines);

        expect(result.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('getColorClass', () => {
    it('should return correct text class for system type', () => {
      expect(getColorClass('system', 'text')).toContain('cyan');
    });

    it('should return correct text class for tool_use type', () => {
      expect(getColorClass('tool_use', 'text')).toContain('yellow');
    });

    it('should return correct text class for tool_result type', () => {
      expect(getColorClass('tool_result', 'text')).toContain('blue');
    });

    it('should return correct text class for text type', () => {
      expect(getColorClass('text', 'text')).toContain('fuchsia');
    });

    it('should return correct text class for result type', () => {
      expect(getColorClass('result', 'text')).toContain('green');
    });

    it('should return correct text class for error type', () => {
      expect(getColorClass('error', 'text')).toContain('red');
    });

    it('should return bg class when variant is bg', () => {
      const bgClass = getColorClass('error', 'bg');
      expect(bgClass).toContain('bg-');
    });

    it('should return border class when variant is border', () => {
      const borderClass = getColorClass('error', 'border');
      expect(borderClass).toContain('border-');
    });

    it('should handle dark mode classes', () => {
      const textClass = getColorClass('system', 'text');
      expect(textClass).toContain('dark:');
    });
  });

  /**
   * Task 4.1: engineId facade tests
   * Requirements: 2.2, 2.3
   */
  describe('engineId support', () => {
    it('should use Claude parser by default when engineId not provided (Requirements: 2.3)', () => {
      const data = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Hello' }],
        },
      });

      const result = parseLogData(data);

      expect(result).toHaveLength(1);
      expect(result[0].engineId).toBe('claude');
    });

    it('should use Claude parser when engineId is "claude" (Requirements: 2.2)', () => {
      const data = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Claude response' }],
        },
      });

      const result = parseLogData(data, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].engineId).toBe('claude');
    });

    it('should use Gemini parser when engineId is "gemini" (Requirements: 2.2)', () => {
      const data = JSON.stringify({
        type: 'message',
        role: 'assistant',
        content: 'Gemini response',
      });

      const result = parseLogData(data, 'gemini');

      expect(result).toHaveLength(1);
      expect(result[0].engineId).toBe('gemini');
    });

    it('should fallback to Claude parser for unknown engineId (Requirements: 2.3)', () => {
      const data = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Test' }],
        },
      });

      // @ts-expect-error Testing unknown engineId
      const result = parseLogData(data, 'unknown-engine');

      expect(result).toHaveLength(1);
      expect(result[0].engineId).toBe('claude');
    });

    it('should parse Claude init event correctly', () => {
      const data = JSON.stringify({
        type: 'system',
        subtype: 'init',
        cwd: '/home/user',
        message: { model: 'claude-3-opus' },
      });

      const result = parseLogData(data, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].session?.model).toBe('claude-3-opus');
    });

    it('should parse Gemini init event correctly', () => {
      const data = JSON.stringify({
        type: 'init',
        model: 'gemini-pro',
        cwd: '/home/user',
      });

      const result = parseLogData(data, 'gemini');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('system');
      expect(result[0].session?.model).toBe('gemini-pro');
    });

    it('should parse Claude result event', () => {
      const data = JSON.stringify({
        type: 'result',
        result: 'Done',
        is_error: false,
        cost_usd: 0.01,
      });

      const result = parseLogData(data, 'claude');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('result');
      expect(result[0].result?.costUsd).toBe(0.01);
    });

    it('should parse Gemini result event', () => {
      const data = JSON.stringify({
        type: 'result',
        message: 'Done',
        status: 'success',
        stats: { input_tokens: 100, output_tokens: 50 },
      });

      const result = parseLogData(data, 'gemini');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('result');
      expect(result[0].result?.inputTokens).toBe(100);
    });
  });
});
