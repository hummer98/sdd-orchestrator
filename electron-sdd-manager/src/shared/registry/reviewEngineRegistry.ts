/**
 * ReviewEngineRegistry
 * Registry for review engine configurations
 * gemini-document-review Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 6.4, 6.5
 */

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
 * Review engine configuration
 */
export interface ReviewEngineConfig {
  /** Display label */
  label: string;
  /** Tag color class (Tailwind) */
  colorClass: string;
  /** Command (string or array) */
  command: string | string[];
  /** Arguments builder function */
  buildArgs: (featureName: string) => string[];
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
    buildArgs: (featureName) => ['sdd-document-review', featureName],
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
