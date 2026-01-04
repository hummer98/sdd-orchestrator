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

/** SDDワークフローのフェーズ */
export type WorkflowPhase =
  | 'requirements' // 要件定義
  | 'design' // 設計
  | 'tasks' // タスク
  | 'impl' // 実装
  | 'inspection' // 検査（InspectionPanelで表示）
  | 'deploy'; // デプロイ

/** PhaseItemとして表示されるフェーズ（inspectionはInspectionPanelで別途表示） */
export type DisplayablePhase = Exclude<WorkflowPhase, 'inspection'>;

/** PhaseItemとして表示されるフェーズ順序定義 */
export const WORKFLOW_PHASES: DisplayablePhase[] = [
  'requirements',
  'design',
  'tasks',
  'impl',
  'deploy',
];

/** 全フェーズ順序定義（inspectionを含む、状態判定用） */
export const ALL_WORKFLOW_PHASES: WorkflowPhase[] = [
  'requirements',
  'design',
  'tasks',
  'impl',
  'inspection',
  'deploy',
];

/** フェーズ表示名のマッピング（日本語） */
export const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  impl: '実装',
  inspection: '検査',
  deploy: 'デプロイ',
};

// ============================================================
// Task 1.1: PhaseStatus Type
// Requirements: 1.3
// ============================================================

/** フェーズの状態 */
export type PhaseStatus = 'pending' | 'generated' | 'approved';

// ============================================================
// Task 1.1: ValidationType
// Requirements: 4.1, 4.2, 4.3
// ============================================================

/** バリデーション種別 */
export type ValidationType = 'gap' | 'design';

// ============================================================
// Command Prefix Support
// ============================================================

export type CommandPrefix = 'kiro' | 'spec-manager';

/** プレフィックス別バリデーションコマンドマッピング */
const VALIDATION_COMMANDS_BY_PREFIX: Record<CommandPrefix, Record<ValidationType, string>> = {
  kiro: {
    gap: '/kiro:validate-gap',
    design: '/kiro:validate-design',
  },
  'spec-manager': {
    gap: '/spec-manager:validate-gap',
    design: '/spec-manager:validate-design',
  },
};

/** バリデーションコマンドマッピング（デフォルト: kiro） */
export const VALIDATION_COMMANDS: Record<ValidationType, string> = VALIDATION_COMMANDS_BY_PREFIX.kiro;

/** プレフィックスに応じたバリデーションコマンドを取得 */
export function getValidationCommand(type: ValidationType, prefix: CommandPrefix = 'kiro'): string {
  return VALIDATION_COMMANDS_BY_PREFIX[prefix][type];
}

/** バリデーション表示名 */
export const VALIDATION_LABELS: Record<ValidationType, string> = {
  gap: 'validate-gap',
  design: 'validate-design',
};

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

/** プレフィックス別フェーズ実行コマンドマッピング */
const PHASE_COMMANDS_BY_PREFIX: Record<CommandPrefix, Record<WorkflowPhase, string>> = {
  kiro: {
    requirements: '/kiro:spec-requirements',
    design: '/kiro:spec-design',
    tasks: '/kiro:spec-tasks',
    impl: '/kiro:spec-impl',
    inspection: '/kiro:spec-inspection',
    deploy: '/kiro:deployment',
  },
  'spec-manager': {
    requirements: '/spec-manager:requirements',
    design: '/spec-manager:design',
    tasks: '/spec-manager:tasks',
    impl: '/spec-manager:impl',
    inspection: '/spec-manager:inspection',
    deploy: '/spec-manager:deployment',
  },
};

/** フェーズ実行コマンドマッピング（デフォルト: kiro） */
export const PHASE_COMMANDS: Record<WorkflowPhase, string> = PHASE_COMMANDS_BY_PREFIX.kiro;

/** プレフィックスに応じたフェーズコマンドを取得 */
export function getPhaseCommand(phase: WorkflowPhase, prefix: CommandPrefix = 'kiro'): string {
  return PHASE_COMMANDS_BY_PREFIX[prefix][phase];
}
