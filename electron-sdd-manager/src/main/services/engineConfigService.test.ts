/**
 * Engine Config Service Tests
 * Requirements: 4.1-4.4, 5.1-5.3, 7.1-7.4
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type EngineConfigPhase,
  type EngineConfig,
  EngineConfigSchema,
  engineConfigService,
} from './engineConfigService';
import { getLLMEngine, type LLMEngineId } from '../../shared/registry/llmEngineRegistry';

// Mock fs/promises
vi.mock('fs/promises');
const mockReadFile = fs.readFile as Mock;
const mockWriteFile = fs.writeFile as Mock;
const mockMkdir = fs.mkdir as Mock;

// Mock path.join to work properly
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
  };
});

describe('EngineConfigService', () => {
  const testProjectPath = '/test/project';
  const configFilePath = `${testProjectPath}/.kiro/sdd-orchestrator.json`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  // ============================================================
  // Task 2.1: EngineConfig Schema Tests
  // Requirement: 4.2
  // ============================================================

  describe('EngineConfigSchema', () => {
    it('should validate valid engine config', () => {
      const config: EngineConfig = {
        default: 'claude',
        plan: 'claude',
        requirements: 'gemini',
      };
      const result = EngineConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept empty config', () => {
      const config = {};
      const result = EngineConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept all phase fields', () => {
      const config: EngineConfig = {
        default: 'claude',
        plan: 'claude',
        requirements: 'claude',
        design: 'gemini',
        tasks: 'gemini',
        'document-review': 'claude',
        'document-review-reply': 'claude',
        inspection: 'gemini',
        impl: 'claude',
      };
      const result = EngineConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid engine ID', () => {
      const config = {
        default: 'invalid-engine',
      };
      const result = EngineConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Task 2.2 & 2.3: loadEngineConfig / saveEngineConfig
  // Requirements: 4.1
  // ============================================================

  describe('loadEngineConfig', () => {
    it('should load engine config from sdd-orchestrator.json', async () => {
      const mockConfig = {
        version: 3,
        settings: {
          engineConfig: {
            default: 'claude',
            plan: 'gemini',
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const config = await engineConfigService.loadEngineConfig(testProjectPath);
      expect(config).toEqual({
        default: 'claude',
        plan: 'gemini',
      });
    });

    it('should return empty config when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const config = await engineConfigService.loadEngineConfig(testProjectPath);
      expect(config).toEqual({});
    });

    it('should return empty config when settings.engineConfig is not present', async () => {
      const mockConfig = {
        version: 3,
        settings: {
          skipPermissions: true,
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const config = await engineConfigService.loadEngineConfig(testProjectPath);
      expect(config).toEqual({});
    });
  });

  describe('saveEngineConfig', () => {
    it('should save engine config to sdd-orchestrator.json', async () => {
      const existingConfig = {
        version: 3,
        settings: {
          skipPermissions: true,
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      const engineConfig: EngineConfig = {
        default: 'claude',
        plan: 'gemini',
      };
      await engineConfigService.saveEngineConfig(testProjectPath, engineConfig);

      expect(mockWriteFile).toHaveBeenCalledWith(
        configFilePath,
        expect.stringContaining('"engineConfig"'),
        'utf-8'
      );
    });

    it('should preserve existing settings when saving', async () => {
      const existingConfig = {
        version: 3,
        settings: {
          skipPermissions: true,
        },
        layout: { leftPaneWidth: 300 },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await engineConfigService.saveEngineConfig(testProjectPath, { default: 'gemini' });

      const writeCall = mockWriteFile.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1] as string);
      expect(savedConfig.settings.skipPermissions).toBe(true);
      expect(savedConfig.layout.leftPaneWidth).toBe(300);
    });
  });

  // ============================================================
  // Task 2.3: resolveEngine
  // Requirements: 4.3, 4.4, 5.2, 5.3, 7.1
  // ============================================================

  describe('resolveEngine', () => {
    const testSpecId = 'my-feature';
    const specPath = `${testProjectPath}/.kiro/specs/${testSpecId}`;

    it('should use spec.json engineOverride when specified (Req 5.2)', async () => {
      // spec.json with engineOverride
      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('spec.json')) {
          return JSON.stringify({
            feature_name: testSpecId,
            engineOverride: {
              requirements: 'gemini',
            },
          });
        }
        // sdd-orchestrator.json
        return JSON.stringify({
          version: 3,
          settings: {
            engineConfig: {
              default: 'claude',
              requirements: 'claude',
            },
          },
        });
      });

      const engine = await engineConfigService.resolveEngine(
        testProjectPath,
        testSpecId,
        'requirements'
      );
      expect(engine.id).toBe('gemini');
    });

    it('should use project engineConfig when no spec override (Req 5.3)', async () => {
      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('spec.json')) {
          return JSON.stringify({
            feature_name: testSpecId,
            // No engineOverride
          });
        }
        return JSON.stringify({
          version: 3,
          settings: {
            engineConfig: {
              default: 'claude',
              requirements: 'gemini',
            },
          },
        });
      });

      const engine = await engineConfigService.resolveEngine(
        testProjectPath,
        testSpecId,
        'requirements'
      );
      expect(engine.id).toBe('gemini');
    });

    it('should fallback to default when phase not configured (Req 4.3)', async () => {
      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('spec.json')) {
          return JSON.stringify({ feature_name: testSpecId });
        }
        return JSON.stringify({
          version: 3,
          settings: {
            engineConfig: {
              default: 'gemini',
              // requirements not configured
            },
          },
        });
      });

      const engine = await engineConfigService.resolveEngine(
        testProjectPath,
        testSpecId,
        'requirements'
      );
      expect(engine.id).toBe('gemini');
    });

    it('should fallback to claude when no config exists (Req 4.4)', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const engine = await engineConfigService.resolveEngine(
        testProjectPath,
        testSpecId,
        'requirements'
      );
      expect(engine.id).toBe('claude');
    });

    it('should handle spec.json read error gracefully', async () => {
      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('spec.json')) {
          throw new Error('Read error');
        }
        return JSON.stringify({
          version: 3,
          settings: {
            engineConfig: {
              default: 'gemini',
            },
          },
        });
      });

      const engine = await engineConfigService.resolveEngine(
        testProjectPath,
        testSpecId,
        'requirements'
      );
      // Should still work using project config
      expect(engine.id).toBe('gemini');
    });

    it('should resolve for all phase types', async () => {
      const phases: EngineConfigPhase[] = [
        'plan',
        'requirements',
        'design',
        'tasks',
        'document-review',
        'document-review-reply',
        'inspection',
        'impl',
      ];

      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('spec.json')) {
          return JSON.stringify({ feature_name: testSpecId });
        }
        return JSON.stringify({
          version: 3,
          settings: {
            engineConfig: {
              default: 'claude',
            },
          },
        });
      });

      for (const phase of phases) {
        const engine = await engineConfigService.resolveEngine(
          testProjectPath,
          testSpecId,
          phase
        );
        expect(engine).toBeDefined();
        expect(engine.id).toBe('claude');
      }
    });
  });

  // ============================================================
  // Task 2.4: spec.json engineOverride type
  // Requirement: 5.1
  // ============================================================

  describe('SpecJson engineOverride support', () => {
    it('should read engineOverride from spec.json', async () => {
      const specJson = {
        feature_name: 'test-feature',
        engineOverride: {
          plan: 'gemini',
          requirements: 'gemini',
          design: 'claude',
        },
      };
      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('spec.json')) {
          return JSON.stringify(specJson);
        }
        return JSON.stringify({ version: 3, settings: {} });
      });

      const engine = await engineConfigService.resolveEngine(
        testProjectPath,
        'test-feature',
        'plan'
      );
      expect(engine.id).toBe('gemini');
    });
  });
});
