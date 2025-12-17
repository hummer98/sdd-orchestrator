/**
 * ProfileManager Tests
 * TDD: インストールプロファイル管理のテスト
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
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
  ProfileManager,
  Profile,
  ProfileName,
} from './profileManager';

describe('ProfileManager', () => {
  let profileManager: ProfileManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-manager-test-'));
    profileManager = new ProfileManager();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getProfile', () => {
    it('should return minimal profile', () => {
      const profile = profileManager.getProfile('minimal');

      expect(profile.name).toBe('minimal');
      expect(profile.commandsets).toBeDefined();
      expect(profile.isCustom).toBe(false);
    });

    it('should return standard profile', () => {
      const profile = profileManager.getProfile('standard');

      expect(profile.name).toBe('standard');
      expect(profile.commandsets).toContain('cc-sdd');
      expect(profile.commandsets).toContain('bug');
      expect(profile.isCustom).toBe(false);
    });

    it('should return full profile', () => {
      const profile = profileManager.getProfile('full');

      expect(profile.name).toBe('full');
      expect(profile.commandsets).toContain('cc-sdd');
      expect(profile.commandsets).toContain('bug');
      expect(profile.isCustom).toBe(false);
    });

    it('should return lightweight-bug-fix-only profile', () => {
      const profile = profileManager.getProfile('lightweight-bug-fix-only');

      expect(profile.name).toBe('lightweight-bug-fix-only');
      expect(profile.commandsets).toContain('bug');
      expect(profile.commandsets).not.toContain('cc-sdd');
      expect(profile.isCustom).toBe(false);
    });
  });

  describe('getCommandsetsForProfile', () => {
    it('should return commandsets for minimal profile', () => {
      const commandsets = profileManager.getCommandsetsForProfile('minimal');

      expect(Array.isArray(commandsets)).toBe(true);
      expect(commandsets.length).toBeGreaterThan(0);
    });

    it('should return commandsets for standard profile', () => {
      const commandsets = profileManager.getCommandsetsForProfile('standard');

      expect(commandsets).toContain('cc-sdd');
      expect(commandsets).toContain('bug');
    });

    it('should return commandsets for full profile', () => {
      const commandsets = profileManager.getCommandsetsForProfile('full');

      expect(commandsets).toContain('cc-sdd');
      expect(commandsets).toContain('bug');
    });
  });

  describe('validateProfile', () => {
    it('should validate valid profile', () => {
      const profile: Profile = {
        name: 'custom',
        description: 'Custom profile',
        commandsets: ['cc-sdd', 'bug'],
        isCustom: true,
      };

      const result = profileManager.validateProfile(profile);

      expect(result.ok).toBe(true);
    });

    it('should reject profile with invalid commandset name', () => {
      const profile: Profile = {
        name: 'custom',
        description: 'Custom profile',
        commandsets: ['cc-sdd', 'invalid-commandset' as any],
        isCustom: true,
      };

      const result = profileManager.validateProfile(profile);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PROFILE');
      }
    });

    it('should reject profile with empty commandsets', () => {
      const profile: Profile = {
        name: 'custom',
        description: 'Custom profile',
        commandsets: [],
        isCustom: true,
      };

      const result = profileManager.validateProfile(profile);

      expect(result.ok).toBe(false);
    });

    it('should reject profile with empty name', () => {
      const profile: Profile = {
        name: '',
        description: 'Custom profile',
        commandsets: ['cc-sdd'],
        isCustom: true,
      };

      const result = profileManager.validateProfile(profile);

      expect(result.ok).toBe(false);
    });
  });

  describe('saveCustomProfile', () => {
    it('should save custom profile to file', async () => {
      const profile: Profile = {
        name: 'my-custom',
        description: 'My custom profile',
        commandsets: ['cc-sdd'],
        isCustom: true,
      };

      const result = await profileManager.saveCustomProfile(tempDir, profile);

      expect(result.ok).toBe(true);

      // Verify file was created
      const profilesPath = path.join(tempDir, '.kiro', 'settings', 'profiles.json');
      const content = await fs.readFile(profilesPath, 'utf-8');
      const savedProfiles = JSON.parse(content);

      expect(savedProfiles).toHaveProperty('my-custom');
    });

    it('should append to existing custom profiles', async () => {
      // Create first profile
      const profile1: Profile = {
        name: 'custom-1',
        description: 'First custom',
        commandsets: ['cc-sdd'],
        isCustom: true,
      };
      await profileManager.saveCustomProfile(tempDir, profile1);

      // Create second profile
      const profile2: Profile = {
        name: 'custom-2',
        description: 'Second custom',
        commandsets: ['bug'],
        isCustom: true,
      };
      const result = await profileManager.saveCustomProfile(tempDir, profile2);

      expect(result.ok).toBe(true);

      // Verify both profiles exist
      const profilesPath = path.join(tempDir, '.kiro', 'settings', 'profiles.json');
      const content = await fs.readFile(profilesPath, 'utf-8');
      const savedProfiles = JSON.parse(content);

      expect(savedProfiles).toHaveProperty('custom-1');
      expect(savedProfiles).toHaveProperty('custom-2');
    });

    it('should reject saving profile with built-in name', async () => {
      const profile: Profile = {
        name: 'minimal', // Built-in name
        description: 'Trying to override',
        commandsets: ['cc-sdd'],
        isCustom: true,
      };

      const result = await profileManager.saveCustomProfile(tempDir, profile);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PROFILE');
      }
    });
  });

  describe('loadCustomProfiles', () => {
    it('should load custom profiles from file', async () => {
      // Save a custom profile first
      const profile: Profile = {
        name: 'loaded-custom',
        description: 'Custom to load',
        commandsets: ['cc-sdd', 'bug'],
        isCustom: true,
      };
      await profileManager.saveCustomProfile(tempDir, profile);

      // Load custom profiles
      const customProfiles = await profileManager.loadCustomProfiles(tempDir);

      expect(customProfiles.size).toBe(1);
      expect(customProfiles.has('loaded-custom')).toBe(true);
    });

    it('should return empty map when no custom profiles exist', async () => {
      const customProfiles = await profileManager.loadCustomProfiles(tempDir);

      expect(customProfiles.size).toBe(0);
    });

    it('should handle corrupted profiles file gracefully', async () => {
      // Create corrupted profiles file
      const profilesPath = path.join(tempDir, '.kiro', 'settings', 'profiles.json');
      await fs.mkdir(path.dirname(profilesPath), { recursive: true });
      await fs.writeFile(profilesPath, 'not valid json', 'utf-8');

      const customProfiles = await profileManager.loadCustomProfiles(tempDir);

      expect(customProfiles.size).toBe(0);
    });
  });

  describe('getAllProfiles', () => {
    it('should return all built-in profiles', () => {
      const profiles = profileManager.getAllProfiles();

      expect(profiles.has('minimal')).toBe(true);
      expect(profiles.has('standard')).toBe(true);
      expect(profiles.has('full')).toBe(true);
      expect(profiles.has('lightweight-bug-fix-only')).toBe(true);
    });

    it('should include profile descriptions', () => {
      const profiles = profileManager.getAllProfiles();
      const minimal = profiles.get('minimal');

      expect(minimal?.description).toBeDefined();
      expect(minimal?.description.length).toBeGreaterThan(0);
    });
  });
});
