/**
 * ToolPathResolverService Unit Tests
 * TDD: Testing Well Known path resolution (no shell spawn)
 * well-known-tool-paths feature
 * Requirements: 1.1-1.4, 2.4, 4.1-4.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ToolPathResolverService,
  TOOL_DEFINITIONS,
  WELL_KNOWN_PATHS,
  getToolPathResolverService,
  resetToolPathResolverService,
  type ToolDefinition,
  type ToolResolutionResult,
  type ToolStatus,
  type FsDeps,
  type ConfigStoreDeps,
} from './toolPathResolverService';

describe('ToolPathResolverService', () => {
  // Store original env
  const originalEnv = process.env;

  // Mock fs dependencies
  const createFsDeps = (existingPaths: string[] = []): FsDeps => ({
    existsSync: vi.fn((path: string) => existingPaths.includes(path)),
  });

  // Mock ConfigStore dependencies
  const createConfigStoreDeps = (toolPaths: Record<string, string | null> = {}): ConfigStoreDeps => ({
    getToolPath: vi.fn((toolName: string) => toolPaths[toolName] ?? null),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.E2E_MOCK_CLAUDE_COMMAND;
    delete process.env.E2E_MOCK_JJ_COMMAND;
    delete process.env.E2E_MOCK_JQ_COMMAND;
    // Reset singleton
    resetToolPathResolverService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================
  // WELL_KNOWN_PATHS constant
  // Requirements: 1.1
  // ============================================================

  describe('WELL_KNOWN_PATHS', () => {
    it('should define the correct well-known paths in order', () => {
      // Requirement 1.1: Check paths in order
      expect(WELL_KNOWN_PATHS).toContain('/opt/homebrew/bin');
      expect(WELL_KNOWN_PATHS).toContain('/usr/local/bin');
      expect(WELL_KNOWN_PATHS).toContain('/usr/bin');
      // $HOME/.local/bin should be expanded
      expect(WELL_KNOWN_PATHS.some((p) => p.includes('.local/bin'))).toBe(true);
    });

    it('should check /opt/homebrew/bin before /usr/local/bin', () => {
      const homebrewIndex = WELL_KNOWN_PATHS.indexOf('/opt/homebrew/bin');
      const usrLocalIndex = WELL_KNOWN_PATHS.indexOf('/usr/local/bin');
      expect(homebrewIndex).toBeLessThan(usrLocalIndex);
    });
  });

  // ============================================================
  // TOOL_DEFINITIONS constant
  // Requirements: 1.4
  // ============================================================

  describe('TOOL_DEFINITIONS', () => {
    it('should contain claude, jj, and jq tool definitions', () => {
      const toolNames = TOOL_DEFINITIONS.map((t) => t.name);
      expect(toolNames).toContain('claude');
      expect(toolNames).toContain('jj');
      expect(toolNames).toContain('jq');
    });

    it('should have required fields for each tool', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('required');
        expect(tool).toHaveProperty('versionCommand');
        expect(tool).toHaveProperty('installGuidance');
      }
    });

    it('should mark claude as required and jj/jq as not required', () => {
      const claudeTool = TOOL_DEFINITIONS.find((t) => t.name === 'claude');
      const jjTool = TOOL_DEFINITIONS.find((t) => t.name === 'jj');
      const jqTool = TOOL_DEFINITIONS.find((t) => t.name === 'jq');

      expect(claudeTool?.required).toBe(true);
      expect(jjTool?.required).toBe(false);
      expect(jqTool?.required).toBe(false);
    });
  });

  // ============================================================
  // resolveTool - Well Known path discovery
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  describe('resolveTool - Well Known paths', () => {
    it('should find tool in /opt/homebrew/bin first', async () => {
      // Requirement 1.1, 1.2: Check well-known paths in order
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude', '/usr/local/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/opt/homebrew/bin/claude');
      expect(result.source).toBe('well-known');
      // Requirement 1.3: No shell spawn - only fs.existsSync called
      expect(fsDeps.existsSync).toHaveBeenCalled();
    });

    it('should find tool in /usr/local/bin when not in /opt/homebrew/bin', async () => {
      const fsDeps = createFsDeps(['/usr/local/bin/jj']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/usr/local/bin/jj');
      expect(result.source).toBe('well-known');
    });

    it('should find tool in $HOME/.local/bin', async () => {
      const homeLocalBin = `${process.env.HOME}/.local/bin/jq`;
      const fsDeps = createFsDeps([homeLocalBin]);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('jq');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe(homeLocalBin);
      expect(result.source).toBe('well-known');
    });

    it('should find tool in /usr/bin as last resort', async () => {
      const fsDeps = createFsDeps(['/usr/bin/jq']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('jq');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/usr/bin/jq');
      expect(result.source).toBe('well-known');
    });

    it('should return not-found when tool is not in any well-known path', async () => {
      const fsDeps = createFsDeps([]); // No paths exist
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.source).toBe('not-found');
      expect(result.error).toBeDefined();
    });

    it('should NOT use shell spawn (fs.existsSync only)', async () => {
      // Requirement 1.3: No shell spawn
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveTool('claude');

      // fs.existsSync should have been called
      expect(fsDeps.existsSync).toHaveBeenCalled();
    });
  });

  // ============================================================
  // resolveTool - Manual path priority
  // Requirements: 2.4
  // ============================================================

  describe('resolveTool - Manual path priority', () => {
    it('should use manual path from ConfigStore when set', async () => {
      // Requirement 2.4: Manual path takes priority
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude', '/custom/path/claude']);
      const configStoreDeps = createConfigStoreDeps({ claude: '/custom/path/claude' });

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/custom/path/claude');
      expect(result.source).toBe('manual');
    });

    it('should return error when manual path does not exist', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']); // Manual path not in list
      const configStoreDeps = createConfigStoreDeps({ claude: '/nonexistent/path/claude' });

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(false);
      expect(result.source).toBe('manual');
      expect(result.error).toContain('Manual path does not exist');
    });

    it('should fallback to Well Known paths when manual path is null', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/jj']);
      const configStoreDeps = createConfigStoreDeps({ jj: null });

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/opt/homebrew/bin/jj');
      expect(result.source).toBe('well-known');
    });
  });

  // ============================================================
  // resolveTool - E2E Mock support
  // ============================================================

  describe('resolveTool - E2E Mock support', () => {
    it('should return E2E_MOCK_CLAUDE_COMMAND when set', async () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();
      process.env.E2E_MOCK_CLAUDE_COMMAND = '/mock/claude';

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('claude');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/mock/claude');
      // fs.existsSync should NOT be called when E2E mock is set
      expect(fsDeps.existsSync).not.toHaveBeenCalled();
    });

    it('should return E2E_MOCK_JJ_COMMAND when set', async () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();
      process.env.E2E_MOCK_JJ_COMMAND = '/mock/jj';

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/mock/jj');
    });
  });

  // ============================================================
  // resolveTool - forceResolve option
  // ============================================================

  describe('resolveTool - forceResolve', () => {
    it('should skip cache and re-resolve when forceResolve is true', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);

      // First call
      await service.resolveTool('claude');
      expect(fsDeps.existsSync).toHaveBeenCalledTimes(1);

      // Second call with forceResolve
      await service.resolveTool('claude', { forceResolve: true });
      // Should have called existsSync again
      expect(fsDeps.existsSync).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // Session cache
  // ============================================================

  describe('Session cache', () => {
    it('should cache the resolved path after first resolution', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);

      // First call
      const result1 = await service.resolveTool('claude');
      // Second call should use cache
      const result2 = await service.resolveTool('claude');

      expect(result1.resolved).toBe(true);
      expect(result2.resolved).toBe(true);
      expect(result1.path).toBe(result2.path);
      // existsSync should only be called once (cached)
      expect(fsDeps.existsSync).toHaveBeenCalledTimes(1);
    });

    it('should cache failure state as well', async () => {
      const fsDeps = createFsDeps([]); // No paths exist
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);

      // First call - fails
      const result1 = await service.resolveTool('claude');
      // Second call should return cached failure
      const result2 = await service.resolveTool('claude');

      expect(result1.resolved).toBe(false);
      expect(result2.resolved).toBe(false);
      // existsSync called for all well-known paths, but only once
      expect(fsDeps.existsSync).toHaveBeenCalledTimes(WELL_KNOWN_PATHS.length);
    });

    it('should return cached path via getPath immediately', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);

      await service.resolveTool('claude');
      const path = service.getPath('claude');

      expect(path).toBe('/opt/homebrew/bin/claude');
    });
  });

  // ============================================================
  // resolveAll
  // ============================================================

  describe('resolveAll', () => {
    it('should resolve all registered tools', async () => {
      const fsDeps = createFsDeps([
        '/opt/homebrew/bin/claude',
        '/opt/homebrew/bin/jj',
        '/usr/local/bin/jq',
      ]);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveAll();

      expect(service.isResolved('claude')).toBe(true);
      expect(service.isResolved('jj')).toBe(true);
      expect(service.isResolved('jq')).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveAll();

      expect(service.isResolved('claude')).toBe(true);
      expect(service.isResolved('jj')).toBe(false);
      expect(service.isResolved('jq')).toBe(false);
    });
  });

  // ============================================================
  // getPath
  // ============================================================

  describe('getPath', () => {
    it('should return cached path when resolved', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveTool('claude');
      const path = service.getPath('claude');

      expect(path).toBe('/opt/homebrew/bin/claude');
    });

    it('should return tool name when not resolved', () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const path = service.getPath('claude');

      expect(path).toBe('claude');
    });

    it('should return E2E mock path when environment variable is set', () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();
      process.env.E2E_MOCK_CLAUDE_COMMAND = '/mock/claude';

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const path = service.getPath('claude');

      expect(path).toBe('/mock/claude');
    });
  });

  // ============================================================
  // getDefinition, getStatus, getAllStatuses, isResolved
  // ============================================================

  describe('getDefinition', () => {
    it('should return definition for known tool', () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const definition = service.getDefinition('claude');

      expect(definition).toBeDefined();
      expect(definition!.name).toBe('claude');
      expect(definition!.required).toBe(true);
    });

    it('should return undefined for unknown tool', () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const definition = service.getDefinition('unknown');

      expect(definition).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return status combining definition and resolution', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveTool('claude');
      const status = service.getStatus('claude');

      expect(status).toBeDefined();
      expect(status!.definition.name).toBe('claude');
      expect(status!.resolution.resolved).toBe(true);
    });

    it('should return undefined for unknown tool', () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      const status = service.getStatus('unknown');

      expect(status).toBeUndefined();
    });
  });

  describe('getAllStatuses', () => {
    it('should return status for all defined tools', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveAll();
      const statuses = service.getAllStatuses();

      expect(statuses.length).toBe(TOOL_DEFINITIONS.length);
      for (const status of statuses) {
        expect(status.definition).toBeDefined();
        expect(status.resolution).toBeDefined();
      }
    });
  });

  describe('isResolved', () => {
    it('should return false before resolution', () => {
      const fsDeps = createFsDeps();
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);

      expect(service.isResolved('claude')).toBe(false);
    });

    it('should return true after successful resolution', async () => {
      const fsDeps = createFsDeps(['/opt/homebrew/bin/claude']);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveTool('claude');

      expect(service.isResolved('claude')).toBe(true);
    });

    it('should return false after failed resolution', async () => {
      const fsDeps = createFsDeps([]);
      const configStoreDeps = createConfigStoreDeps();

      const service = new ToolPathResolverService(fsDeps, configStoreDeps);
      await service.resolveTool('claude');

      expect(service.isResolved('claude')).toBe(false);
    });
  });

  // ============================================================
  // Singleton pattern
  // ============================================================

  describe('singleton pattern', () => {
    it('should return same instance when calling getToolPathResolverService', () => {
      const instance1 = getToolPathResolverService();
      const instance2 = getToolPathResolverService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getToolPathResolverService();
      resetToolPathResolverService();
      const instance2 = getToolPathResolverService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
