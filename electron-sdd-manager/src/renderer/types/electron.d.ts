import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  Phase,
  ExecutionResult,
  CommandOutputEvent,
} from './index';

/**
 * Agent status type
 * Requirements: 5.2
 */
export type AgentStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed';

/**
 * Execution group type
 * Requirements: 6.1-6.5
 */
export type ExecutionGroup = 'doc' | 'validate' | 'impl';

/**
 * Workflow phase type
 */
export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy';

/**
 * Validation type
 */
export type ValidationType = 'gap' | 'design' | 'impl';

/**
 * Specs change event type
 */
export interface SpecsChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  specId?: string;
}

/**
 * Agent information interface
 * Requirements: 5.1-5.8
 */
export interface AgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly sessionId: string;
  readonly status: AgentStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;
}

export interface ElectronAPI {
  // File System
  showOpenDialog(): Promise<string | null>;
  validateKiroDirectory(path: string): Promise<KiroValidation>;
  setProjectPath(projectPath: string): Promise<void>;
  readSpecs(projectPath: string): Promise<SpecMetadata[]>;
  readSpecJson(specPath: string): Promise<SpecJson>;
  readArtifact(artifactPath: string): Promise<string>;
  createSpec(projectPath: string, specName: string, description: string): Promise<void>;
  writeFile(filePath: string, content: string): Promise<void>;
  updateApproval(specPath: string, phase: Phase, approved: boolean): Promise<void>;

  // Command Execution
  executeCommand(command: string, workingDirectory: string): Promise<ExecutionResult>;
  cancelExecution(): Promise<void>;
  onCommandOutput(callback: (event: CommandOutputEvent) => void): () => void;

  // Agent Management (Task 27.1)
  // Requirements: 5.1-5.8
  startAgent(
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: ExecutionGroup,
    sessionId?: string
  ): Promise<AgentInfo>;
  stopAgent(agentId: string): Promise<void>;
  resumeAgent(agentId: string): Promise<AgentInfo>;
  getAgents(specId: string): Promise<AgentInfo[]>;
  getAllAgents(): Promise<Record<string, AgentInfo[]>>;
  sendAgentInput(agentId: string, input: string): Promise<void>;

  // Phase Execution (high-level commands)
  executePhase(specId: string, phase: WorkflowPhase, featureName: string): Promise<AgentInfo>;
  executeValidation(specId: string, type: ValidationType, featureName: string): Promise<AgentInfo>;
  executeSpecStatus(specId: string, featureName: string): Promise<AgentInfo>;

  // Agent Events (Task 27.2)
  // Requirements: 9.1-9.10
  onAgentOutput(
    callback: (agentId: string, stream: 'stdout' | 'stderr', data: string) => void
  ): () => void;
  onAgentStatusChange(
    callback: (agentId: string, status: AgentStatus) => void
  ): () => void;

  // Config
  getRecentProjects(): Promise<string[]>;
  addRecentProject(path: string): Promise<void>;

  // Config - Hang Threshold (Task 27.3)
  // Requirements: 13.1, 13.2
  getHangThreshold(): Promise<number>;
  setHangThreshold(thresholdMs: number): Promise<void>;

  // App
  getAppVersion(): Promise<string>;
  getPlatform(): NodeJS.Platform;
  getInitialProjectPath(): Promise<string | null>;

  // Specs Watcher
  startSpecsWatcher(): Promise<void>;
  stopSpecsWatcher(): Promise<void>;
  onSpecsChanged(callback: (event: SpecsChangeEvent) => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
