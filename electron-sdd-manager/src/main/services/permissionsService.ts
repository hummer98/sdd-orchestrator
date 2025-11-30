/**
 * PermissionsService
 * Manages Claude Code permissions in settings.local.json
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { app } from 'electron';
import { logger } from './logger';

/**
 * Result type
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Add permissions error types
 */
export type AddPermissionsError =
  | { type: 'PERMISSIONS_FILE_NOT_FOUND'; path: string }
  | { type: 'READ_ERROR'; path: string; message: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PARSE_ERROR'; path: string; message: string };

/**
 * Add permissions result
 */
export interface AddPermissionsResult {
  readonly added: readonly string[];
  readonly alreadyExists: readonly string[];
  readonly total: number;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path to standard-commands.txt
 */
export function getStandardPermissionsPath(): string {
  // In production, use app resources path
  // In development, use the project's resources folder
  if (app.isPackaged) {
    return join(process.resourcesPath, 'permissions', 'standard-commands.txt');
  }
  return join(process.cwd(), 'resources', 'permissions', 'standard-commands.txt');
}

/**
 * Read standard permissions from the text file
 */
async function readStandardPermissions(
  permissionsPath: string
): Promise<Result<string[], AddPermissionsError>> {
  try {
    const content = await readFile(permissionsPath, 'utf-8');
    const permissions = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    return { ok: true, value: permissions };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT')) {
      return {
        ok: false,
        error: { type: 'PERMISSIONS_FILE_NOT_FOUND', path: permissionsPath },
      };
    }
    return {
      ok: false,
      error: { type: 'READ_ERROR', path: permissionsPath, message },
    };
  }
}

/**
 * Settings.local.json structure
 */
interface SettingsLocalJson {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

/**
 * Add shell permissions to project's settings.local.json
 *
 * @param projectPath - Project root path
 * @param permissionsPath - Path to standard-commands.txt (optional, uses default if not provided)
 * @returns Result with added and already existing permissions
 */
export async function addShellPermissions(
  projectPath: string,
  permissionsPath?: string
): Promise<Result<AddPermissionsResult, AddPermissionsError>> {
  const standardPermissionsPath = permissionsPath ?? getStandardPermissionsPath();
  logger.info('[permissionsService] Adding shell permissions', { projectPath, standardPermissionsPath });

  // Read standard permissions
  const standardResult = await readStandardPermissions(standardPermissionsPath);
  if (!standardResult.ok) {
    return standardResult;
  }
  const standardPermissions = standardResult.value;

  // Path to settings.local.json
  const settingsPath = join(projectPath, '.claude', 'settings.local.json');
  logger.info('[permissionsService] Settings path', { settingsPath });

  // Read existing settings or create empty structure
  let settings: SettingsLocalJson = {};
  if (await fileExists(settingsPath)) {
    try {
      const content = await readFile(settingsPath, 'utf-8');
      settings = JSON.parse(content) as SettingsLocalJson;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { type: 'PARSE_ERROR', path: settingsPath, message },
      };
    }
  }

  // Ensure permissions.allow exists
  if (!settings.permissions) {
    settings.permissions = {};
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }

  const existingPermissions = new Set(settings.permissions.allow);
  const added: string[] = [];
  const alreadyExists: string[] = [];

  // Add new permissions
  for (const permission of standardPermissions) {
    if (existingPermissions.has(permission)) {
      alreadyExists.push(permission);
    } else {
      settings.permissions.allow.push(permission);
      added.push(permission);
    }
  }

  // Write back to file
  try {
    await mkdir(dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    logger.info('[permissionsService] Permissions added successfully', { added: added.length, alreadyExists: alreadyExists.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: { type: 'WRITE_ERROR', path: settingsPath, message },
    };
  }

  return {
    ok: true,
    value: {
      added,
      alreadyExists,
      total: settings.permissions.allow.length,
    },
  };
}
