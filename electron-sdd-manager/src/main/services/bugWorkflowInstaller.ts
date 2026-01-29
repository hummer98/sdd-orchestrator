/**
 * BugWorkflowInstaller
 * Bug Workflowのコマンド、テンプレート、CLAUDE.mdセクションをプロジェクトにインストール
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Bug Workflow コマンド一覧
 * bugs-worktree-support: bug-merge added for worktree merge workflow
 */
export const BUG_COMMANDS = [
  'bug-create',
  'bug-analyze',
  'bug-fix',
  'bug-verify',
  'bug-status',
  'bug-merge',  // bugs-worktree-support: worktree merge command
] as const;

/**
 * Bug Workflow テンプレート一覧
 * bugs-worktree-support: bug.json template added
 */
export const BUG_TEMPLATES = [
  'report.md',
  'analysis.md',
  'fix.md',
  'verification.md',
  'bug.json',  // bugs-worktree-support: bug metadata template
] as const;

// claudemd-profile-install-merge: BUG_WORKFLOW_CLAUDE_MD_SECTION removed
// CLAUDE.md installation is now handled by the claudemd-merge Agent

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

// claudemd-profile-install-merge: ClaudeMdUpdateResult removed
// CLAUDE.md installation is now handled by the claudemd-merge Agent

/**
 * Full install result
 * claudemd-profile-install-merge: claudeMd property removed
 */
export interface BugWorkflowInstallResult {
  readonly commands: InstallResult;
  readonly templates: InstallResult;
}

/**
 * Install status
 * claudemd-profile-install-merge: claudeMd property removed
 */
export interface BugWorkflowInstallStatus {
  readonly commands: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly templates: {
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
 * Bug Workflow Installer Service
 */
export class BugWorkflowInstaller {
  private templateDir: string;

  /**
   * Create installer with template directory
   * @param templateDir - Directory containing template files
   */
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Install bug commands to project
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installCommands(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const cmd of BUG_COMMANDS) {
      const templatePath = join(this.templateDir, 'commands', 'bug', `${cmd}.md`);
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
   * Install bug templates to project
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installTemplates(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const tmpl of BUG_TEMPLATES) {
      const templatePath = join(this.templateDir, 'settings', 'templates', 'bugs', tmpl);
      const targetPath = join(projectPath, '.kiro', 'settings', 'templates', 'bugs', tmpl);

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
        skipped.push(tmpl);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(tmpl);
        } else {
          installed.push(tmpl);
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

  // claudemd-profile-install-merge: updateClaudeMd, hasBugWorkflowSection, mergeBugSection removed
  // CLAUDE.md installation is now handled by the claudemd-merge Agent

  /**
   * Install all bug workflow components
   * @param projectPath - Project root path
   * @param options - Install options
   * claudemd-profile-install-merge: CLAUDE.md update removed - handled by claudemd-merge Agent
   */
  async installAll(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<BugWorkflowInstallResult, InstallError>> {
    // Install commands
    const commandsResult = await this.installCommands(projectPath, options);
    if (!commandsResult.ok) {
      return commandsResult;
    }

    // Install templates
    const templatesResult = await this.installTemplates(projectPath, options);
    if (!templatesResult.ok) {
      return templatesResult;
    }

    // claudemd-profile-install-merge: CLAUDE.md update removed
    // CLAUDE.md installation is now handled by the claudemd-merge Agent

    return {
      ok: true,
      value: {
        commands: commandsResult.value,
        templates: templatesResult.value,
      },
    };
  }

  /**
   * Check installation status
   * @param projectPath - Project root path
   * claudemd-profile-install-merge: claudeMd status check removed - handled by claudemd-merge Agent
   */
  async checkInstallStatus(projectPath: string): Promise<BugWorkflowInstallStatus> {
    const installedCommands: string[] = [];
    const missingCommands: string[] = [];

    for (const cmd of BUG_COMMANDS) {
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);
      if (await fileExists(targetPath)) {
        installedCommands.push(cmd);
      } else {
        missingCommands.push(cmd);
      }
    }

    const installedTemplates: string[] = [];
    const missingTemplates: string[] = [];

    for (const tmpl of BUG_TEMPLATES) {
      const targetPath = join(projectPath, '.kiro', 'settings', 'templates', 'bugs', tmpl);
      if (await fileExists(targetPath)) {
        installedTemplates.push(tmpl);
      } else {
        missingTemplates.push(tmpl);
      }
    }

    // claudemd-profile-install-merge: claudeMd status check removed
    // CLAUDE.md installation is now handled by the claudemd-merge Agent

    return {
      commands: {
        installed: installedCommands,
        missing: missingCommands,
      },
      templates: {
        installed: installedTemplates,
        missing: missingTemplates,
      },
    };
  }
}
