/**
 * CLI Installer Service Tests
 * Requirements: 10.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as path from 'path';

// Mock dependencies
const { mockFs, mockElectron, mockOs, mockResourcePaths } = vi.hoisted(() => {
  return {
    mockFs: {
      access: vi.fn(),
      constants: { F_OK: 0 },
      symlink: vi.fn(),
      unlink: vi.fn(),
      stat: vi.fn(),
      readlink: vi.fn(),
      mkdir: vi.fn(),
      lstat: vi.fn(),
    },
    mockElectron: {
      app: {
        isPackaged: false,
        getAppPath: vi.fn(),
        getPath: vi.fn(),
      },
    },
    mockOs: {
      homedir: vi.fn(() => '/Users/testuser'),
    },
    mockResourcePaths: {
      getScriptsPath: vi.fn(),
    },
  };
});

// Apply mocks
vi.mock('fs/promises', async () => {
  return {
    ...mockFs,
    default: mockFs, // For dynamic imports if any
  };
});

vi.mock('electron', () => mockElectron);
vi.mock('os', () => ({
  ...mockOs,
  default: mockOs,
}));
vi.mock('../utils/resourcePaths', () => mockResourcePaths);

// Import service under test
import {
  getCliInstallStatus,
  installCliCommand,
  getScriptPath,
  getManualInstallInstructions,
  type InstallLocation,
} from './cliInstallerService';

describe('CliInstallerService', () => {
  const MOCK_HOME = '/Users/testuser';
  const MOCK_PROJECT_ROOT = '/Users/testuser/project';
  const MOCK_APP_PATH = path.join(MOCK_PROJECT_ROOT, 'electron-sdd-manager');
  const EXPECTED_USER_SYMLINK = path.join(MOCK_HOME, '.local', 'bin', 'sdd');
  const EXPECTED_SYSTEM_SYMLINK = '/usr/local/bin/sdd';
  
  // Script paths
  const DEV_SCRIPT_PATH = path.join(MOCK_PROJECT_ROOT, 'scripts', 'sdd');
  const PROD_SCRIPT_PATH = '/Applications/SDD.app/Contents/Resources/scripts/sdd';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockOs.homedir.mockReturnValue(MOCK_HOME);
    mockElectron.app.getAppPath.mockReturnValue(MOCK_APP_PATH);
    mockElectron.app.isPackaged = false;
    
    // Default to file not existing (access throws)
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.lstat.mockRejectedValue(new Error('ENOENT'));
  });

  describe('getScriptPath', () => {
    it('should return dev path when not packaged', () => {
      mockElectron.app.isPackaged = false;
      mockElectron.app.getAppPath.mockReturnValue(MOCK_APP_PATH);
      
      const scriptPath = getScriptPath();
      expect(scriptPath).toBe(DEV_SCRIPT_PATH);
    });

    it('should return prod path when packaged', () => {
      mockElectron.app.isPackaged = true;
      mockResourcePaths.getScriptsPath.mockReturnValue('/Applications/SDD.app/Contents/Resources/scripts');
      
      const scriptPath = getScriptPath();
      expect(scriptPath).toBe(PROD_SCRIPT_PATH);
    });
  });

  describe('getCliInstallStatus', () => {
    it('should report not installed when symlink does not exist', async () => {
      // access fails (default)
      const status = await getCliInstallStatus('user');
      
      expect(status.isInstalled).toBe(false);
      expect(status.needsUpdate).toBe(false);
      expect(status.symlinkPath).toBe(EXPECTED_USER_SYMLINK);
    });

    it('should report installed when symlink exists and points to correct script', async () => {
      // access succeeds
      mockFs.access.mockResolvedValue(undefined);
      
      // stat says it's a symlink
      mockFs.stat.mockResolvedValue({
        isSymbolicLink: () => true,
      });
      
      // readlink returns correct target
      mockFs.readlink.mockResolvedValue(DEV_SCRIPT_PATH);

      const status = await getCliInstallStatus('user');
      
      expect(status.isInstalled).toBe(true);
      expect(status.needsUpdate).toBe(false);
      expect(status.currentTarget).toBe(DEV_SCRIPT_PATH);
    });

    it('should report needsUpdate when symlink points to wrong target', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ isSymbolicLink: () => true });
      mockFs.readlink.mockResolvedValue('/wrong/path/sdd');

      const status = await getCliInstallStatus('user');
      
      expect(status.isInstalled).toBe(false);
      expect(status.needsUpdate).toBe(true);
      expect(status.currentTarget).toBe('/wrong/path/sdd');
    });

    it('should handle non-symlink file at target path', async () => {
      mockFs.access.mockResolvedValue(undefined);
      // stat says it's NOT a symlink (maybe a regular file)
      mockFs.stat.mockResolvedValue({ isSymbolicLink: () => false });
      
      // fallback to lstat check (which might also fail if we mock it that way, or we can mock it to return false)
      mockFs.lstat.mockResolvedValue({ isSymbolicLink: () => false });

      const status = await getCliInstallStatus('user');
      
      expect(status.isInstalled).toBe(false); // It's a file, not OUR symlink
      expect(status.needsUpdate).toBe(true); // Technically treats as mismatch
    });
  });

  describe('installCliCommand', () => {
    it('should fail if source script does not exist', async () => {
      // script path access fails (default)
      const result = await installCliCommand('user');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('スクリプトが見つかりません');
    });

    it('should succeed if symlink already exists and is correct', async () => {
      // Both script and symlink exist
      mockFs.access.mockResolvedValue(undefined);
      
      mockFs.stat.mockResolvedValue({ isSymbolicLink: () => true });
      mockFs.readlink.mockResolvedValue(DEV_SCRIPT_PATH);

      const result = await installCliCommand('user');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('既にインストールされています');
      expect(mockFs.symlink).not.toHaveBeenCalled();
    });

    it('should create symlink for user installation', async () => {
      // Script exists
      mockFs.access.mockImplementation((path) => {
        if (path === DEV_SCRIPT_PATH) return Promise.resolve();
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await installCliCommand('user');
      
      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.dirname(EXPECTED_USER_SYMLINK), { recursive: true });
      expect(mockFs.symlink).toHaveBeenCalledWith(DEV_SCRIPT_PATH, EXPECTED_USER_SYMLINK);
    });

    it('should remove existing symlink and recreate if updating', async () => {
      // Script exists
      mockFs.access.mockResolvedValue(undefined);
      
      // Symlink exists but points elsewhere
      mockFs.stat.mockResolvedValue({ isSymbolicLink: () => true });
      mockFs.readlink.mockResolvedValue('/old/path/sdd');

      const result = await installCliCommand('user');
      
      expect(result.success).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(EXPECTED_USER_SYMLINK);
      expect(mockFs.symlink).toHaveBeenCalledWith(DEV_SCRIPT_PATH, EXPECTED_USER_SYMLINK);
    });

    it('should return sudo command instruction on EACCES error', async () => {
      // Script exists
      mockFs.access.mockImplementation((path) => {
        if (path === DEV_SCRIPT_PATH) return Promise.resolve();
        return Promise.reject(new Error('ENOENT'));
      });

      // symlink throws permission error
      const permissionError = new Error('EACCES: permission denied');
      mockFs.symlink.mockRejectedValue(permissionError);

      const result = await installCliCommand('system');
      
      expect(result.success).toBe(false);
      expect(result.requiresSudo).toBe(true);
      expect(result.command).toContain(`sudo ln -s "${DEV_SCRIPT_PATH}" "${EXPECTED_SYSTEM_SYMLINK}"`);
    });
  });

  describe('getManualInstallInstructions', () => {
    it('should return user instructions', () => {
      const instructions = getManualInstallInstructions('user');
      expect(instructions.command).toContain('mkdir -p');
      expect(instructions.command).toContain(EXPECTED_USER_SYMLINK);
    });

    it('should return system instructions', () => {
      const instructions = getManualInstallInstructions('system');
      expect(instructions.command).toContain('sudo ln -sf');
      expect(instructions.command).toContain(EXPECTED_SYSTEM_SYMLINK);
    });
  });
});
