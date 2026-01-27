/**
 * Tool availability check types
 * jj-merge-support feature: Task 12.11
 * Requirements: 9.1, 9.2
 */

/**
 * Result of checking tool availability
 * Used for jj, jq, and other external tools
 */
export interface ToolCheck {
  readonly name: string;
  readonly available: boolean;
  readonly version?: string;
  readonly installGuidance?: string;
}
