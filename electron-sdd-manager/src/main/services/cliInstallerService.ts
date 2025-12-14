/**
 * CLI Installer Service
 * Manages installation of the 'sdd' CLI command
 */

import { access, constants, symlink, unlink, stat, readlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { app } from 'electron';
import { homedir } from 'os';
import { getScriptsPath } from '../utils/resourcePaths';

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
 * Installation location type
 */
export type InstallLocation = 'system' | 'user';

/**
 * Default symlink path for the CLI command (system-wide, requires sudo)
 */
const SYSTEM_SYMLINK_PATH = '/usr/local/bin/sdd';

/**
 * User-local symlink path (no sudo required)
 */
const USER_SYMLINK_PATH = join(homedir(), '.local', 'bin', 'sdd');

/**
 * Get the path to the sdd script
 * In development: scripts/sdd in the project root (sdd-orchestrator)
 * In production: resources/scripts/sdd in the app bundle
 */
export function getScriptPath(): string {
  if (app.isPackaged) {
    // Production: script is in extraResources
    return join(getScriptsPath(), 'sdd');
  } else {
    // Development: app.getAppPath() returns electron-sdd-manager directory
    // Project root (sdd-orchestrator) is one level up
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
 * Get symlink path based on install location
 */
function getSymlinkPath(location: InstallLocation): string {
  return location === 'system' ? SYSTEM_SYMLINK_PATH : USER_SYMLINK_PATH;
}

/**
 * Get CLI install status for a specific location
 */
export async function getCliInstallStatus(
  location: InstallLocation = 'user'
): Promise<CliInstallStatus> {
  const scriptPath = getScriptPath();
  const symlinkPath = getSymlinkPath(location);

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
 * Check if CLI is installed in any location
 */
export async function isCliInstalledAnywhere(): Promise<{
  user: boolean;
  system: boolean;
}> {
  const userStatus = await getCliInstallStatus('user');
  const systemStatus = await getCliInstallStatus('system');

  return {
    user: userStatus.isInstalled,
    system: systemStatus.isInstalled,
  };
}

/**
 * Attempt to install the CLI command
 */
export async function installCliCommand(
  location: InstallLocation = 'user'
): Promise<CliInstallResult> {
  const scriptPath = getScriptPath();
  const symlinkPath = getSymlinkPath(location);

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
      message: `「sdd」コマンドは既にインストールされています (${location === 'user' ? 'ユーザー' : 'システム'}全体)。`,
      requiresSudo: false,
    };
  }

  // Try to create/update symlink
  try {
    // For user installation, ensure ~/.local/bin exists
    if (location === 'user') {
      const binDir = dirname(symlinkPath);
      try {
        await mkdir(binDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore
      }
    }

    // Remove existing symlink if it exists
    if (symlinkExists) {
      await unlink(symlinkPath);
    }

    // Create new symlink
    await symlink(scriptPath, symlinkPath);

    const locationDesc = location === 'user' ? 'ユーザーディレクトリ' : 'システム全体';
    return {
      success: true,
      message: `「sdd」コマンドを正常にインストールしました (${locationDesc})。`,
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
export function getManualInstallInstructions(
  location: InstallLocation = 'user'
): {
  title: string;
  steps: string[];
  command: string;
  usage: {
    title: string;
    examples: Array<{ command: string; description: string }>;
  };
  pathNote?: string;
} {
  const scriptPath = getScriptPath();
  const symlinkPath = getSymlinkPath(location);

  const instructions = {
    title: '「sdd」コマンドのインストール',
    steps:
      location === 'user'
        ? ['ターミナルを開きます', '以下のコマンドを実行します（sudoは不要です）']
        : ['ターミナルを開きます', '以下のコマンドを実行します（管理者パスワードが必要です）'],
    command:
      location === 'user'
        ? `mkdir -p ~/.local/bin && ln -sf "${scriptPath}" "${symlinkPath}"`
        : `sudo ln -sf "${scriptPath}" "${symlinkPath}"`,
    usage: {
      title: '使い方',
      examples: [
        { command: 'sdd .', description: 'カレントディレクトリをプロジェクトとして開く' },
        { command: 'sdd /path/to/project', description: '指定したディレクトリをプロジェクトとして開く' },
        { command: 'sdd', description: 'プロジェクト選択画面で起動' },
      ],
    },
  };

  // Add PATH note for user installation
  if (location === 'user') {
    return {
      ...instructions,
      pathNote: '~/.local/bin がPATHに含まれていることを確認してください。',
    };
  }

  return instructions;
}
