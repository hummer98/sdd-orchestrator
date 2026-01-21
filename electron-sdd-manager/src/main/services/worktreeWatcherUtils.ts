/**
 * Worktree Watcher Utilities
 * Common utility functions for 2-tier watcher pattern
 * spec-path-ssot-refactor Task 2.1
 * Requirements: 4.1, 4.3
 */

import * as path from 'path';

/**
 * Entity type for watcher operations
 */
export type EntityType = 'specs' | 'bugs';

/**
 * Detect worktree addition from directory path
 * Used to identify when a new worktree directory is added to .kiro/worktrees/{entityType}/
 *
 * @param basePath - Base path to check against (e.g., /project/.kiro/worktrees/specs/)
 * @param dirPath - Detected directory path
 * @returns Entity name if worktree pattern matched (direct child of basePath), null otherwise
 */
export function detectWorktreeAddition(
  basePath: string,
  dirPath: string
): string | null {
  // Normalize paths for comparison
  const normalizedBase = path.normalize(basePath);
  const normalizedDir = path.normalize(dirPath);

  // Check if dirPath is a direct child of basePath
  if (!normalizedDir.startsWith(normalizedBase + path.sep)) {
    return null;
  }

  // Get relative path from base
  const relativePath = path.relative(normalizedBase, normalizedDir);

  // Should be exactly one segment (direct child), not nested
  // e.g., "my-feature" is valid, "my-feature/.kiro" is not
  if (relativePath.includes(path.sep) || relativePath === '') {
    return null;
  }

  return relativePath;
}

/**
 * Build inner entity path for worktree monitoring
 * Returns the path to the actual entity directory inside the worktree
 *
 * Pattern: .kiro/worktrees/{type}/{name}/.kiro/{type}/{name}/
 *
 * @param projectPath - Project root
 * @param entityType - 'specs' or 'bugs'
 * @param entityName - Entity name
 * @returns Absolute path to entity directory inside worktree
 */
export function buildWorktreeEntityPath(
  projectPath: string,
  entityType: EntityType,
  entityName: string
): string {
  return path.join(
    projectPath,
    '.kiro',
    'worktrees',
    entityType,
    entityName,
    '.kiro',
    entityType,
    entityName
  );
}

/**
 * Extract entity name from file path (supports both main and worktree paths)
 *
 * Main path pattern: .kiro/{type}/{name}/...
 * Worktree path pattern: .kiro/worktrees/{type}/{name}/.kiro/{type}/{name}/...
 *
 * @param projectPath - Project root
 * @param entityType - 'specs' or 'bugs'
 * @param filePath - Detected file path
 * @returns Entity name or undefined if path doesn't match expected patterns
 */
export function extractEntityName(
  projectPath: string,
  entityType: EntityType,
  filePath: string
): string | undefined {
  const normalizedProject = path.normalize(projectPath);
  const normalizedFile = path.normalize(filePath);

  // Check if file is within project
  if (!normalizedFile.startsWith(normalizedProject)) {
    return undefined;
  }

  // Get relative path from project root
  const relativePath = path.relative(normalizedProject, normalizedFile);
  const segments = relativePath.split(path.sep);

  // Pattern 1: Worktree path
  // .kiro/worktrees/{type}/{name}/.kiro/{type}/{name}/...
  // segments: ['.kiro', 'worktrees', 'specs|bugs', 'name', '.kiro', 'specs|bugs', 'name', ...]
  if (
    segments.length >= 7 &&
    segments[0] === '.kiro' &&
    segments[1] === 'worktrees' &&
    segments[2] === entityType &&
    segments[4] === '.kiro' &&
    segments[5] === entityType
  ) {
    // Verify the entity name matches in both positions (segments[3] and segments[6])
    if (segments[3] === segments[6]) {
      return segments[6];
    }
    return undefined;
  }

  // Pattern 2: Main path
  // .kiro/{type}/{name}/...
  // segments: ['.kiro', 'specs|bugs', 'name', ...]
  // Note: We need at least 4 segments to extract from path (3 would be just .kiro/{type}/{name})
  if (
    segments.length >= 4 &&
    segments[0] === '.kiro' &&
    segments[1] === entityType
  ) {
    return segments[2];
  }

  return undefined;
}
