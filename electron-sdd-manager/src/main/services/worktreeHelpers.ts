/**
 * Worktree Helpers
 * Common utility functions for Specs/Bugs worktree directory operations
 * Requirements: 8.1, 8.4
 */

import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { logger } from './logger';

/**
 * Entity type for worktree operations
 */
export type EntityType = 'specs' | 'bugs';

/**
 * Worktree entity info returned by scanner
 */
export interface WorktreeEntityInfo {
  /** Entity name (spec feature or bug name) */
  name: string;
  /** Absolute path to entity directory inside worktree */
  path: string;
  /** Relative path to worktree base: .kiro/worktrees/{type}/{name} */
  worktreeBasePath: string;
}

/**
 * File system interface for dependency injection (testing)
 */
export interface FileSystemInterface {
  readdir: typeof fsPromises.readdir;
  access: typeof fsPromises.access;
}

/**
 * Default file system implementation using fs/promises
 */
export const defaultFs: FileSystemInterface = {
  readdir: fsPromises.readdir,
  access: fsPromises.access,
};

/**
 * Get worktree base path for an entity
 * Returns: .kiro/worktrees/{type}/{name}
 *
 * @param projectPath - Project root path
 * @param type - Entity type ('specs' | 'bugs')
 * @param name - Entity name (spec feature or bug name)
 * @returns Object with relative and absolute paths
 */
export function getWorktreeBasePath(
  projectPath: string,
  type: EntityType,
  name: string
): { relative: string; absolute: string } {
  const relative = `.kiro/worktrees/${type}/${name}`;
  const absolute = path.resolve(projectPath, relative);
  return { relative, absolute };
}

/**
 * Get entity path inside worktree
 * Returns: .kiro/worktrees/{type}/{name}/.kiro/{type}/{name}
 *
 * @param projectPath - Project root path
 * @param type - Entity type ('specs' | 'bugs')
 * @param name - Entity name (spec feature or bug name)
 * @returns Object with relative and absolute paths
 */
export function getWorktreeEntityPath(
  projectPath: string,
  type: EntityType,
  name: string
): { relative: string; absolute: string } {
  const relative = `.kiro/worktrees/${type}/${name}/.kiro/${type}/${name}`;
  const absolute = path.resolve(projectPath, relative);
  return { relative, absolute };
}

/**
 * Scan worktree entities of a given type
 * Pattern: .kiro/worktrees/{type}/{name}/.kiro/{type}/{name}/
 *
 * @param projectPath - Project root path
 * @param type - Entity type ('specs' | 'bugs')
 * @param fs - Optional file system interface for testing
 * @returns Array of worktree entity info
 */
export async function scanWorktreeEntities(
  projectPath: string,
  type: EntityType,
  fs: FileSystemInterface = defaultFs
): Promise<WorktreeEntityInfo[]> {
  const worktreeBaseDir = path.join(projectPath, '.kiro', 'worktrees', type);
  const entities: WorktreeEntityInfo[] = [];

  // Check if worktrees base directory exists
  try {
    await fs.access(worktreeBaseDir);
  } catch {
    // Worktrees directory doesn't exist
    logger.debug('[worktreeHelpers] Worktrees directory not found', { type, worktreeBaseDir });
    return [];
  }

  // Read worktree directories
  const entries = await fs.readdir(worktreeBaseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;
    const entityPath = getWorktreeEntityPath(projectPath, type, name);
    const basePath = getWorktreeBasePath(projectPath, type, name);

    // Check if entity directory exists inside worktree
    try {
      await fs.access(entityPath.absolute);

      entities.push({
        name,
        path: entityPath.absolute,
        worktreeBasePath: basePath.relative,
      });

      logger.debug('[worktreeHelpers] Found worktree entity', { type, name, path: entityPath.absolute });
    } catch {
      // Entity path doesn't exist inside worktree, skip
      logger.debug('[worktreeHelpers] Worktree entity path not found, skipping', {
        type,
        name,
        expectedPath: entityPath.absolute,
      });
    }
  }

  return entities;
}
