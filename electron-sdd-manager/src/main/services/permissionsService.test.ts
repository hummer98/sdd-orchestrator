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

import { checkRequiredPermissions, addShellPermissions } from './permissionsService';

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
      const result = await checkRequiredPermissions(tempDir, ['SlashCommand(/test:*)']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PERMISSIONS_FILE_NOT_FOUND');
      }
    });

    it('should return all present when all permissions exist', async () => {
      const requiredPermissions = [
        'SlashCommand(/kiro:spec-init:*)',
        'SlashCommand(/kiro:spec-requirements:*)',
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
      await createSettingsFile(['SlashCommand(/kiro:spec-init:*)']);

      const requiredPermissions = [
        'SlashCommand(/kiro:spec-init:*)',
        'SlashCommand(/kiro:spec-requirements:*)',
        'SlashCommand(/kiro:spec-design:*)',
      ];

      const result = await checkRequiredPermissions(tempDir, requiredPermissions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.allPresent).toBe(false);
        expect(result.value.missing).toEqual([
          'SlashCommand(/kiro:spec-requirements:*)',
          'SlashCommand(/kiro:spec-design:*)',
        ]);
        expect(result.value.present).toEqual(['SlashCommand(/kiro:spec-init:*)']);
      }
    });

    it('should return all missing when no permissions exist in settings', async () => {
      await createSettingsFile([]);

      const requiredPermissions = [
        'SlashCommand(/kiro:spec-init:*)',
        'SlashCommand(/kiro:spec-requirements:*)',
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

      const result = await checkRequiredPermissions(tempDir, ['SlashCommand(/test:*)']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PARSE_ERROR');
      }
    });
  });
});
