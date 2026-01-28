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
  // main-process-log-parser Task 10.4: LogEntry import removed - now using ParsedLogEntry
  BugMetadata,
  BugDetail,
  BugAction,
  BugsChangeEvent,
  // main-process-log-parser Task 10.2: Import ParsedLogEntry for onAgentLog
  ParsedLogEntry,
} from './types';

function getCurrentProjectPath(): string | null {
  if (typeof window === 'undefined') return null;
  // Use globally exposed stores to avoid circular dependency and require() issues in renderer
  const stores = (window as any).__STORES__;
  return stores?.project?.getState().currentProject ?? null;
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
  // Project Operations
  // auto-execution-projectpath-fix Task 4.5
  // ===========================================================================

  /**
   * Get the current project path from projectStore
   */
  getProjectPath(): string {
    return getCurrentProjectPath() ?? '';
  }

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
        parallelTaskInfo: null,
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
    // Bug fix: empty bug directory handling - extract bugs from ReadBugsResult
    const result = await wrapResult(() => window.electronAPI.readBugs(projectPath));
    if (!result.ok) {
      return result;
    }
    // Log warnings to console (IpcApiClient doesn't have access to toast)
    if (result.value.warnings.length > 0) {
      console.warn('[IpcApiClient] Bug warnings:', result.value.warnings);
    }
    return { ok: true, value: result.value.bugs };
  }

  async getBugDetail(bugPath: string): Promise<Result<BugDetail, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.readBugDetail(bugPath));
  }

  async executeBugPhase(
    bugName: string,
    action: BugAction,
    _options?: { useWorktree?: boolean } // Reserved for future use
  ): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
    }

    // Map action to phase command
    const phaseCommand = `/kiro:bug-${action}`;
    // Note: useWorktree option is not yet supported via IPC
    // Task 6.3 (remote-ui-bug-advanced-features): WebSocket API supports useWorktree
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
            // Bug fix: agent-command-missing-in-remote-ui
            // Include command and sessionId for agent log display
            command: agent.command,
            sessionId: agent.sessionId,
            engineId: agent.engineId,
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

  /**
   * Get logs for a specific agent
   * main-process-log-parser Task 10.4: Updated to return ParsedLogEntry[]
   * Converts raw LogEntry from file to ParsedLogEntry format
   */
  async getAgentLogs(specId: string, agentId: string): Promise<Result<ParsedLogEntry[], ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      const logs = await window.electronAPI.getAgentLogs(specId, agentId);
      // Convert LogEntry to ParsedLogEntry format
      // main-process-log-parser Task 10.4: Temporary converter until Main process returns ParsedLogEntry
      // Note: log.stream can be 'stdout' | 'stderr' (stdin is not returned from file logs)
      return logs.map((log, index) => ({
        id: `${agentId}-${index}`,
        type: 'text' as const,  // File logs are always stdout/stderr, not stdin
        timestamp: new Date(log.timestamp).getTime(),
        text: {
          content: log.data,
          role: 'assistant' as const,
        },
      }));
    });
  }

  // ===========================================================================
  // release-button-api-fix: Task 5.2 - executeProjectCommand
  // Requirements: 1.1, 4.4
  // ===========================================================================

  async executeProjectCommand(command: string, title: string): Promise<Result<AgentInfo, ApiError>> {
    checkElectronAPI();
    const projectPath = getCurrentProjectPath();
    if (!projectPath) {
      return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
    }
    return wrapResult(async () => {
      const result = await window.electronAPI.executeProjectCommand(projectPath, command, title);
      return {
        id: result.agentId,
        specId: result.specId,
        phase: result.phase,
        status: result.status as AgentStatus,
        startedAt: result.startedAt,
      } as AgentInfo;
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
  // auto-execution-projectpath-fix: Task 4.4 - Added projectPath parameter
  // ===========================================================================

  async startAutoExecution(
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>> {
    checkElectronAPI();
    return wrapResult(async () => {
      // document-review-phase Task 8.1: documentReviewFlag removed
      // Use permissions['document-review'] instead
      const result = await window.electronAPI.autoExecutionStart({
        projectPath,
        specPath,
        specId,
        options: {
          permissions: options.permissions,
          // documentReviewFlag removed - use permissions['document-review'] instead
        },
      });

      if (!result.ok) {
        throw result.error;
      }

      const state = result.value;
      return {
        // projectPath is returned from the caller's argument, not from state
        // The internal AutoExecutionState stores projectPath but the IPC response
        // uses the serializable state which may not include it
        projectPath,
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
      // Bug fix: empty bug directory handling - extract bugs from ReadBugsResult
      const projectPath = getCurrentProjectPath();
      if (projectPath) {
        window.electronAPI.readBugs(projectPath).then((result) => {
          if (result.warnings.length > 0) {
            console.warn('[IpcApiClient] Bug warnings:', result.warnings);
          }
          callback(result.bugs);
        });
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

  // ===========================================================================
  // main-process-log-parser Task 10.2: onAgentLog implementation
  // Requirements: 3.1
  // ===========================================================================

  onAgentLog(callback: (agentId: string, log: ParsedLogEntry) => void): () => void {
    checkElectronAPI();
    return window.electronAPI.onAgentLog((agentId, log) => {
      callback(agentId, log);
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

  // ===========================================================================
  // Bug Monitoring Operations (bugs-view-unification)
  // Task 1.2: IpcApiClient implementation
  // Requirements: 4.5, 4.7
  // ===========================================================================

  async switchAgentWatchScope(specId: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.switchAgentWatchScope(specId));
  }

  async startBugsWatcher(): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.startBugsWatcher());
  }

  async stopBugsWatcher(): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    return wrapResult(() => window.electronAPI.stopBugsWatcher());
  }

  onBugsChanged(listener: (event: BugsChangeEvent) => void): () => void {
    checkElectronAPI();
    // IPC already sends BugsChangeEvent format, so no conversion needed
    return window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
      listener(event);
    });
  }

  // ===========================================================================
  // Git Diff Viewer Operations (Task 15.7)
  // Requirements: 10.2
  // ===========================================================================

  async getGitStatus(projectPath: string): Promise<Result<import('./types').GitStatusResult, ApiError>> {
    checkElectronAPI();
    // Convert from shared/types Result format (success/data) to shared/api/types Result format (ok/value)
    const result = await window.electronAPI.git.getGitStatus(projectPath);
    if (result.success) {
      return { ok: true, value: result.data };
    } else {
      return { ok: false, error: result.error };
    }
  }

  async getGitDiff(projectPath: string, filePath: string): Promise<Result<string, ApiError>> {
    checkElectronAPI();
    // Convert from shared/types Result format (success/data) to shared/api/types Result format (ok/value)
    const result = await window.electronAPI.git.getGitDiff(projectPath, filePath);
    if (result.success) {
      return { ok: true, value: result.data };
    } else {
      return { ok: false, error: result.error };
    }
  }

  async startWatching(projectPath: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    // Convert from shared/types Result format (success/data) to shared/api/types Result format (ok/value)
    const result = await window.electronAPI.git.startWatching(projectPath);
    if (result.success) {
      return { ok: true, value: result.data };
    } else {
      return { ok: false, error: result.error };
    }
  }

  async stopWatching(projectPath: string): Promise<Result<void, ApiError>> {
    checkElectronAPI();
    // Convert from shared/types Result format (success/data) to shared/api/types Result format (ok/value)
    const result = await window.electronAPI.git.stopWatching(projectPath);
    if (result.success) {
      return { ok: true, value: result.data };
    } else {
      return { ok: false, error: result.error };
    }
  }
}
