// Spec-Driven Development Types

export type SpecPhase =
  | 'initialized'
  | 'requirements-generated'
  | 'design-generated'
  | 'tasks-generated'
  | 'implementation-complete';

export type Phase = 'requirements' | 'design' | 'tasks';

export interface PhaseApproval {
  generated: boolean;
  approved: boolean;
}

export interface ApprovalStatus {
  requirements: PhaseApproval;
  design: PhaseApproval;
  tasks: PhaseApproval;
}

// Note: LegacyInspectionState is supported for backward compatibility with existing spec.json files.
// Bug fix: inspection-panel-display
import type { MultiRoundInspectionState, LegacyInspectionState } from './inspection';

export interface SpecJson {
  feature_name: string;
  created_at: string;
  updated_at: string;
  language: 'ja' | 'en';
  phase: SpecPhase;
  approvals: ApprovalStatus;
  /** Document review state (optional for backward compatibility) */
  documentReview?: {
    status: string;
    currentRound?: number;
    roundDetails?: Array<{
      roundNumber: number;
      status: string;
      reviewCompletedAt?: string;
      replyCompletedAt?: string;
      fixApplied?: boolean;
    }>;
  };
  /** Auto execution state (optional for backward compatibility) */
  autoExecution?: SpecAutoExecutionState;
  /** Inspection state - supports both MultiRoundInspectionState and LegacyInspectionState for backward compatibility */
  inspection?: MultiRoundInspectionState | LegacyInspectionState;
}

export interface SpecMetadata {
  readonly name: string;
  readonly path: string;
  readonly phase: SpecPhase;
  readonly updatedAt: string;
  readonly approvals: ApprovalStatus;
}

export interface SpecDetail {
  metadata: SpecMetadata;
  specJson: SpecJson;
  artifacts: {
    requirements: ArtifactInfo | null;
    design: ArtifactInfo | null;
    tasks: ArtifactInfo | null;
    research: ArtifactInfo | null;
    /** Inspection report artifact (spec-inspection feature) */
    inspection: ArtifactInfo | null;
  };
  taskProgress: TaskProgress | null;
}

export interface ArtifactInfo {
  exists: boolean;
  updatedAt: string | null;
  content?: string;
}

// Task progress for spec-status
export interface TaskProgress {
  total: number;
  completed: number;
  percentage: number;
}

export interface KiroValidation {
  readonly exists: boolean;
  readonly hasSpecs: boolean;
  readonly hasSteering: boolean;
}

export interface LogEntry {
  id: string;
  stream: 'stdout' | 'stderr' | 'stdin';
  data: string;
  timestamp: number;
}

export interface ExecutionResult {
  readonly exitCode: number;
  readonly executionTimeMs: number;
}

export interface CommandOutputEvent {
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

// File operation error types
export type FileError =
  | { type: 'NOT_FOUND'; path: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'INVALID_PATH'; path: string; reason: string }
  | { type: 'PARSE_ERROR'; path: string; message: string }
  | { type: 'WRITE_ERROR'; path: string; message: string };

// Command error types
export type CommandError =
  | { type: 'SPAWN_ERROR'; message: string }
  | { type: 'PROCESS_NOT_FOUND'; processId: string }
  | { type: 'ALREADY_RUNNING' }
  | { type: 'COMMAND_NOT_ALLOWED'; command: string };

// Result type for error handling
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Window bounds for persisting window state
export interface WindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// Bug Workflow Types
export * from './bug';
import type { BugMetadata } from './bug';

// ============================================================
// bugs-workflow-auto-execution Task 6: Bug Auto Execution Types
// Requirements: 7.4
// ============================================================
export * from './bugAutoExecution';

// ============================================================
// auto-execution-parallel-spec Task 1: ExecutionContext Types
// Requirements: 1.1, 1.5, 1.6, 3.6
// ============================================================
export * from './executionContext';

// ============================================================
// inspection-workflow-ui Task 1: Inspection Workflow Types
// Requirements: 2.1, 2.2, 2.3, 2.4
// ============================================================
export * from './inspection';

// ============================================================
// Unified Project Selection Types (unified-project-selection feature)
// Requirements: 1.1-1.6, 4.1-4.4, 5.1-5.4, 6.1-6.4
// ============================================================

/** プロジェクト選択エラー型 */
export type SelectProjectError =
  | { type: 'PATH_NOT_EXISTS'; path: string }
  | { type: 'NOT_A_DIRECTORY'; path: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'SELECTION_IN_PROGRESS' }
  | { type: 'INTERNAL_ERROR'; message: string };

/** プロジェクト選択結果 */
export interface SelectProjectResult {
  readonly success: boolean;
  readonly projectPath: string;
  readonly kiroValidation: KiroValidation;
  readonly specs: SpecMetadata[];
  readonly bugs: BugMetadata[];
  readonly error?: SelectProjectError;
}

// ============================================================
// Spec-Scoped Auto Execution State Types
// spec-scoped-auto-execution-state feature
// Requirements: 1.1, 1.2, 1.3
// ============================================================

/**
 * 自動実行の詳細状態
 * NOTE: This type was moved from workflowStore as part of spec-scoped-auto-execution-state Task 5.1
 */
export type AutoExecutionStatus =
  | 'idle'       // 待機中
  | 'running'    // 実行中
  | 'paused'     // 一時停止（Agent待機中）
  | 'completing' // 完了処理中
  | 'error'      // エラー停止
  | 'completed'; // 完了

/** 自動実行フェーズ許可設定 */
export interface AutoExecutionPermissions {
  requirements: boolean;
  design: boolean;
  tasks: boolean;
  impl: boolean;
  inspection: boolean;
  deploy: boolean;
}

/** バリデーションオプション */
export interface ValidationOptions {
  gap: boolean;
  design: boolean;
  impl: boolean;
}

/** ドキュメントレビューフラグ */
export type DocumentReviewFlag = 'skip' | 'run' | 'pause';

/**
 * Spec単位の自動実行状態
 * spec.jsonのautoExecutionフィールドに永続化される
 */
export interface SpecAutoExecutionState {
  /** 自動実行の有効/無効 */
  enabled: boolean;
  /** フェーズ別許可設定 */
  permissions: AutoExecutionPermissions;
  /** ドキュメントレビューフラグ */
  documentReviewFlag: DocumentReviewFlag;
  /** バリデーションオプション */
  validationOptions: ValidationOptions;
}

/** デフォルトの自動実行状態 */
export const DEFAULT_SPEC_AUTO_EXECUTION_STATE: SpecAutoExecutionState = {
  enabled: false,
  permissions: {
    requirements: false,
    design: false,
    tasks: false,
    impl: false,
    inspection: false,
    deploy: false,
  },
  documentReviewFlag: 'pause',
  validationOptions: {
    gap: false,
    design: false,
    impl: false,
  },
};

/** Partial型の自動実行状態からフル状態を生成するファクトリー関数 */
export function createSpecAutoExecutionState(
  partial?: Partial<{
    enabled: boolean;
    permissions: Partial<AutoExecutionPermissions>;
    documentReviewFlag: DocumentReviewFlag;
    validationOptions: Partial<ValidationOptions>;
  }>
): SpecAutoExecutionState {
  if (!partial) {
    return { ...DEFAULT_SPEC_AUTO_EXECUTION_STATE };
  }

  return {
    enabled: partial.enabled ?? DEFAULT_SPEC_AUTO_EXECUTION_STATE.enabled,
    permissions: {
      ...DEFAULT_SPEC_AUTO_EXECUTION_STATE.permissions,
      ...(partial.permissions ?? {}),
    },
    documentReviewFlag:
      partial.documentReviewFlag ?? DEFAULT_SPEC_AUTO_EXECUTION_STATE.documentReviewFlag,
    validationOptions: {
      ...DEFAULT_SPEC_AUTO_EXECUTION_STATE.validationOptions,
      ...(partial.validationOptions ?? {}),
    },
  };
}

// ============================================================
// Commandset Version Detection Types (commandset-version-detection feature)
// Requirements: 2.1, 3.1
// ============================================================

/**
 * Commandset names supported by the application
 */
export type CommandsetName =
  | 'cc-sdd'
  | 'cc-sdd-agent'
  | 'bug'
  | 'document-review'
  | 'spec-manager';

/**
 * Version information for a single commandset
 * Requirements: 2.1
 */
export interface CommandsetVersionInfo {
  readonly name: CommandsetName;
  readonly bundleVersion: string;
  readonly installedVersion?: string;
  readonly installedAt?: string;
  readonly updateRequired: boolean;
}

/**
 * Result of version check for a project
 * Requirements: 2.1, 2.5
 */
export interface VersionCheckResult {
  readonly projectPath: string;
  readonly commandsets: readonly CommandsetVersionInfo[];
  readonly anyUpdateRequired: boolean;
  readonly hasCommandsets: boolean;
  readonly legacyProject: boolean;
}
