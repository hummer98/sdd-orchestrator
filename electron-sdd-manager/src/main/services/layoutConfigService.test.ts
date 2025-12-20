/**
 * Layout Config Service Tests
 * Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2, 4.1-4.4, 5.1-5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  LayoutConfigSchema,
  LayoutValuesSchema,
  DEFAULT_LAYOUT,
  layoutConfigService,
  type LayoutValues,
} from './layoutConfigService';

// Mock fs/promises
vi.mock('fs/promises');

const mockFs = vi.mocked(fs);

describe('layoutConfigService', () => {
  const testProjectPath = '/test/project';
  const configFilePath = path.join(testProjectPath, '.kiro', 'sdd-orchestrator.json');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Zodスキーマ (Task 1.1)', () => {
    describe('LayoutValuesSchema', () => {
      it('有効なレイアウト値を検証できる', () => {
        const validLayout = {
          leftPaneWidth: 288,
          rightPaneWidth: 320,
          bottomPaneHeight: 192,
          agentListHeight: 160,
        };
        const result = LayoutValuesSchema.safeParse(validLayout);
        expect(result.success).toBe(true);
      });

      it('0以上の数値を許可する', () => {
        const layout = {
          leftPaneWidth: 0,
          rightPaneWidth: 0,
          bottomPaneHeight: 0,
          agentListHeight: 0,
        };
        const result = LayoutValuesSchema.safeParse(layout);
        expect(result.success).toBe(true);
      });

      it('負の数値を拒否する', () => {
        const layout = {
          leftPaneWidth: -1,
          rightPaneWidth: 320,
          bottomPaneHeight: 192,
          agentListHeight: 160,
        };
        const result = LayoutValuesSchema.safeParse(layout);
        expect(result.success).toBe(false);
      });

      it('必須フィールドが欠けている場合は拒否する', () => {
        const layout = {
          leftPaneWidth: 288,
          // rightPaneWidth missing
        };
        const result = LayoutValuesSchema.safeParse(layout);
        expect(result.success).toBe(false);
      });
    });

    describe('LayoutConfigSchema', () => {
      it('有効な設定を検証できる', () => {
        const config = {
          version: 1,
          layout: {
            leftPaneWidth: 288,
            rightPaneWidth: 320,
            bottomPaneHeight: 192,
            agentListHeight: 160,
          },
        };
        const result = LayoutConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('version 1のみを許可する', () => {
        const config = {
          version: 2,
          layout: {
            leftPaneWidth: 288,
            rightPaneWidth: 320,
            bottomPaneHeight: 192,
            agentListHeight: 160,
          },
        };
        const result = LayoutConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });

      it('layoutオブジェクトが必須', () => {
        const config = {
          version: 1,
        };
        const result = LayoutConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('DEFAULT_LAYOUT (Task 1.1)', () => {
    it('デフォルト値が定義されている', () => {
      expect(DEFAULT_LAYOUT).toBeDefined();
      expect(DEFAULT_LAYOUT.leftPaneWidth).toBe(288);
      expect(DEFAULT_LAYOUT.rightPaneWidth).toBe(320);
      expect(DEFAULT_LAYOUT.bottomPaneHeight).toBe(192);
      expect(DEFAULT_LAYOUT.agentListHeight).toBe(160);
    });

    it('globalAgentPanelHeightのデフォルト値が120pxで定義されている', () => {
      expect(DEFAULT_LAYOUT.globalAgentPanelHeight).toBe(120);
    });

    it('デフォルト値がスキーマで検証可能', () => {
      const result = LayoutValuesSchema.safeParse(DEFAULT_LAYOUT);
      expect(result.success).toBe(true);
    });
  });

  describe('globalAgentPanelHeight (global-agent-panel-always-visible feature)', () => {
    it('globalAgentPanelHeightを含む設定を検証できる', () => {
      const validLayout = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
        globalAgentPanelHeight: 120,
      };
      const result = LayoutValuesSchema.safeParse(validLayout);
      expect(result.success).toBe(true);
    });

    it('globalAgentPanelHeightがない場合も後方互換で検証できる（optional）', () => {
      const layoutWithoutGlobalAgentPanel = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
      };
      const result = LayoutValuesSchema.safeParse(layoutWithoutGlobalAgentPanel);
      expect(result.success).toBe(true);
    });

    it('globalAgentPanelHeightが負の場合は拒否する', () => {
      const layout = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
        globalAgentPanelHeight: -10,
      };
      const result = LayoutValuesSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });
  });

  describe('getDefaultLayout (Task 1.1)', () => {
    it('デフォルトのレイアウト値を返す', () => {
      const layout = layoutConfigService.getDefaultLayout();
      expect(layout).toEqual(DEFAULT_LAYOUT);
    });
  });

  describe('loadLayoutConfig (Task 1.2)', () => {
    it('設定ファイルが存在する場合は読み込んで返す', async () => {
      const savedConfig = {
        version: 1,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedConfig));

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(savedConfig.layout);
      expect(mockFs.readFile).toHaveBeenCalledWith(configFilePath, 'utf-8');
    });

    it('設定ファイルが存在しない場合はnullを返す (ENOENT)', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
    });

    it('JSONパースエラーの場合はnullを返しログを記録', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('バリデーション失敗の場合はnullを返しログを記録', async () => {
      const invalidConfig = {
        version: 1,
        layout: {
          leftPaneWidth: -100, // Invalid: negative value
          rightPaneWidth: 320,
          bottomPaneHeight: 192,
          agentListHeight: 160,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('その他のエラーの場合はnullを返しログを記録', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('saveLayoutConfig (Task 1.2)', () => {
    it('設定をJSON形式で保存する', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      const layout: LayoutValues = {
        leftPaneWidth: 350,
        rightPaneWidth: 400,
        bottomPaneHeight: 250,
        agentListHeight: 180,
      };

      await layoutConfigService.saveLayoutConfig(testProjectPath, layout);

      const expectedConfig = {
        version: 1,
        layout,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });

    it('ディレクトリが存在しない場合は作成する', async () => {
      const mkdirError = new Error('ENOENT') as NodeJS.ErrnoException;
      mkdirError.code = 'ENOENT';
      mockFs.writeFile.mockRejectedValueOnce(mkdirError);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const layout: LayoutValues = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
      };

      await layoutConfigService.saveLayoutConfig(testProjectPath, layout);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testProjectPath, '.kiro'),
        { recursive: true }
      );
    });

    it('エラー発生時はログを記録して例外を投げない', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const layout: LayoutValues = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
      };

      // Should not throw
      await expect(
        layoutConfigService.saveLayoutConfig(testProjectPath, layout)
      ).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('resetLayoutConfig (Task 1.2)', () => {
    it('デフォルト値で設定ファイルを上書きする', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await layoutConfigService.resetLayoutConfig(testProjectPath);

      const expectedConfig = {
        version: 1,
        layout: DEFAULT_LAYOUT,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });
  });

  describe('後方互換性テスト (global-agent-panel-always-visible feature)', () => {
    it('globalAgentPanelHeightがない古い設定ファイルを読み込める', async () => {
      const oldConfig = {
        version: 1,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
          // globalAgentPanelHeight is missing
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(oldConfig));

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(oldConfig.layout);
      // globalAgentPanelHeightはundefinedだが、Renderer側でデフォルト値にフォールバック
      expect(result?.globalAgentPanelHeight).toBeUndefined();
    });

    it('globalAgentPanelHeightがある新しい設定ファイルを読み込める', async () => {
      const newConfig = {
        version: 1,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
          globalAgentPanelHeight: 140,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(newConfig));

      const result = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(newConfig.layout);
      expect(result?.globalAgentPanelHeight).toBe(140);
    });

    it('globalAgentPanelHeightを含む設定を保存できる', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      const layout: LayoutValues = {
        leftPaneWidth: 350,
        rightPaneWidth: 400,
        bottomPaneHeight: 250,
        agentListHeight: 180,
        globalAgentPanelHeight: 150,
      };

      await layoutConfigService.saveLayoutConfig(testProjectPath, layout);

      const expectedConfig = {
        version: 1,
        layout,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });
  });
});
