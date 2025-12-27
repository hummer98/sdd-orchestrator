/**
 * Cloudflared Binary Checker Service
 * Detects cloudflared binary and provides installation instructions
 * Requirements: 4.1, 4.2
 */

import { exec } from 'child_process';
import { existsSync, accessSync, constants } from 'fs';
import { promisify } from 'util';
import { CloudflareConfigStore, getCloudflareConfigStore } from './cloudflareConfigStore';

const execAsync = promisify(exec);

/**
 * Result of binary existence check
 */
export type BinaryCheckResult =
  | { exists: true; path: string }
  | { exists: false };

/**
 * Installation instructions for cloudflared
 */
export interface InstallInstructions {
  /** Homebrew installation command */
  homebrew: string;
  /** MacPorts installation command */
  macports: string;
  /** Official download URL */
  downloadUrl: string;
}

/**
 * File system dependencies for testing
 */
export interface FsDeps {
  existsSync: (path: string) => boolean;
  accessSync: (path: string, mode: number) => void;
  constants: { X_OK: number };
}

/**
 * Command execution dependencies for testing
 */
export interface ExecDeps {
  execAsync: (cmd: string) => Promise<{ stdout: string; stderr: string }>;
}

/**
 * Common paths to check for cloudflared binary
 */
const COMMON_PATHS = [
  '/usr/local/bin/cloudflared',
  '/opt/homebrew/bin/cloudflared', // Apple Silicon Homebrew
  '/usr/bin/cloudflared',
  '/opt/cloudflared/cloudflared',
];

/**
 * Default file system dependencies
 */
const defaultFsDeps: FsDeps = {
  existsSync,
  accessSync,
  constants,
};

/**
 * Default execution dependencies
 */
const defaultExecDeps: ExecDeps = {
  execAsync,
};

/**
 * CloudflaredBinaryChecker
 *
 * Checks for the existence of cloudflared binary in various locations.
 * Provides installation instructions when binary is not found.
 *
 * @example
 * const checker = getCloudflaredBinaryChecker();
 * const result = await checker.checkBinaryExists();
 * if (!result.exists) {
 *   console.log(checker.getInstallInstructions());
 * }
 */
export class CloudflaredBinaryChecker {
  private configStore: CloudflareConfigStore;
  private fsDeps: FsDeps;
  private execDeps: ExecDeps;

  constructor(
    configStore?: CloudflareConfigStore,
    fsDeps?: FsDeps,
    execDeps?: ExecDeps
  ) {
    this.configStore = configStore ?? getCloudflareConfigStore();
    this.fsDeps = fsDeps ?? defaultFsDeps;
    this.execDeps = execDeps ?? defaultExecDeps;
  }

  /**
   * Check if cloudflared binary exists
   * Requirements: 4.1
   *
   * Search order:
   * 1. Custom path from config
   * 2. `which cloudflared` command
   * 3. Common installation paths
   *
   * @returns Result with path if found, or exists: false
   */
  async checkBinaryExists(): Promise<BinaryCheckResult> {
    // 1. Check custom path first
    const customPath = this.configStore.getCloudflaredPath();
    if (customPath && this.isExecutable(customPath)) {
      return { exists: true, path: customPath };
    }

    // 2. Try which command
    try {
      const { stdout } = await this.execDeps.execAsync('which cloudflared');
      const path = stdout.trim();
      if (path) {
        return { exists: true, path };
      }
    } catch {
      // which failed, continue to check common paths
    }

    // 3. Check common paths
    for (const path of COMMON_PATHS) {
      if (this.isExecutable(path)) {
        return { exists: true, path };
      }
    }

    return { exists: false };
  }

  /**
   * Check if a file exists and is executable
   * Requirements: 4.1
   *
   * @param path Path to check
   * @returns true if exists and executable
   */
  isExecutable(path: string): boolean {
    try {
      if (!this.fsDeps.existsSync(path)) {
        return false;
      }
      this.fsDeps.accessSync(path, this.fsDeps.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get installation instructions for cloudflared
   * Requirements: 4.2
   *
   * @returns Installation instructions for different methods
   */
  getInstallInstructions(): InstallInstructions {
    return {
      homebrew: 'brew install cloudflared',
      macports: 'sudo port install cloudflared',
      downloadUrl: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
    };
  }
}

// Singleton instance
let cloudflaredBinaryChecker: CloudflaredBinaryChecker | null = null;

export function getCloudflaredBinaryChecker(): CloudflaredBinaryChecker {
  if (!cloudflaredBinaryChecker) {
    cloudflaredBinaryChecker = new CloudflaredBinaryChecker();
  }
  return cloudflaredBinaryChecker;
}
