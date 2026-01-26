/**
 * ReviewEngineRegistry
 * Registry for review engine configurations
 * gemini-document-review Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 6.4, 6.5
 */

// ============================================================
// Error Definitions
// debatex-document-review Task 2.2: Error messages for debatex
// Requirements: 6.1, 6.2, 6.3
// ============================================================

/**
 * Debatex-specific error types and user-friendly messages
 */
export const DEBATEX_ERRORS = {
  NOT_INSTALLED: {
    code: 'DEBATEX_NOT_INSTALLED',
    message: 'debatex がインストールされていません',
    hint: 'npm install -g debatex でインストールしてください',
  },
  TIMEOUT: {
    code: 'DEBATEX_TIMEOUT',
    message: 'debatex の実行がタイムアウトしました',
    hint: 'ネットワーク接続を確認するか、後で再試行してください',
  },
  EXECUTION_FAILED: {
    code: 'DEBATEX_EXECUTION_FAILED',
    message: 'debatex の実行に失敗しました',
    hint: 'ログを確認してエラーの詳細を確認してください',
  },
} as const;

/**
 * Check if an error is a debatex not installed error (ENOENT from spawn)
 * @param error - The error object
 * @returns true if the error indicates debatex is not installed
 */
export function isDebatexNotInstalledError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // ENOENT from spawn indicates command not found
    return message.includes('enoent') || message.includes('spawn npx enoent');
  }
  return false;
}

/**
 * Get user-friendly error info for debatex errors
 * @param error - The error object
 * @returns Error info with code, message, and hint, or null if not a known debatex error
 */
export function getDebatexErrorInfo(error: unknown): typeof DEBATEX_ERRORS[keyof typeof DEBATEX_ERRORS] | null {
  if (isDebatexNotInstalledError(error)) {
    return DEBATEX_ERRORS.NOT_INSTALLED;
  }
  if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
    return DEBATEX_ERRORS.TIMEOUT;
  }
  return null;
}

// ============================================================
// Types
// ============================================================

/**
 * Reviewer scheme for document review
 * - 'claude-code': Claude Code CLI (default)
 * - 'gemini-cli': Gemini CLI
 * - 'debatex': Debatex CLI
 */
export type ReviewerScheme = 'claude-code' | 'gemini-cli' | 'debatex';

/**
 * Default reviewer scheme
 */
export const DEFAULT_REVIEWER_SCHEME: ReviewerScheme = 'claude-code';

/**
 * Extended build args context for engines that need additional information
 * debatex-document-review Requirements: 1.1, 1.3
 */
export interface BuildArgsContext {
  featureName: string;
  specPath?: string;
  roundNumber?: number;
}

/**
 * Review engine configuration
 * debatex-document-review: buildArgs signature extended to accept string | BuildArgsContext
 */
export interface ReviewEngineConfig {
  /** Display label */
  label: string;
  /** Tag color class (Tailwind) */
  colorClass: string;
  /** Command (string or array) */
  command: string | string[];
  /**
   * Arguments builder function
   * @param context - Feature name (string) or full context object
   * debatex-document-review Requirements: 1.1, 1.3
   */
  buildArgs: (context: string | BuildArgsContext) => string[];
  /** Output format */
  outputFormat: 'jsonl' | 'text';
}

// ============================================================
// Registry
// Requirements: 9.1, 9.2
// ============================================================

/**
 * Review engine registry
 * Contains configuration for all supported review engines
 */
export const REVIEW_ENGINES: Record<ReviewerScheme, ReviewEngineConfig> = {
  'claude-code': {
    label: 'Claude',
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    command: 'claude',
    buildArgs: (featureName) => ['-p', `/kiro:document-review ${featureName}`],
    outputFormat: 'jsonl',
  },
  'gemini-cli': {
    label: 'Gemini',
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    command: 'gemini',
    buildArgs: (featureName) => [
      '-p',
      `/kiro:document-review ${featureName}`,
      '--yolo',
      '--output-format',
      'stream-json',
    ],
    outputFormat: 'jsonl',
  },
  'debatex': {
    label: 'Debatex',
    colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    command: ['npx', 'debatex'],
    // debatex-document-review Requirements: 1.2, 1.3
    // Accepts string | BuildArgsContext for backward compatibility and output path support
    buildArgs: (context) => {
      // Normalize to BuildArgsContext
      const ctx: BuildArgsContext = typeof context === 'string'
        ? { featureName: context }
        : context;

      const args: string[] = ['sdd-document-review', ctx.featureName];

      // Add --output flag only when both specPath and roundNumber are provided
      // debatex-document-review Requirement: 1.3
      if (ctx.specPath && ctx.roundNumber !== undefined) {
        const outputPath = `${ctx.specPath}/document-review-${ctx.roundNumber}.md`;
        args.push('--output', outputPath);
      }

      return args;
    },
    outputFormat: 'text',
  },
};

// ============================================================
// Functions
// Requirements: 9.4, 9.5
// ============================================================

/**
 * Get review engine configuration
 * Falls back to DEFAULT_REVIEWER_SCHEME for unknown or undefined scheme
 *
 * @param scheme - Reviewer scheme (undefined or unknown falls back to default)
 * @returns Review engine configuration
 */
export function getReviewEngine(scheme?: ReviewerScheme): ReviewEngineConfig {
  if (!scheme || !(scheme in REVIEW_ENGINES)) {
    return REVIEW_ENGINES[DEFAULT_REVIEWER_SCHEME];
  }
  return REVIEW_ENGINES[scheme];
}

/**
 * Get list of available engines for dropdown menu
 *
 * @returns Array of engine info with scheme, label, and colorClass
 */
export function getAvailableEngines(): Array<{
  scheme: ReviewerScheme;
  label: string;
  colorClass: string;
}> {
  return (Object.keys(REVIEW_ENGINES) as ReviewerScheme[]).map((scheme) => ({
    scheme,
    label: REVIEW_ENGINES[scheme].label,
    colorClass: REVIEW_ENGINES[scheme].colorClass,
  }));
}

/**
 * Get the primary command string for an engine
 * For single-string commands, returns the command directly.
 * For array commands (e.g., ['npx', 'debatex']), returns the first element.
 *
 * @param engine - Review engine configuration
 * @returns Primary command string
 */
export function getEngineCommand(engine: ReviewEngineConfig): string {
  return Array.isArray(engine.command) ? engine.command[0] : engine.command;
}

/**
 * Get the full arguments for an engine, including any command parts
 * For array commands (e.g., ['npx', 'debatex']), prepends extra command parts to args.
 *
 * @param engine - Review engine configuration
 * @param featureName - Feature name to pass to buildArgs
 * @returns Full arguments array
 */
export function getEngineArgs(engine: ReviewEngineConfig, featureName: string): string[] {
  const baseArgs = engine.buildArgs(featureName);
  if (Array.isArray(engine.command)) {
    // For array commands, include the command parts after the first one as initial args
    // e.g., ['npx', 'debatex'] -> args = ['debatex', ...baseArgs]
    return [...engine.command.slice(1), ...baseArgs];
  }
  return baseArgs;
}

// ============================================================
// ReviewerScheme to LLMEngineId Mapping
// Bug fix: gemini-document-review-engineid-missing
// ============================================================

// Import LLMEngineId from llmEngineRegistry to avoid circular dependency
import type { LLMEngineId } from './llmEngineRegistry';

/**
 * Mapping from ReviewerScheme to LLMEngineId
 * Used for log parser selection
 */
const SCHEME_TO_ENGINE_ID: Record<ReviewerScheme, LLMEngineId> = {
  'claude-code': 'claude',
  'gemini-cli': 'gemini',
  'debatex': 'claude', // debatex uses Claude for log parsing (text output, not JSONL)
};

/**
 * Get LLMEngineId from ReviewerScheme
 * Falls back to 'claude' for unknown schemes
 *
 * @param scheme - Reviewer scheme (undefined falls back to 'claude')
 * @returns LLMEngineId for log parser selection
 */
export function getEngineIdFromScheme(scheme?: ReviewerScheme): LLMEngineId {
  if (!scheme || !(scheme in SCHEME_TO_ENGINE_ID)) {
    return 'claude';
  }
  return SCHEME_TO_ENGINE_ID[scheme];
}
