/**
 * ImplCompletionAnalyzer
 * Analyzes impl execution logs using Claude API Structured Output
 * Requirements: 2.4, 6.1-6.6
 */

import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Output schema for impl completion analysis
 * Requirements: 6.2, 6.3, 6.4
 */
export const CheckImplResultSchema = z.object({
  status: z.literal('success'),
  completedTasks: z.array(z.string().regex(/^\d+(\.\d+)?$/)),
  stats: z.object({
    num_turns: z.number().int().nonnegative(),
    duration_ms: z.number().int().nonnegative(),
    total_cost_usd: z.number().nonnegative(),
  }),
});

export type CheckImplResult = z.infer<typeof CheckImplResultSchema>;

/**
 * API call error types
 */
export type AnalyzeError =
  | { type: 'API_ERROR'; message: string; statusCode?: number }
  | { type: 'RATE_LIMITED'; retryAfter?: number }
  | { type: 'TIMEOUT' }
  | { type: 'INVALID_INPUT'; message: string };

/**
 * API key error types
 */
export type ApiKeyError =
  | { type: 'API_KEY_NOT_SET' }
  | { type: 'API_KEY_INVALID_FORMAT' };

/**
 * Result type for error handling
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Get Anthropic API key from environment
 * Requirements: Design spec - APIキー管理
 */
export function getAnthropicApiKey(): Result<string, ApiKeyError> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, error: { type: 'API_KEY_NOT_SET' } };
  }
  if (!key.startsWith('sk-ant-')) {
    return { ok: false, error: { type: 'API_KEY_INVALID_FORMAT' } };
  }
  return { ok: true, value: key };
}

/**
 * Analyzer for impl completion using Claude API Structured Output
 * Requirements: 6.1, 6.5, 6.6
 */
export class ImplCompletionAnalyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Analyze impl execution log to identify completed tasks
   * Uses Claude API Structured Output for 100% JSON guarantee
   * Requirements: 2.4, 6.1-6.6
   *
   * @param resultLine - The result line from the log (contains stats)
   * @param lastAssistantMessage - The last assistant message
   * @returns Type-safe CheckImplResult or AnalyzeError
   */
  async analyzeCompletion(
    resultLine: string,
    lastAssistantMessage: string
  ): Promise<Result<CheckImplResult, AnalyzeError>> {
    // Input validation
    if (!resultLine || !lastAssistantMessage) {
      return {
        ok: false,
        error: {
          type: 'INVALID_INPUT',
          message: 'resultLine and lastAssistantMessage are required',
        },
      };
    }

    try {
      // Use beta.messages.parse with Zod schema for structured output
      const response = await this.client.beta.messages.parse({
        model: 'claude-sonnet-4-5-20250929',
        betas: ['structured-outputs-2025-11-13'],
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Analyze the following impl execution log and identify completed tasks.

## Result Line
${resultLine}

## Last Assistant Message
${lastAssistantMessage}

Task IDs are in format "1.1", "2.3", etc.
Extract stats (num_turns, duration_ms, total_cost_usd) from the result line.
Return ONLY the completed tasks that were explicitly marked as done.`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'check_impl_result',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['success'] },
                completedTasks: {
                  type: 'array',
                  items: { type: 'string', pattern: '^\\d+(\\.\\d+)?$' },
                },
                stats: {
                  type: 'object',
                  properties: {
                    num_turns: { type: 'integer', minimum: 0 },
                    duration_ms: { type: 'integer', minimum: 0 },
                    total_cost_usd: { type: 'number', minimum: 0 },
                  },
                  required: ['num_turns', 'duration_ms', 'total_cost_usd'],
                  additionalProperties: false,
                },
              },
              required: ['status', 'completedTasks', 'stats'],
              additionalProperties: false,
            },
          },
        },
      });

      // Parse the response content
      const content = response.content[0];
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // Validate with Zod for extra safety
        const validated = CheckImplResultSchema.parse(parsed);
        return { ok: true, value: validated };
      }

      // If we get here, something unexpected happened
      return {
        ok: false,
        error: { type: 'API_ERROR', message: 'Unexpected response format' },
      };
    } catch (error) {
      // Handle errors by name to support both real SDK and mocks
      if (error instanceof Error) {
        const errorName = error.name;

        if (errorName === 'RateLimitError') {
          const headers = (error as { headers?: Record<string, string> }).headers;
          const retryAfter = headers?.['retry-after'];
          return {
            ok: false,
            error: {
              type: 'RATE_LIMITED',
              retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
            },
          };
        }

        if (errorName === 'APIConnectionError') {
          return {
            ok: false,
            error: { type: 'TIMEOUT' },
          };
        }

        if (errorName === 'APIError') {
          const apiError = error as { status?: number };
          return {
            ok: false,
            error: {
              type: 'API_ERROR',
              message: error.message,
              statusCode: apiError.status,
            },
          };
        }

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          return {
            ok: false,
            error: {
              type: 'API_ERROR',
              message: `Validation error: ${error.message}`,
            },
          };
        }
      }

      // Unknown error
      return {
        ok: false,
        error: {
          type: 'API_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

/**
 * Create an ImplCompletionAnalyzer instance if API key is available
 */
export function createImplCompletionAnalyzer(): Result<ImplCompletionAnalyzer, ApiKeyError> {
  const keyResult = getAnthropicApiKey();
  if (!keyResult.ok) {
    return keyResult;
  }
  return { ok: true, value: new ImplCompletionAnalyzer(keyResult.value) };
}
