/**
 * Resource Path Utilities
 * Handles differences between development and production resource paths
 */

import { app } from 'electron';
import { join } from 'path';

/**
 * Get the base resources directory path
 *
 * In production (packaged):
 *   - extraResources are located at process.resourcesPath
 *   - Example: /Applications/App.app/Contents/Resources
 *
 * In development:
 *   - Resources are in the project directory
 *   - Example: /path/to/project/electron-sdd-manager
 *
 * @returns Base path to resources directory
 */
export function getResourcesBasePath(): string {
  if (app.isPackaged) {
    // Production: extraResources are outside app.asar at process.resourcesPath
    return process.resourcesPath;
  }
  // Development: use current working directory or app path
  return process.cwd();
}

/**
 * Get path to a resource file or directory
 *
 * @param relativePath - Relative path from resources directory (e.g., 'templates', 'permissions/standard-commands.txt')
 * @returns Absolute path to the resource
 *
 * @example
 * ```ts
 * // Get templates directory
 * const templatesDir = getResourcePath('resources', 'templates');
 *
 * // Get specific file
 * const permissionsFile = getResourcePath('resources', 'permissions', 'standard-commands.txt');
 * ```
 */
export function getResourcePath(...pathSegments: string[]): string {
  return join(getResourcesBasePath(), ...pathSegments);
}

/**
 * Get the templates directory path
 * @returns Absolute path to templates directory
 */
export function getTemplatesPath(): string {
  return getResourcePath('resources', 'templates');
}

/**
 * Get the permissions directory path
 * @returns Absolute path to permissions directory
 */
export function getPermissionsPath(): string {
  return getResourcePath('resources', 'permissions');
}

/**
 * Get the scripts directory path
 * @returns Absolute path to scripts directory
 */
export function getScriptsPath(): string {
  return getResourcePath('scripts');
}

/**
 * Get the experimental templates directory path
 * @returns Absolute path to experimental templates directory
 */
export function getExperimentalTemplatesPath(): string {
  return getResourcePath('resources', 'templates', 'experimental');
}

/**
 * Get the common commands templates directory path
 * @returns Absolute path to common commands templates directory
 */
export function getCommonCommandsTemplatesPath(): string {
  return getResourcePath('resources', 'templates', 'commands', 'common');
}
