/**
 * RollbackManager Tests
 * TDD: インストール操作のバックアップとロールバック機能のテスト
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
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
  RollbackManager,
  BackupId,
  InstallHistory,
  RollbackResult,
} from './rollbackManager';
import { CommandsetName } from './unifiedCommandsetInstaller';

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rollback-manager-test-'));
    rollbackManager = new RollbackManager();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create test files
   */
  async function createTestFiles(): Promise<void> {
    const files = [
      '.claude/commands/kiro/spec-init.md',
      '.claude/commands/kiro/spec-design.md',
      '.kiro/settings/rules/ears-format.md',
      'CLAUDE.md',
    ];

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `Content of ${file}`, 'utf-8');
    }
  }

  describe('createBackup', () => {
    it('should create backup and return backup ID', async () => {
      await createTestFiles();

      const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeDefined();
        expect(typeof result.value).toBe('string');
        // UUID format check
        expect(result.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      }
    });

    it('should backup files to .kiro/.backups directory', async () => {
      await createTestFiles();

      const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const backupDir = path.join(tempDir, '.kiro', '.backups', result.value);
        const stat = await fs.stat(backupDir);
        expect(stat.isDirectory()).toBe(true);
      }
    });

    it('should record backup in install history', async () => {
      await createTestFiles();

      const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const history = await rollbackManager.getHistory(tempDir);
        expect(history.length).toBe(1);
        expect(history[0].id).toBe(result.value);
        expect(history[0].commandsets).toContain('cc-sdd');
      }
    });

    it('should backup CLAUDE.md when it exists', async () => {
      await createTestFiles();

      const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const backupClaudeMd = path.join(tempDir, '.kiro', '.backups', result.value, 'CLAUDE.md');
        const content = await fs.readFile(backupClaudeMd, 'utf-8');
        expect(content).toBe('Content of CLAUDE.md');
      }
    });

    it('should handle empty project', async () => {
      const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should still create a backup entry even if no files to backup
        const history = await rollbackManager.getHistory(tempDir);
        expect(history.length).toBe(1);
      }
    });
  });

  describe('rollback', () => {
    it('should restore files from backup', async () => {
      // Create initial files
      await createTestFiles();

      // Create backup
      const backupResult = await rollbackManager.createBackup(tempDir, ['cc-sdd']);
      expect(backupResult.ok).toBe(true);
      if (!backupResult.ok) return;

      const backupId = backupResult.value;

      // Modify a file
      const specInitPath = path.join(tempDir, '.claude/commands/kiro/spec-init.md');
      await fs.writeFile(specInitPath, 'Modified content', 'utf-8');

      // Rollback
      const rollbackResult = await rollbackManager.rollback(tempDir, backupId);

      expect(rollbackResult.ok).toBe(true);
      if (rollbackResult.ok) {
        // Verify file was restored
        const content = await fs.readFile(specInitPath, 'utf-8');
        expect(content).toBe('Content of .claude/commands/kiro/spec-init.md');
      }
    });

    it('should return error for non-existent backup ID', async () => {
      const result = await rollbackManager.rollback(tempDir, 'non-existent-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('BACKUP_NOT_FOUND');
      }
    });

    it('should report restored and failed files', async () => {
      await createTestFiles();

      const backupResult = await rollbackManager.createBackup(tempDir, ['cc-sdd']);
      expect(backupResult.ok).toBe(true);
      if (!backupResult.ok) return;

      const rollbackResult = await rollbackManager.rollback(tempDir, backupResult.value);

      expect(rollbackResult.ok).toBe(true);
      if (rollbackResult.ok) {
        expect(rollbackResult.value.restoredFiles).toBeDefined();
        expect(rollbackResult.value.failedFiles).toBeDefined();
        expect(Array.isArray(rollbackResult.value.restoredFiles)).toBe(true);
        expect(Array.isArray(rollbackResult.value.failedFiles)).toBe(true);
      }
    });

    it('should restore CLAUDE.md from backup', async () => {
      await createTestFiles();
      const originalClaudeMd = await fs.readFile(path.join(tempDir, 'CLAUDE.md'), 'utf-8');

      const backupResult = await rollbackManager.createBackup(tempDir, ['cc-sdd']);
      expect(backupResult.ok).toBe(true);
      if (!backupResult.ok) return;

      // Modify CLAUDE.md
      await fs.writeFile(path.join(tempDir, 'CLAUDE.md'), 'Modified CLAUDE.md', 'utf-8');

      // Rollback
      const rollbackResult = await rollbackManager.rollback(tempDir, backupResult.value);

      expect(rollbackResult.ok).toBe(true);
      const restoredContent = await fs.readFile(path.join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(restoredContent).toBe(originalClaudeMd);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for project without history', async () => {
      const history = await rollbackManager.getHistory(tempDir);

      expect(history).toEqual([]);
    });

    it('should return history entries in reverse chronological order', async () => {
      await createTestFiles();

      // Create multiple backups
      await rollbackManager.createBackup(tempDir, ['cc-sdd']);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await rollbackManager.createBackup(tempDir, ['bug']);

      const history = await rollbackManager.getHistory(tempDir);

      expect(history.length).toBe(2);
      // Most recent first
      expect(history[0].commandsets).toContain('bug');
      expect(history[1].commandsets).toContain('cc-sdd');
    });

    it('should include timestamp in ISO 8601 format', async () => {
      await createTestFiles();
      await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      const history = await rollbackManager.getHistory(tempDir);

      expect(history[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include list of backed up files', async () => {
      await createTestFiles();
      await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      const history = await rollbackManager.getHistory(tempDir);

      expect(history[0].files).toBeDefined();
      expect(Array.isArray(history[0].files)).toBe(true);
      expect(history[0].files.length).toBeGreaterThan(0);
    });
  });

  describe('history limit', () => {
    it('should maintain maximum 10 backup entries', async () => {
      await createTestFiles();

      // Create 12 backups
      for (let i = 0; i < 12; i++) {
        await rollbackManager.createBackup(tempDir, ['cc-sdd']);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const history = await rollbackManager.getHistory(tempDir);

      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should delete old backup files when limit is exceeded', async () => {
      await createTestFiles();

      const oldBackupIds: string[] = [];

      // Create 12 backups
      for (let i = 0; i < 12; i++) {
        const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);
        if (result.ok) {
          if (i < 2) {
            oldBackupIds.push(result.value);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Check that oldest backups were deleted
      for (const oldId of oldBackupIds) {
        const backupDir = path.join(tempDir, '.kiro', '.backups', oldId);
        const exists = await fs.access(backupDir).then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in file paths', async () => {
      const specialPath = path.join(tempDir, '.claude/commands/kiro/spec-test-file.md');
      await fs.mkdir(path.dirname(specialPath), { recursive: true });
      await fs.writeFile(specialPath, 'Special content', 'utf-8');

      const result = await rollbackManager.createBackup(tempDir, ['cc-sdd']);

      expect(result.ok).toBe(true);
    });

    it('should handle concurrent backup requests', async () => {
      await createTestFiles();

      const results = await Promise.all([
        rollbackManager.createBackup(tempDir, ['cc-sdd']),
        rollbackManager.createBackup(tempDir, ['bug']),
      ]);

      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);

      const history = await rollbackManager.getHistory(tempDir);
      expect(history.length).toBe(2);
    });
  });
});
