/**
 * CommandsetDefinitionManager
 * コマンドセット定義のメタデータ（名前、説明、カテゴリ、ファイルリスト、依存関係）を管理
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';
import { CC_SDD_COMMANDS, CC_SDD_AGENTS, CC_SDD_SETTINGS } from './ccSddWorkflowInstaller';
import { BUG_COMMANDS, BUG_TEMPLATES } from './bugWorkflowInstaller';

/**
 * Commandset definition
 * Requirements: 2.1, 2.2, 2.3, 2.6
 */
export interface CommandsetDefinition {
  readonly name: CommandsetName;
  readonly description: string;
  readonly category: 'workflow' | 'utility';
  readonly version: string; // Semantic version
  readonly files: readonly string[]; // List of files included
  readonly dependencies: readonly CommandsetName[]; // Dependencies on other commandsets
}

/**
 * Load error types
 */
export type LoadError =
  | { type: 'DEFINITION_NOT_FOUND'; name: CommandsetName }
  | { type: 'PARSE_ERROR'; message: string };

/**
 * Validation error types
 */
export type ValidationError = {
  type: 'INVALID_DEFINITION';
  reason: string;
};

/**
 * Semantic version pattern
 */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

/**
 * Valid categories
 */
const VALID_CATEGORIES: readonly ('workflow' | 'utility')[] = ['workflow', 'utility'];

/**
 * CommandsetDefinitionManager
 * コマンドセット定義のメタデータを管理
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export class CommandsetDefinitionManager {
  /**
   * Built-in commandset definitions
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
   */
  private readonly definitions: ReadonlyMap<CommandsetName, CommandsetDefinition>;

  constructor() {
    // Build definitions from existing constants
    const definitions = new Map<CommandsetName, CommandsetDefinition>();

    // CC-SDD definition
    const ccSddFiles = [
      ...CC_SDD_COMMANDS.map(cmd => {
        if (cmd.startsWith('bug-')) {
          return `commands/bug/${cmd}.md`;
        }
        if (cmd.startsWith('document-review')) {
          return `commands/document-review/${cmd}.md`;
        }
        return `commands/cc-sdd-agent/${cmd}.md`;
      }),
      ...CC_SDD_AGENTS.map(agent => `agents/kiro/${agent}.md`),
      ...CC_SDD_SETTINGS.map(setting => `settings/${setting}`),
    ];

    definitions.set('cc-sdd', {
      name: 'cc-sdd',
      description: 'Claude Code Spec-Driven Development workflow with full commands, agents, and settings',
      category: 'workflow',
      version: '1.0.0',
      files: ccSddFiles,
      dependencies: [],
    });

    // Bug definition
    const bugFiles = [
      ...BUG_COMMANDS.map(cmd => `commands/bug/${cmd}.md`),
      ...BUG_TEMPLATES.map(tmpl => `settings/templates/bugs/${tmpl}`),
    ];

    definitions.set('bug', {
      name: 'bug',
      description: 'Lightweight bug fix workflow with bug commands and templates',
      category: 'workflow',
      version: '1.0.0',
      files: bugFiles,
      dependencies: [],
    });

    // Spec-manager definition (subset of cc-sdd)
    const specManagerFiles = [
      'commands/cc-sdd-agent/spec-init.md',
      'commands/cc-sdd-agent/spec-requirements.md',
      'commands/cc-sdd-agent/spec-design.md',
      'commands/cc-sdd-agent/spec-tasks.md',
      'commands/cc-sdd-agent/spec-impl.md',
      'commands/cc-sdd-agent/spec-status.md',
    ];

    definitions.set('spec-manager', {
      name: 'spec-manager',
      description: 'Basic spec management commands (subset of cc-sdd)',
      category: 'utility',
      version: '1.0.0',
      files: specManagerFiles,
      dependencies: [],
    });

    this.definitions = definitions;
  }

  /**
   * Get definition for a commandset
   * Requirements: 2.1, 2.2, 2.3
   * @param commandsetName - Commandset name
   */
  getDefinition(commandsetName: CommandsetName): CommandsetDefinition {
    const definition = this.definitions.get(commandsetName);
    if (!definition) {
      // Return a minimal definition for unknown commandsets
      return {
        name: commandsetName,
        description: `Unknown commandset: ${commandsetName}`,
        category: 'utility',
        version: '0.0.0',
        files: [],
        dependencies: [],
      };
    }
    return definition;
  }

  /**
   * Load all commandset definitions
   * Requirements: 2.4, 2.5
   */
  async loadAllDefinitions(): Promise<Result<ReadonlyMap<CommandsetName, CommandsetDefinition>, LoadError>> {
    // Currently using built-in definitions
    // In future, this could load from JSON files
    return { ok: true, value: this.definitions };
  }

  /**
   * Validate a commandset definition
   * Requirements: 2.4
   * @param definition - Definition to validate
   */
  validateDefinition(definition: CommandsetDefinition): Result<void, ValidationError> {
    // Check name is not empty
    if (!definition.name || definition.name.trim() === '') {
      return {
        ok: false,
        error: { type: 'INVALID_DEFINITION', reason: 'Name cannot be empty' },
      };
    }

    // Check description
    if (!definition.description) {
      return {
        ok: false,
        error: { type: 'INVALID_DEFINITION', reason: 'Description is required' },
      };
    }

    // Check category
    if (!VALID_CATEGORIES.includes(definition.category)) {
      return {
        ok: false,
        error: { type: 'INVALID_DEFINITION', reason: `Invalid category: ${definition.category}` },
      };
    }

    // Check version format
    if (!SEMVER_PATTERN.test(definition.version)) {
      return {
        ok: false,
        error: { type: 'INVALID_DEFINITION', reason: `Invalid version format: ${definition.version}` },
      };
    }

    // Check files is not empty
    if (!definition.files || definition.files.length === 0) {
      return {
        ok: false,
        error: { type: 'INVALID_DEFINITION', reason: 'Files list cannot be empty' },
      };
    }

    return { ok: true, value: undefined };
  }

  /**
   * Get all available commandset names
   */
  getAvailableCommandsets(): readonly CommandsetName[] {
    return [...this.definitions.keys()];
  }

  /**
   * Get file list for a commandset
   * @param commandsetName - Commandset name
   */
  getFiles(commandsetName: CommandsetName): readonly string[] {
    const definition = this.definitions.get(commandsetName);
    return definition?.files ?? [];
  }

  /**
   * Get dependencies for a commandset
   * @param commandsetName - Commandset name
   */
  getDependencies(commandsetName: CommandsetName): readonly CommandsetName[] {
    const definition = this.definitions.get(commandsetName);
    return definition?.dependencies ?? [];
  }

  /**
   * Get version for a specific commandset
   * Requirements (commandset-version-detection): 5.1, 5.3
   * @param commandsetName - Commandset name
   * @returns Version string (e.g., "1.0.0"), or "0.0.0" for unknown commandset
   */
  getVersion(commandsetName: CommandsetName): string {
    const definition = this.definitions.get(commandsetName);
    return definition?.version ?? '0.0.0';
  }

  /**
   * Get all commandset versions as a map
   * Requirements (commandset-version-detection): 5.1, 5.3
   * @returns ReadonlyMap of commandset name to version
   */
  getAllVersions(): ReadonlyMap<CommandsetName, string> {
    const versions = new Map<CommandsetName, string>();
    for (const [name, definition] of this.definitions) {
      versions.set(name, definition.version);
    }
    return versions;
  }

  /**
   * Compare versions to determine if bundle version is newer than installed
   * Requirements (commandset-version-detection): 2.2
   * @param installedVersion - Currently installed version (undefined/empty means not installed)
   * @param bundleVersion - Version bundled in the app
   * @returns true if bundleVersion > installedVersion
   */
  isNewerVersion(installedVersion: string | undefined, bundleVersion: string): boolean {
    // If not installed, any bundle version is newer
    if (!installedVersion || installedVersion === '') {
      return true;
    }

    return this.compareVersions(installedVersion, bundleVersion) < 0;
  }

  /**
   * Compare two semantic versions
   * @param a - First version
   * @param b - Second version
   * @returns -1 if a < b, 0 if a === b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    // Parse version strings
    const parseVersion = (v: string) => {
      const [main, prerelease] = v.split('-');
      const [major, minor, patch] = main.split('.').map(Number);
      return { major, minor, patch, prerelease };
    };

    const av = parseVersion(a);
    const bv = parseVersion(b);

    // Compare major
    if (av.major !== bv.major) {
      return av.major < bv.major ? -1 : 1;
    }

    // Compare minor
    if (av.minor !== bv.minor) {
      return av.minor < bv.minor ? -1 : 1;
    }

    // Compare patch
    if (av.patch !== bv.patch) {
      return av.patch < bv.patch ? -1 : 1;
    }

    // Compare prerelease (versions with prerelease are older than release)
    if (av.prerelease && !bv.prerelease) {
      return -1; // a is prerelease, b is release => a < b
    }
    if (!av.prerelease && bv.prerelease) {
      return 1; // a is release, b is prerelease => a > b
    }
    if (av.prerelease && bv.prerelease) {
      // Both have prerelease, compare alphabetically
      return av.prerelease.localeCompare(bv.prerelease);
    }

    return 0;
  }
}
