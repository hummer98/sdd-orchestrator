/**
 * ExperimentalToolsInstallerService
 * Installs experimental tools (Debug) to projects
 * Note: Commit command has been moved to CommonCommandsInstallerService
 * Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4, 7.1-7.4
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
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
 * Service for installing common commands (auto-installed on project selection)
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
}
