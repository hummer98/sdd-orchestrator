/**
 * Layout Config Service
 * プロジェクト固有のレイアウト設定をファイルシステムで管理
 * Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2, 4.1-4.4, 5.1-5.3
 */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * レイアウト値のスキーマ
 * 各ペインのサイズを0以上の数値として検証
 * globalAgentPanelHeightは後方互換のためoptional
 */
export const LayoutValuesSchema = z.object({
  leftPaneWidth: z.number().min(0),
  rightPaneWidth: z.number().min(0),
  bottomPaneHeight: z.number().min(0),
  agentListHeight: z.number().min(0),
  globalAgentPanelHeight: z.number().min(0).optional(),
});

export type LayoutValues = z.infer<typeof LayoutValuesSchema>;

/**
 * レイアウト設定ファイルのスキーマ
 * versionフィールドは将来のフォーマット変更に対応するため
 */
export const LayoutConfigSchema = z.object({
  version: z.literal(1),
  layout: LayoutValuesSchema,
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

/**
 * デフォルトのレイアウト値
 * App.tsxの現在の初期値と同一
 */
export const DEFAULT_LAYOUT: LayoutValues = {
  leftPaneWidth: 288,    // w-72 = 18rem = 288px
  rightPaneWidth: 320,   // w-80 = 20rem = 320px
  bottomPaneHeight: 192, // h-48 = 12rem = 192px
  agentListHeight: 160,  // Agent一覧パネルの高さ（右サイドバー）
  globalAgentPanelHeight: 120, // GlobalAgentPanelの高さ（左サイドバー）
};

/**
 * 設定ファイルのパスを構築
 */
function getConfigFilePath(projectPath: string): string {
  return path.join(projectPath, '.kiro', 'sdd-orchestrator.json');
}

/**
 * Layout Config Service
 * レイアウト設定のファイルI/Oを担当
 */
export const layoutConfigService = {
  /**
   * デフォルトのレイアウト値を取得
   */
  getDefaultLayout(): LayoutValues {
    return { ...DEFAULT_LAYOUT };
  },

  /**
   * レイアウト設定を読み込む
   * @param projectPath プロジェクトルートパス
   * @returns LayoutValues | null（ファイルが存在しない場合）
   */
  async loadLayoutConfig(projectPath: string): Promise<LayoutValues | null> {
    const configFilePath = getConfigFilePath(projectPath);

    try {
      const content = await fs.readFile(configFilePath, 'utf-8');
      const data = JSON.parse(content);
      const result = LayoutConfigSchema.safeParse(data);

      if (!result.success) {
        console.warn(
          '[layoutConfigService] Invalid layout config format:',
          result.error.errors
        );
        return null;
      }

      return result.data.layout;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not found - normal case for first launch
        return null;
      }

      if (error instanceof SyntaxError) {
        console.warn('[layoutConfigService] Failed to parse layout config JSON:', error);
        return null;
      }

      console.error('[layoutConfigService] Failed to read layout config:', error);
      return null;
    }
  },

  /**
   * レイアウト設定を保存する
   * @param projectPath プロジェクトルートパス
   * @param layout 保存するレイアウト値
   */
  async saveLayoutConfig(projectPath: string, layout: LayoutValues): Promise<void> {
    const configFilePath = getConfigFilePath(projectPath);
    const config: LayoutConfig = {
      version: 1,
      layout,
    };

    try {
      await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // .kiro directory doesn't exist, try to create it
        try {
          await fs.mkdir(path.join(projectPath, '.kiro'), { recursive: true });
          await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
        } catch (mkdirError) {
          console.error('[layoutConfigService] Failed to create .kiro directory:', mkdirError);
        }
      } else {
        console.error('[layoutConfigService] Failed to save layout config:', error);
      }
    }
  },

  /**
   * レイアウト設定をリセットする（デフォルト値で上書き）
   * @param projectPath プロジェクトルートパス
   */
  async resetLayoutConfig(projectPath: string): Promise<void> {
    await this.saveLayoutConfig(projectPath, DEFAULT_LAYOUT);
  },
};
