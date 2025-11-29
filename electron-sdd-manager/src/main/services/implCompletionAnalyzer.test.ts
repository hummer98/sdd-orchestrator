/**
 * ImplCompletionAnalyzer Tests
 * Requirements: 2.4, 6.1-6.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import {
  ImplCompletionAnalyzer,
  CheckImplResult,
  AnalyzeError,
  getAnthropicApiKey,
  ApiKeyError,
} from './implCompletionAnalyzer';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockParse = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      beta: {
        messages: {
          parse: mockParse,
        },
      },
    })),
    RateLimitError: class RateLimitError extends Error {
      headers?: Record<string, string>;
      constructor(message: string, headers?: Record<string, string>) {
        super(message);
        this.name = 'RateLimitError';
        this.headers = headers;
      }
    },
    APIConnectionError: class APIConnectionError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'APIConnectionError';
      }
    },
    APIError: class APIError extends Error {
      status: number;
      constructor(status: number, message: string) {
        super(message);
        this.name = 'APIError';
        this.status = status;
      }
    },
  };
});

describe('getAnthropicApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return API key when valid key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test-key';

    const result = getAnthropicApiKey();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('sk-ant-api03-test-key');
    }
  });

  it('should return API_KEY_NOT_SET when key is not set', () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = getAnthropicApiKey();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('API_KEY_NOT_SET');
    }
  });

  it('should return API_KEY_INVALID_FORMAT when key does not start with sk-ant-', () => {
    process.env.ANTHROPIC_API_KEY = 'invalid-key-format';

    const result = getAnthropicApiKey();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('API_KEY_INVALID_FORMAT');
    }
  });
});

describe('ImplCompletionAnalyzer', () => {
  let analyzer: ImplCompletionAnalyzer;
  let mockParse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new ImplCompletionAnalyzer('sk-ant-api03-test-key');
    // Get reference to the mock parse function
    const mockClient = new Anthropic({ apiKey: 'test' });
    mockParse = mockClient.beta.messages.parse as ReturnType<typeof vi.fn>;
  });

  describe('analyzeCompletion', () => {
    it('should return CheckImplResult on successful analysis', async () => {
      const expectedResult: CheckImplResult = {
        status: 'success',
        completedTasks: ['1.1', '1.2', '2.1'],
        stats: {
          num_turns: 15,
          duration_ms: 120000,
          total_cost_usd: 0.05,
        },
      };

      // Mock the API response format (content array with text)
      mockParse.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedResult),
          },
        ],
      });

      const result = await analyzer.analyzeCompletion(
        '{"type":"result","subtype":"success","num_turns":15}',
        'Completed tasks 1.1, 1.2, and 2.1'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('success');
        expect(result.value.completedTasks).toEqual(['1.1', '1.2', '2.1']);
        expect(result.value.stats.num_turns).toBe(15);
      }
    });

    it('should return INVALID_INPUT when resultLine is empty', async () => {
      const result = await analyzer.analyzeCompletion('', 'Some message');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_INPUT');
      }
    });

    it('should return INVALID_INPUT when lastAssistantMessage is empty', async () => {
      const result = await analyzer.analyzeCompletion('{"type":"result"}', '');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_INPUT');
      }
    });

    it('should handle rate limit errors', async () => {
      const { RateLimitError } = await import('@anthropic-ai/sdk');
      mockParse.mockRejectedValueOnce(new RateLimitError('Rate limited', { 'retry-after': '60' }));

      const result = await analyzer.analyzeCompletion(
        '{"type":"result"}',
        'Some message'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('RATE_LIMITED');
      }
    });

    it('should handle connection errors', async () => {
      const { APIConnectionError } = await import('@anthropic-ai/sdk');
      mockParse.mockRejectedValueOnce(new APIConnectionError('Connection failed'));

      const result = await analyzer.analyzeCompletion(
        '{"type":"result"}',
        'Some message'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TIMEOUT');
      }
    });

    it('should handle API errors with status code', async () => {
      const { APIError } = await import('@anthropic-ai/sdk');
      mockParse.mockRejectedValueOnce(new APIError(500, 'Internal server error'));

      const result = await analyzer.analyzeCompletion(
        '{"type":"result"}',
        'Some message'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('API_ERROR');
        if (result.error.type === 'API_ERROR') {
          expect(result.error.statusCode).toBe(500);
        }
      }
    });

    it('should handle unknown errors', async () => {
      mockParse.mockRejectedValueOnce(new Error('Unknown error'));

      const result = await analyzer.analyzeCompletion(
        '{"type":"result"}',
        'Some message'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('API_ERROR');
      }
    });
  });
});

describe('CheckImplResult schema validation', () => {
  it('should accept valid task IDs', () => {
    const validIds = ['1', '1.1', '2.3', '10.5'];
    const regex = /^\d+(\.\d+)?$/;

    for (const id of validIds) {
      expect(regex.test(id)).toBe(true);
    }
  });

  it('should reject invalid task IDs', () => {
    const invalidIds = ['a', '1.a', 'task-1', '1.1.1'];
    const regex = /^\d+(\.\d+)?$/;

    for (const id of invalidIds) {
      expect(regex.test(id)).toBe(false);
    }
  });
});
