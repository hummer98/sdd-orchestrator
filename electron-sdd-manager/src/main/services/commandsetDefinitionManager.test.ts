/**
 * CommandsetDefinitionManager Tests
 * TDD: コマンドセット定義のメタデータ管理のテスト
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
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
  CommandsetDefinitionManager,
  CommandsetDefinition,
} from './commandsetDefinitionManager';
import { CommandsetName } from './unifiedCommandsetInstaller';

describe('CommandsetDefinitionManager', () => {
  let manager: CommandsetDefinitionManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'commandset-def-test-'));
    manager = new CommandsetDefinitionManager();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getDefinition', () => {
    it('should return cc-sdd definition', () => {
      const definition = manager.getDefinition('cc-sdd');

      expect(definition.name).toBe('cc-sdd');
      expect(definition.category).toBe('workflow');
      expect(definition.version).toBeDefined();
      expect(definition.files.length).toBeGreaterThan(0);
    });

    it('should return bug definition', () => {
      const definition = manager.getDefinition('bug');

      expect(definition.name).toBe('bug');
      expect(definition.category).toBe('workflow');
      expect(definition.version).toBeDefined();
      expect(definition.files.length).toBeGreaterThan(0);
    });

    it('should return spec-manager definition', () => {
      const definition = manager.getDefinition('spec-manager');

      expect(definition.name).toBe('spec-manager');
      expect(definition.category).toBe('utility');
      expect(definition.version).toBeDefined();
    });

    it('should include description', () => {
      const definition = manager.getDefinition('cc-sdd');

      expect(definition.description).toBeDefined();
      expect(definition.description.length).toBeGreaterThan(0);
    });

    it('should include dependencies', () => {
      const definition = manager.getDefinition('cc-sdd');

      expect(definition.dependencies).toBeDefined();
      expect(Array.isArray(definition.dependencies)).toBe(true);
    });
  });

  describe('loadAllDefinitions', () => {
    it('should load all commandset definitions', async () => {
      const result = await manager.loadAllDefinitions();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBeGreaterThanOrEqual(2);
        expect(result.value.has('cc-sdd')).toBe(true);
        expect(result.value.has('bug')).toBe(true);
      }
    });

    it('should return all definitions in the map', async () => {
      const result = await manager.loadAllDefinitions();

      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const [name, definition] of result.value) {
          expect(definition.name).toBe(name);
        }
      }
    });
  });

  describe('validateDefinition', () => {
    it('should validate valid definition', () => {
      const definition: CommandsetDefinition = {
        name: 'cc-sdd',
        description: 'Test description',
        category: 'workflow',
        version: '1.0.0',
        files: ['file1.md', 'file2.md'],
        dependencies: [],
      };

      const result = manager.validateDefinition(definition);

      expect(result.ok).toBe(true);
    });

    it('should reject definition with empty name', () => {
      const definition: CommandsetDefinition = {
        name: '' as any,
        description: 'Test description',
        category: 'workflow',
        version: '1.0.0',
        files: ['file1.md'],
        dependencies: [],
      };

      const result = manager.validateDefinition(definition);

      expect(result.ok).toBe(false);
    });

    it('should reject definition with invalid version', () => {
      const definition: CommandsetDefinition = {
        name: 'cc-sdd',
        description: 'Test description',
        category: 'workflow',
        version: 'invalid',
        files: ['file1.md'],
        dependencies: [],
      };

      const result = manager.validateDefinition(definition);

      expect(result.ok).toBe(false);
    });

    it('should reject definition with empty files', () => {
      const definition: CommandsetDefinition = {
        name: 'cc-sdd',
        description: 'Test description',
        category: 'workflow',
        version: '1.0.0',
        files: [],
        dependencies: [],
      };

      const result = manager.validateDefinition(definition);

      expect(result.ok).toBe(false);
    });

    it('should reject definition with invalid category', () => {
      const definition: CommandsetDefinition = {
        name: 'cc-sdd',
        description: 'Test description',
        category: 'invalid' as any,
        version: '1.0.0',
        files: ['file1.md'],
        dependencies: [],
      };

      const result = manager.validateDefinition(definition);

      expect(result.ok).toBe(false);
    });
  });

  describe('file lists', () => {
    it('should include all cc-sdd command files', () => {
      const definition = manager.getDefinition('cc-sdd');
      const commandFiles = definition.files.filter(f => f.includes('commands/'));

      expect(commandFiles.length).toBeGreaterThan(10);
    });

    it('should include all cc-sdd agent files', () => {
      const definition = manager.getDefinition('cc-sdd');
      const agentFiles = definition.files.filter(f => f.includes('agents/'));

      expect(agentFiles.length).toBeGreaterThan(5);
    });

    it('should include all bug command files', () => {
      const definition = manager.getDefinition('bug');
      const commandFiles = definition.files.filter(f => f.includes('commands/'));

      expect(commandFiles.length).toBe(5);
    });
  });

  describe('version information', () => {
    it('should have semantic version format', () => {
      const definition = manager.getDefinition('cc-sdd');

      expect(definition.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
    });

    it('should have version for all definitions', async () => {
      const result = await manager.loadAllDefinitions();

      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const definition of result.value.values()) {
          expect(definition.version).toBeDefined();
          expect(definition.version.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
