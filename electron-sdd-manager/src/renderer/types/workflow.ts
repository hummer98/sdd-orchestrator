/**
 * Workflow Types
 * Type definitions for SDD Hybrid Workflow
 * Requirements: 1.1, 1.3, 8.3, 8.6
 */

import type { SpecJson } from './index';
import { normalizeInspectionState, hasPassed } from './inspection';

// ============================================================
// Task 1.1: WorkflowPhase Type
// Requirements: 1.1, 1.3
// ============================================================

/**
 * SDDワークフローのフェーズ
 * document-review-phase Task 1.1: 'document-review' を追加
 * Requirements: 1.2
 */
export type WorkflowPhase =
  | 'requirements' // 要件定義
  | 'design' // 設計
  | 'tasks' // タスク
  | 'document-review' // ドキュメントレビュー (document-review-phase)
  | 'impl' // 実装
  | 'inspection' // 検査（InspectionPanelで表示）
  | 'deploy'; // デプロイ

/**
 * PhaseItemとして表示されるフェーズ
 * document-review-phase: document-reviewとinspectionは別パネルで表示
 */
export type DisplayablePhase = Exclude<WorkflowPhase, 'inspection' | 'document-review'>;

/** PhaseItemとして表示されるフェーズ順序定義 */
export const WORKFLOW_PHASES: DisplayablePhase[] = [
  'requirements',
  'design',
  'tasks',
  'impl',
  'deploy',
];

/**
 * impl-flow-hierarchy-fix Task 3.1: DISPLAY_PHASES
 * Phases rendered in the main map loop (impl/deploy are rendered inside ImplFlowFrame)
 * Requirements: 3.2
 */
export const DISPLAY_PHASES = ['requirements', 'design', 'tasks'] as const;
export type DisplayPhase = typeof DISPLAY_PHASES[number];

/**
 * 全フェーズ順序定義（document-review, inspectionを含む、状態判定用）
 * document-review-phase Task 1.1: 'document-review' を tasks と impl の間に追加
 * Requirements: 1.2
 */
export const ALL_WORKFLOW_PHASES: WorkflowPhase[] = [
  'requirements',
  'design',
  'tasks',
  'document-review',
  'impl',
  'inspection',
  'deploy',
];

/**
 * フェーズ表示名のマッピング（日本語）
 * document-review-phase Task 1.2: 'document-review' のラベルを追加
 * Requirements: 1.3
 */
export const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  'document-review': 'ドキュメントレビュー',
  impl: '実装',
  inspection: '検査',
  deploy: 'コミット',
};

/**
 * フェーズ説明のマッピング（Infoダイアログ用）
 * document-review-phase Task 1.2: 'document-review' の説明を追加
 * Requirements: 1.3
 */
export const PHASE_DESCRIPTIONS: Record<WorkflowPhase, string> = {
  requirements: `要件定義フェーズでは、ユーザーストーリーや機能要件をEARS (Easy Approach to Requirements Syntax) 形式で定義します。

• ユーザーの期待する機能・振る舞いを明確化
• 曖昧さを排除した構造化された要件記述
• 検証可能な受け入れ基準の設定`,

  design: `設計フェーズでは、要件を満たすための技術的なアーキテクチャと実装方針を定義します。

• システム構成・コンポーネント設計
• データフロー・状態管理の設計
• 既存コードベースとの統合方針
• 技術的制約・トレードオフの検討`,

  tasks: `タスクフェーズでは、設計をもとに実装タスクを分割し、TDD (テスト駆動開発) の手順を定義します。

• 依存関係を考慮したタスク分割
• 各タスクのテストファースト実装手順
• 並列実行可能なタスクの識別`,

  'document-review': `ドキュメントレビューフェーズでは、生成されたドキュメント（requirements, design, tasks）の品質をAIがレビューします。

• 要件の完全性・一貫性チェック
• 設計の技術的妥当性評価
• タスク分割の適切性確認
• 複数ラウンドの反復的改善`,

  impl: `実装フェーズでは、タスクに従ってTDD方式でコードを実装します。

• Red-Green-Refactor サイクル
• テストを先に書き、その後実装
• 継続的なリファクタリング
• Worktreeモード: 独立したブランチで安全に作業`,

  inspection: `検査フェーズでは、実装が要件と設計に沿っているかを包括的に検証します。

• 要件への適合性チェック
• 設計との整合性確認
• コード品質・テストカバレッジ検証
• GO/NOGO判定による品質ゲート`,

  deploy: `デプロイフェーズでは、実装をバージョン管理に反映します。

• 通常モード: 変更をコミット
• Worktreeモード: ブランチをmainにマージ
• コミットメッセージの自動生成`,
};

/** ドキュメントレビューの説明（Infoダイアログ用） */
export const DOCUMENT_REVIEW_DESCRIPTION = `ドキュメントレビューでは、生成されたドキュメント（requirements, design, tasks）の品質をAIがレビューします。

• 要件の完全性・一貫性チェック
• 設計の技術的妥当性評価
• タスク分割の適切性確認
• 複数ラウンドの反復的改善`;

/** Inspectionの説明（Infoダイアログ用） */
export const INSPECTION_DESCRIPTION = `Inspectionでは、実装が要件と設計に沿っているかを包括的に検証します。

• 要件への適合性チェック
• 設計との整合性確認
• コード品質・テストカバレッジ検証
• GO/NOGO判定による品質ゲート
• 問題発見時はFix実行で自動修正`;

// ============================================================
// Task 1.1: PhaseStatus Type
// Requirements: 1.3
// ============================================================

/** フェーズの状態 */
export type PhaseStatus = 'pending' | 'generated' | 'approved';

// ============================================================
// Command Prefix Support
// ============================================================

export type CommandPrefix = 'kiro' | 'spec-manager';

// ============================================================
// Task 1.2: Extended SpecJson
// Requirements: 8.3, 8.6
// ============================================================

/** spec.jsonの拡張フィールド（オプショナル） */
export interface ExtendedSpecJson extends SpecJson {
  /** 実装完了フラグ（オプショナル、デフォルト: false） */
  impl_completed?: boolean;
  // Note: deploy_completed は廃止。phase: 'deploy-complete' で統一
}

// ============================================================
// Task 1.1: Phase Status Logic
// Requirements: 1.3
// ============================================================

/**
 * フェーズ状態の判定ロジック
 * @param phase 対象フェーズ
 * @param specJson spec.jsonの内容
 * @returns フェーズ状態
 */
export function getPhaseStatus(
  phase: WorkflowPhase,
  specJson: ExtendedSpecJson
): PhaseStatus {
  // 検査フェーズ - InspectionState構造をサポート（旧形式も自動変換）
  // Bug fix: inspection-panel-display
  // Bug fix: inspection-state-data-model - Updated to use new InspectionState structure
  if (phase === 'inspection') {
    const inspection = normalizeInspectionState(specJson.inspection);
    if (!inspection) return 'pending';

    // Check if latest round is GO using helper function
    if (hasPassed(inspection)) {
      return 'approved';
    }

    // No rounds or NOGO result → pending
    return 'pending';
  }

  // デプロイフェーズ - phase: 'deploy-complete' で判定
  if (phase === 'deploy') {
    return specJson.phase === 'deploy-complete' ? 'approved' : 'pending';
  }

  // 実装フェーズ
  if (phase === 'impl') {
    if (specJson.impl_completed) {
      return 'approved';
    }
    return 'pending';
  }

  /**
   * document-review-phase Task 1.1: ドキュメントレビューフェーズの状態判定
   * Requirements: 1.2, 4.1
   * - documentReview.status === 'approved' → 'approved'
   * - documentReview.status === 'in_progress' → 'generated'
   * - それ以外 → 'pending'
   */
  if (phase === 'document-review') {
    const documentReview = specJson.documentReview;
    if (!documentReview) return 'pending';

    if (documentReview.status === 'approved') {
      return 'approved';
    }
    if (documentReview.status === 'in_progress') {
      return 'generated';
    }
    return 'pending';
  }

  // 要件定義、設計、タスクフェーズ
  const approval = specJson.approvals[phase as keyof typeof specJson.approvals];
  if (approval) {
    if (approval.approved) return 'approved';
    if (approval.generated) return 'generated';
  }
  return 'pending';
}

// ============================================================
// Phase Command Mapping
// ============================================================

/**
 * プレフィックス別フェーズ実行コマンドマッピング
 * document-review-phase Task 1.3: 'document-review' コマンドを追加
 * Requirements: 1.4
 */
const PHASE_COMMANDS_BY_PREFIX: Record<CommandPrefix, Record<WorkflowPhase, string>> = {
  kiro: {
    requirements: '/kiro:spec-requirements',
    design: '/kiro:spec-design',
    tasks: '/kiro:spec-tasks',
    'document-review': '/kiro:spec-document-review',
    impl: '/kiro:spec-impl',
    inspection: '/kiro:spec-inspection',
    deploy: '/commit',
  },
  'spec-manager': {
    requirements: '/spec-manager:requirements',
    design: '/spec-manager:design',
    tasks: '/spec-manager:tasks',
    'document-review': '/spec-manager:document-review',
    impl: '/spec-manager:impl',
    inspection: '/spec-manager:inspection',
    deploy: '/commit',
  },
};

/** フェーズ実行コマンドマッピング（デフォルト: kiro） */
export const PHASE_COMMANDS: Record<WorkflowPhase, string> = PHASE_COMMANDS_BY_PREFIX.kiro;

/** プレフィックスに応じたフェーズコマンドを取得 */
export function getPhaseCommand(phase: WorkflowPhase, prefix: CommandPrefix = 'kiro'): string {
  return PHASE_COMMANDS_BY_PREFIX[prefix][phase];
}
