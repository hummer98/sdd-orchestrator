/**
 * Tool Path Types
 * Shared type definitions for tool path resolution (claude, jj, jq)
 *
 * Migrated from legacy Electron API type definitions (Task 11.3)
 * Canonical definitions also exist in main/services/toolPathResolverService.ts
 * This shared version is used by Renderer-side stores and components.
 *
 * Requirements: well-known-tool-paths 1.1, 2.1, 2.4
 */

/**
 * Tool definition
 */
export interface ToolDefinition {
  readonly name: string;
  readonly required: boolean;
  readonly versionCommand: string;
  readonly installGuidance: string;
}

/**
 * Resolution result with source indicator
 */
export interface ToolResolutionResult {
  readonly resolved: boolean;
  readonly path?: string;
  readonly source?: 'manual' | 'well-known' | 'not-found';
  readonly error?: string;
}

/**
 * Tool status combining definition and resolution
 */
export interface ToolStatus {
  readonly definition: ToolDefinition;
  readonly resolution: ToolResolutionResult;
}
