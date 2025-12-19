/**
 * ProjectChecker
 * Checks for existence of Slash Commands and SDD settings in a project
 * Requirements: 4.1, 4.2, 4.4
 */

import { access } from 'fs/promises';
import { join } from 'path';
import { checkRequiredPermissions, CheckPermissionsResult } from './permissionsService';

/**
 * Required Slash Command files
 * Location: {projectRoot}/.claude/commands/kiro/*.md (CC-SDD)
 * Legacy: {projectRoot}/.claude/commands/spec-manager/*.md
 */
export const REQUIRED_COMMANDS = [
  // CC-SDD commands (kiro namespace) - 14 commands
  'kiro/spec-init',
  'kiro/spec-requirements',
  'kiro/spec-design',
  'kiro/spec-tasks',
  'kiro/spec-impl',
  'kiro/spec-status',
  'kiro/spec-quick',
  'kiro/validate-gap',
  'kiro/validate-design',
  'kiro/validate-impl',
  'kiro/document-review',
  'kiro/document-review-reply',
  'kiro/steering',
  'kiro/steering-custom',
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
 * Required basic permissions for Claude Code tools
 * Location: {projectRoot}/.claude/settings.local.json
 * Note: Bash(**) is not a supported pattern - use individual commands in standard-commands.txt
 */
export const REQUIRED_BASIC_PERMISSIONS = [
  'Read(**)',
  'Edit(**)',
  'Write(**)',
  'Glob(**)',
  'Grep(**)',
  'WebSearch',
  'WebFetch',
] as const;

/**
 * Required permissions for CC-SDD workflow skills
 * Location: {projectRoot}/.claude/settings.local.json
 * Note: Uses Skill(kiro:*) wildcard to allow all kiro skills
 */
export const REQUIRED_SKILL_PERMISSIONS = [
  'Skill(kiro:*)',
] as const;

/**
 * @deprecated Use REQUIRED_SKILL_PERMISSIONS instead
 * Kept for backward compatibility during migration
 */
export const REQUIRED_SLASH_COMMAND_PERMISSIONS = REQUIRED_SKILL_PERMISSIONS;

/**
 * All required permissions (basic + skills)
 */
export const REQUIRED_PERMISSIONS = [
  ...REQUIRED_BASIC_PERMISSIONS,
  ...REQUIRED_SKILL_PERMISSIONS,
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
 * Result of checking commands, settings, and permissions
 */
export interface CompleteCheckResult {
  readonly commands: FileCheckResult;
  readonly settings: FileCheckResult;
  readonly permissions: CheckPermissionsResult;
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

  /**
   * Check permissions in settings.local.json
   *
   * @param projectPath - Project root path
   * @returns Permission check result
   */
  async checkPermissions(projectPath: string): Promise<CheckPermissionsResult> {
    const result = await checkRequiredPermissions(
      projectPath,
      [...REQUIRED_PERMISSIONS]
    );

    if (!result.ok) {
      // If settings.local.json doesn't exist or has errors, return all as missing
      return {
        allPresent: false,
        missing: [...REQUIRED_PERMISSIONS],
        present: [],
      };
    }

    return result.value;
  }

  /**
   * Check Slash Commands, SDD settings, and permissions
   * Requirements: 4.1, 4.2
   *
   * @param projectPath - Project root path
   * @returns Complete check result
   */
  async checkComplete(projectPath: string): Promise<CompleteCheckResult> {
    const [commands, settings, permissions] = await Promise.all([
      this.checkSlashCommands(projectPath),
      this.checkSettings(projectPath),
      this.checkPermissions(projectPath),
    ]);

    return {
      commands,
      settings,
      permissions,
      allPresent: commands.allPresent && settings.allPresent && permissions.allPresent,
    };
  }
}
