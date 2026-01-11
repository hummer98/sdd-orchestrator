/**
 * Project Config Service
 * プロジェクト固有の設定（プロファイル・レイアウト・コマンドセットバージョン）をファイルシステムで管理
 * Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2, 4.1-4.4, 5.1-5.3
 * Requirements (commandset-version-detection): 1.1-1.4, 6.1-6.4
 */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { CommandsetName } from './unifiedCommandsetInstaller';

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
 * projectAgentPanelHeightは後方互換のためoptional
 * globalAgentPanelHeight（旧名）も後方互換のため受け入れる
 */
export const LayoutValuesSchema = z.object({
  leftPaneWidth: z.number().min(0),
  rightPaneWidth: z.number().min(0),
  bottomPaneHeight: z.number().min(0),
  agentListHeight: z.number().min(0),
  projectAgentPanelHeight: z.number().min(0).optional(),
  // 後方互換: globalAgentPanelHeight（旧名）も受け入れる
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
 * コマンドセットバージョン記録のスキーマ
 * Requirements (commandset-version-detection): 1.1, 6.2
 */
export const CommandsetVersionRecordSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/),
  installedAt: z.string(),
});

export type CommandsetVersionRecord = z.infer<typeof CommandsetVersionRecordSchema>;

/**
 * プロジェクト設定のスキーマ
 * Bug fix: persist-skip-permission-per-project
 */
export const ProjectSettingsSchema = z.object({
  skipPermissions: z.boolean().optional(),
});

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

/**
 * 統合設定ファイルのスキーマ（version 3）
 * profile: コマンドセットのインストール状態
 * layout: UIレイアウト設定
 * commandsets: コマンドセットバージョン情報
 * settings: プロジェクト設定（skipPermissions等）
 * Requirements (commandset-version-detection): 6.1, 6.2, 6.4
 */
export const ProjectConfigSchemaV3 = z.object({
  version: z.literal(3),
  profile: ProfileConfigSchema.optional(),
  layout: LayoutValuesSchema.optional(),
  commandsets: z.record(
    z.enum(['cc-sdd', 'cc-sdd-agent', 'bug', 'document-review', 'spec-manager']),
    CommandsetVersionRecordSchema
  ).optional(),
  settings: ProjectSettingsSchema.optional(),
});

export type ProjectConfigV3 = z.infer<typeof ProjectConfigSchemaV3>;

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
  projectAgentPanelHeight: 120, // ProjectAgentPanelの高さ（左サイドバー）
};

/**
 * 設定ファイルのパスを構築
 */
function getConfigFilePath(projectPath: string): string {
  return path.join(projectPath, '.kiro', 'sdd-orchestrator.json');
}

/**
 * 設定ファイル全体を読み込む（内部用）
 * v1, v2, v3全てに対応し、v2形式で返す
 * Requirements (commandset-version-detection): 6.3
 */
async function loadProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
  const configFilePath = getConfigFilePath(projectPath);

  try {
    const content = await fs.readFile(configFilePath, 'utf-8');
    const data = JSON.parse(content);

    // version 3の場合 - v2形式で返す（profile/layoutのみ）
    const v3Result = ProjectConfigSchemaV3.safeParse(data);
    if (v3Result.success) {
      return {
        version: 2,
        profile: v3Result.data.profile,
        layout: v3Result.data.layout,
      };
    }

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
 * 設定ファイル全体を読み込む（v3形式、内部用）
 * Requirements (commandset-version-detection): 6.3
 */
async function loadProjectConfigV3(projectPath: string): Promise<ProjectConfigV3 | null> {
  const configFilePath = getConfigFilePath(projectPath);

  try {
    const content = await fs.readFile(configFilePath, 'utf-8');
    const data = JSON.parse(content);

    // version 3の場合
    const v3Result = ProjectConfigSchemaV3.safeParse(data);
    if (v3Result.success) {
      return v3Result.data;
    }

    // version 2の場合 - v3形式に変換（commandsetsはundefined）
    const v2Result = ProjectConfigSchema.safeParse(data);
    if (v2Result.success) {
      return {
        version: 3,
        profile: v2Result.data.profile,
        layout: v2Result.data.layout,
        // commandsetsはundefined（レガシー）
      };
    }

    // version 1の場合 - v3形式に変換
    const v1Result = LayoutConfigSchemaV1.safeParse(data);
    if (v1Result.success) {
      return {
        version: 3,
        layout: v1Result.data.layout,
      };
    }

    console.warn('[projectConfigService] Invalid config format for V3 load');
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
 * 設定ファイル全体を保存する（v3形式、内部用）
 * Requirements (commandset-version-detection): 6.4
 */
async function saveProjectConfigV3(projectPath: string, config: ProjectConfigV3): Promise<void> {
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
   * Requirements (commandset-version-detection): 6.4 - 既存のcommandsetsを維持
   * @param projectPath プロジェクトルートパス
   * @param profile プロファイル設定
   */
  async saveProfile(projectPath: string, profile: ProfileConfig): Promise<void> {
    // Use v3 loading to preserve commandsets field
    const existing = await loadProjectConfigV3(projectPath);
    const config: ProjectConfigV3 = {
      version: 3,
      profile,
      layout: existing?.layout,
      commandsets: existing?.commandsets,
    };
    await saveProjectConfigV3(projectPath, config);
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
   * Requirements (commandset-version-detection): 6.4 - 既存のcommandsetsを維持
   * @param projectPath プロジェクトルートパス
   * @param layout レイアウト値
   */
  async saveLayoutConfig(projectPath: string, layout: LayoutValues): Promise<void> {
    // Use v3 loading to preserve commandsets field
    const existing = await loadProjectConfigV3(projectPath);
    const config: ProjectConfigV3 = {
      version: 3,
      profile: existing?.profile,
      layout,
      commandsets: existing?.commandsets,
    };
    await saveProjectConfigV3(projectPath, config);
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

  /**
   * コマンドセットバージョン情報を読み込む
   * Requirements (commandset-version-detection): 1.3, 6.2
   * @param projectPath プロジェクトルートパス
   * @returns commandsetsフィールド、またはレガシーの場合undefined
   */
  async loadCommandsetVersions(projectPath: string): Promise<Record<CommandsetName, CommandsetVersionRecord> | undefined> {
    const config = await loadProjectConfigV3(projectPath);
    return config?.commandsets as Record<CommandsetName, CommandsetVersionRecord> | undefined;
  },

  /**
   * コマンドセットバージョン情報を保存
   * 既存のprofile/layoutは維持、既存のcommandsetsとマージ
   * Requirements (commandset-version-detection): 1.1, 1.2, 1.3, 1.4, 6.4
   * @param projectPath プロジェクトルートパス
   * @param commandsets コマンドセットバージョン情報
   */
  async saveCommandsetVersions(
    projectPath: string,
    commandsets: Record<string, CommandsetVersionRecord>
  ): Promise<void> {
    const existing = await loadProjectConfigV3(projectPath);
    const mergedCommandsets = {
      ...(existing?.commandsets ?? {}),
      ...commandsets,
    };
    const config: ProjectConfigV3 = {
      version: 3,
      profile: existing?.profile,
      layout: existing?.layout,
      commandsets: mergedCommandsets as Record<CommandsetName, CommandsetVersionRecord>,
      settings: existing?.settings,
    };
    await saveProjectConfigV3(projectPath, config);
  },

  /**
   * skipPermissions設定を読み込む
   * Bug fix: persist-skip-permission-per-project
   * @param projectPath プロジェクトルートパス
   * @returns skipPermissions設定（存在しない場合はfalse）
   */
  async loadSkipPermissions(projectPath: string): Promise<boolean> {
    const config = await loadProjectConfigV3(projectPath);
    return config?.settings?.skipPermissions ?? false;
  },

  /**
   * skipPermissions設定を保存
   * Bug fix: persist-skip-permission-per-project
   * @param projectPath プロジェクトルートパス
   * @param skipPermissions 設定値
   */
  async saveSkipPermissions(projectPath: string, skipPermissions: boolean): Promise<void> {
    const existing = await loadProjectConfigV3(projectPath);
    const config: ProjectConfigV3 = {
      version: 3,
      profile: existing?.profile,
      layout: existing?.layout,
      commandsets: existing?.commandsets,
      settings: {
        ...(existing?.settings ?? {}),
        skipPermissions,
      },
    };
    await saveProjectConfigV3(projectPath, config);
  },
};

/**
 * @deprecated Use projectConfigService instead
 */
export const layoutConfigService = projectConfigService;
