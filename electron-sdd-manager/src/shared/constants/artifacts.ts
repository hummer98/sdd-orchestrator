/**
 * Artifact Constants
 *
 * Centralized artifact filename definitions and mappings.
 * Shared by Main process, Electron Renderer, and Remote UI.
 *
 * Design: Following SSOT principle for artifact filenames.
 */

// =============================================================================
// Core Artifact Filenames
// =============================================================================

/**
 * Spec JSON configuration filename
 */
export const SPEC_JSON_FILENAME = 'spec.json' as const;

/**
 * All spec artifact filenames (excluding spec.json)
 */
export const SPEC_ARTIFACT_FILENAMES = {
  requirements: 'requirements.md',
  design: 'design.md',
  tasks: 'tasks.md',
  research: 'research.md',
} as const;

// =============================================================================
// Artifact Type Definitions (derived from constants)
// =============================================================================

/**
 * Spec artifact keys (type-safe)
 */
export type SpecArtifactKey = keyof typeof SPEC_ARTIFACT_FILENAMES;

/**
 * All artifact filenames as a union type
 */
export type SpecArtifactFilename = (typeof SPEC_ARTIFACT_FILENAMES)[SpecArtifactKey];

// =============================================================================
// Arrays for Iteration
// =============================================================================

/**
 * Ordered list of spec artifact keys for iteration
 * Order: requirements -> design -> tasks -> research
 */
export const SPEC_ARTIFACT_KEYS = ['requirements', 'design', 'tasks', 'research'] as const satisfies readonly SpecArtifactKey[];

/**
 * Ordered list of required document artifact filenames
 * Used for document validation (excludes optional research.md)
 */
export const REQUIRED_DOC_FILENAMES = [
  SPEC_ARTIFACT_FILENAMES.requirements,
  SPEC_ARTIFACT_FILENAMES.design,
  SPEC_ARTIFACT_FILENAMES.tasks,
] as const;

/**
 * All artifact files watched for phase changes
 */
export const WATCHED_ARTIFACT_FILENAMES = [
  SPEC_ARTIFACT_FILENAMES.requirements,
  SPEC_ARTIFACT_FILENAMES.design,
  SPEC_ARTIFACT_FILENAMES.tasks,
] as const;

// =============================================================================
// Phase Mappings
// =============================================================================

/**
 * Maps artifact filename to workflow phase
 * Used by specsWatcherService for phase detection
 */
export const ARTIFACT_TO_PHASE = {
  [SPEC_ARTIFACT_FILENAMES.requirements]: 'requirements',
  [SPEC_ARTIFACT_FILENAMES.design]: 'design',
  [SPEC_ARTIFACT_FILENAMES.tasks]: 'tasks',
} as const satisfies Record<string, string>;

// =============================================================================
// UI Tab Configurations
// =============================================================================

/**
 * Tab configuration for spec artifact display
 * Used by SpecPane.tsx and RemoteArtifactEditor.tsx
 */
export interface ArtifactTabInfo {
  readonly key: SpecArtifactKey;
  readonly label: string;
}

/**
 * Spec artifact tabs for UI components
 * Eliminates duplication between SpecPane and RemoteArtifactEditor
 */
export const SPEC_ARTIFACT_TABS: readonly ArtifactTabInfo[] = [
  { key: 'requirements', label: SPEC_ARTIFACT_FILENAMES.requirements },
  { key: 'design', label: SPEC_ARTIFACT_FILENAMES.design },
  { key: 'tasks', label: SPEC_ARTIFACT_FILENAMES.tasks },
  { key: 'research', label: SPEC_ARTIFACT_FILENAMES.research },
] as const;

/**
 * Required artifact tabs (excludes research)
 * Used for preview components
 */
export const REQUIRED_ARTIFACT_TABS: readonly ArtifactTabInfo[] = [
  { key: 'requirements', label: SPEC_ARTIFACT_FILENAMES.requirements },
  { key: 'design', label: SPEC_ARTIFACT_FILENAMES.design },
  { key: 'tasks', label: SPEC_ARTIFACT_FILENAMES.tasks },
] as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get artifact filename from key
 */
export function getArtifactFilename(key: SpecArtifactKey): string {
  return SPEC_ARTIFACT_FILENAMES[key];
}

/**
 * Get artifact key from filename (reverse lookup)
 * Returns undefined if not a recognized artifact filename
 */
export function getArtifactKeyFromFilename(filename: string): SpecArtifactKey | undefined {
  const entries = Object.entries(SPEC_ARTIFACT_FILENAMES) as [SpecArtifactKey, string][];
  const found = entries.find(([, value]) => value === filename);
  return found?.[0];
}

/**
 * Check if a filename is a spec artifact
 */
export function isSpecArtifactFilename(filename: string): boolean {
  return Object.values(SPEC_ARTIFACT_FILENAMES).includes(filename as SpecArtifactFilename);
}

/**
 * Check if a filename is a required artifact (excludes research)
 */
export function isRequiredArtifactFilename(filename: string): boolean {
  return REQUIRED_DOC_FILENAMES.includes(filename as (typeof REQUIRED_DOC_FILENAMES)[number]);
}

/**
 * Check if a filename is a watched artifact for phase changes
 */
export function isWatchedArtifactFilename(filename: string): boolean {
  return WATCHED_ARTIFACT_FILENAMES.includes(filename as (typeof WATCHED_ARTIFACT_FILENAMES)[number]);
}
