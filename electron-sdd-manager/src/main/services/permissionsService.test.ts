/**
 * PermissionsService Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (name: string) => {
      if (name === 'logs') return '/tmp/test-logs';
      if (name === 'userData') return '/tmp/test-userdata';
      return '/tmp/test';
    },
  },
}));

import { checkRequiredPermissions, addShellPermissions, sanitizePermissions, addPermissionsToProject } from './permissionsService';

describe('PermissionsService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'permissions-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create settings.local.json
   */
  async function createSettingsFile(permissions: string[]): Promise<void> {
    const settingsPath = path.join(tempDir, '.claude', 'settings.local.json');
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    const content = {
      permissions: {
        allow: permissions,
      },
    };
    await fs.writeFile(settingsPath, JSON.stringify(content, null, 2), 'utf-8');
  }

  describe('checkRequiredPermissions', () => {
    it('should return PERMISSIONS_FILE_NOT_FOUND when settings.local.json does not exist', async () => {
      const result = await checkRequiredPermissions(tempDir, ['Skill(kiro:*)']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PERMISSIONS_FILE_NOT_FOUND');
      }
    });

    it('should return all present when all permissions exist', async () => {
      const requiredPermissions = [
        'Skill(kiro:*)',
        'Read(**)',
      ];
      await createSettingsFile(requiredPermissions);

      const result = await checkRequiredPermissions(tempDir, requiredPermissions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.allPresent).toBe(true);
        expect(result.value.missing).toEqual([]);
        expect(result.value.present).toEqual(requiredPermissions);
      }
    });

    it('should return missing permissions when some are absent', async () => {
      await createSettingsFile(['Skill(kiro:*)']);

      const requiredPermissions = [
        'Skill(kiro:*)',
        'Read(**)',
        'Edit(**)',
      ];

      const result = await checkRequiredPermissions(tempDir, requiredPermissions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.allPresent).toBe(false);
        expect(result.value.missing).toEqual([
          'Read(**)',
          'Edit(**)',
        ]);
        expect(result.value.present).toEqual(['Skill(kiro:*)']);
      }
    });

    it('should return all missing when no permissions exist in settings', async () => {
      await createSettingsFile([]);

      const requiredPermissions = [
        'Skill(kiro:*)',
        'Read(**)',
      ];

      const result = await checkRequiredPermissions(tempDir, requiredPermissions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.allPresent).toBe(false);
        expect(result.value.missing).toEqual(requiredPermissions);
        expect(result.value.present).toEqual([]);
      }
    });

    it('should handle malformed JSON', async () => {
      const settingsPath = path.join(tempDir, '.claude', 'settings.local.json');
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(settingsPath, 'invalid json', 'utf-8');

      const result = await checkRequiredPermissions(tempDir, ['Skill(kiro:*)']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PARSE_ERROR');
      }
    });
  });

  describe('sanitizePermissions', () => {
    it('should remove Bash(**) from permissions', () => {
      const permissions = ['Read(**)', 'Bash(**)', 'Edit(**)', 'Write(**)'];
      const result = sanitizePermissions(permissions);

      expect(result.sanitized).toEqual(['Read(**)', 'Edit(**)', 'Write(**)']);
      expect(result.removed).toEqual(['Bash(**)']);
    });

    it('should remove SlashCommand patterns', () => {
      const permissions = [
        'Read(**)',
        'SlashCommand(/kiro:spec-init:*)',
        'SlashCommand(/kiro:spec-design:*)',
        'Skill(kiro:*)',
      ];
      const result = sanitizePermissions(permissions);

      expect(result.sanitized).toEqual(['Read(**)', 'Skill(kiro:*)']);
      expect(result.removed).toEqual([
        'SlashCommand(/kiro:spec-init:*)',
        'SlashCommand(/kiro:spec-design:*)',
      ]);
    });

    it('should keep valid permissions unchanged', () => {
      const permissions = [
        'Read(**)',
        'Edit(**)',
        'Bash(git:*)',
        'Skill(kiro:*)',
        'mcp__electron',
      ];
      const result = sanitizePermissions(permissions);

      expect(result.sanitized).toEqual(permissions);
      expect(result.removed).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = sanitizePermissions([]);

      expect(result.sanitized).toEqual([]);
      expect(result.removed).toEqual([]);
    });
  });

  describe('addPermissionsToProject', () => {
    it('should sanitize existing deprecated permissions when adding new ones', async () => {
      // Create settings with deprecated permissions
      await createSettingsFile([
        'Read(**)',
        'Bash(**)',
        'SlashCommand(/kiro:spec-init:*)',
      ]);

      const result = await addPermissionsToProject(tempDir, ['Edit(**)']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.added).toContain('Edit(**)');
      }

      // Verify deprecated permissions were removed
      const settingsPath = path.join(tempDir, '.claude', 'settings.local.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.allow).not.toContain('Bash(**)');
      expect(settings.permissions.allow).not.toContain('SlashCommand(/kiro:spec-init:*)');
      expect(settings.permissions.allow).toContain('Read(**)');
      expect(settings.permissions.allow).toContain('Edit(**)');
    });

    it('should not add deprecated permissions', async () => {
      await createSettingsFile(['Read(**)']);

      const result = await addPermissionsToProject(tempDir, ['Bash(**)', 'SlashCommand(/kiro:test:*)', 'Edit(**)']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Only Edit(**) should be added, deprecated ones should be filtered
        expect(result.value.added).toEqual(['Edit(**)']);
      }

      // Verify final state
      const settingsPath = path.join(tempDir, '.claude', 'settings.local.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.allow).not.toContain('Bash(**)');
      expect(settings.permissions.allow).not.toContain('SlashCommand(/kiro:test:*)');
    });
  });
});
