/**
 * Project Utilities
 * trpc-full-migration Task 11.2: ipc/projectUtils.ts から trpc/helpers/ に移動
 *
 * Functions:
 * - validateProjectPath: Validate path exists, is directory, has read permission
 * - isProjectSelectionInProgress: Check selection lock state
 * - setProjectSelectionLock: Set selection lock
 * - resetProjectSelectionLock: Reset selection lock
 */

import { access, stat, readdir } from 'fs/promises';
import type { SelectProjectError } from '../../../renderer/types';

// ============================================================
// Exclusive Control for Project Selection
// ============================================================

let projectSelectionInProgress = false;

export function isProjectSelectionInProgress(): boolean {
  return projectSelectionInProgress;
}

export function setProjectSelectionLock(locked: boolean): void {
  projectSelectionInProgress = locked;
}

export function resetProjectSelectionLock(): void {
  projectSelectionInProgress = false;
}

/**
 * Validate project path
 * Checks if path exists, is a directory, and has read permission
 */
export async function validateProjectPath(
  projectPath: string
): Promise<{ ok: true; value: string } | { ok: false; error: SelectProjectError }> {
  try {
    await access(projectPath);
  } catch {
    return {
      ok: false,
      error: { type: 'PATH_NOT_EXISTS', path: projectPath },
    };
  }

  try {
    const stats = await stat(projectPath);
    if (!stats.isDirectory()) {
      return {
        ok: false,
        error: { type: 'NOT_A_DIRECTORY', path: projectPath },
      };
    }
  } catch {
    return {
      ok: false,
      error: { type: 'PERMISSION_DENIED', path: projectPath },
    };
  }

  try {
    await readdir(projectPath);
  } catch {
    return {
      ok: false,
      error: { type: 'PERMISSION_DENIED', path: projectPath },
    };
  }

  return { ok: true, value: projectPath };
}
