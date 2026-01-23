/**
 * Spec Store Shared Types
 * Type definitions shared by decomposed spec stores and services
 * Requirements: 1.1, 2.1, 2.2, 5.1, 6.1
 */

import type {
  SpecMetadata,
  SpecDetail,
  SpecPhase,
  SpecJson,
  ArtifactInfo,
  TaskProgress,
  AutoExecutionStatus,
} from '../../types';
import type { WorkflowPhase } from '../../types/workflow';
import type { ReviewerScheme } from '@shared/registry';
import type { SpecMetadataWithPhase } from '@shared/types/spec';

// ============================================================
// spec-metadata-ssot-refactor: Extended type for display with phase info
// spec-list-unification: Re-export from shared for backwards compatibility
// ============================================================

export type { SpecMetadataWithPhase };

// ============================================================
// Artifact Type
// ============================================================

/** Artifact type for granular updates */
export type ArtifactType = 'requirements' | 'design' | 'tasks' | 'research';

// ============================================================
// SpecListStore Types (Requirement 1)
// ============================================================

/** SpecListStore state interface */
export interface SpecListState {
  readonly specs: readonly SpecMetadata[];
  /** spec-metadata-ssot-refactor: Map from spec name to SpecJson for phase/updatedAt access */
  readonly specJsonMap: ReadonlyMap<string, SpecJson>;
  readonly sortBy: 'name' | 'updatedAt' | 'phase';
  readonly sortOrder: 'asc' | 'desc';
  readonly statusFilter: SpecPhase | 'all';
  readonly isLoading: boolean;
  readonly error: string | null;
}

/** SpecListStore actions interface */
export interface SpecListActions {
  setSpecs(specs: SpecMetadata[]): void;
  /** spec-metadata-ssot-refactor: Set specJsonMap directly from selectProject result */
  setSpecJsonMap(specJsonMap: Record<string, SpecJson>): void;
  setSortBy(sortBy: SpecListState['sortBy']): void;
  setSortOrder(order: SpecListState['sortOrder']): void;
  setStatusFilter(filter: SpecListState['statusFilter']): void;
  /** spec-metadata-ssot-refactor: Returns SpecMetadataWithPhase for display */
  getSortedFilteredSpecs(): SpecMetadataWithPhase[];
  updateSpecMetadata(specId: string, projectPath: string): Promise<void>;
}

/** Default SpecListState values */
export const DEFAULT_SPEC_LIST_STATE: SpecListState = {
  specs: [],
  specJsonMap: new Map(),
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  statusFilter: 'all',
  isLoading: false,
  error: null,
};

// ============================================================
// SpecDetailStore Types (Requirement 2)
// ============================================================

/** SpecDetailStore state interface */
export interface SpecDetailState {
  readonly selectedSpec: SpecMetadata | null;
  readonly specDetail: SpecDetail | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  /**
   * debatex-document-review Task 3.2: Project default reviewer scheme
   * Loaded from projectDefaults.json
   * Used when spec.json doesn't have a documentReview.scheme
   */
  readonly projectDefaultScheme?: ReviewerScheme;
}

/** SpecDetailStore actions interface */
export interface SpecDetailActions {
  selectSpec(spec: SpecMetadata, options?: { silent?: boolean }): Promise<void>;
  clearSelectedSpec(): void;
  refreshSpecDetail(): Promise<void>;
  // Internal setters for SpecSyncService
  setSpecDetail(detail: SpecDetail): void;
  setSpecJson(specJson: SpecDetail['specJson']): void;
  setArtifact(type: ArtifactType, info: ArtifactInfo | null): void;
  setTaskProgress(progress: TaskProgress | null): void;
  setParallelTaskInfo(info: import('../../types').ParallelTaskInfo | null): void;
  /**
   * debatex-document-review Task 3.2: Set project default scheme
   * Called when project is selected and projectDefaults.json is loaded
   */
  setProjectDefaultScheme(scheme: ReviewerScheme | undefined): void;
}

/** Default SpecDetailState values */
export const DEFAULT_SPEC_DETAIL_STATE: SpecDetailState = {
  selectedSpec: null,
  specDetail: null,
  isLoading: false,
  error: null,
  projectDefaultScheme: undefined,
};

// ============================================================
// AutoExecutionStore Types (Requirement 5)
// ============================================================

/**
 * Auto Execution Runtime State (per-spec)
 * Runtime state for auto-execution (not persisted to spec.json)
 */
export interface AutoExecutionRuntimeState {
  /** Auto-executing flag */
  readonly isAutoExecuting: boolean;
  /** Current auto-execution phase */
  readonly currentAutoPhase: WorkflowPhase | null;
  /** Detailed auto-execution status */
  readonly autoExecutionStatus: AutoExecutionStatus;
}

/** Auto Execution Runtime Map type */
export type AutoExecutionRuntimeMap = Map<string, AutoExecutionRuntimeState>;

/** AutoExecutionStore state interface */
export interface AutoExecutionState {
  readonly autoExecutionRuntimeMap: AutoExecutionRuntimeMap;
}

/** AutoExecutionStore actions interface */
export interface AutoExecutionActions {
  getAutoExecutionRuntime(specId: string): AutoExecutionRuntimeState;
  setAutoExecutionRunning(specId: string, isRunning: boolean): void;
  setAutoExecutionPhase(specId: string, phase: WorkflowPhase | null): void;
  setAutoExecutionStatus(specId: string, status: AutoExecutionStatus): void;
  startAutoExecution(specId: string): void;
  stopAutoExecution(specId: string): void;
}

/** Default AutoExecutionRuntimeState values */
export const DEFAULT_AUTO_EXECUTION_RUNTIME: AutoExecutionRuntimeState = {
  isAutoExecuting: false,
  currentAutoPhase: null,
  autoExecutionStatus: 'idle',
};

/** Default AutoExecutionState values */
export const DEFAULT_AUTO_EXECUTION_STATE: AutoExecutionState = {
  autoExecutionRuntimeMap: new Map<string, AutoExecutionRuntimeState>(),
};

// ============================================================
// SpecManagerExecutionStore Types (Requirement 6)
// ============================================================

/** spec-manager phase types */
export type SpecManagerPhase = 'requirements' | 'design' | 'tasks' | 'impl';

/** impl task status types */
export type ImplTaskStatus =
  | 'pending'      // Not started
  | 'running'      // Running
  | 'continuing'   // Continuing (retry)
  | 'success'      // Completed
  | 'error'        // Error
  | 'stalled';     // Retry limit reached

// execution-store-consolidation: CheckImplResult type REMOVED
// Task completion state is now managed via tasks.md (TaskProgress) as SSOT
// Req 6.1: Delete CheckImplResult type

/**
 * SpecManagerExecutionState interface
 * execution-store-consolidation: This is now a derived value interface
 * computed from agentStore, not a separate store state.
 * Req 4.1: Maintain interface shape (except lastCheckResult)
 */
export interface SpecManagerExecutionState {
  readonly isRunning: boolean;
  readonly currentPhase: SpecManagerPhase | null;
  readonly currentSpecId: string | null;
  // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
  // Task completion state is managed via TaskProgress
  readonly error: string | null;
  readonly implTaskStatus: ImplTaskStatus | null;
  readonly retryCount: number;
  readonly executionMode: 'auto' | 'manual' | null;
}

/**
 * SpecManagerExecutionActions interface
 * execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)
 */
export interface SpecManagerExecutionActions {
  executeSpecManagerGeneration(
    specId: string,
    phase: SpecManagerPhase,
    featureName: string,
    taskId: string | undefined,
    executionMode: 'auto' | 'manual'
  ): Promise<void>;
  // execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)
  updateImplTaskStatus(status: ImplTaskStatus, retryCount?: number): void;
  clearSpecManagerError(): void;
}

/** Default SpecManagerExecutionState values */
export const DEFAULT_SPEC_MANAGER_EXECUTION_STATE: SpecManagerExecutionState = {
  isRunning: false,
  currentPhase: null,
  currentSpecId: null,
  // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
  error: null,
  implTaskStatus: null,
  retryCount: 0,
  executionMode: null,
};

// ============================================================
// Combined Store Types (for Facade)
// ============================================================

/** Combined SpecStore state (for Facade compatibility) */
export interface SpecStoreState
  extends SpecListState,
    Omit<SpecDetailState, 'isLoading' | 'error'>,
    AutoExecutionState {
  /** File watching status */
  readonly isWatching: boolean;
  /** spec-manager execution state */
  readonly specManagerExecution: SpecManagerExecutionState;
  /**
   * Bug fix: spec-list-loading-on-item-click
   * Separate loading state for detail panel to prevent list from showing spinner
   * when selecting a spec item
   */
  readonly isDetailLoading: boolean;
}

/** Combined SpecStore actions (for Facade compatibility) */
export interface SpecStoreActions
  extends SpecListActions,
    Omit<SpecDetailActions, 'setSpecDetail' | 'setSpecJson' | 'setArtifact' | 'setTaskProgress' | 'setParallelTaskInfo'>,
    AutoExecutionActions,
    SpecManagerExecutionActions {
  // Note: refreshSpecs removed - File Watcher handles updates automatically
  /** Start file watching */
  startWatching(): Promise<void>;
  /** Stop file watching */
  stopWatching(): Promise<void>;
  // Granular update methods
  updateSpecJson(): Promise<void>;
  updateArtifact(artifact: ArtifactType): Promise<void>;
  // Sync methods
  syncDocumentReviewState(): Promise<void>;
  syncInspectionState(): Promise<void>;
  syncTaskProgress(): Promise<void>;
}

/** Complete SpecStore type (state + actions) */
export type SpecStore = SpecStoreState & SpecStoreActions;
