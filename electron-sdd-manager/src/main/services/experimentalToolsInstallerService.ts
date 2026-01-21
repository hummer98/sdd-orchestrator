/**
 * ExperimentalToolsInstallerService
 * Installs experimental tools (Debug) to projects
 * Note: Commit command has been moved to CommonCommandsInstallerService
 * Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4, 7.1-7.4
 */

import { readFile, writeFile, mkdir, access, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { getExperimentalTemplatesPath, getCommonCommandsTemplatesPath } from '../utils/resourcePaths';

/**
 * Experimental tool types (debug only, commit moved to common commands)
 */
export type ExperimentalToolType = 'debug';

/**
 * Tool types that can be installed (kept for backward compatibility)
 * @deprecated Use ExperimentalToolType for experimental tools
 */
export type ToolType = 'debug' | 'commit';

/**
 * Install options
 */
export interface InstallOptions {
  readonly force?: boolean; // Overwrite existing files
}

/**
 * Install result
 */
export interface InstallResult {
  readonly success: boolean;
  readonly installedFiles: readonly string[];
  readonly skippedFiles: readonly string[];
  readonly overwrittenFiles: readonly string[];
}

/**
 * Install error types
 */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'MERGE_ERROR'; message: string }
  | { type: 'CLAUDE_CLI_NOT_FOUND' }
  | { type: 'DIRECTORY_CREATE_ERROR'; path: string; message: string };

/**
 * Result type
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Check result for target file existence
 */
export interface CheckResult {
  readonly exists: boolean;
  readonly path: string;
}

/**
 * Semantic merge options for Claude CLI
 */
export interface SemanticMergeOptions {
  readonly templateContent: string;
  readonly existingContent?: string;
  readonly targetPath: string;
}

/**
 * Semantic merge result
 */
export interface SemanticMergeResult {
  readonly mergedContent: string;
  readonly wasCreated: boolean; // true if new file, false if merged
}

/**
 * Claude CLI error types
 */
export type ClaudeCliError =
  | { type: 'CLI_NOT_FOUND' }
  | { type: 'EXECUTION_FAILED'; exitCode: number; stderr: string }
  | { type: 'TIMEOUT' };

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
 * Get target path for a tool type
 */
function getTargetPath(projectPath: string, toolType: ToolType): string {
  switch (toolType) {
    case 'debug':
      return join(projectPath, '.claude', 'agents', 'debug.md');
    case 'commit':
      return join(projectPath, '.claude', 'commands', 'commit.md');
  }
}

/**
 * Get relative path from project root for reporting
 */
function getRelativePath(toolType: ToolType): string {
  switch (toolType) {
    case 'debug':
      return '.claude/agents/debug.md';
    case 'commit':
      return '.claude/commands/commit.md';
  }
}

/**
 * Service for installing experimental tools
 */
export class ExperimentalToolsInstallerService {
  private templateDir: string;

  /**
   * Create installer with template directory
   * @param templateDir - Directory containing template files
   */
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Check if target file exists for a tool type
   * @param projectPath - Project root path
   * @param toolType - Type of tool to check
   * @returns Check result with existence and path
   */
  async checkTargetExists(projectPath: string, toolType: ToolType): Promise<CheckResult> {
    const targetPath = getTargetPath(projectPath, toolType);
    const exists = await fileExists(targetPath);
    return { exists, path: targetPath };
  }

  /**
   * Install Commit command
   * @param projectPath - Project root path
   * @param options - Install options
   * @returns Install result or error
   */
  async installCommitCommand(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    return this.installTool(projectPath, 'commit', options);
  }

  /**
   * Install Debug agent (with CLAUDE.md semantic merge)
   * @param projectPath - Project root path
   * @param options - Install options
   * @returns Install result or error
   */
  async installDebugAgent(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const { force = false } = options;
    const relativePath = getRelativePath('debug');
    const targetPath = getTargetPath(projectPath, 'debug');
    const templatePath = join(this.templateDir, 'agents', 'debug.md');

    // Check if template exists
    if (!(await fileExists(templatePath))) {
      return {
        ok: false,
        error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
      };
    }

    // Check if target exists
    const exists = await fileExists(targetPath);
    if (exists && !force) {
      return {
        ok: true,
        value: {
          success: true,
          installedFiles: [],
          skippedFiles: [relativePath],
          overwrittenFiles: [],
        },
      };
    }

    // Install the debug agent file
    try {
      const content = await readFile(templatePath, 'utf-8');
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, 'utf-8');
    } catch (error) {
      return this.handleWriteError(error, targetPath);
    }

    // Semantic merge to CLAUDE.md
    const debugSectionPath = join(this.templateDir, 'claude-md-snippets', 'debug-section.md');
    if (await fileExists(debugSectionPath)) {
      try {
        const debugSection = await readFile(debugSectionPath, 'utf-8');
        const claudeMdPath = join(projectPath, 'CLAUDE.md');
        const existingClaudeMd = (await fileExists(claudeMdPath))
          ? await readFile(claudeMdPath, 'utf-8')
          : undefined;

        const mergeResult = await this.runClaudeCli({
          templateContent: debugSection,
          existingContent: existingClaudeMd,
          targetPath: claudeMdPath,
        });

        if (mergeResult.ok) {
          await writeFile(claudeMdPath, mergeResult.value.mergedContent, 'utf-8');
        }
        // Note: If merge fails, we still consider the agent installation successful
        // The user can manually add the debug section to CLAUDE.md
      } catch {
        // Semantic merge is best-effort; don't fail the whole installation
      }
    }

    return {
      ok: true,
      value: {
        success: true,
        installedFiles: exists ? [] : [relativePath],
        skippedFiles: [],
        overwrittenFiles: exists ? [relativePath] : [],
      },
    };
  }

  /**
   * Install a tool (Commit)
   */
  private async installTool(
    projectPath: string,
    toolType: 'commit',
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const { force = false } = options;
    const relativePath = getRelativePath(toolType);
    const targetPath = getTargetPath(projectPath, toolType);
    const templatePath = join(this.templateDir, 'commands', `${toolType}.md`);

    // Check if template exists
    if (!(await fileExists(templatePath))) {
      return {
        ok: false,
        error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
      };
    }

    // Check if target exists
    const exists = await fileExists(targetPath);
    if (exists && !force) {
      return {
        ok: true,
        value: {
          success: true,
          installedFiles: [],
          skippedFiles: [relativePath],
          overwrittenFiles: [],
        },
      };
    }

    // Install the file
    try {
      const content = await readFile(templatePath, 'utf-8');
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, 'utf-8');

      return {
        ok: true,
        value: {
          success: true,
          installedFiles: exists ? [] : [relativePath],
          skippedFiles: [],
          overwrittenFiles: exists ? [relativePath] : [],
        },
      };
    } catch (error) {
      return this.handleWriteError(error, targetPath);
    }
  }

  /**
   * Handle write errors and convert to appropriate error type
   */
  private handleWriteError(error: unknown, targetPath: string): Result<InstallResult, InstallError> {
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

  /**
   * Run Claude CLI for semantic merge
   * This method can be mocked in tests
   */
  protected async runClaudeCli(
    options: SemanticMergeOptions
  ): Promise<Result<SemanticMergeResult, ClaudeCliError>> {
    const { templateContent, existingContent } = options;

    // Build prompt for semantic merge
    const prompt = existingContent
      ? `以下のデバッグセクションを既存のCLAUDE.mdにセマンティックにマージしてください。

【追加するデバッグセクション】
---
${templateContent}
---

【既存のCLAUDE.md】
---
${existingContent}
---

マージルール:
1. 既存の内容を保持しつつ、デバッグセクションを適切な位置に追加
2. 既にDebuggingセクションがある場合は内容を統合
3. 結果はCLAUDE.mdの完全な内容のみを出力
4. 説明や解説は不要`
      : `以下のデバッグセクションを含む新しいCLAUDE.mdを生成してください。

【デバッグセクション】
---
${templateContent}
---

結果はCLAUDE.mdの完全な内容のみを出力。説明や解説は不要。`;

    return new Promise((resolve) => {
      const claude = spawn('claude', ['-p', prompt], {
        shell: true,
        env: { ...process.env },
        timeout: 30000, // 30 seconds timeout
      });

      let output = '';
      let errorOutput = '';

      claude.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      claude.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      claude.on('close', (code: number | null) => {
        if (code === 0 && output.trim()) {
          resolve({
            ok: true,
            value: {
              mergedContent: output.trim(),
              wasCreated: !existingContent,
            },
          });
        } else {
          resolve({
            ok: false,
            error: {
              type: 'EXECUTION_FAILED',
              exitCode: code ?? -1,
              stderr: errorOutput,
            },
          });
        }
      });

      claude.on('error', (err: Error) => {
        if (err.message.includes('ENOENT')) {
          resolve({
            ok: false,
            error: { type: 'CLI_NOT_FOUND' },
          });
        } else {
          resolve({
            ok: false,
            error: {
              type: 'EXECUTION_FAILED',
              exitCode: -1,
              stderr: err.message,
            },
          });
        }
      });
    });
  }

  /**
   * Check if Claude CLI is available
   */
  async isClaudeCliAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const claude = spawn('claude', ['--version'], {
        shell: true,
        env: { ...process.env },
      });

      claude.on('close', (code) => {
        resolve(code === 0);
      });

      claude.on('error', () => {
        resolve(false);
      });
    });
  }

  // ============================================================
  // gemini-document-review Task 3.1: Gemini Document Review Installer
  // Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
  // ============================================================

  /**
   * Check if Gemini document-review TOML file exists
   * @param projectPath - Project root path
   * @returns Check result with existence and path
   */
  async checkGeminiDocumentReviewExists(projectPath: string): Promise<CheckResult> {
    const targetPath = join(projectPath, '.gemini', 'commands', 'kiro', 'document-review.toml');
    const exists = await fileExists(targetPath);
    return { exists, path: targetPath };
  }

  /**
   * Install Gemini CLI document-review commands
   * @param projectPath - Project root path
   * @param options - Install options
   * @returns Install result or error
   */
  async installGeminiDocumentReview(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const { force = false } = options;

    const files = [
      {
        relativePath: '.gemini/commands/kiro/document-review.toml',
        templateSubPath: 'gemini/kiro/document-review.toml',
      },
      {
        relativePath: '.gemini/commands/kiro/document-review-reply.toml',
        templateSubPath: 'gemini/kiro/document-review-reply.toml',
      },
    ];

    const installedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const overwrittenFiles: string[] = [];

    for (const file of files) {
      const targetPath = join(projectPath, file.relativePath);
      const templatePath = join(this.templateDir, file.templateSubPath);

      // Check if template exists
      if (!(await fileExists(templatePath))) {
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
        };
      }

      // Check if target exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skippedFiles.push(file.relativePath);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');

        if (exists) {
          overwrittenFiles.push(file.relativePath);
        } else {
          installedFiles.push(file.relativePath);
        }
      } catch (error) {
        return this.handleWriteError(error, targetPath);
      }
    }

    return {
      ok: true,
      value: {
        success: true,
        installedFiles,
        skippedFiles,
        overwrittenFiles,
      },
    };
  }
}

/**
 * Get template directory for creating service instance
 * Uses the global resource path function
 */
export function getExperimentalTemplateDir(): string {
  return getExperimentalTemplatesPath();
}

/**
 * Get common commands template directory
 */
export function getCommonCommandsTemplateDir(): string {
  return getCommonCommandsTemplatesPath();
}

/**
 * Common command types
 */
export type CommonCommandType = 'commit';

/**
 * Common command info (Task 2.1)
 * Requirements: 4.1, 4.2, 4.3
 */
export interface CommonCommandInfo {
  /** Command name (filename without .md extension) */
  readonly name: string;
  /** Absolute path to template file */
  readonly templatePath: string;
  /** Target relative path in project (e.g., ".claude/commands/commit.md") */
  readonly targetRelativePath: string;
}

/**
 * Common command conflict info (Task 2.2)
 * Requirements: 3.1, 3.2
 */
export interface CommonCommandConflict {
  /** Command name */
  readonly name: string;
  /** Absolute path to existing file in project */
  readonly existingPath: string;
}

/**
 * User decision for common command conflict (Task 2.3)
 * Requirements: 3.4, 3.5
 */
export interface CommonCommandDecision {
  /** Command name */
  readonly name: string;
  /** User action: skip or overwrite */
  readonly action: 'skip' | 'overwrite';
}

/**
 * Result of installAllCommands (Task 2.3)
 * Requirements: 3.4, 3.5
 */
export interface CommonCommandsInstallResult {
  /** Number of successfully installed commands */
  readonly totalInstalled: number;
  /** Number of skipped commands */
  readonly totalSkipped: number;
  /** Number of failed commands */
  readonly totalFailed: number;
  /** List of installed command names */
  readonly installedCommands: readonly string[];
  /** List of skipped command names */
  readonly skippedCommands: readonly string[];
  /** List of failed command names */
  readonly failedCommands: readonly string[];
}

/**
 * Service for installing common commands
 * common-commands-installer: Extended with listCommonCommands, checkConflicts, installAllCommands
 * Requirements: 4.1, 4.2, 4.3, 3.1, 3.2, 3.4, 3.5
 */
export class CommonCommandsInstallerService {
  private templateDir: string;

  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Install commit command to project
   * @param projectPath - Project root path
   * @param options - Install options
   * @returns Install result or error
   */
  async installCommitCommand(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const { force = false } = options;
    const relativePath = '.claude/commands/commit.md';
    const targetPath = join(projectPath, relativePath);
    const templatePath = join(this.templateDir, 'commit.md');

    // Check if template exists
    if (!(await fileExists(templatePath))) {
      return {
        ok: false,
        error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
      };
    }

    // Check if target exists
    const exists = await fileExists(targetPath);
    if (exists && !force) {
      return {
        ok: true,
        value: {
          success: true,
          installedFiles: [],
          skippedFiles: [relativePath],
          overwrittenFiles: [],
        },
      };
    }

    // Install the file
    try {
      const content = await readFile(templatePath, 'utf-8');
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, 'utf-8');

      return {
        ok: true,
        value: {
          success: true,
          installedFiles: exists ? [] : [relativePath],
          skippedFiles: [],
          overwrittenFiles: exists ? [relativePath] : [],
        },
      };
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

  /**
   * Check if commit command exists in project
   */
  async checkCommitCommandExists(projectPath: string): Promise<CheckResult> {
    const targetPath = join(projectPath, '.claude', 'commands', 'commit.md');
    const exists = await fileExists(targetPath);
    return { exists, path: targetPath };
  }

  /**
   * List all available common commands from template directory
   * Task 2.1: Requirements: 4.1, 4.2, 4.3
   * @returns Array of CommonCommandInfo
   */
  async listCommonCommands(): Promise<CommonCommandInfo[]> {
    try {
      const files = await readdir(this.templateDir);
      const commands: CommonCommandInfo[] = [];

      for (const file of files) {
        // Filter for .md files only, exclude README
        if (file.endsWith('.md') && file.toUpperCase() !== 'README.MD') {
          const name = file.replace(/\.md$/, '');
          commands.push({
            name,
            templatePath: join(this.templateDir, file),
            targetRelativePath: `.claude/commands/${file}`,
          });
        }
      }

      return commands;
    } catch {
      // Return empty array if directory doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Check for conflicts between template commands and existing project files
   * Task 2.2: Requirements: 3.1, 3.2
   * @param projectPath - Project root path
   * @returns Array of CommonCommandConflict for existing files
   */
  async checkConflicts(projectPath: string): Promise<CommonCommandConflict[]> {
    const commands = await this.listCommonCommands();
    const conflicts: CommonCommandConflict[] = [];

    for (const cmd of commands) {
      const targetPath = join(projectPath, cmd.targetRelativePath);
      if (await fileExists(targetPath)) {
        conflicts.push({
          name: cmd.name,
          existingPath: targetPath,
        });
      }
    }

    return conflicts;
  }

  /**
   * Install all common commands with user decisions for conflicts
   * Task 2.3: Requirements: 3.4, 3.5
   * @param projectPath - Project root path
   * @param decisions - User decisions for conflicting files
   * @returns Install result
   */
  async installAllCommands(
    projectPath: string,
    decisions: CommonCommandDecision[]
  ): Promise<Result<CommonCommandsInstallResult, InstallError>> {
    const commands = await this.listCommonCommands();
    const decisionMap = new Map(decisions.map(d => [d.name, d.action]));

    const installedCommands: string[] = [];
    const skippedCommands: string[] = [];
    const failedCommands: string[] = [];

    for (const cmd of commands) {
      const targetPath = join(projectPath, cmd.targetRelativePath);
      const exists = await fileExists(targetPath);

      // Determine action based on file existence and user decisions
      if (exists) {
        const action = decisionMap.get(cmd.name);
        if (action === 'skip') {
          skippedCommands.push(cmd.name);
          continue;
        }
        // If action is 'overwrite' or not specified (default to overwrite for conflicts with decision)
        // If exists but no decision, we should not install (treat as skip for safety)
        if (!action) {
          skippedCommands.push(cmd.name);
          continue;
        }
      }

      // Install the file
      try {
        const content = await readFile(cmd.templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        installedCommands.push(cmd.name);
      } catch (error) {
        failedCommands.push(cmd.name);
      }
    }

    return {
      ok: true,
      value: {
        totalInstalled: installedCommands.length,
        totalSkipped: skippedCommands.length,
        totalFailed: failedCommands.length,
        installedCommands,
        skippedCommands,
        failedCommands,
      },
    };
  }
}
