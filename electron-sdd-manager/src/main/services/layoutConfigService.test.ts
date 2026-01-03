/**
 * Project Config Service Tests
 * Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2, 4.1-4.4, 5.1-5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  LayoutConfigSchemaV1,
  ProjectConfigSchema,
  ProjectConfigSchemaV3,
  CommandsetVersionRecordSchema,
  ProfileConfigSchema,
  LayoutValuesSchema,
  DEFAULT_LAYOUT,
  projectConfigService,
  layoutConfigService,
  type LayoutValues,
  type ProfileConfig,
  type CommandsetVersionRecord,
} from './layoutConfigService';

// Mock fs/promises
vi.mock('fs/promises');

const mockFs = vi.mocked(fs);

describe('projectConfigService', () => {
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

    describe('ProfileConfigSchema', () => {
      it('有効なプロファイル設定を検証できる', () => {
        const config = {
          name: 'cc-sdd-agent',
          installedAt: '2024-01-01T00:00:00.000Z',
        };
        const result = ProfileConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('無効なプロファイル名を拒否する', () => {
        const config = {
          name: 'invalid-profile',
          installedAt: '2024-01-01T00:00:00.000Z',
        };
        const result = ProfileConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    describe('ProjectConfigSchema (version 2)', () => {
      it('有効な設定を検証できる', () => {
        const config = {
          version: 2,
          profile: {
            name: 'cc-sdd-agent',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
          layout: {
            leftPaneWidth: 288,
            rightPaneWidth: 320,
            bottomPaneHeight: 192,
            agentListHeight: 160,
          },
        };
        const result = ProjectConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('profileとlayoutはoptional', () => {
        const config = {
          version: 2,
        };
        const result = ProjectConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('version 2のみを許可する', () => {
        const config = {
          version: 1,
          layout: {
            leftPaneWidth: 288,
            rightPaneWidth: 320,
            bottomPaneHeight: 192,
            agentListHeight: 160,
          },
        };
        const result = ProjectConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    describe('LayoutConfigSchemaV1 (後方互換)', () => {
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
        const result = LayoutConfigSchemaV1.safeParse(config);
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
        const result = LayoutConfigSchemaV1.safeParse(config);
        expect(result.success).toBe(false);
      });

      it('layoutオブジェクトが必須', () => {
        const config = {
          version: 1,
        };
        const result = LayoutConfigSchemaV1.safeParse(config);
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

    it('projectAgentPanelHeightのデフォルト値が120pxで定義されている', () => {
      expect(DEFAULT_LAYOUT.projectAgentPanelHeight).toBe(120);
    });

    it('デフォルト値がスキーマで検証可能', () => {
      const result = LayoutValuesSchema.safeParse(DEFAULT_LAYOUT);
      expect(result.success).toBe(true);
    });
  });

  describe('projectAgentPanelHeight (project-agent-panel-always-visible feature)', () => {
    it('projectAgentPanelHeightを含む設定を検証できる', () => {
      const validLayout = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
        projectAgentPanelHeight: 120,
      };
      const result = LayoutValuesSchema.safeParse(validLayout);
      expect(result.success).toBe(true);
    });

    it('projectAgentPanelHeightがない場合も後方互換で検証できる（optional）', () => {
      const layoutWithoutProjectAgentPanel = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
      };
      const result = LayoutValuesSchema.safeParse(layoutWithoutProjectAgentPanel);
      expect(result.success).toBe(true);
    });

    it('projectAgentPanelHeightが負の場合は拒否する', () => {
      const layout = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
        projectAgentPanelHeight: -10,
      };
      const result = LayoutValuesSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });

    it('globalAgentPanelHeight（旧名）も後方互換で受け入れる', () => {
      const layoutWithOldName = {
        leftPaneWidth: 288,
        rightPaneWidth: 320,
        bottomPaneHeight: 192,
        agentListHeight: 160,
        globalAgentPanelHeight: 120,
      };
      const result = LayoutValuesSchema.safeParse(layoutWithOldName);
      expect(result.success).toBe(true);
    });
  });

  describe('getDefaultLayout (Task 1.1)', () => {
    it('デフォルトのレイアウト値を返す', () => {
      const layout = projectConfigService.getDefaultLayout();
      expect(layout).toEqual(DEFAULT_LAYOUT);
    });
  });

  describe('loadProfile', () => {
    it('version 2の設定ファイルからプロファイルを読み込む', async () => {
      const savedConfig = {
        version: 2,
        profile: {
          name: 'cc-sdd-agent',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedConfig));

      const result = await projectConfigService.loadProfile(testProjectPath);

      expect(result).toEqual(savedConfig.profile);
    });

    it('プロファイルが存在しない場合はnullを返す', async () => {
      const savedConfig = {
        version: 2,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedConfig));

      const result = await projectConfigService.loadProfile(testProjectPath);

      expect(result).toBeNull();
    });

    it('設定ファイルが存在しない場合はnullを返す', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await projectConfigService.loadProfile(testProjectPath);

      expect(result).toBeNull();
    });
  });

  describe('saveProfile', () => {
    it('既存のlayoutを保持しながらプロファイルを保存する', async () => {
      const existingConfig = {
        version: 2,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockFs.writeFile.mockResolvedValue(undefined);

      const profile: ProfileConfig = {
        name: 'cc-sdd-agent',
        installedAt: '2024-01-01T00:00:00.000Z',
      };

      await projectConfigService.saveProfile(testProjectPath, profile);

      // v3 format is now used for all saves to preserve commandsets
      const expectedConfig = {
        version: 3,
        profile,
        layout: existingConfig.layout,
        commandsets: undefined,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });

    it('ファイルが存在しない場合も保存できる', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);
      mockFs.writeFile.mockResolvedValue(undefined);

      const profile: ProfileConfig = {
        name: 'cc-sdd',
        installedAt: '2024-01-01T00:00:00.000Z',
      };

      await projectConfigService.saveProfile(testProjectPath, profile);

      // v3 format is now used for all saves
      const expectedConfig = {
        version: 3,
        profile,
        layout: undefined,
        commandsets: undefined,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });
  });

  describe('loadLayoutConfig (Task 1.2)', () => {
    it('version 2の設定ファイルから読み込んで返す', async () => {
      const savedConfig = {
        version: 2,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(savedConfig));

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(savedConfig.layout);
      expect(mockFs.readFile).toHaveBeenCalledWith(configFilePath, 'utf-8');
    });

    it('version 1の設定ファイルをマイグレーションして読み込む', async () => {
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

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(savedConfig.layout);
    });

    it('設定ファイルが存在しない場合はnullを返す (ENOENT)', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
    });

    it('JSONパースエラーの場合はnullを返しログを記録', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('その他のエラーの場合はnullを返しログを記録', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('saveLayoutConfig (Task 1.2)', () => {
    it('既存のprofileを保持しながらレイアウトを保存する', async () => {
      const existingConfig = {
        version: 2,
        profile: {
          name: 'cc-sdd-agent',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockFs.writeFile.mockResolvedValue(undefined);

      const layout: LayoutValues = {
        leftPaneWidth: 350,
        rightPaneWidth: 400,
        bottomPaneHeight: 250,
        agentListHeight: 180,
      };

      await projectConfigService.saveLayoutConfig(testProjectPath, layout);

      // v3 format is now used for all saves to preserve commandsets
      const expectedConfig = {
        version: 3,
        profile: existingConfig.profile,
        layout,
        commandsets: undefined,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });

    it('ディレクトリが存在しない場合は作成する', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

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

      await projectConfigService.saveLayoutConfig(testProjectPath, layout);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testProjectPath, '.kiro'),
        { recursive: true }
      );
    });

    it('エラー発生時はログを記録して例外を投げない', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);
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
        projectConfigService.saveLayoutConfig(testProjectPath, layout)
      ).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('resetLayoutConfig (Task 1.2)', () => {
    it('デフォルト値で設定ファイルを上書きする', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);
      mockFs.writeFile.mockResolvedValue(undefined);

      await projectConfigService.resetLayoutConfig(testProjectPath);

      // v3 format is now used for all saves
      const expectedConfig = {
        version: 3,
        profile: undefined,
        layout: DEFAULT_LAYOUT,
        commandsets: undefined,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });
  });

  describe('layoutConfigService (後方互換エイリアス)', () => {
    it('projectConfigServiceと同じオブジェクト', () => {
      expect(layoutConfigService).toBe(projectConfigService);
    });
  });

  // ============================================================
  // Task 1.1: v3スキーマ定義テスト (commandset-version-detection feature)
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================

  describe('CommandsetVersionRecordSchema (Task 1.1)', () => {
    it('有効なバージョン記録を検証できる', () => {
      const record = {
        version: '1.0.0',
        installedAt: '2024-01-01T00:00:00.000Z',
      };
      const result = CommandsetVersionRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('セマンティックバージョン形式を要求する', () => {
      const record = {
        version: 'invalid-version',
        installedAt: '2024-01-01T00:00:00.000Z',
      };
      const result = CommandsetVersionRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('プレリリースサフィックスを許可する', () => {
      const record = {
        version: '1.0.0-beta.1',
        installedAt: '2024-01-01T00:00:00.000Z',
      };
      const result = CommandsetVersionRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('installedAtが必須', () => {
      const record = {
        version: '1.0.0',
      };
      const result = CommandsetVersionRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  describe('ProjectConfigSchemaV3 (Task 1.1)', () => {
    it('有効なv3設定を検証できる', () => {
      const config = {
        version: 3,
        profile: {
          name: 'cc-sdd-agent',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
        layout: {
          leftPaneWidth: 288,
          rightPaneWidth: 320,
          bottomPaneHeight: 192,
          agentListHeight: 160,
        },
        commandsets: {
          'cc-sdd': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
          'bug': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      const result = ProjectConfigSchemaV3.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('commandsetsフィールドはオプショナル', () => {
      const config = {
        version: 3,
        profile: {
          name: 'cc-sdd',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      };
      const result = ProjectConfigSchemaV3.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('profile/layoutもオプショナル', () => {
      const config = {
        version: 3,
        commandsets: {
          'spec-manager': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      const result = ProjectConfigSchemaV3.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('version 3のみを許可する', () => {
      const config = {
        version: 2,
        commandsets: {},
      };
      const result = ProjectConfigSchemaV3.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('無効なコマンドセット名を拒否する', () => {
      const config = {
        version: 3,
        commandsets: {
          'invalid-commandset-name': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      const result = ProjectConfigSchemaV3.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Task 1.2: v2からv3へのマイグレーション処理テスト
  // Requirements: 6.3, 6.4
  // ============================================================

  describe('v2 to v3 migration (Task 1.2)', () => {
    it('v2設定ファイルを読み込んでも正常に動作する', async () => {
      const v2Config = {
        version: 2,
        profile: {
          name: 'cc-sdd',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(v2Config));

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(v2Config.layout);
    });

    it('v3設定ファイルを正常に読み込む', async () => {
      const v3Config = {
        version: 3,
        profile: {
          name: 'cc-sdd-agent',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
        commandsets: {
          'cc-sdd': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(v3Config));

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(v3Config.layout);
    });

    it('v3設定の保存時はversion: 3で書き込む', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);
      mockFs.writeFile.mockResolvedValue(undefined);

      const commandsets: Record<string, CommandsetVersionRecord> = {
        'cc-sdd': {
          version: '1.0.0',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      await projectConfigService.saveCommandsetVersions(testProjectPath, commandsets);

      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string);
      expect(savedContent.version).toBe(3);
      expect(savedContent.commandsets).toEqual(commandsets);
    });
  });

  // ============================================================
  // Task 1.3: loadCommandsetVersions/saveCommandsetVersionsメソッドテスト
  // Requirements: 1.1, 1.2, 1.3, 6.2
  // ============================================================

  describe('loadCommandsetVersions (Task 1.3)', () => {
    it('v3設定ファイルからcommandsetsフィールドを読み込む', async () => {
      const v3Config = {
        version: 3,
        commandsets: {
          'cc-sdd': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
          'bug': {
            version: '1.0.0',
            installedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(v3Config));

      const result = await projectConfigService.loadCommandsetVersions(testProjectPath);

      expect(result).toEqual(v3Config.commandsets);
    });

    it('v2設定ファイル（レガシー）の場合はundefinedを返す', async () => {
      const v2Config = {
        version: 2,
        profile: {
          name: 'cc-sdd',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(v2Config));

      const result = await projectConfigService.loadCommandsetVersions(testProjectPath);

      expect(result).toBeUndefined();
    });

    it('ファイルが存在しない場合はundefinedを返す', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await projectConfigService.loadCommandsetVersions(testProjectPath);

      expect(result).toBeUndefined();
    });
  });

  describe('saveCommandsetVersions (Task 1.3)', () => {
    it('既存のprofile/layoutを保持しながらcommandsetsを保存する', async () => {
      const existingConfig = {
        version: 2,
        profile: {
          name: 'cc-sdd-agent',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockFs.writeFile.mockResolvedValue(undefined);

      const commandsets: Record<string, CommandsetVersionRecord> = {
        'cc-sdd': {
          version: '1.0.0',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      await projectConfigService.saveCommandsetVersions(testProjectPath, commandsets);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string);
      expect(savedContent.version).toBe(3);
      expect(savedContent.profile).toEqual(existingConfig.profile);
      expect(savedContent.layout).toEqual(existingConfig.layout);
      expect(savedContent.commandsets).toEqual(commandsets);
    });

    it('既存のcommandsetsがある場合はマージする', async () => {
      const existingConfig = {
        version: 3,
        commandsets: {
          'bug': {
            version: '0.9.0',
            installedAt: '2023-12-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockFs.writeFile.mockResolvedValue(undefined);

      const newCommandsets: Record<string, CommandsetVersionRecord> = {
        'cc-sdd': {
          version: '1.0.0',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
        'bug': {
          version: '1.0.0',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      await projectConfigService.saveCommandsetVersions(testProjectPath, newCommandsets);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string);
      // bug should be updated, cc-sdd should be added
      expect(savedContent.commandsets['cc-sdd'].version).toBe('1.0.0');
      expect(savedContent.commandsets['bug'].version).toBe('1.0.0');
    });
  });

  describe('後方互換性テスト (project-agent-panel-always-visible feature)', () => {
    it('projectAgentPanelHeightがない古い設定ファイル(v1)を読み込める', async () => {
      const oldConfig = {
        version: 1,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
          // projectAgentPanelHeight is missing
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(oldConfig));

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(oldConfig.layout);
      // projectAgentPanelHeightはundefinedだが、Renderer側でデフォルト値にフォールバック
      expect(result?.projectAgentPanelHeight).toBeUndefined();
    });

    it('projectAgentPanelHeightがある設定ファイル(v2)を読み込める', async () => {
      const newConfig = {
        version: 2,
        layout: {
          leftPaneWidth: 350,
          rightPaneWidth: 400,
          bottomPaneHeight: 250,
          agentListHeight: 180,
          projectAgentPanelHeight: 140,
        },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(newConfig));

      const result = await projectConfigService.loadLayoutConfig(testProjectPath);

      expect(result).toEqual(newConfig.layout);
      expect(result?.projectAgentPanelHeight).toBe(140);
    });

    it('projectAgentPanelHeightを含む設定を保存できる', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);
      mockFs.writeFile.mockResolvedValue(undefined);

      const layout: LayoutValues = {
        leftPaneWidth: 350,
        rightPaneWidth: 400,
        bottomPaneHeight: 250,
        agentListHeight: 180,
        projectAgentPanelHeight: 150,
      };

      await projectConfigService.saveLayoutConfig(testProjectPath, layout);

      // v3 format is now used for all saves
      const expectedConfig = {
        version: 3,
        profile: undefined,
        layout,
        commandsets: undefined,
      };
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFilePath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });
  });
});
