/**
 * CLI Installer Service
 * Manages installation of the 'sdd' CLI command
 */

import { access, constants, symlink, unlink, stat, readlink } from 'fs/promises';
import { join, dirname } from 'path';
import { app } from 'electron';

/**
 * CLI install status
 */
export interface CliInstallStatus {
  readonly isInstalled: boolean;
  readonly symlinkPath: string;
  readonly scriptPath: string;
  readonly currentTarget?: string;
  readonly needsUpdate: boolean;
}

/**
 * CLI install result
 */
export interface CliInstallResult {
  readonly success: boolean;
  readonly message: string;
  readonly requiresSudo: boolean;
  readonly command?: string;
}

/**
 * Default symlink path for the CLI command
 */
const DEFAULT_SYMLINK_PATH = '/usr/local/bin/sdd';

/**
 * Get the path to the sdd script
 * In development: scripts/sdd in the project root (sdd-manager)
 * In production: resources/scripts/sdd in the app bundle
 */
export function getScriptPath(): string {
  if (app.isPackaged) {
    // Production: script is in resources folder
    return join(process.resourcesPath, 'scripts', 'sdd');
  } else {
    // Development: app.getAppPath() returns electron-sdd-manager directory
    // Project root (sdd-manager) is one level up
    const appPath = app.getAppPath();
    const projectRoot = dirname(appPath);
    return join(projectRoot, 'scripts', 'sdd');
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a symlink and get its target
 */
async function getSymlinkTarget(symlinkPath: string): Promise<string | null> {
  try {
    const stats = await stat(symlinkPath);
    if (stats.isSymbolicLink()) {
      return await readlink(symlinkPath);
    }
    // It's a regular file, not a symlink - check via lstat
    const lstats = await import('fs/promises').then(fs => fs.lstat(symlinkPath));
    if (lstats.isSymbolicLink()) {
      return await readlink(symlinkPath);
    }
    return null;
  } catch {
    // Try lstat directly
    try {
      const lstats = await import('fs/promises').then(fs => fs.lstat(symlinkPath));
      if (lstats.isSymbolicLink()) {
        return await readlink(symlinkPath);
      }
    } catch {
      return null;
    }
    return null;
  }
}

/**
 * Get CLI install status
 */
export async function getCliInstallStatus(): Promise<CliInstallStatus> {
  const scriptPath = getScriptPath();
  const symlinkPath = DEFAULT_SYMLINK_PATH;

  const symlinkExists = await fileExists(symlinkPath);
  let currentTarget: string | undefined;
  let needsUpdate = false;

  if (symlinkExists) {
    currentTarget = (await getSymlinkTarget(symlinkPath)) ?? undefined;
    // Check if the symlink points to our script
    needsUpdate = currentTarget !== scriptPath;
  }

  return {
    isInstalled: symlinkExists && currentTarget === scriptPath,
    symlinkPath,
    scriptPath,
    currentTarget,
    needsUpdate,
  };
}

/**
 * Attempt to install the CLI command
 * This may fail if the user doesn't have write permission to /usr/local/bin
 */
export async function installCliCommand(): Promise<CliInstallResult> {
  const scriptPath = getScriptPath();
  const symlinkPath = DEFAULT_SYMLINK_PATH;

  // Check if script exists
  if (!(await fileExists(scriptPath))) {
    return {
      success: false,
      message: `スクリプトが見つかりません: ${scriptPath}`,
      requiresSudo: false,
    };
  }

  // Check if symlink already exists
  const symlinkExists = await fileExists(symlinkPath);
  const currentTarget = symlinkExists ? await getSymlinkTarget(symlinkPath) : null;

  // If symlink exists and points to our script, nothing to do
  if (currentTarget === scriptPath) {
    return {
      success: true,
      message: '「sdd」コマンドは既にインストールされています。',
      requiresSudo: false,
    };
  }

  // Try to create/update symlink
  try {
    // Remove existing symlink if it exists
    if (symlinkExists) {
      await unlink(symlinkPath);
    }

    // Create new symlink
    await symlink(scriptPath, symlinkPath);

    return {
      success: true,
      message: '「sdd」コマンドを正常にインストールしました。',
      requiresSudo: false,
    };
  } catch (error) {
    // Permission denied - need sudo
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('EACCES') || message.includes('EPERM')) {
      const sudoCommand = symlinkExists
        ? `sudo ln -sf "${scriptPath}" "${symlinkPath}"`
        : `sudo ln -s "${scriptPath}" "${symlinkPath}"`;

      return {
        success: false,
        message: '管理者権限が必要です。以下のコマンドをターミナルで実行してください：',
        requiresSudo: true,
        command: sudoCommand,
      };
    }

    return {
      success: false,
      message: `インストールに失敗しました: ${message}`,
      requiresSudo: false,
    };
  }
}

/**
 * Get the manual install instructions
 */
export function getManualInstallInstructions(): {
  title: string;
  steps: string[];
  command: string;
  usage: {
    title: string;
    examples: Array<{ command: string; description: string }>;
  };
} {
  const scriptPath = getScriptPath();
  const symlinkPath = DEFAULT_SYMLINK_PATH;

  return {
    title: '「sdd」コマンドのインストール',
    steps: [
      'ターミナルを開きます',
      '以下のコマンドを実行します（管理者パスワードが必要です）',
    ],
    command: `sudo ln -sf "${scriptPath}" "${symlinkPath}"`,
    usage: {
      title: '使い方',
      examples: [
        { command: 'sdd .', description: 'カレントディレクトリをプロジェクトとして開く' },
        { command: 'sdd /path/to/project', description: '指定したディレクトリをプロジェクトとして開く' },
        { command: 'sdd', description: 'プロジェクト選択画面で起動' },
      ],
    },
  };
}
