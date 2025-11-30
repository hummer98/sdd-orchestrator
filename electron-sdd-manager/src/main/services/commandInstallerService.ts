/**
 * CommandInstallerService
 * Installs Slash Command files, SDD settings, and CLAUDE.md to projects
 * Requirements: 4.3, 4.5, 4.6
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { spawn } from 'child_process';
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
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'MERGE_ERROR'; message: string };

/**
 * CLAUDE.md install mode
 */
export type ClaudeMdInstallMode = 'overwrite' | 'merge' | 'skip';

/**
 * CLAUDE.md install result
 */
export interface ClaudeMdInstallResult {
  readonly mode: ClaudeMdInstallMode;
  readonly existed: boolean;
}

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

  /**
   * Check if CLAUDE.md exists in project
   * @param projectPath - Project root path
   * @returns true if CLAUDE.md exists
   */
  async claudeMdExists(projectPath: string): Promise<boolean> {
    const targetPath = join(projectPath, 'CLAUDE.md');
    return fileExists(targetPath);
  }

  /**
   * Install CLAUDE.md to project
   * @param projectPath - Project root path
   * @param mode - Install mode: 'overwrite', 'merge', or 'skip'
   * @returns Install result
   */
  async installClaudeMd(
    projectPath: string,
    mode: ClaudeMdInstallMode
  ): Promise<Result<ClaudeMdInstallResult, InstallError>> {
    const templatePath = join(this.templateDir, 'CLAUDE.md');
    const targetPath = join(projectPath, 'CLAUDE.md');

    // Check if template exists
    if (!(await fileExists(templatePath))) {
      return {
        ok: false,
        error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
      };
    }

    const existed = await fileExists(targetPath);

    if (mode === 'skip') {
      return { ok: true, value: { mode: 'skip', existed } };
    }

    try {
      const templateContent = await readFile(templatePath, 'utf-8');

      if (mode === 'overwrite' || !existed) {
        // Simply write the template
        await writeFile(targetPath, templateContent, 'utf-8');
        return { ok: true, value: { mode: existed ? 'overwrite' : 'overwrite', existed } };
      }

      // Semantic merge
      const existingContent = await readFile(targetPath, 'utf-8');
      const mergedContent = await this.semanticMergeClaudeMd(templateContent, existingContent);
      await writeFile(targetPath, mergedContent, 'utf-8');
      return { ok: true, value: { mode: 'merge', existed } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('EACCES') || message.includes('EPERM')) {
        return {
          ok: false,
          error: { type: 'PERMISSION_DENIED', path: targetPath },
        };
      }
      if (message.includes('merge')) {
        return {
          ok: false,
          error: { type: 'MERGE_ERROR', message },
        };
      }
      return {
        ok: false,
        error: { type: 'WRITE_ERROR', path: targetPath, message },
      };
    }
  }

  /**
   * Semantic merge of CLAUDE.md using claude -p
   * @param templateContent - Template content (new version)
   * @param existingContent - Existing content (user's customizations)
   * @returns Merged content
   */
  private async semanticMergeClaudeMd(
    templateContent: string,
    existingContent: string
  ): Promise<string> {
    const prompt = `以下の2つのCLAUDE.mdファイルをセマンティックにマージしてください。

【テンプレート（新しいバージョン）】
---
${templateContent}
---

【既存ファイル（ユーザーのカスタマイズ）】
---
${existingContent}
---

マージルール:
1. テンプレートの構造とセクションを基本とする
2. ユーザーがカスタマイズした内容（プロジェクト固有の設定、追加のコマンド、開発ルールなど）は保持する
3. テンプレートで更新された部分（コマンド名の変更、新機能の追加など）は反映する
4. 重複するセクションは統合し、情報は失わない
5. プレースホルダー（{{KIRO_DIR}}など）はテンプレートのまま残す

結果は以下の形式で出力してください：
- マージ後のCLAUDE.mdの完全な内容のみを出力
- 説明や解説は不要`;

    return new Promise((resolve, reject) => {
      const claude = spawn('claude', ['-p', prompt], {
        shell: true,
        env: { ...process.env },
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
          resolve(output.trim());
        } else {
          reject(new Error(`Semantic merge failed: ${errorOutput || `exit code ${code}`}`));
        }
      });

      claude.on('error', (err: Error) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });
    });
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
