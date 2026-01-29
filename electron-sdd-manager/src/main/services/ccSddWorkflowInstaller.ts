/**
 * CcSddWorkflowInstaller
 * cc-sdd (Claude Code Spec-Driven Development) コマンドセット、エージェントをプロジェクトにインストール
 * Note: CLAUDE.md installation is now handled by the claudemd-merge Agent
 * (claudemd-profile-install-merge feature)
 *
 * Requirements: 3.1-3.8, 6.1-6.5
 */

import { readFile, writeFile, mkdir, access, chmod, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { addPermissionsToProject } from './permissionsService';
import { REQUIRED_PERMISSIONS } from './projectChecker';

/**
 * cc-sdd コマンド一覧（25種類）
 * Requirements: 2.1-2.5
 */
export const CC_SDD_COMMANDS = [
  // Spec Workflow (8)
  'spec-init',
  'spec-plan',
  'spec-requirements',
  'spec-design',
  'spec-tasks',
  'spec-impl',
  'spec-status',
  'spec-quick',
  // Ask Commands (2)
  'project-ask',
  'spec-ask',
  // Merge Command (1)
  'spec-merge',
  // Validation (3)
  'validate-gap',
  'validate-design',
  'validate-impl',
  // Inspection (1)
  'spec-inspection',
  // Document Review (2)
  'document-review',
  'document-review-reply',
  // Steering (2)
  'steering',
  'steering-custom',
  // Generate Release (1)
  'generate-release',
  // Bug Workflow (5)
  'bug-create',
  'bug-analyze',
  'bug-fix',
  'bug-verify',
  'bug-status',
] as const;

/**
 * cc-sdd エージェント一覧（12種類）
 * Claude Code subagent として使用されるエージェント定義ファイル
 */
export const CC_SDD_AGENTS = [
  // Spec Agents (4)
  'spec-design',
  'spec-impl',
  'spec-requirements',
  'spec-tasks',
  // Steering Agents (3)
  'steering',
  'steering-custom',
  'steering-verification',
  // Generate Release Agent (1)
  'generate-release',
  // Validation Agents (3)
  'validate-design',
  'validate-gap',
  'validate-impl',
  // Inspection Agent (1)
  'spec-inspection',
] as const;

/**
 * cc-sdd 設定ファイル一覧
 * Location: {projectRoot}/.kiro/settings/
 */
export const CC_SDD_SETTINGS = [
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
  'templates/steering/design-principles.md',
  'templates/steering/logging.md',
  'templates/steering/debugging.md',
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
 * Helper scripts for merge operations
 * Requirements: 3.1, 3.2 (merge-helper-scripts feature)
 * Location: {projectRoot}/.kiro/scripts/
 */
export const HELPER_SCRIPTS = [
  'update-spec-for-deploy.sh',
  'update-bug-for-deploy.sh',
  'create-spec-worktree.sh',
  'create-bug-worktree.sh',
] as const;

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
 * Full install result
 * Note: CLAUDE.md installation is now handled by the claudemd-merge Agent
 * (claudemd-profile-install-merge feature)
 */
export interface CcSddWorkflowInstallResult {
  readonly commands: InstallResult;
  readonly agents: InstallResult;
  readonly settings: InstallResult;
}

/**
 * Install status
 * Note: CLAUDE.md status check is now handled by the claudemd-merge Agent
 */
export interface CcSddWorkflowInstallStatus {
  readonly commands: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly agents: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly settings: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
}

/**
 * Install error types
 */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'READ_ERROR'; path: string; message: string }
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
 * cc-sdd Workflow Installer Service
 * Requirements: 3.1-3.8, 4.1-4.8
 */
export class CcSddWorkflowInstaller {
  private templateDir: string;

  /**
   * Create installer with template directory
   * @param templateDir - Directory containing template files
   * Requirements: 3.1
   */
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Get template subdirectory for a command
   * Commands are organized by category:
   * - cc-sdd-agent: spec-*, validate-*, steering*
   * - bug: bug-*
   * - document-review: document-review-*
   */
  private getCommandTemplateSubdir(cmd: string): string {
    if (cmd.startsWith('bug-')) {
      return 'bug';
    }
    if (cmd.startsWith('document-review')) {
      return 'document-review';
    }
    return 'cc-sdd-agent';
  }

  /**
   * Install cc-sdd commands to project
   * @param projectPath - Project root path
   * @param commandsetDir - Optional commandset directory name (e.g., 'cc-sdd', 'cc-sdd-agent', 'spec-manager', 'document-review')
   * @param options - Install options
   * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6
   */
  async installCommands(
    projectPath: string,
    commandsetDir?: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    // If commandsetDir is specified, install all .md files from that directory
    if (commandsetDir) {
      return this.installCommandsFromDir(projectPath, commandsetDir, options);
    }

    // Legacy behavior: install from CC_SDD_COMMANDS list
    for (const cmd of CC_SDD_COMMANDS) {
      const templateSubdir = this.getCommandTemplateSubdir(cmd);
      const templatePath = join(this.templateDir, 'commands', templateSubdir, `${cmd}.md`);
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);

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
   * Install commands from a specific directory
   * @param projectPath - Project root path
   * @param commandsetDir - Commandset directory name (e.g., 'cc-sdd', 'cc-sdd-agent', 'spec-manager', 'document-review')
   * @param options - Install options
   */
  async installCommandsFromDir(
    projectPath: string,
    commandsetDir: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    const templateDirPath = join(this.templateDir, 'commands', commandsetDir);

    // Check if template directory exists
    if (!(await fileExists(templateDirPath))) {
      return {
        ok: false,
        error: { type: 'TEMPLATE_NOT_FOUND', path: templateDirPath },
      };
    }

    // Read all .md files from the directory
    const { readdir } = await import('fs/promises');
    let files: string[];
    try {
      files = await readdir(templateDirPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { type: 'READ_ERROR', path: templateDirPath, message },
      };
    }

    const mdFiles = files.filter((f) => f.endsWith('.md'));

    for (const file of mdFiles) {
      const cmdName = file.replace('.md', '');
      const templatePath = join(templateDirPath, file);
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', file);

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(cmdName);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(cmdName);
        } else {
          installed.push(cmdName);
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
   * Install a single command from a specific commandset directory
   * @param projectPath - Project root path
   * @param commandsetDir - Source commandset directory name (e.g., 'cc-sdd-agent')
   * @param commandName - Command name to install (without .md extension)
   * @param options - Install options
   * Requirements: 2.1, 2.2 (generate-release-command feature)
   */
  async installSingleCommand(
    projectPath: string,
    commandsetDir: string,
    commandName: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    const templatePath = join(this.templateDir, 'commands', commandsetDir, `${commandName}.md`);
    const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${commandName}.md`);

    // Check if template exists
    if (!(await fileExists(templatePath))) {
      // Return empty result if template doesn't exist (non-fatal for optional commands)
      return { ok: true, value: { installed, skipped, overwritten } };
    }

    // Check if target already exists
    const exists = await fileExists(targetPath);
    if (exists && !force) {
      skipped.push(commandName);
      return { ok: true, value: { installed, skipped, overwritten } };
    }

    // Install the file
    try {
      const content = await readFile(templatePath, 'utf-8');
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, 'utf-8');
      if (exists) {
        overwritten.push(commandName);
      } else {
        installed.push(commandName);
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

    return { ok: true, value: { installed, skipped, overwritten } };
  }

  /**
   * Install cc-sdd agents to project
   * @param projectPath - Project root path
   * @param options - Install options
   * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6
   */
  async installAgents(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const agent of CC_SDD_AGENTS) {
      const templatePath = join(this.templateDir, 'agents', 'kiro', `${agent}.md`);
      const targetPath = join(projectPath, '.claude', 'agents', 'kiro', `${agent}.md`);

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
        skipped.push(agent);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(agent);
        } else {
          installed.push(agent);
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
   * Install cc-sdd settings to project
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installSettings(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const setting of CC_SDD_SETTINGS) {
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
   * Install helper scripts to .kiro/scripts/
   * @param projectPath - Project root path
   * @param options - Install options
   * Requirements: 3.1, 3.2, 3.3, 3.4 (merge-helper-scripts feature)
   */
  async installScripts(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    const templateScriptsDir = join(this.templateDir, 'scripts');
    const targetScriptsDir = join(projectPath, '.kiro', 'scripts');

    // Check if template scripts directory exists
    if (!(await fileExists(templateScriptsDir))) {
      // No scripts to install - return empty result
      return { ok: true, value: { installed, skipped, overwritten } };
    }

    // Read script files from template directory
    let scriptFiles: string[];
    try {
      const files = await readdir(templateScriptsDir);
      scriptFiles = files.filter((f) => f.endsWith('.sh'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: { type: 'READ_ERROR', path: templateScriptsDir, message },
      };
    }

    // Ensure target directory exists
    await mkdir(targetScriptsDir, { recursive: true });

    for (const script of scriptFiles) {
      const templatePath = join(templateScriptsDir, script);
      const targetPath = join(targetScriptsDir, script);

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(script);
        continue;
      }

      // Install the script
      try {
        const content = await readFile(templatePath, 'utf-8');
        await writeFile(targetPath, content, 'utf-8');
        // Set executable permission (chmod +x)
        await chmod(targetPath, 0o755);
        if (exists) {
          overwritten.push(script);
        } else {
          installed.push(script);
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
   * Install all cc-sdd workflow components
   * Note: CLAUDE.md installation is now handled by the claudemd-merge Agent
   * (claudemd-profile-install-merge feature)
   *
   * @param projectPath - Project root path
   * @param options - Install options
   * Requirements: 3.7
   */
  async installAll(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<CcSddWorkflowInstallResult, InstallError>> {
    // Install commands
    const commandsResult = await this.installCommands(projectPath, undefined, options);
    if (!commandsResult.ok) {
      return commandsResult;
    }

    // Install agents
    const agentsResult = await this.installAgents(projectPath, options);
    if (!agentsResult.ok) {
      return agentsResult;
    }

    // Install settings
    const settingsResult = await this.installSettings(projectPath, options);
    if (!settingsResult.ok) {
      return settingsResult;
    }

    // Add required permissions to settings.local.json
    const permissionsResult = await addPermissionsToProject(
      projectPath,
      REQUIRED_PERMISSIONS
    );
    if (!permissionsResult.ok) {
      // Log error but don't fail installation
      console.warn('[CcSddWorkflowInstaller] Failed to add permissions:', permissionsResult.error);
    }

    return {
      ok: true,
      value: {
        commands: commandsResult.value,
        agents: agentsResult.value,
        settings: settingsResult.value,
      },
    };
  }

  /**
   * Check installation status
   * Note: CLAUDE.md status check is now handled by the claudemd-merge Agent
   *
   * @param projectPath - Project root path
   * Requirements: 3.8, 6.3, 6.4, 6.5
   */
  async checkInstallStatus(projectPath: string): Promise<CcSddWorkflowInstallStatus> {
    const installedCommands: string[] = [];
    const missingCommands: string[] = [];

    for (const cmd of CC_SDD_COMMANDS) {
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);
      if (await fileExists(targetPath)) {
        installedCommands.push(cmd);
      } else {
        missingCommands.push(cmd);
      }
    }

    const installedAgents: string[] = [];
    const missingAgents: string[] = [];

    for (const agent of CC_SDD_AGENTS) {
      const targetPath = join(projectPath, '.claude', 'agents', 'kiro', `${agent}.md`);
      if (await fileExists(targetPath)) {
        installedAgents.push(agent);
      } else {
        missingAgents.push(agent);
      }
    }

    const installedSettings: string[] = [];
    const missingSettings: string[] = [];

    for (const setting of CC_SDD_SETTINGS) {
      const targetPath = join(projectPath, '.kiro', 'settings', setting);
      if (await fileExists(targetPath)) {
        installedSettings.push(setting);
      } else {
        missingSettings.push(setting);
      }
    }

    return {
      commands: {
        installed: installedCommands,
        missing: missingCommands,
      },
      agents: {
        installed: installedAgents,
        missing: missingAgents,
      },
      settings: {
        installed: installedSettings,
        missing: missingSettings,
      },
    };
  }
}
