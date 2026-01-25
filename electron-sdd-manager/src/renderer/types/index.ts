// Spec-Driven Development Types

export type SpecPhase =
  | 'initialized'
  | 'requirements-generated'
  | 'design-generated'
  | 'tasks-generated'
  | 'implementation-complete'
  | 'inspection-complete'   // spec-phase-auto-update: Inspection GO判定完了
  | 'deploy-complete';      // spec-phase-auto-update: デプロイ完了

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
// git-worktree-support: WorktreeConfig for worktree mode
import type { WorktreeConfig } from './worktree';
// gemini-document-review: ReviewerScheme for scheme field
import type { ReviewerScheme } from './documentReview';
// impl-mode-toggle: ImplConfig for impl mode selection
import type { ImplConfig } from './implMode';

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
      fixStatus?: 'not_required' | 'pending' | 'applied';
      fixRequired?: number;
      needsDiscussion?: number;
    }>;
    /** Reviewer CLI scheme - gemini-document-review: Requirements 7.1, 7.2 */
    scheme?: ReviewerScheme;
  };
  /** Auto execution state (optional for backward compatibility) */
  autoExecution?: SpecAutoExecutionState;
  /** Inspection state - supports both MultiRoundInspectionState and LegacyInspectionState for backward compatibility */
  inspection?: MultiRoundInspectionState | LegacyInspectionState;
  /**
   * Worktree configuration (optional for backward compatibility)
   * git-worktree-support: Requirements 2.1, 2.2, 2.3
   * - Field presence indicates worktree mode is active
   * - Field absence indicates normal mode
   */
  worktree?: WorktreeConfig;
  /**
   * Implementation mode configuration (optional for backward compatibility)
   * impl-mode-toggle: Requirements 1.1, 1.2, 1.3
   * - 'sequential': Use spec-impl for sequential execution
   * - 'parallel': Use spec-auto-impl for parallel batch execution
   * - Field absence defaults to 'sequential'
   */
  impl?: ImplConfig;
}

/**
 * SpecMetadata - Spec identification information only (lightweight)
 * spec-metadata-ssot-refactor: Removed phase, updatedAt, approvals fields
 * spec-path-ssot-refactor: Removed path field - path resolution is Main process responsibility
 * These fields should be obtained from SpecJson (SSOT principle)
 */
export interface SpecMetadata {
  readonly name: string;
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
  /** Parallel task info calculated from tasks.md (P) markers */
  parallelTaskInfo: ParallelTaskInfo | null;
}

/** Task item from parsed tasks.md */
export interface ParsedTaskItem {
  readonly id: string;
  readonly title: string;
  readonly isParallel: boolean;
  readonly completed: boolean;
  readonly parentId: string | null;
}

/** Task group for parallel execution */
export interface ParsedTaskGroup {
  readonly groupIndex: number;
  readonly tasks: readonly ParsedTaskItem[];
  readonly isParallel: boolean;
}

/** Parallel task information for parallel execution mode */
export interface ParallelTaskInfo {
  /** Number of tasks with (P) marker */
  parallelTasks: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Grouped tasks for parallel execution */
  groups: readonly ParsedTaskGroup[];
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
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'INVALID_TRANSITION'; path: string; message: string };  // spec-phase-auto-update

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
  /**
   * spec-metadata-ssot-refactor: Map of spec name to SpecJson for phase/updatedAt display
   * Main process reads all specJsons during selectProject to avoid multiple IPC calls
   */
  readonly specJsonMap: Record<string, SpecJson>;
  /**
   * Bug fix: empty bug directory handling - warnings for skipped directories
   */
  readonly bugWarnings?: string[];
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

/**
 * 自動実行フェーズ許可設定
 * document-review-phase Task 2.1: 'document-review' を追加
 * Requirements: 2.1
 */
export interface AutoExecutionPermissions {
  requirements: boolean;
  design: boolean;
  tasks: boolean;
  'document-review': boolean;
  impl: boolean;
  inspection: boolean;
  deploy: boolean;
}

/**
 * ドキュメントレビューフラグ
 * @deprecated document-review-phase Task 1.3: Use permissions['document-review'] instead
 * Kept for backward compatibility with existing spec.json files during migration
 * Requirements: 2.2
 */
export type DocumentReviewFlag = 'run' | 'pause';

/**
 * Inspection自動実行フラグ
 * @deprecated inspection-permission-unification: Use permissions.inspection instead
 */
export type InspectionAutoExecutionFlag = 'run' | 'pause';

/**
 * Spec単位の自動実行状態
 * spec.jsonのautoExecutionフィールドに永続化される
 * inspection-permission-unification Task 3.1: Removed inspectionFlag field
 * document-review-phase Task 1.3: Removed documentReviewFlag field
 * Requirements: 2.2, 3.2, 3.4
 */
export interface SpecAutoExecutionState {
  /** 自動実行の有効/無効 */
  enabled: boolean;
  /** フェーズ別許可設定 */
  permissions: AutoExecutionPermissions;
  // documentReviewFlag field removed - use permissions['document-review'] instead
  // inspectionFlag field removed - use permissions.inspection instead
}

/**
 * デフォルトの自動実行状態
 * document-review-phase Task 1.3: documentReviewFlag を削除し permissions['document-review'] を使用
 * Requirements: 2.2, 2.3
 */
export const DEFAULT_SPEC_AUTO_EXECUTION_STATE: SpecAutoExecutionState = {
  enabled: false,
  permissions: {
    requirements: true,
    design: true,
    tasks: true,
    'document-review': true,  // document-review-phase: デフォルトGO
    impl: true,
    inspection: true,  // inspection permission is now handled via permissions.inspection
    deploy: true,
  },
  // documentReviewFlag removed - use permissions['document-review'] instead
  // inspectionFlag removed - use permissions.inspection instead
};

/**
 * Partial型の自動実行状態からフル状態を生成するファクトリー関数
 * inspection-permission-unification Task 3.2: Removed inspectionFlag processing
 * document-review-phase Task 1.3: Removed documentReviewFlag processing
 * Requirements: 2.2, 3.5
 */
export function createSpecAutoExecutionState(
  partial?: Partial<{
    enabled: boolean;
    permissions: Partial<AutoExecutionPermissions>;
    // documentReviewFlag parameter removed - use permissions['document-review'] instead
    // inspectionFlag parameter removed - use permissions.inspection instead
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
    // documentReviewFlag processing removed - use permissions['document-review'] instead
    // inspectionFlag processing removed - use permissions.inspection instead
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

// ============================================================
// Git Worktree Support Types (git-worktree-support feature)
// Requirements: 2.1, 2.2, 2.3
// ============================================================
export * from './worktree';

// ============================================================
// Bug Worktree Support Types (bugs-worktree-support feature)
// Requirements: 1.1, 1.2, 1.3, 1.4
// ============================================================
export * from './bugJson';

// ============================================================
// Document Review Types (gemini-document-review feature)
// Requirements: 7.1, 7.2
// ============================================================
export * from './documentReview';

// ============================================================
// Implementation Mode Types (impl-mode-toggle feature)
// Requirements: 1.1, 1.2, 1.3
// ============================================================
export * from './implMode';
