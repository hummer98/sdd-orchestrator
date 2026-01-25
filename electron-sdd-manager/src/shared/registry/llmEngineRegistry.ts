/**
 * LLM Engine Registry
 * Provides a unified interface for managing LLM CLI engines (Claude, Gemini)
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1-2.5, 3.1-3.5
 */

// ============================================================
// Type Definitions
// Requirements: 1.1, 2.1, 3.1
// ============================================================

/**
 * LLM Engine ID
 * Requirement: 1.4
 */
export type LLMEngineId = 'claude' | 'gemini';

/**
 * Build arguments options
 * Requirement: 2.1
 */
export interface BuildArgsOptions {
  /** The prompt/command to execute */
  prompt: string;
  /** Skip permissions mode (auto-approve) */
  skipPermissions?: boolean;
  /** Output format (default: 'stream-json') */
  outputFormat?: 'stream-json' | 'json';
  /** Allowed tools list (optional) */
  allowedTools?: string[];
  /** Disallowed tools list (optional) */
  disallowedTools?: string[];
}

/**
 * Parsed output structure
 * Requirement: 3.1
 */
export interface ParsedOutput {
  /** Result type */
  type: 'success' | 'error' | 'max_turns' | 'interrupted';
  /** Session ID */
  sessionId?: string;
  /** Statistics */
  stats?: {
    numTurns: number;
    durationMs: number;
    totalCostUsd: number;
  };
  /** Error message (when type is 'error') */
  errorMessage?: string;
}

/**
 * LLM Engine interface
 * Requirement: 1.1
 */
export interface LLMEngine {
  /** Engine identifier */
  readonly id: LLMEngineId;
  /** Display name */
  readonly label: string;
  /** Executable command */
  readonly command: string;
  /** Build command line arguments */
  buildArgs(options: BuildArgsOptions): string[];
  /** Parse output to unified format */
  parseOutput(data: string): ParsedOutput;
}

// ============================================================
// Output Parsing Helpers
// Requirements: 3.2, 3.3, 3.5
// ============================================================

/**
 * Parse JSONL output to extract the result line
 * Both Claude and Gemini use similar JSONL format
 */
function parseJSONLResult(data: string): ParsedOutput {
  if (!data || data.trim() === '') {
    return {
      type: 'error',
      errorMessage: 'Empty output received',
    };
  }

  try {
    // Find the result line in JSONL output
    const lines = data.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'result') {
          // Map subtype to our ParsedOutput type
          let resultType: ParsedOutput['type'];
          switch (parsed.subtype) {
            case 'success':
              resultType = 'success';
              break;
            case 'error_max_turns':
              resultType = 'max_turns';
              break;
            case 'interrupted':
              resultType = 'interrupted';
              break;
            case 'error':
            default:
              resultType = parsed.subtype?.startsWith('error') ? 'error' : 'success';
          }

          return {
            type: resultType,
            sessionId: parsed.session_id,
            stats: parsed.num_turns !== undefined ? {
              numTurns: parsed.num_turns,
              durationMs: parsed.duration_ms ?? 0,
              totalCostUsd: parsed.total_cost_usd ?? 0,
            } : undefined,
            errorMessage: parsed.error_message,
          };
        }
      } catch {
        // Skip non-JSON lines
        continue;
      }
    }

    // No result line found
    return {
      type: 'error',
      errorMessage: 'No result found in output',
    };
  } catch (error) {
    return {
      type: 'error',
      errorMessage: `Failed to parse output: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================
// Claude Engine
// Requirements: 2.2, 2.4, 2.5, 3.2
// ============================================================

/**
 * Claude CLI Engine
 * Uses buildClaudeArgs pattern from specManagerService
 */
const CLAUDE_ENGINE: LLMEngine = {
  id: 'claude',
  label: 'Claude',
  command: 'claude',

  buildArgs(options: BuildArgsOptions): string[] {
    const args: string[] = ['-p', '--verbose', '--output-format', 'stream-json'];

    // --dangerously-skip-permissions is placed before other options
    if (options.skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    // AskUserQuestion is always disabled (stream-json mode cannot respond)
    args.push('--disallowedTools=AskUserQuestion');

    // allowedTools (comma-separated format)
    if (options.allowedTools && options.allowedTools.length > 0) {
      args.push(`--allowedTools=${options.allowedTools.join(',')}`);
    }

    // Prompt is the last argument
    args.push(options.prompt);

    return args;
  },

  parseOutput(data: string): ParsedOutput {
    return parseJSONLResult(data);
  },
};

// ============================================================
// Gemini Engine
// Requirements: 2.3, 2.4, 2.5, 3.3, 3.4
// ============================================================

/**
 * Gemini CLI Engine
 * Note: allowedTools/disallowedTools are not supported, silently ignored (Req 2.5)
 */
const GEMINI_ENGINE: LLMEngine = {
  id: 'gemini',
  label: 'Gemini',
  command: 'gemini',

  buildArgs(options: BuildArgsOptions): string[] {
    const args: string[] = ['-p', '--output-format', 'stream-json'];

    // --yolo for skip permissions mode
    if (options.skipPermissions) {
      args.push('--yolo');
    }

    // Note: allowedTools and disallowedTools are silently ignored
    // as Gemini CLI does not support these options in -p mode (Req 2.5)

    // Prompt
    args.push(options.prompt);

    return args;
  },

  parseOutput(data: string): ParsedOutput {
    // Gemini CLI uses the same JSONL format as Claude (based on documentation)
    return parseJSONLResult(data);
  },
};

// ============================================================
// Registry
// Requirements: 1.2, 1.3, 1.4
// ============================================================

/**
 * LLM Engine Registry
 * Contains all registered engines
 * Requirement: 1.2
 */
export const LLM_ENGINES: Record<LLMEngineId, LLMEngine> = {
  claude: CLAUDE_ENGINE,
  gemini: GEMINI_ENGINE,
};

/**
 * Default LLM Engine ID
 */
export const DEFAULT_LLM_ENGINE: LLMEngineId = 'claude';

/**
 * Get engine by ID with fallback to claude
 * Requirement: 1.2
 * @param id - Engine ID (optional, defaults to claude)
 * @returns LLMEngine instance
 */
export function getLLMEngine(id?: LLMEngineId): LLMEngine {
  if (!id || !(id in LLM_ENGINES)) {
    return LLM_ENGINES[DEFAULT_LLM_ENGINE];
  }
  return LLM_ENGINES[id];
}

/**
 * Get list of available engines
 * @returns Array of engine info with id and label
 */
export function getAvailableLLMEngines(): Array<{
  id: LLMEngineId;
  label: string;
}> {
  return (Object.keys(LLM_ENGINES) as LLMEngineId[]).map((id) => ({
    id,
    label: LLM_ENGINES[id].label,
  }));
}
