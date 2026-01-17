/**
 * IpcApiClient - Electron IPC implementation of ApiClient
 *
 * This implementation wraps window.electronAPI to provide the ApiClient interface.
 * Used in the Electron renderer process for communication with the main process.
 *
 * Design Decision: DD-002 in design.md
 */

import type {
  ApiClient,
  ApiError,
  Result,
  WorkflowPhase,
  AgentInfo,
  AgentStatus,
  AutoExecutionOptions,
  AutoExecutionState,
  AutoExecutionStatusEvent,
  SpecMetadata,
  SpecDetail,
  Phase,
  LogEntry,
  BugMetadata,
  BugDetail,
  BugAction,
} from './types';

// Get project store for current project path
// Lazy import to avoid circular dependencies
let _projectStore: { getState: () => { currentProject: { path: string } | null } } | null = null;

function getProjectStore() {
  if (!_projectStore) {
    // Dynamic import to avoid circular dependency issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useProjectStore } = require('@renderer/stores/projectStore');
    _projectStore = useProjectStore;
  }
  return _projectStore;
}

function getCurrentProjectPath(): string | null {
  const store = getProjectStore();
  return store?.getState().currentProject?.path ?? null;
}

/**
 * Create an ApiError from an unknown error
 */
function createApiError(error: unknown, type = 'IPC_ERROR'): ApiError {
  if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
    return error as ApiError;
  }
  return {
    type,
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Wrap an async operation in a Result type
 */
async function wrapResult<T>(
  fn: () => Promise<T>,
  errorType = 'IPC_ERROR'
): Promise<Result<T, ApiError>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: createApiError(error, errorType) };
  }
}

/**
 * Check if window.electronAPI is available
 */
function checkElectronAPI(): void {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error('window.electronAPI is not available. IpcApiClient can only be used in Electron renderer.');
  }
}

/**
 * IpcApiClient - Implementation of ApiClient using Electron IPC
 */
export class IpcApiClient implements ApiClient {
  // ===========================================================================
  // Spec Operations
  // ===========================================================================

  async getSpecs(): Promise<Result<SpecMetadata[], ApiError>> {
    checkElectronAPI();
    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
    }
    return wrapResult(() => window.electronAPI.readSpecs(projectPath));
  }

  async getSpecDetail(specId: string): Promise<Result<SpecDetail, ApiError>> {
    checkElectronAPI();
    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
    }
    const specPath = `${projectPath}/.kiro/specs/${specId}`;
    return wrapResult(async () => {
      const specJson = await window.electronAPI.readSpecJson(specPath);
      return {
        metadata: {
          name: specId,
          path: specPath,
          phase: specJson.phase,
          updatedAt: specJson.updated_at,
          approvals: specJson.approvals,
        },
        specJson,
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      } as SpecDetail;
    });
  }

  async executePhase(specId: string, phase: WorkflowPhase): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      // Use unified execute API
      const result = await window.electronAPI.execute({
        type: phase,
        specId,
        featureName: specId,
      });
      return {
        id: result.agentId,
        specId: result.specId,
        phase: result.phase,
        status: result.status as AgentStatus,
        startedAt: result.startedAt,
        endedAt: (result as { endedAt?: string | number }).endedAt,
      } as AgentInfo;
    });
  }

  async updateApproval(
    specPath: string,
    phase: Phase,
    approved: boolean
  ): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.updateApproval(specPath, phase, approved));
  }

  // ===========================================================================
  // Bug Operations
  // ===========================================================================

  async getBugs(): Promise<Result<BugMetadata[], ApiError>> {
    checkElectronAPI();
    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
    }
    return wrapResult(() => window.electronAPI.readBugs(projectPath));
  }

  async getBugDetail(bugPath: string): Promise<Result<BugDetail, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.readBugDetail(bugPath));
  }

  async executeBugPhase(bugName: string, action: BugAction): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
    }

    // Map action to phase command
    const phaseCommand = `/kiro:bug-${action}`;
    return wrapResult(async () => {
      const result = await window.electronAPI.startAgent(
        bugName,
        action,
        'claude',
        ['-p', phaseCommand, bugName]
      );
      return {
        id: result.agentId,
        specId: bugName,
        phase: action,
        status: result.status as AgentStatus,
        startedAt: result.startedAt,
      } as AgentInfo;
    });
  }

  // ===========================================================================
  // Agent Operations
  // ===========================================================================

  async getAgents(): Promise<Result<AgentInfo[], ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const agentsRecord = await window.electronAPI.getAllAgents();
      const agents: AgentInfo[] = [];
      for (const specId of Object.keys(agentsRecord)) {
        const specAgents = agentsRecord[specId];
        for (const agent of specAgents) {
          agents.push({
            id: agent.agentId,
            specId: agent.specId,
            phase: agent.phase,
            status: agent.status as AgentStatus,
            startedAt: agent.startedAt,
            endedAt: (agent as { endedAt?: string | number }).endedAt,
          });
        }
      }
      return agents;
    });
  }

  async stopAgent(agentId: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.stopAgent(agentId));
  }

  async resumeAgent(agentId: string): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const result = await window.electronAPI.resumeAgent(agentId);
      return {
        id: result.agentId,
        specId: result.specId,
        phase: result.phase,
        status: result.status as AgentStatus,
        startedAt: result.startedAt,
      } as AgentInfo;
    });
  }

  async sendAgentInput(agentId: string, text: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.sendAgentInput(agentId, text));
  }

  async getAgentLogs(specId: string, agentId: string): Promise<Result<LogEntry[], ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const logs = await window.electronAPI.getAgentLogs(specId, agentId);
      return logs.map((log, index) => ({
        id: `${agentId}-${index}`,
        stream: log.stream,
        data: log.data,
        timestamp: new Date(log.timestamp).getTime(),
      }));
    });
  }

  // ===========================================================================
  // Review Operations
  // ===========================================================================

  async executeDocumentReview(specId: string): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const result = await window.electronAPI.executeDocumentReview(specId, specId);
      return {
        id: result.agentId,
        specId: result.specId,
        phase: 'document-review',
        status: result.status as AgentStatus,
        startedAt: result.startedAt,
      } as AgentInfo;
    });
  }

  async executeInspection(specId: string): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const result = await window.electronAPI.executeInspection(specId, specId);
      return {
        id: result.agentId,
        specId: result.specId,
        phase: 'inspection',
        status: result.status as AgentStatus,
        startedAt: result.startedAt,
      } as AgentInfo;
    });
  }

  // ===========================================================================
  // Auto Execution Operations
  // ===========================================================================

  async startAutoExecution(
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const result = await window.electronAPI.autoExecutionStart({
        specPath,
        specId,
        options: {
          permissions: options.permissions,
          documentReviewFlag: options.documentReviewFlag,
        },
      });

      if (!result.ok) {
        throw result.error;
      }

      const state = result.value;
      return {
        status: state.status,
        currentPhase: state.currentPhase as WorkflowPhase | undefined,
        completedPhases: state.executedPhases as WorkflowPhase[],
      };
    });
  }

  async stopAutoExecution(specPath: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const result = await window.electronAPI.autoExecutionStop({ specPath });
      if (!result.ok) {
        throw result.error;
      }
    });
  }

  async getAutoExecutionStatus(
    specPath: string
  ): Promise<Result<AutoExecutionState | null, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const state = await window.electronAPI.autoExecutionStatus({ specPath });
      if (!state) return null;
      return {
        status: state.status,
        currentPhase: state.currentPhase as WorkflowPhase | undefined,
        completedPhases: state.executedPhases as WorkflowPhase[],
      };
    });
  }

  // ===========================================================================
  // File Operations
  // ===========================================================================

  async saveFile(filePath: string, content: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.writeFile(filePath, content));
  }

  // ===========================================================================
  // Event Subscriptions
  // ===========================================================================

  onSpecsUpdated(callback: (specs: SpecMetadata[]) => void): () => void {
    checkElectronAPI();
    return window.electronAPI.onSpecsChanged((_event) => {
      // On any change, reload specs
      const projectPath = getCurrentProjectPath();
      if (projectPath) {
        window.electronAPI.readSpecs(projectPath).then(callback);
      }
    });
  }

  onBugsUpdated(callback: (bugs: BugMetadata[]) => void): () => void {
    checkElectronAPI();
    return window.electronAPI.onBugsChanged((_event) => {
      // On any change, reload bugs
      const projectPath = getCurrentProjectPath();
      if (projectPath) {
        window.electronAPI.readBugs(projectPath).then(callback);
      }
    });
  }

  onAgentOutput(
    callback: (agentId: string, stream: 'stdout' | 'stderr' | 'stdin', data: string) => void
  ): () => void {
    checkElectronAPI();
    return window.electronAPI.onAgentOutput((agentId, stream, data) => {
      callback(agentId, stream as 'stdout' | 'stderr' | 'stdin', data);
    });
  }

  onAgentStatusChange(callback: (agentId: string, status: AgentStatus) => void): () => void {
    checkElectronAPI();
    return window.electronAPI.onAgentStatusChange((agentId, status) => {
      callback(agentId, status as AgentStatus);
    });
  }

  onAutoExecutionStatusChanged(callback: (data: AutoExecutionStatusEvent) => void): () => void {
    checkElectronAPI();
    return window.electronAPI.onAutoExecutionStatusChanged((data) => {
      callback({
        specPath: data.specPath,
        status: data.state.status,
        currentPhase: data.state.currentPhase as WorkflowPhase | undefined,
        completedPhases: data.state.executedPhases as WorkflowPhase[],
      });
    });
  }
}
