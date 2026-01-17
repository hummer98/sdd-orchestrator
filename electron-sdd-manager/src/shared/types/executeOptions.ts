/**
 * ExecuteOptions - Unified Execute Method Options Types
 *
 * execute-method-unification feature
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * This module defines the ExecuteOptions Union type that consolidates
 * all execute* method parameters into a single discriminated union.
 * The `type` field serves as the discriminant for type narrowing.
 */

import type { ReviewerScheme } from '../registry/reviewEngineRegistry';

// ============================================================
// Command Prefix Type
// ============================================================

/**
 * Command prefix for slash commands
 * - 'kiro': Uses /kiro:* commands (default)
 * - 'spec-manager': Uses /spec-manager:* commands
 */
export type CommandPrefix = 'kiro' | 'spec-manager';

// ============================================================
// Base Interface (Requirements: 1.2)
// ============================================================

/**
 * Common fields shared by all execute phase options
 *
 * Requirements: 1.2 - Extract common fields to ExecutePhaseBase
 */
export interface ExecutePhaseBase {
  /** Spec directory name (e.g., 'my-feature') */
  specId: string;
  /** Feature name for the command argument */
  featureName: string;
  /** Command prefix (default: 'kiro') */
  commandPrefix?: CommandPrefix;
}

// ============================================================
// Phase-Specific Interfaces (Requirements: 1.1, 1.3)
// ============================================================

/**
 * Execute requirements phase
 * Command: /kiro:spec-requirements {featureName}
 */
export interface ExecuteRequirements extends ExecutePhaseBase {
  type: 'requirements';
}

/**
 * Execute design phase
 * Command: /kiro:spec-design {featureName}
 */
export interface ExecuteDesign extends ExecutePhaseBase {
  type: 'design';
}

/**
 * Execute tasks phase
 * Command: /kiro:spec-tasks {featureName}
 */
export interface ExecuteTasks extends ExecutePhaseBase {
  type: 'tasks';
}

/**
 * Execute deploy phase
 * Command: /commit
 */
export interface ExecuteDeploy extends ExecutePhaseBase {
  type: 'deploy';
}

/**
 * Execute impl phase with optional task ID
 * Command: /kiro:spec-impl {featureName} [{taskId}]
 *
 * When taskId is provided: Executes specific task
 * When taskId is omitted: Executes all pending tasks
 *
 * group: 'impl' - worktreeCwd will be auto-resolved
 */
export interface ExecuteImpl extends ExecutePhaseBase {
  type: 'impl';
  /** Task ID to implement (e.g., '1.1', '2.3'). When omitted, all pending tasks are executed. */
  taskId?: string;
}

/**
 * Execute document-review phase
 * Command: /kiro:document-review {featureName} (for claude-code)
 * Or external command based on scheme (gemini-cli, debatex)
 *
 * gemini-document-review: scheme option for multi-engine support
 */
export interface ExecuteDocumentReview extends ExecutePhaseBase {
  type: 'document-review';
  /** Reviewer scheme (default: 'claude-code') */
  scheme?: ReviewerScheme;
}

/**
 * Execute document-review-reply phase
 * Command: /kiro:document-review-reply {featureName} {reviewNumber} [--autofix]
 */
export interface ExecuteDocumentReviewReply extends ExecutePhaseBase {
  type: 'document-review-reply';
  /** Review round number to reply to */
  reviewNumber: number;
  /** When true, appends --autofix flag */
  autofix?: boolean;
}

/**
 * Execute document-review-fix phase (apply fixes from existing reply)
 * Command: /kiro:document-review-reply {featureName} {reviewNumber} --fix
 */
export interface ExecuteDocumentReviewFix extends ExecutePhaseBase {
  type: 'document-review-fix';
  /** Review round number to apply fixes for */
  reviewNumber: number;
}

/**
 * Execute inspection phase
 * Command: /kiro:spec-inspection {featureName}
 *
 * group: 'impl' - worktreeCwd will be auto-resolved
 */
export interface ExecuteInspection extends ExecutePhaseBase {
  type: 'inspection';
}

/**
 * Execute inspection-fix phase
 * Command: /kiro:spec-inspection {featureName} --fix
 *
 * group: 'impl' - worktreeCwd will be auto-resolved
 */
export interface ExecuteInspectionFix extends ExecutePhaseBase {
  type: 'inspection-fix';
  /** Inspection round number to apply fixes for */
  roundNumber: number;
}

/**
 * Execute spec-merge phase
 * Command: /kiro:spec-merge {featureName}
 */
export interface ExecuteSpecMerge extends ExecutePhaseBase {
  type: 'spec-merge';
}

// ============================================================
// Union Type (Requirements: 1.4)
// ============================================================

/**
 * ExecuteOptions - Discriminated Union of all execute phase options
 *
 * Requirements: 1.4 - Union all interfaces into ExecuteOptions
 *
 * Usage:
 * ```typescript
 * const options: ExecuteOptions = { type: 'impl', specId: 'my-feature', featureName: 'my-feature', taskId: '1.1' };
 *
 * // Type narrowing with switch
 * switch (options.type) {
 *   case 'impl':
 *     console.log(options.taskId); // TypeScript knows taskId exists
 *     break;
 *   case 'requirements':
 *     // No taskId here
 *     break;
 * }
 * ```
 */
export type ExecuteOptions =
  | ExecuteRequirements
  | ExecuteDesign
  | ExecuteTasks
  | ExecuteDeploy
  | ExecuteImpl
  | ExecuteDocumentReview
  | ExecuteDocumentReviewReply
  | ExecuteDocumentReviewFix
  | ExecuteInspection
  | ExecuteInspectionFix
  | ExecuteSpecMerge;

// ============================================================
// Helper Types
// ============================================================

/**
 * All possible execute option type discriminants
 */
export type ExecuteOptionType = ExecuteOptions['type'];

/**
 * Extract specific option type from ExecuteOptions union
 */
export type ExtractExecuteOption<T extends ExecuteOptionType> = Extract<
  ExecuteOptions,
  { type: T }
>;
