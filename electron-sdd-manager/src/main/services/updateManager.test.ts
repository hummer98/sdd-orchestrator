/**
 * UpdateManager Tests
 * TDD: コマンドセットのバージョン管理とアップデート機能のテスト
 * Requirements: 14.1, 14.2, 14.4
 * Note: Phase 2スケルトン実装 - 将来的に完全実装
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn((name: string) => {
      if (name === 'logs') return '/tmp/logs';
      return '/tmp';
    })
  }
}));

import {
  UpdateManager,
  VersionInfo,
  UpdateAvailable,
} from './updateManager';

describe('UpdateManager', () => {
  let updateManager: UpdateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'update-manager-test-'));
    updateManager = new UpdateManager();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create command file with version
   */
  async function createCommandFileWithVersion(name: string, version: string): Promise<void> {
    const filePath = path.join(tempDir, '.claude', 'commands', 'kiro', `${name}.md`);
    const content = `<!-- version: ${version} -->
# ${name} Command

## Role
Role description.

## Task
Task description.
`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  describe('detectVersion', () => {
    it('should detect version from command file with version comment', async () => {
      await createCommandFileWithVersion('spec-init', '1.2.0');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.current).toBe('1.2.0');
    });

    it('should return unknown version for file without version comment', async () => {
      const filePath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '# Command\n\n## Role\nDescription', 'utf-8');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.current).toBe('0.0.0');
    });

    it('should return unknown version for non-existent files', async () => {
      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.current).toBe('0.0.0');
    });

    it('should include latest version information', async () => {
      await createCommandFileWithVersion('spec-init', '1.0.0');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.latest).toBeDefined();
      expect(typeof versionInfo.latest).toBe('string');
    });

    it('should indicate if update is available', async () => {
      await createCommandFileWithVersion('spec-init', '1.0.0');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(typeof versionInfo.updateAvailable).toBe('boolean');
    });
  });

  describe('checkAvailableUpdates', () => {
    it('should return list of available updates', async () => {
      await createCommandFileWithVersion('spec-init', '1.0.0');

      const updates = await updateManager.checkAvailableUpdates(tempDir);

      expect(Array.isArray(updates)).toBe(true);
    });

    it('should include commandset name in update info', async () => {
      await createCommandFileWithVersion('spec-init', '0.1.0');

      const updates = await updateManager.checkAvailableUpdates(tempDir);

      if (updates.length > 0) {
        expect(updates[0].commandset).toBeDefined();
      }
    });

    it('should include version information in update info', async () => {
      await createCommandFileWithVersion('spec-init', '0.1.0');

      const updates = await updateManager.checkAvailableUpdates(tempDir);

      if (updates.length > 0) {
        expect(updates[0].currentVersion).toBeDefined();
        expect(updates[0].latestVersion).toBeDefined();
      }
    });
  });

  describe('updateAll (skeleton)', () => {
    it('should return not implemented error for now', async () => {
      const result = await updateManager.updateAll(tempDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('UPDATE_NOT_IMPLEMENTED');
      }
    });
  });

  describe('version parsing', () => {
    it('should parse semantic version format', async () => {
      await createCommandFileWithVersion('spec-init', '2.1.3');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.current).toBe('2.1.3');
    });

    it('should handle version with prerelease suffix', async () => {
      await createCommandFileWithVersion('spec-init', '1.0.0-beta.1');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.current).toBe('1.0.0-beta.1');
    });

    it('should handle malformed version gracefully', async () => {
      const filePath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '<!-- version: not-a-version -->\n# Command', 'utf-8');

      const versionInfo = await updateManager.detectVersion(tempDir, 'cc-sdd');

      expect(versionInfo.current).toBe('0.0.0');
    });
  });
});
