// Spec-Driven Development Types

export type SpecPhase =
  | 'initialized'
  | 'requirements-generated'
  | 'design-generated'
  | 'tasks-generated'
  | 'implementation-in-progress'
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

export interface SpecJson {
  feature_name: string;
  created_at: string;
  updated_at: string;
  language: 'ja' | 'en';
  phase: SpecPhase;
  approvals: ApprovalStatus;
  ready_for_implementation: boolean;
}

export interface SpecMetadata {
  readonly name: string;
  readonly path: string;
  readonly phase: SpecPhase;
  readonly updatedAt: string;
  readonly approvals: ApprovalStatus;
  readonly readyForImplementation: boolean;
}

export interface SpecDetail {
  metadata: SpecMetadata;
  specJson: SpecJson;
  artifacts: {
    requirements: ArtifactInfo | null;
    design: ArtifactInfo | null;
    tasks: ArtifactInfo | null;
    research: ArtifactInfo | null;
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
