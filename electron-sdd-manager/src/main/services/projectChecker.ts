/**
 * ProjectChecker
 * Checks for existence of Slash Commands and SDD settings in a project
 * Requirements: 4.1, 4.2, 4.4
 */

import { access } from 'fs/promises';
import { join } from 'path';

/**
 * Required Slash Command files
 * Location: {projectRoot}/.claude/commands/spec-manager/*.md
 */
export const REQUIRED_COMMANDS = [
  'spec-manager/init',
  'spec-manager/requirements',
  'spec-manager/design',
  'spec-manager/tasks',
  'spec-manager/impl',
] as const;

/**
 * Required SDD settings files
 * Location: {projectRoot}/.kiro/settings/
 */
export const REQUIRED_SETTINGS = [
  'rules/ears-format.md',
  'rules/tasks-generation.md',
  'rules/tasks-parallel-analysis.md',
  'templates/specs/init.json',
  'templates/specs/requirements-init.md',
  'templates/specs/requirements.md',
  'templates/specs/design.md',
  'templates/specs/tasks.md',
] as const;

/**
 * Result of checking file existence
 */
export interface FileCheckResult {
  readonly allPresent: boolean;
  readonly missing: readonly string[];
  readonly present: readonly string[];
}

/**
 * Result of checking both commands and settings
 */
export interface FullCheckResult {
  readonly commands: FileCheckResult;
  readonly settings: FileCheckResult;
  readonly allPresent: boolean;
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
 * Service for checking project setup
 */
export class ProjectChecker {
  /**
   * Check Slash Commands existence
   * Requirements: 4.1
   *
   * @param projectPath - Project root path
   * @returns Check result with missing and present commands
   */
  async checkSlashCommands(projectPath: string): Promise<FileCheckResult> {
    const missing: string[] = [];
    const present: string[] = [];

    for (const cmd of REQUIRED_COMMANDS) {
      const cmdPath = join(projectPath, '.claude', 'commands', `${cmd}.md`);
      if (await fileExists(cmdPath)) {
        present.push(cmd);
      } else {
        missing.push(cmd);
      }
    }

    return {
      allPresent: missing.length === 0,
      missing,
      present,
    };
  }

  /**
   * Check SDD settings existence
   * Requirements: 4.2
   *
   * @param projectPath - Project root path
   * @returns Check result with missing and present settings
   */
  async checkSettings(projectPath: string): Promise<FileCheckResult> {
    const missing: string[] = [];
    const present: string[] = [];

    for (const setting of REQUIRED_SETTINGS) {
      const settingPath = join(projectPath, '.kiro', 'settings', setting);
      if (await fileExists(settingPath)) {
        present.push(setting);
      } else {
        missing.push(setting);
      }
    }

    return {
      allPresent: missing.length === 0,
      missing,
      present,
    };
  }

  /**
   * Check both Slash Commands and SDD settings
   * Requirements: 4.1, 4.2
   *
   * @param projectPath - Project root path
   * @returns Full check result
   */
  async checkAll(projectPath: string): Promise<FullCheckResult> {
    const [commands, settings] = await Promise.all([
      this.checkSlashCommands(projectPath),
      this.checkSettings(projectPath),
    ]);

    return {
      commands,
      settings,
      allPresent: commands.allPresent && settings.allPresent,
    };
  }
}
