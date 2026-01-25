/**
 * MigrationService Tests
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6
 *
 * Task 5.1: MigrationService class
 * Task 5.2: checkMigrationNeeded method
 * Task 5.3: migrateSpec method
 * Task 5.4: IPC integration (tested via service interface)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MigrationService, type MigrationInfo } from './migrationService';

describe('MigrationService', () => {
  let testDir: string;
  let service: MigrationService;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join(os.tmpdir(), `migration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new MigrationService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // =============================================================================
  // Task 5.1: MigrationService class with declinedSpecs Set
  // Requirements: 5.5
  // =============================================================================
  describe('MigrationService class (Task 5.1)', () => {
    it('should be instantiable', () => {
      expect(service).toBeDefined();
    });

    it('should have declineMigration method', () => {
      expect(typeof service.declineMigration).toBe('function');
    });

    it('should have isDeclined method', () => {
      expect(typeof service.isDeclined).toBe('function');
    });

    it('should remember declined specs within session', () => {
      service.declineMigration('spec-a');

      expect(service.isDeclined('spec-a')).toBe(true);
      expect(service.isDeclined('spec-b')).toBe(false);
    });

    it('should handle multiple declines', () => {
      service.declineMigration('spec-a');
      service.declineMigration('spec-b');

      expect(service.isDeclined('spec-a')).toBe(true);
      expect(service.isDeclined('spec-b')).toBe(true);
      expect(service.isDeclined('spec-c')).toBe(false);
    });
  });

  // =============================================================================
  // Task 5.2: checkMigrationNeeded method
  // Requirements: 5.1, 5.2
  // =============================================================================
  describe('checkMigrationNeeded (Task 5.2)', () => {
    it('should return MigrationInfo when legacy logs exist for spec', async () => {
      // Create legacy logs at old path: {basePath}/{specId}/logs/
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test1"}\n', 'utf-8');
      await fs.writeFile(path.join(legacyDir, 'agent-002.log'), '{"data":"test2"}\n', 'utf-8');

      const info = await service.checkMigrationNeeded('my-feature');

      expect(info).not.toBeNull();
      expect(info?.specId).toBe('my-feature');
      expect(info?.fileCount).toBe(2);
      expect(info?.totalSize).toBeGreaterThan(0);
    });

    it('should return MigrationInfo for bug with bug: prefix (Req 5.2)', async () => {
      // Create legacy logs for bug at: {basePath}/bug:{bugId}/logs/
      const legacyDir = path.join(testDir, 'bug:login-error', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"bug log"}\n', 'utf-8');

      const info = await service.checkMigrationNeeded('bug:login-error');

      expect(info).not.toBeNull();
      expect(info?.specId).toBe('bug:login-error');
      expect(info?.fileCount).toBe(1);
    });

    it('should return null when no legacy logs exist', async () => {
      const info = await service.checkMigrationNeeded('non-existent');

      expect(info).toBeNull();
    });

    it('should return null when spec is already declined (Req 5.5)', async () => {
      // Create legacy logs
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test"}\n', 'utf-8');

      // Decline migration for this spec
      service.declineMigration('my-feature');

      const info = await service.checkMigrationNeeded('my-feature');

      expect(info).toBeNull();
    });

    it('should return null when legacy directory exists but is empty', async () => {
      const legacyDir = path.join(testDir, 'empty-spec', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });

      const info = await service.checkMigrationNeeded('empty-spec');

      expect(info).toBeNull();
    });
  });

  // =============================================================================
  // Task 5.3: migrateSpec method
  // Requirements: 5.4, 5.6
  // =============================================================================
  describe('migrateSpec (Task 5.3)', () => {
    it('should move files from legacy to new path for spec', async () => {
      // Create legacy logs
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test1"}\n', 'utf-8');

      const result = await service.migrateSpec('my-feature');

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toBe(1);

      // Verify file was moved to new path
      const newPath = path.join(testDir, 'specs', 'my-feature', 'logs', 'agent-001.log');
      const exists = await fs.access(newPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify content was preserved
      const content = await fs.readFile(newPath, 'utf-8');
      expect(content).toBe('{"data":"test1"}\n');
    });

    it('should move files from legacy to new path for bug', async () => {
      // Create legacy logs for bug
      const legacyDir = path.join(testDir, 'bug:login-error', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"bug log"}\n', 'utf-8');

      const result = await service.migrateSpec('bug:login-error');

      expect(result.success).toBe(true);

      // Verify file was moved to bugs/ path
      const newPath = path.join(testDir, 'bugs', 'login-error', 'logs', 'agent-001.log');
      const exists = await fs.access(newPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should delete empty legacy directory after migration (Req 5.6)', async () => {
      // Create legacy logs
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test"}\n', 'utf-8');

      await service.migrateSpec('my-feature');

      // Verify legacy logs directory was deleted
      const legacyExists = await fs.access(legacyDir).then(() => true).catch(() => false);
      expect(legacyExists).toBe(false);
    });

    it('should migrate multiple files', async () => {
      // Create multiple legacy logs
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"1"}\n', 'utf-8');
      await fs.writeFile(path.join(legacyDir, 'agent-002.log'), '{"data":"2"}\n', 'utf-8');
      await fs.writeFile(path.join(legacyDir, 'agent-003.log'), '{"data":"3"}\n', 'utf-8');

      const result = await service.migrateSpec('my-feature');

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toBe(3);
    });

    it('should return error when no legacy logs exist', async () => {
      const result = await service.migrateSpec('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should only migrate .log files', async () => {
      // Create legacy logs with non-log file
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"log"}\n', 'utf-8');
      await fs.writeFile(path.join(legacyDir, 'README.txt'), 'ignore me', 'utf-8');

      const result = await service.migrateSpec('my-feature');

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toBe(1);

      // Non-log file should still exist (directory not deleted because non-empty)
      const txtExists = await fs.access(path.join(legacyDir, 'README.txt')).then(() => true).catch(() => false);
      expect(txtExists).toBe(true);
    });
  });

  // =============================================================================
  // Additional edge cases
  // =============================================================================
  describe('Edge cases', () => {
    it('should handle specId with special characters', async () => {
      const specialSpecId = 'feature-v2.0-beta';
      const legacyDir = path.join(testDir, specialSpecId, 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"test"}\n', 'utf-8');

      const info = await service.checkMigrationNeeded(specialSpecId);
      expect(info).not.toBeNull();

      const result = await service.migrateSpec(specialSpecId);
      expect(result.success).toBe(true);
    });

    it('should not migrate if new path already has files', async () => {
      // Create legacy logs
      const legacyDir = path.join(testDir, 'my-feature', 'logs');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'agent-001.log'), '{"data":"legacy"}\n', 'utf-8');

      // Create new path with existing file
      const newDir = path.join(testDir, 'specs', 'my-feature', 'logs');
      await fs.mkdir(newDir, { recursive: true });
      await fs.writeFile(path.join(newDir, 'agent-001.log'), '{"data":"new"}\n', 'utf-8');

      const result = await service.migrateSpec('my-feature');

      // Should still succeed but skip existing files
      expect(result.success).toBe(true);

      // Verify new path file was NOT overwritten
      const content = await fs.readFile(path.join(newDir, 'agent-001.log'), 'utf-8');
      expect(content).toBe('{"data":"new"}\n');
    });
  });
});
