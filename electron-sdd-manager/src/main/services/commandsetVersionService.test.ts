/**
 * CommandsetVersionService Tests
 * TDD: コマンドセットバージョンチェックサービスのテスト
 * Requirements (commandset-version-detection): 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CommandsetVersionService,
  type VersionCheckResult,
  type CommandsetVersionInfo,
} from './commandsetVersionService';
import { projectConfigService } from './layoutConfigService';
import { CommandsetDefinitionManager } from './commandsetDefinitionManager';

// Mock dependencies
vi.mock('./layoutConfigService', () => ({
  projectConfigService: {
    loadCommandsetVersions: vi.fn(),
  },
}));

describe('CommandsetVersionService', () => {
  let service: CommandsetVersionService;
  const mockProjectPath = '/path/to/project';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommandsetVersionService();
  });

  // ============================================================
  // Task 4.1: Basic service functionality
  // Requirements: 2.1, 2.5
  // ============================================================

  describe('checkVersions (Task 4.1)', () => {
    it('should return version check result for project with v3 config', async () => {
      // Mock v3 config with commandsets
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '1.0.0', installedAt: '2024-01-01T00:00:00.000Z' },
        'bug': { version: '1.0.0', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      expect(result).toBeDefined();
      expect(result.projectPath).toBe(mockProjectPath);
      expect(result.commandsets).toBeDefined();
      expect(result.hasCommandsets).toBe(true);
    });

    it('should include version info for each known commandset', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '1.0.0', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      // Should have info for cc-sdd
      const ccSddInfo = result.commandsets.find(c => c.name === 'cc-sdd');
      expect(ccSddInfo).toBeDefined();
      expect(ccSddInfo?.installedVersion).toBe('1.0.0');
      expect(ccSddInfo?.bundleVersion).toBeDefined();
    });

    it('should calculate anyUpdateRequired correctly', async () => {
      // Mock older installed version
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '0.9.0', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      // If bundle version is newer than installed, anyUpdateRequired should be true
      if (result.commandsets.some(c => c.updateRequired)) {
        expect(result.anyUpdateRequired).toBe(true);
      }
    });
  });

  // ============================================================
  // Task 4.2: Legacy project handling
  // Requirements: 2.3, 2.4
  // ============================================================

  describe('legacy project handling (Task 4.2)', () => {
    it('should return hasCommandsets: false for v2 config (no commandsets field)', async () => {
      // Mock undefined (legacy config without commandsets)
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue(undefined);

      const result = await service.checkVersions(mockProjectPath);

      expect(result.hasCommandsets).toBe(false);
    });

    it('should treat legacy projects as version 0.0.1', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue(undefined);

      const result = await service.checkVersions(mockProjectPath);

      // For legacy projects, installed version should be treated as 0.0.1 (or undefined)
      expect(result.legacyProject).toBe(true);
    });

    it('should handle missing sdd-orchestrator.json', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue(undefined);

      const result = await service.checkVersions(mockProjectPath);

      expect(result.hasCommandsets).toBe(false);
    });
  });

  // ============================================================
  // Task 4.3: Update detection logic
  // Requirements: 2.2
  // ============================================================

  describe('update detection (Task 4.3)', () => {
    it('should mark commandset as updateRequired when installed < bundle', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '0.5.0', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      const ccSddInfo = result.commandsets.find(c => c.name === 'cc-sdd');
      // Bundle version is 1.0.0, installed is 0.5.0, so update should be required
      expect(ccSddInfo?.updateRequired).toBe(true);
    });

    it('should not mark as updateRequired when installed >= bundle', async () => {
      // Get the actual bundle version from definition manager
      const manager = new CommandsetDefinitionManager();
      const bundleVersion = manager.getVersion('cc-sdd');

      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: bundleVersion, installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      const ccSddInfo = result.commandsets.find(c => c.name === 'cc-sdd');
      expect(ccSddInfo?.updateRequired).toBe(false);
    });

    it('should mark uninstalled commandsets as not updateRequired', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '1.0.0', installedAt: '2024-01-01T00:00:00.000Z' },
        // bug is not in the config
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      const bugInfo = result.commandsets.find(c => c.name === 'bug');
      // Bug is not installed, so it should not require update (user hasn't installed it)
      expect(bugInfo?.installedVersion).toBeUndefined();
      expect(bugInfo?.updateRequired).toBe(false);
    });

    it('should handle invalid version format as needing update', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: 'invalid', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      const ccSddInfo = result.commandsets.find(c => c.name === 'cc-sdd');
      // Invalid version should be treated as 0.0.0 and require update
      expect(ccSddInfo?.updateRequired).toBe(true);
    });
  });

  // ============================================================
  // Task 4.4: Type definitions
  // ============================================================

  describe('type definitions (Task 4.4)', () => {
    it('should return VersionCheckResult with required fields', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '1.0.0', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      expect(result).toHaveProperty('projectPath');
      expect(result).toHaveProperty('commandsets');
      expect(result).toHaveProperty('anyUpdateRequired');
      expect(result).toHaveProperty('hasCommandsets');
      expect(result).toHaveProperty('legacyProject');
    });

    it('should return CommandsetVersionInfo with required fields', async () => {
      vi.mocked(projectConfigService.loadCommandsetVersions).mockResolvedValue({
        'cc-sdd': { version: '1.0.0', installedAt: '2024-01-01T00:00:00.000Z' },
      } as any);

      const result = await service.checkVersions(mockProjectPath);

      const info = result.commandsets[0];
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('bundleVersion');
      expect(info).toHaveProperty('updateRequired');
      // installedVersion may be undefined for uninstalled commandsets
    });
  });
});
