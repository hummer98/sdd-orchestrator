/**
 * ProfileManager
 * インストールプロファイルの定義管理と、プロファイルに基づくコマンドセット選択ロジックを提供
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';

/**
 * Profile name types (built-in profiles)
 * Requirements: 8.1
 */
export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';

/**
 * Profile definition
 * Requirements: 8.1
 */
export interface Profile {
  readonly name: ProfileName | string;
  readonly description: string;
  readonly commandsets: readonly CommandsetName[];
  readonly isCustom: boolean;
}

/**
 * Profile error types
 */
export type ProfileError =
  | { type: 'PROFILE_NOT_FOUND'; name: string }
  | { type: 'INVALID_PROFILE'; reason: string }
  | { type: 'SAVE_ERROR'; message: string };

/**
 * Validation error
 */
export type ValidationError = {
  type: 'INVALID_PROFILE';
  reason: string;
};

/**
 * Built-in profile names
 */
const BUILT_IN_PROFILE_NAMES: readonly ProfileName[] = [
  'cc-sdd',
  'cc-sdd-agent',
  'spec-manager',
];

/**
 * Valid commandset names
 */
const VALID_COMMANDSET_NAMES: readonly CommandsetName[] = [
  'cc-sdd',
  'cc-sdd-agent',
  'bug',
  'document-review',
  'spec-manager',
];

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
 * ProfileManager
 * インストールプロファイルの管理を提供
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export class ProfileManager {
  /**
   * Built-in profiles
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  private readonly builtInProfiles: ReadonlyMap<ProfileName, Profile> = new Map([
    [
      'cc-sdd',
      {
        name: 'cc-sdd',
        description: 'cc-sdd workflow commands with bug and document-review',
        commandsets: ['cc-sdd', 'bug', 'document-review'],
        isCustom: false,
      },
    ],
    [
      'cc-sdd-agent',
      {
        name: 'cc-sdd-agent',
        description: 'cc-sdd-agent commands with bug, document-review, and agents',
        commandsets: ['cc-sdd-agent', 'bug', 'document-review'],
        isCustom: false,
      },
    ],
    [
      'spec-manager',
      {
        name: 'spec-manager',
        description: 'spec-manager commands with bug and document-review',
        commandsets: ['spec-manager', 'bug', 'document-review'],
        isCustom: false,
      },
    ],
  ]);

  /**
   * Get profile by name
   * Requirements: 8.1
   * @param profileName - Profile name
   */
  getProfile(profileName: ProfileName): Profile {
    const profile = this.builtInProfiles.get(profileName);
    if (!profile) {
      // Should not happen for built-in profiles, but return cc-sdd as fallback
      return this.builtInProfiles.get('cc-sdd')!;
    }
    return profile;
  }

  /**
   * Get commandsets for a profile
   * Requirements: 8.2, 8.3, 8.4, 8.5
   * @param profileName - Profile name
   */
  getCommandsetsForProfile(profileName: ProfileName): CommandsetName[] {
    const profile = this.getProfile(profileName);
    return [...profile.commandsets];
  }

  /**
   * Validate a profile definition
   * Requirements: 8.6
   * @param profile - Profile to validate
   */
  validateProfile(profile: Profile): Result<void, ValidationError> {
    // Check name is not empty
    if (!profile.name || profile.name.trim() === '') {
      return {
        ok: false,
        error: { type: 'INVALID_PROFILE', reason: 'Profile name cannot be empty' },
      };
    }

    // Check commandsets is not empty
    if (!profile.commandsets || profile.commandsets.length === 0) {
      return {
        ok: false,
        error: { type: 'INVALID_PROFILE', reason: 'Profile must contain at least one commandset' },
      };
    }

    // Validate all commandset names
    for (const commandset of profile.commandsets) {
      if (!VALID_COMMANDSET_NAMES.includes(commandset)) {
        return {
          ok: false,
          error: {
            type: 'INVALID_PROFILE',
            reason: `Invalid commandset name: ${commandset}`,
          },
        };
      }
    }

    return { ok: true, value: undefined };
  }

  /**
   * Save custom profile
   * Requirements: 8.6
   * @param projectPath - Project root path
   * @param profile - Profile to save
   */
  async saveCustomProfile(
    projectPath: string,
    profile: Profile
  ): Promise<Result<void, ProfileError>> {
    // Validate profile first
    const validationResult = this.validateProfile(profile);
    if (!validationResult.ok) {
      return {
        ok: false,
        error: { type: 'INVALID_PROFILE', reason: validationResult.error.reason },
      };
    }

    // Check if trying to override built-in profile
    if (BUILT_IN_PROFILE_NAMES.includes(profile.name as ProfileName)) {
      return {
        ok: false,
        error: {
          type: 'INVALID_PROFILE',
          reason: `Cannot override built-in profile: ${profile.name}`,
        },
      };
    }

    try {
      const profilesPath = join(projectPath, '.kiro', 'settings', 'profiles.json');

      // Load existing custom profiles
      let customProfiles: Record<string, Profile> = {};
      if (await fileExists(profilesPath)) {
        try {
          const content = await readFile(profilesPath, 'utf-8');
          customProfiles = JSON.parse(content);
        } catch {
          customProfiles = {};
        }
      }

      // Add/update the profile
      customProfiles[profile.name] = profile;

      // Ensure directory exists
      await mkdir(join(projectPath, '.kiro', 'settings'), { recursive: true });

      // Save to file
      await writeFile(profilesPath, JSON.stringify(customProfiles, null, 2), 'utf-8');

      return { ok: true, value: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { type: 'SAVE_ERROR', message },
      };
    }
  }

  /**
   * Load custom profiles from project
   * Requirements: 8.6
   * @param projectPath - Project root path
   */
  async loadCustomProfiles(projectPath: string): Promise<Map<string, Profile>> {
    const customProfiles = new Map<string, Profile>();
    const profilesPath = join(projectPath, '.kiro', 'settings', 'profiles.json');

    if (!(await fileExists(profilesPath))) {
      return customProfiles;
    }

    try {
      const content = await readFile(profilesPath, 'utf-8');
      const parsed = JSON.parse(content);

      for (const [name, profile] of Object.entries(parsed)) {
        const p = profile as Profile;
        // Validate before adding
        const validationResult = this.validateProfile(p);
        if (validationResult.ok) {
          customProfiles.set(name, p);
        }
      }
    } catch {
      // Ignore corrupted file, return empty map
    }

    return customProfiles;
  }

  /**
   * Get all built-in profiles
   * @returns Map of built-in profiles
   */
  getAllProfiles(): ReadonlyMap<ProfileName, Profile> {
    return this.builtInProfiles;
  }

  /**
   * Check if a profile name is a built-in profile
   * @param name - Profile name to check
   */
  isBuiltInProfile(name: string): name is ProfileName {
    return BUILT_IN_PROFILE_NAMES.includes(name as ProfileName);
  }
}
