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

// ============================================================
// spec-metadata-ssot-refactor: Extended type for display with phase info
// ============================================================

/**
 * Extended SpecMetadata with phase info for display
 * spec-metadata-ssot-refactor: SpecListItem needs phase/updatedAt for display
 */
export interface SpecMetadataWithPhase extends SpecMetadata {
  readonly phase: SpecPhase;
  readonly updatedAt: string;
}

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
  loadSpecs(projectPath: string): Promise<void>;
  /** spec-metadata-ssot-refactor: Load specJsons for all specs */
  loadSpecJsons(projectPath: string): Promise<void>;
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
}

/** Default SpecDetailState values */
export const DEFAULT_SPEC_DETAIL_STATE: SpecDetailState = {
  selectedSpec: null,
  specDetail: null,
  isLoading: false,
  error: null,
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

/** impl completion analysis result */
export interface CheckImplResult {
  readonly status: 'success';
  readonly completedTasks: readonly string[];
  readonly stats: {
    readonly num_turns: number;
    readonly duration_ms: number;
    readonly total_cost_usd: number;
  };
}

/** SpecManagerExecutionStore state interface */
export interface SpecManagerExecutionState {
  readonly isRunning: boolean;
  readonly currentPhase: SpecManagerPhase | null;
  readonly currentSpecId: string | null;
  readonly lastCheckResult: CheckImplResult | null;
  readonly error: string | null;
  readonly implTaskStatus: ImplTaskStatus | null;
  readonly retryCount: number;
  readonly executionMode: 'auto' | 'manual' | null;
}

/** SpecManagerExecutionStore actions interface */
export interface SpecManagerExecutionActions {
  executeSpecManagerGeneration(
    specId: string,
    phase: SpecManagerPhase,
    featureName: string,
    taskId: string | undefined,
    executionMode: 'auto' | 'manual'
  ): Promise<void>;
  handleCheckImplResult(result: CheckImplResult): void;
  updateImplTaskStatus(status: ImplTaskStatus, retryCount?: number): void;
  clearSpecManagerError(): void;
}

/** Default SpecManagerExecutionState values */
export const DEFAULT_SPEC_MANAGER_EXECUTION_STATE: SpecManagerExecutionState = {
  isRunning: false,
  currentPhase: null,
  currentSpecId: null,
  lastCheckResult: null,
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
}

/** Combined SpecStore actions (for Facade compatibility) */
export interface SpecStoreActions
  extends SpecListActions,
    Omit<SpecDetailActions, 'setSpecDetail' | 'setSpecJson' | 'setArtifact' | 'setTaskProgress'>,
    AutoExecutionActions,
    SpecManagerExecutionActions {
  /** Refresh specs from file system */
  refreshSpecs(): Promise<void>;
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
