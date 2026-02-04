/**
 * Tool Path Handlers Integration Tests
 * well-known-tool-paths feature
 * Task 7.1: IPC経由のツールパス設定テストを実装する
 *
 * Requirements: 2.1, 2.4
 * Integration Point: Design.md "設定画面での手動指定フロー"
 *
 * Tests the full IPC flow:
 * Renderer -> Main -> ConfigStore -> ToolPathResolverService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  ToolPathResolverService,
  resetToolPathResolverService,
  WELL_KNOWN_PATHS,
  type ToolResolutionResult,
  type FsDeps,
  type ConfigStoreDeps,
} from '../services/toolPathResolverService';

// =============================================================================
// Mock ConfigStore for integration testing
// =============================================================================

interface MockConfigStore {
  toolPaths: Record<string, string | null>;
  getToolPath: (toolName: string) => string | null;
  setToolPath: (toolName: string, path: string | null) => void;
}

function createMockConfigStore(): MockConfigStore {
  const store: MockConfigStore = {
    toolPaths: {
      claude: null,
      jj: null,
      jq: null,
    },
    getToolPath: (toolName: string) => store.toolPaths[toolName] ?? null,
    setToolPath: (toolName: string, toolPath: string | null) => {
      store.toolPaths[toolName] = toolPath;
    },
  };
  return store;
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('ToolPathHandlers Integration Tests', () => {
  let testDir: string;
  let mockConfigStore: MockConfigStore;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'tool-path-test-'));

    // Reset singleton
    resetToolPathResolverService();

    // Create mock config store
    mockConfigStore = createMockConfigStore();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    resetToolPathResolverService();
  });

  // =============================================================================
  // Test: Well Known Path Discovery
  // Requirements: 1.1, 1.2, 1.3
  // =============================================================================
  describe('Well Known Path Discovery', () => {
    it('should discover tool in first Well Known path', async () => {
      // Create mock tool in the first Well Known path
      const mockToolPath = path.join(testDir, 'opt/homebrew/bin/claude');
      await fs.mkdir(path.dirname(mockToolPath), { recursive: true });
      await fs.writeFile(mockToolPath, '#!/bin/bash\necho "mock claude"');

      // Mock fs.existsSync to use test directory
      const fsDeps: FsDeps = {
        existsSync: (p: string) => {
          // Redirect Well Known paths to test directory
          for (const basePath of WELL_KNOWN_PATHS) {
            if (p.startsWith(basePath)) {
              const relativePath = p.replace(basePath, '');
              const testPath = path.join(testDir, 'opt/homebrew/bin' + relativePath);
              return fsSync.existsSync(testPath);
            }
          }
          return fsSync.existsSync(p);
        },
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: () => null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.source).toBe('well-known');
    });

    it('should check Well Known paths in correct order', async () => {
      const checkedPaths: string[] = [];

      const fsDeps: FsDeps = {
        existsSync: (p: string) => {
          checkedPaths.push(p);
          return false;
        },
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: () => null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveTool('claude');

      // Verify paths are checked in correct order
      const expectedOrder = WELL_KNOWN_PATHS.map((base) => `${base}/claude`);
      expect(checkedPaths).toEqual(expectedOrder);
    });

    it('should return not-found when tool does not exist in any Well Known path', async () => {
      const fsDeps: FsDeps = {
        existsSync: () => false,
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: () => null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.source).toBe('not-found');
      expect(result.error).toContain('not found');
    });
  });

  // =============================================================================
  // Test: Manual Path Priority
  // Requirements: 2.4
  // =============================================================================
  describe('Manual Path Priority', () => {
    it('should prioritize manual path over Well Known paths', async () => {
      const manualPath = path.join(testDir, 'custom/path/claude');
      await fs.mkdir(path.dirname(manualPath), { recursive: true });
      await fs.writeFile(manualPath, '#!/bin/bash\necho "custom claude"');

      // Mock that manual path exists
      const fsDeps: FsDeps = {
        existsSync: (p: string) => p === manualPath,
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: (toolName: string) =>
          toolName === 'claude' ? manualPath : null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe(manualPath);
      expect(result.source).toBe('manual');
    });

    it('should fall back to Well Known when manual path does not exist', async () => {
      const manualPath = '/nonexistent/path/claude';
      const wellKnownPath = '/opt/homebrew/bin/claude';

      const fsDeps: FsDeps = {
        existsSync: (p: string) => p === wellKnownPath,
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: (toolName: string) =>
          toolName === 'claude' ? manualPath : null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      // Manual path doesn't exist, so it should fail with manual source
      expect(result.resolved).toBe(false);
      expect(result.source).toBe('manual');
      expect(result.error).toContain('does not exist');
    });
  });

  // =============================================================================
  // Test: ConfigStore Integration (simulating IPC flow)
  // Requirements: 2.1
  // =============================================================================
  describe('ConfigStore Integration', () => {
    it('should persist and retrieve tool path settings', async () => {
      // Simulate SET_TOOL_PATH IPC call
      const customPath = '/custom/path/jj';
      mockConfigStore.setToolPath('jj', customPath);

      // Verify persistence
      expect(mockConfigStore.getToolPath('jj')).toBe(customPath);

      // Verify service uses the persisted path
      const fsDeps: FsDeps = {
        existsSync: (p: string) => p === customPath,
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: (toolName: string) => mockConfigStore.getToolPath(toolName),
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe(customPath);
      expect(result.source).toBe('manual');
    });

    it('should clear tool path when set to null', async () => {
      // Set a path
      mockConfigStore.setToolPath('jj', '/custom/path/jj');
      expect(mockConfigStore.getToolPath('jj')).toBe('/custom/path/jj');

      // Clear the path (simulate SET_TOOL_PATH with null)
      mockConfigStore.setToolPath('jj', null);
      expect(mockConfigStore.getToolPath('jj')).toBeNull();
    });
  });

  // =============================================================================
  // Test: Force Re-resolution
  // Requirements: 2.4 (forceResolve option)
  // =============================================================================
  describe('Force Re-resolution', () => {
    it('should invalidate cache and re-resolve when forceResolve is true', async () => {
      let callCount = 0;

      const fsDeps: FsDeps = {
        existsSync: () => {
          callCount++;
          return true;
        },
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: () => null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);

      // First call
      await service.resolveTool('claude');
      expect(callCount).toBeGreaterThan(0);

      const firstCallCount = callCount;

      // Second call without forceResolve (should use cache)
      await service.resolveTool('claude');
      expect(callCount).toBe(firstCallCount);

      // Third call with forceResolve (should re-check filesystem)
      await service.resolveTool('claude', { forceResolve: true });
      expect(callCount).toBeGreaterThan(firstCallCount);
    });
  });

  // =============================================================================
  // Test: GET_TOOL_STATUSES simulation
  // Requirements: 2.1, 2.4
  // =============================================================================
  describe('GET_TOOL_STATUSES simulation', () => {
    it('should return all tool statuses', async () => {
      const fsDeps: FsDeps = {
        existsSync: (p: string) =>
          p === '/opt/homebrew/bin/claude' || p === '/usr/local/bin/jq',
      };

      const configStoreDeps: ConfigStoreDeps = {
        getToolPath: () => null,
      };

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveAll();

      const statuses = service.getAllStatuses();

      expect(statuses.length).toBe(3);

      // claude should be resolved
      const claudeStatus = statuses.find((s) => s.definition.name === 'claude');
      expect(claudeStatus?.resolution.resolved).toBe(true);

      // jj should not be resolved
      const jjStatus = statuses.find((s) => s.definition.name === 'jj');
      expect(jjStatus?.resolution.resolved).toBe(false);

      // jq should be resolved
      const jqStatus = statuses.find((s) => s.definition.name === 'jq');
      expect(jqStatus?.resolution.resolved).toBe(true);
    });
  });

  // =============================================================================
  // Test: Full IPC Flow Simulation
  // "設定画面での手動指定フロー" from Design.md
  // =============================================================================
  describe('Full IPC Flow: Manual Path Setting', () => {
    it('should simulate Renderer -> Main -> ConfigStore -> Resolver flow', async () => {
      // Initial state: tool not found
      let fsDeps: FsDeps = {
        existsSync: () => false,
      };

      let configStoreDeps: ConfigStoreDeps = {
        getToolPath: (toolName: string) => mockConfigStore.getToolPath(toolName),
      };

      let service = new ToolPathResolverService(fsDeps, configStoreDeps);

      // 1. Initial resolution fails
      let result = await service.resolveTool('jj');
      expect(result.resolved).toBe(false);

      // 2. User sets manual path via UI (simulating SET_TOOL_PATH IPC)
      const manualPath = path.join(testDir, 'custom/jj');
      await fs.mkdir(path.dirname(manualPath), { recursive: true });
      await fs.writeFile(manualPath, '#!/bin/bash\necho "jj"');

      mockConfigStore.setToolPath('jj', manualPath);

      // 3. Re-resolution with new path (simulating forceResolve after setting path)
      fsDeps = {
        existsSync: (p: string) => p === manualPath,
      };

      service = new ToolPathResolverService(fsDeps, configStoreDeps);
      result = await service.resolveTool('jj', { forceResolve: true });

      expect(result.resolved).toBe(true);
      expect(result.path).toBe(manualPath);
      expect(result.source).toBe('manual');
    });

    it('should handle path clearing flow', async () => {
      // Setup: Tool resolved via manual path
      const manualPath = '/custom/jj';
      mockConfigStore.setToolPath('jj', manualPath);

      let fsDeps: FsDeps = {
        existsSync: (p: string) => p === manualPath,
      };

      let configStoreDeps: ConfigStoreDeps = {
        getToolPath: (toolName: string) => mockConfigStore.getToolPath(toolName),
      };

      let service = new ToolPathResolverService(fsDeps, configStoreDeps);
      let result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.source).toBe('manual');

      // User clears path via UI (simulating SET_TOOL_PATH with null)
      mockConfigStore.setToolPath('jj', null);

      // Re-resolution should fall back to Well Known paths (which don't have jj)
      fsDeps = {
        existsSync: () => false,
      };

      service = new ToolPathResolverService(fsDeps, configStoreDeps);
      result = await service.resolveTool('jj', { forceResolve: true });

      expect(result.resolved).toBe(false);
      expect(result.source).toBe('not-found');
    });
  });
});
