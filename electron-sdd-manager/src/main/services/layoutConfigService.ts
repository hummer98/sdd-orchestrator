/**
 * Project Config Service
 * プロジェクト固有の設定（プロファイル・レイアウト）をファイルシステムで管理
 * Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2, 4.1-4.4, 5.1-5.3
 */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * プロファイル名の型定義
 */
export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';

/**
 * プロファイル設定のスキーマ
 */
export const ProfileConfigSchema = z.object({
  name: z.enum(['cc-sdd', 'cc-sdd-agent', 'spec-manager']),
  installedAt: z.string(),
});

export type ProfileConfig = z.infer<typeof ProfileConfigSchema>;

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
 * 統合設定ファイルのスキーマ（version 2）
 * profile: コマンドセットのインストール状態
 * layout: UIレイアウト設定
 */
export const ProjectConfigSchema = z.object({
  version: z.literal(2),
  profile: ProfileConfigSchema.optional(),
  layout: LayoutValuesSchema.optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * @deprecated version 1のスキーマ（後方互換のため保持）
 */
export const LayoutConfigSchemaV1 = z.object({
  version: z.literal(1),
  layout: LayoutValuesSchema,
});

export type LayoutConfigV1 = z.infer<typeof LayoutConfigSchemaV1>;

/**
 * @deprecated Use ProjectConfig instead
 */
export type LayoutConfig = LayoutConfigV1;

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
 * 設定ファイル全体を読み込む（内部用）
 */
async function loadProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
  const configFilePath = getConfigFilePath(projectPath);

  try {
    const content = await fs.readFile(configFilePath, 'utf-8');
    const data = JSON.parse(content);

    // version 2の場合
    const v2Result = ProjectConfigSchema.safeParse(data);
    if (v2Result.success) {
      return v2Result.data;
    }

    // version 1の場合はマイグレーション
    const v1Result = LayoutConfigSchemaV1.safeParse(data);
    if (v1Result.success) {
      return {
        version: 2,
        layout: v1Result.data.layout,
      };
    }

    console.warn('[projectConfigService] Invalid config format');
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    if (error instanceof SyntaxError) {
      console.warn('[projectConfigService] Failed to parse config JSON:', error);
      return null;
    }
    console.error('[projectConfigService] Failed to read config:', error);
    return null;
  }
}

/**
 * 設定ファイル全体を保存する（内部用）
 */
async function saveProjectConfig(projectPath: string, config: ProjectConfig): Promise<void> {
  const configFilePath = getConfigFilePath(projectPath);

  try {
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        await fs.mkdir(path.join(projectPath, '.kiro'), { recursive: true });
        await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
      } catch (mkdirError) {
        console.error('[projectConfigService] Failed to create .kiro directory:', mkdirError);
      }
    } else {
      console.error('[projectConfigService] Failed to save config:', error);
    }
  }
}

/**
 * Project Config Service
 * プロファイルとレイアウト設定の統合管理
 */
export const projectConfigService = {
  /**
   * デフォルトのレイアウト値を取得
   */
  getDefaultLayout(): LayoutValues {
    return { ...DEFAULT_LAYOUT };
  },

  /**
   * プロファイル設定を読み込む
   * @param projectPath プロジェクトルートパス
   * @returns ProfileConfig | null
   */
  async loadProfile(projectPath: string): Promise<ProfileConfig | null> {
    const config = await loadProjectConfig(projectPath);
    return config?.profile ?? null;
  },

  /**
   * プロファイル設定を保存する
   * @param projectPath プロジェクトルートパス
   * @param profile プロファイル設定
   */
  async saveProfile(projectPath: string, profile: ProfileConfig): Promise<void> {
    const existing = await loadProjectConfig(projectPath);
    const config: ProjectConfig = {
      version: 2,
      profile,
      layout: existing?.layout,
    };
    await saveProjectConfig(projectPath, config);
  },

  /**
   * レイアウト設定を読み込む
   * @param projectPath プロジェクトルートパス
   * @returns LayoutValues | null
   */
  async loadLayoutConfig(projectPath: string): Promise<LayoutValues | null> {
    const config = await loadProjectConfig(projectPath);
    return config?.layout ?? null;
  },

  /**
   * レイアウト設定を保存する
   * @param projectPath プロジェクトルートパス
   * @param layout レイアウト値
   */
  async saveLayoutConfig(projectPath: string, layout: LayoutValues): Promise<void> {
    const existing = await loadProjectConfig(projectPath);
    const config: ProjectConfig = {
      version: 2,
      profile: existing?.profile,
      layout,
    };
    await saveProjectConfig(projectPath, config);
  },

  /**
   * レイアウト設定をリセットする
   * @param projectPath プロジェクトルートパス
   */
  async resetLayoutConfig(projectPath: string): Promise<void> {
    await this.saveLayoutConfig(projectPath, DEFAULT_LAYOUT);
  },

  /**
   * 設定ファイルのパスを取得
   */
  getConfigFilePath(projectPath: string): string {
    return getConfigFilePath(projectPath);
  },
};

/**
 * @deprecated Use projectConfigService instead
 */
export const layoutConfigService = projectConfigService;
