/**
 * ProjectChecker
 * Checks for existence of Slash Commands and SDD settings in a project
 * Requirements: 4.1, 4.2, 4.4
 */

import { access } from 'fs/promises';
import { join } from 'path';
import { checkRequiredPermissions, CheckPermissionsResult } from './permissionsService';
import {
  projectConfigService,
  ProfileName,
} from './layoutConfigService';

/**
 * @deprecated Use ProfileName from layoutConfigService
 */
export type { ProfileName };

/**
 * Profile configuration stored in .kiro/sdd-orchestrator.json
 * @deprecated Use ProfileConfig from layoutConfigService with name field
 */
export interface ProfileConfig {
  readonly profile: ProfileName;
  readonly installedAt: string;
  readonly version?: string;
}

/**
 * Commands included in cc-sdd profile (11 commands)
 * Note: Does NOT include spec-quick
 */
export const CC_SDD_PROFILE_COMMANDS = [
  'kiro/spec-init',
  'kiro/spec-requirements',
  'kiro/spec-design',
  'kiro/spec-tasks',
  'kiro/spec-impl',
  'kiro/spec-status',
  'kiro/validate-gap',
  'kiro/validate-design',
  'kiro/validate-impl',
  'kiro/steering',
  'kiro/steering-custom',
] as const;

/**
 * Commands included in cc-sdd-agent profile (12 commands)
 * Includes all cc-sdd commands + spec-quick
 */
export const CC_SDD_AGENT_PROFILE_COMMANDS = [
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
  'kiro/steering',
  'kiro/steering-custom',
] as const;

/**
 * Bug workflow commands (shared across all profiles)
 */
export const BUG_PROFILE_COMMANDS = [
  'kiro/bug-create',
  'kiro/bug-analyze',
  'kiro/bug-fix',
  'kiro/bug-verify',
  'kiro/bug-status',
] as const;

/**
 * Document review commands (shared across all profiles)
 */
export const DOCUMENT_REVIEW_COMMANDS = [
  'kiro/document-review',
  'kiro/document-review-reply',
] as const;

/**
 * Commands by profile
 * Each profile includes its base commands + bug + document-review
 */
export const COMMANDS_BY_PROFILE: Record<ProfileName, readonly string[]> = {
  'cc-sdd': [
    ...CC_SDD_PROFILE_COMMANDS,
    ...BUG_PROFILE_COMMANDS,
    ...DOCUMENT_REVIEW_COMMANDS,
  ],
  'cc-sdd-agent': [
    ...CC_SDD_AGENT_PROFILE_COMMANDS,
    ...BUG_PROFILE_COMMANDS,
    ...DOCUMENT_REVIEW_COMMANDS,
  ],
  'spec-manager': [
    // spec-manager uses same commands as cc-sdd
    ...CC_SDD_PROFILE_COMMANDS,
    ...BUG_PROFILE_COMMANDS,
    ...DOCUMENT_REVIEW_COMMANDS,
  ],
};

/**
 * Required SDD settings files
 * Location: {projectRoot}/.kiro/settings/
 */
export const REQUIRED_SETTINGS = [
  // Rules
  'rules/ears-format.md',
  'rules/tasks-generation.md',
  'rules/tasks-parallel-analysis.md',
  'rules/design-discovery-full.md',
  'rules/design-discovery-light.md',
  'rules/design-principles.md',
  'rules/design-review.md',
  'rules/gap-analysis.md',
  'rules/steering-principles.md',
  // Spec templates
  'templates/specs/init.json',
  'templates/specs/requirements-init.md',
  'templates/specs/requirements.md',
  'templates/specs/design.md',
  'templates/specs/tasks.md',
  'templates/specs/research.md',
  // Steering templates
  'templates/steering/product.md',
  'templates/steering/structure.md',
  'templates/steering/tech.md',
  // Steering-custom templates
  'templates/steering-custom/api-standards.md',
  'templates/steering-custom/authentication.md',
  'templates/steering-custom/database.md',
  'templates/steering-custom/deployment.md',
  'templates/steering-custom/error-handling.md',
  'templates/steering-custom/security.md',
  'templates/steering-custom/testing.md',
  // Bug Workflow templates
  'templates/bugs/report.md',
  'templates/bugs/analysis.md',
  'templates/bugs/fix.md',
  'templates/bugs/verification.md',
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
 * Read profile configuration from project
 * Now reads from .kiro/sdd-orchestrator.json via projectConfigService
 */
async function readProfileConfig(projectPath: string): Promise<ProfileConfig | null> {
  const profile = await projectConfigService.loadProfile(projectPath);
  if (profile && COMMANDS_BY_PROFILE[profile.name]) {
    return {
      profile: profile.name,
      installedAt: profile.installedAt,
    };
  }
  return null;
}

/**
 * Get commands for a specific profile
 */
export function getCommandsForProfile(profile: ProfileName): readonly string[] {
  return COMMANDS_BY_PROFILE[profile] || COMMANDS_BY_PROFILE['cc-sdd-agent'];
}

/**
 * Service for checking project setup
 */
export class ProjectChecker {
  /**
   * Read the installed profile from project
   * @param projectPath - Project root path
   * @returns Profile config or null if not found
   */
  async getInstalledProfile(projectPath: string): Promise<ProfileConfig | null> {
    return readProfileConfig(projectPath);
  }

  /**
   * Check Slash Commands existence for a specific profile
   * Requirements: 4.1
   *
   * @param projectPath - Project root path
   * @param profile - Profile name (optional, auto-detects from project if not provided)
   * @returns Check result with missing and present commands
   */
  async checkSlashCommandsForProfile(
    projectPath: string,
    profile?: ProfileName
  ): Promise<FileCheckResult> {
    // If profile not specified, try to read from project config
    let effectiveProfile = profile;
    if (!effectiveProfile) {
      const config = await readProfileConfig(projectPath);
      effectiveProfile = config?.profile || 'cc-sdd-agent'; // fallback to cc-sdd-agent (superset)
    }

    const requiredCommands = getCommandsForProfile(effectiveProfile);
    const missing: string[] = [];
    const present: string[] = [];

    for (const cmd of requiredCommands) {
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
   * @param profile - Profile name (optional, auto-detects from project if not provided)
   * @returns Full check result
   */
  async checkAll(projectPath: string, profile?: ProfileName): Promise<FullCheckResult> {
    const [commands, settings] = await Promise.all([
      this.checkSlashCommandsForProfile(projectPath, profile),
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
   * @param profile - Profile name (optional, auto-detects from project if not provided)
   * @returns Complete check result
   */
  async checkComplete(projectPath: string, profile?: ProfileName): Promise<CompleteCheckResult> {
    const [commands, settings, permissions] = await Promise.all([
      this.checkSlashCommandsForProfile(projectPath, profile),
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
