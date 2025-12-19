/**
 * Layout Config Service Integration Tests
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 5.1, 5.2
 *
 * 実際のファイルシステムを使用した統合テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  layoutConfigService,
  DEFAULT_LAYOUT,
  LayoutConfigSchema,
  type LayoutValues,
} from './layoutConfigService';

describe('layoutConfigService integration tests', () => {
  let testProjectPath: string;
  let kiroDir: string;
  let configFilePath: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testProjectPath = await fs.mkdtemp(path.join(tmpdir(), 'layout-test-'));
    kiroDir = path.join(testProjectPath, '.kiro');
    configFilePath = path.join(kiroDir, 'sdd-orchestrator.json');

    // Create .kiro directory
    await fs.mkdir(kiroDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('saveLayoutConfig', () => {
    it('設定ファイルを正しいJSON形式で生成する', async () => {
      const layout: LayoutValues = {
        leftPaneWidth: 350,
        rightPaneWidth: 400,
        bottomPaneHeight: 250,
        agentListHeight: 180,
      };

      await layoutConfigService.saveLayoutConfig(testProjectPath, layout);

      // ファイルが存在することを確認
      const stat = await fs.stat(configFilePath);
      expect(stat.isFile()).toBe(true);

      // ファイル内容を確認
      const content = await fs.readFile(configFilePath, 'utf-8');
      const data = JSON.parse(content);

      // スキーマで検証
      const result = LayoutConfigSchema.safeParse(data);
      expect(result.success).toBe(true);

      // 値が正しいことを確認
      expect(data.version).toBe(1);
      expect(data.layout).toEqual(layout);
    });

    it('.kiroディレクトリが存在しない場合は作成する', async () => {
      // .kiroディレクトリを削除
      await fs.rm(kiroDir, { recursive: true });

      const layout: LayoutValues = {
        leftPaneWidth: 300,
        rightPaneWidth: 350,
        bottomPaneHeight: 200,
        agentListHeight: 150,
      };

      await layoutConfigService.saveLayoutConfig(testProjectPath, layout);

      // ファイルが存在することを確認
      const exists = await fs.stat(configFilePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('既存の設定ファイルを上書きする', async () => {
      // 初回保存
      const layout1: LayoutValues = {
        leftPaneWidth: 300,
        rightPaneWidth: 350,
        bottomPaneHeight: 200,
        agentListHeight: 150,
      };
      await layoutConfigService.saveLayoutConfig(testProjectPath, layout1);

      // 2回目の保存（上書き）
      const layout2: LayoutValues = {
        leftPaneWidth: 400,
        rightPaneWidth: 450,
        bottomPaneHeight: 300,
        agentListHeight: 200,
      };
      await layoutConfigService.saveLayoutConfig(testProjectPath, layout2);

      // 読み込んで確認
      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);
      expect(loaded).toEqual(layout2);
    });
  });

  describe('loadLayoutConfig', () => {
    it('保存した設定を正しく復元する', async () => {
      const layout: LayoutValues = {
        leftPaneWidth: 320,
        rightPaneWidth: 380,
        bottomPaneHeight: 220,
        agentListHeight: 170,
      };

      await layoutConfigService.saveLayoutConfig(testProjectPath, layout);
      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);

      expect(loaded).toEqual(layout);
    });

    it('設定ファイルが存在しない場合はnullを返す', async () => {
      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);
      expect(loaded).toBeNull();
    });

    it('不正なJSONの場合はnullを返す', async () => {
      await fs.writeFile(configFilePath, 'not valid json', 'utf-8');

      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);
      expect(loaded).toBeNull();
    });

    it('スキーマに合致しないJSONの場合はnullを返す', async () => {
      const invalidConfig = {
        version: 2, // Invalid version
        layout: {
          leftPaneWidth: 300,
        },
      };
      await fs.writeFile(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);
      expect(loaded).toBeNull();
    });

    it('負の数値を含む設定の場合はnullを返す', async () => {
      const invalidConfig = {
        version: 1,
        layout: {
          leftPaneWidth: -100, // Invalid: negative
          rightPaneWidth: 320,
          bottomPaneHeight: 192,
          agentListHeight: 160,
        },
      };
      await fs.writeFile(configFilePath, JSON.stringify(invalidConfig), 'utf-8');

      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);
      expect(loaded).toBeNull();
    });
  });

  describe('resetLayoutConfig', () => {
    it('デフォルト値で設定ファイルを上書きする', async () => {
      // まず別の値で保存
      const customLayout: LayoutValues = {
        leftPaneWidth: 500,
        rightPaneWidth: 600,
        bottomPaneHeight: 400,
        agentListHeight: 300,
      };
      await layoutConfigService.saveLayoutConfig(testProjectPath, customLayout);

      // リセット
      await layoutConfigService.resetLayoutConfig(testProjectPath);

      // デフォルト値で上書きされていることを確認
      const loaded = await layoutConfigService.loadLayoutConfig(testProjectPath);
      expect(loaded).toEqual(DEFAULT_LAYOUT);
    });
  });

  describe('getDefaultLayout', () => {
    it('デフォルト値を返す', () => {
      const defaultLayout = layoutConfigService.getDefaultLayout();
      expect(defaultLayout).toEqual(DEFAULT_LAYOUT);
    });

    it('返されたオブジェクトを変更しても元のデフォルト値に影響しない', () => {
      const layout1 = layoutConfigService.getDefaultLayout();
      layout1.leftPaneWidth = 999;

      const layout2 = layoutConfigService.getDefaultLayout();
      expect(layout2.leftPaneWidth).toBe(DEFAULT_LAYOUT.leftPaneWidth);
    });
  });

  describe('エラーハンドリング', () => {
    it('保存時のエラーでアプリがクラッシュしない', async () => {
      // 読み取り専用ディレクトリを作成
      const readonlyDir = path.join(testProjectPath, 'readonly');
      await fs.mkdir(readonlyDir, { recursive: true });
      const readonlyKiro = path.join(readonlyDir, '.kiro');
      await fs.mkdir(readonlyKiro, { recursive: true });

      // 権限を変更（読み取り専用）
      await fs.chmod(readonlyKiro, 0o444);

      const layout: LayoutValues = {
        leftPaneWidth: 300,
        rightPaneWidth: 350,
        bottomPaneHeight: 200,
        agentListHeight: 150,
      };

      // エラーが発生しても例外を投げない
      await expect(
        layoutConfigService.saveLayoutConfig(readonlyDir, layout)
      ).resolves.not.toThrow();

      // 後始末：権限を元に戻す
      await fs.chmod(readonlyKiro, 0o755);
    });

    it('読み込み時のエラーでアプリがクラッシュしない', async () => {
      // 存在しないプロジェクトパスでも例外を投げない
      const nonExistentPath = path.join(testProjectPath, 'non-existent');

      await expect(
        layoutConfigService.loadLayoutConfig(nonExistentPath)
      ).resolves.not.toThrow();

      const result = await layoutConfigService.loadLayoutConfig(nonExistentPath);
      expect(result).toBeNull();
    });
  });
});
