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
}

/**
 * SpecMetadata - Spec identification information only (lightweight)
 * spec-metadata-ssot-refactor: Removed phase, updatedAt, approvals fields
 * These fields should be obtained from SpecJson (SSOT principle)
 */
export interface SpecMetadata {
  readonly name: string;
  readonly path: string;
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

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// =====================================
// Auto Execution State types
// =====================================

export type AutoExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'completed';

export type DocumentReviewFlag = 'run' | 'pause';

export type AutoExecutionPermissions = {
  requirements: boolean;
  design: boolean;
  tasks: boolean;
  impl: boolean;
  inspection: boolean;
  deploy: boolean;
};

export interface SpecAutoExecutionState {
  permissions: AutoExecutionPermissions;
  documentReviewFlag: DocumentReviewFlag;
}

// Export inspection types
export type { MultiRoundInspectionState, LegacyInspectionState } from './inspection';
// Export worktree types
export type { WorktreeConfig } from './worktree';
// Export documentReview types
export type { ReviewerScheme } from './documentReview';
