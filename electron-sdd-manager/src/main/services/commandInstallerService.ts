/**
 * CommandInstallerService
 * Installs Slash Command files and SDD settings to projects
 * Requirements: 4.3, 4.5, 4.6
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { REQUIRED_COMMANDS, REQUIRED_SETTINGS } from './projectChecker';

/**
 * Install options
 */
export interface InstallOptions {
  readonly force?: boolean;
}

/**
 * Install result
 */
export interface InstallResult {
  readonly installed: readonly string[];
  readonly skipped: readonly string[];
  readonly overwritten: readonly string[];
}

/**
 * Full install result (commands + settings)
 */
export interface FullInstallResult {
  readonly commands: InstallResult;
  readonly settings: InstallResult;
}

/**
 * Install error types
 */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string };

/**
 * Result type
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

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
 * Service for installing command and settings files
 */
export class CommandInstallerService {
  private templateDir: string;

  /**
   * Create installer with template directory
   * @param templateDir - Directory containing template files
   */
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Install Slash Command files to project
   * Requirements: 4.3, 4.5, 4.6
   *
   * @param projectPath - Project root path
   * @param commands - List of command names to install
   * @param options - Install options (force: overwrite existing files)
   * @returns Install result with installed, skipped, and overwritten files
   */
  async installCommands(
    projectPath: string,
    commands: readonly string[],
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const cmd of commands) {
      const templatePath = join(this.templateDir, 'commands', `${cmd}.md`);
      const targetPath = join(projectPath, '.claude', 'commands', `${cmd}.md`);

      // Check if template exists
      if (!(await fileExists(templatePath))) {
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
        };
      }

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(cmd);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(cmd);
        } else {
          installed.push(cmd);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('EACCES') || message.includes('EPERM')) {
          return {
            ok: false,
            error: { type: 'PERMISSION_DENIED', path: targetPath },
          };
        }
        return {
          ok: false,
          error: { type: 'WRITE_ERROR', path: targetPath, message },
        };
      }
    }

    return { ok: true, value: { installed, skipped, overwritten } };
  }

  /**
   * Install SDD settings files to project
   * Requirements: 4.3, 4.5, 4.6
   *
   * @param projectPath - Project root path
   * @param settings - List of settings file names to install
   * @param options - Install options (force: overwrite existing files)
   * @returns Install result with installed, skipped, and overwritten files
   */
  async installSettings(
    projectPath: string,
    settings: readonly string[],
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const setting of settings) {
      const templatePath = join(this.templateDir, 'settings', setting);
      const targetPath = join(projectPath, '.kiro', 'settings', setting);

      // Check if template exists
      if (!(await fileExists(templatePath))) {
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
        };
      }

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(setting);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(setting);
        } else {
          installed.push(setting);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('EACCES') || message.includes('EPERM')) {
          return {
            ok: false,
            error: { type: 'PERMISSION_DENIED', path: targetPath },
          };
        }
        return {
          ok: false,
          error: { type: 'WRITE_ERROR', path: targetPath, message },
        };
      }
    }

    return { ok: true, value: { installed, skipped, overwritten } };
  }

  /**
   * Install all Slash Commands and SDD settings
   * Requirements: 4.3, 4.5, 4.6
   *
   * @param projectPath - Project root path
   * @param options - Install options (force: overwrite existing files)
   * @returns Full install result
   */
  async installAll(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<FullInstallResult, InstallError>> {
    const commandsResult = await this.installCommands(projectPath, REQUIRED_COMMANDS, options);
    if (!commandsResult.ok) {
      return commandsResult;
    }

    const settingsResult = await this.installSettings(projectPath, REQUIRED_SETTINGS, options);
    if (!settingsResult.ok) {
      return settingsResult;
    }

    return {
      ok: true,
      value: {
        commands: commandsResult.value,
        settings: settingsResult.value,
      },
    };
  }

  /**
   * Force reinstall all Slash Commands and SDD settings
   * Overwrites existing files with templates
   *
   * @param projectPath - Project root path
   * @returns Full install result
   */
  async forceReinstallAll(
    projectPath: string
  ): Promise<Result<FullInstallResult, InstallError>> {
    return this.installAll(projectPath, { force: true });
  }
}

/**
 * Get template directory path
 * In production, this would be in the app resources
 * In development, it's in the project's resources folder
 */
export function getTemplateDir(): string {
  // For Electron, we'd use app.getAppPath() or process.resourcesPath
  // For now, return relative to the current working directory
  return join(process.cwd(), 'resources', 'templates');
}
