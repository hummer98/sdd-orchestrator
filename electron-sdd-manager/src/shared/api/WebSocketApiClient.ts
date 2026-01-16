/**
 * WebSocketApiClient - WebSocket implementation of ApiClient
 *
 * This implementation uses WebSocket for communication with the Remote Access Server.
 * Used in the Remote UI web application for real-time bidirectional communication.
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
  BugAutoExecutionState,
} from './types';

// =============================================================================
// WebSocket Message Types
// =============================================================================

interface WebSocketMessage {
  type: string;
  requestId?: string;
  payload?: unknown;
}

interface WebSocketResponse {
  type: string;
  requestId?: string;
  payload?: unknown;
  error?: ApiError;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_ATTEMPTS = 5;

// =============================================================================
// WebSocketApiClient Implementation
// =============================================================================

/**
 * WebSocketApiClient - Implementation of ApiClient using WebSocket
 */
export class WebSocketApiClient implements ApiClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: ApiError) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private requestCounter = 0;
  private reconnectAttempts = 0;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private connectionPromise: Promise<void> | null = null;
  // remote-ui-vanilla-removal: Store project path from INIT message
  private projectPath: string = '';
  private appVersion: string = '';

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  /**
   * Get the current project path received from INIT message
   * remote-ui-vanilla-removal: For E2E testing compatibility
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get the app version received from INIT message
   * remote-ui-vanilla-removal: For E2E testing compatibility
   */
  getAppVersion(): string {
    return this.appVersion;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async connect(): Promise<Result<void, ApiError>> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return { ok: true, value: undefined };
    }

    if (this.connectionPromise) {
      await this.connectionPromise;
      return { ok: true, value: undefined };
    }

    try {
      this.connectionPromise = this.createConnection();
      await this.connectionPromise;
      this.reconnectAttempts = 0;
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to connect',
        },
      };
    } finally {
      this.connectionPromise = null;
    }
  }

  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Include token in URL query parameter
      const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onerror = (_event) => {
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (_event) => {
        this.handleDisconnect();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Clear all pending requests
    for (const [_requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject({ type: 'DISCONNECTED', message: 'WebSocket disconnected' });
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.reconnect();
      }, RECONNECT_DELAY * this.reconnectAttempts);
    }
  }

  private async reconnect(): Promise<void> {
    try {
      await this.connect();
      this.emit('reconnected', undefined);
    } catch {
      // Reconnection failed, will retry via handleDisconnect
    }
  }

  // ===========================================================================
  // Message Handling
  // ===========================================================================

  private handleMessage(data: string): void {
    try {
      const message: WebSocketResponse = JSON.parse(data);

      // Handle response to a request
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const pending = this.pendingRequests.get(message.requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.error) {
          pending.reject(message.error);
        } else {
          pending.resolve(message.payload);
        }
        return;
      }

      // Handle push messages (events)
      this.handlePushMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handlePushMessage(message: WebSocketResponse): void {
    switch (message.type) {
      // remote-ui-vanilla-removal: Handle INIT message for project path
      case 'INIT': {
        const initPayload = message.payload as {
          project?: string;
          version?: string;
          specs?: SpecMetadata[];
          bugs?: BugMetadata[];
        } | undefined;
        if (initPayload?.project) {
          this.projectPath = initPayload.project;
        }
        if (initPayload?.version) {
          this.appVersion = initPayload.version;
        }
        // Emit events for initial data
        if (initPayload?.specs) {
          this.emit('specsUpdated', initPayload.specs);
        }
        if (initPayload?.bugs) {
          this.emit('bugsUpdated', initPayload.bugs);
        }
        this.emit('initialized', initPayload);
        break;
      }
      case 'SPECS_UPDATED':
        this.emit('specsUpdated', message.payload);
        break;
      case 'BUGS_UPDATED':
        this.emit('bugsUpdated', message.payload);
        break;
      case 'AGENT_OUTPUT':
        this.emit('agentOutput', message.payload);
        break;
      case 'AGENT_STATUS_CHANGE':
        this.emit('agentStatusChange', message.payload);
        break;
      case 'AUTO_EXECUTION_STATUS_CHANGED':
        this.emit('autoExecutionStatusChanged', message.payload);
        break;
      // bug-auto-execution-per-bug-state Task 6.1, 6.2: Bug auto execution events
      case 'BUG_AUTO_EXECUTION_STATUS':
        this.emit('bugAutoExecutionStatus', message.payload);
        break;
      case 'BUG_AUTO_EXECUTION_PHASE_COMPLETED':
        this.emit('bugAutoExecutionPhaseCompleted', message.payload);
        break;
      case 'BUG_AUTO_EXECUTION_COMPLETED':
        this.emit('bugAutoExecutionCompleted', message.payload);
        break;
      case 'BUG_AUTO_EXECUTION_ERROR':
        this.emit('bugAutoExecutionError', message.payload);
        break;
      // header-profile-badge feature: profile updates from server
      case 'PROFILE_UPDATED':
        this.emit('profileUpdated', message.payload);
        break;
    }
  }

  // ===========================================================================
  // Request/Response
  // ===========================================================================

  private generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestCounter}`;
  }

  private async sendRequest<T>(type: string, payload?: unknown): Promise<T> {
    if (!this.isConnected()) {
      const connectResult = await this.connect();
      if (!connectResult.ok) {
        throw connectResult.error;
      }
    }

    const requestId = this.generateRequestId();

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject({ type: 'TIMEOUT', message: `Request ${type} timed out` } as ApiError);
      }, DEFAULT_TIMEOUT);

      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      const message: WebSocketMessage = {
        type,
        requestId,
        payload,
      };

      this.ws!.send(JSON.stringify(message));
    });
  }

  private async wrapRequest<T>(
    type: string,
    payload?: unknown
  ): Promise<Result<T, ApiError>> {
    try {
      const value = await this.sendRequest<T>(type, payload);
      return { ok: true, value };
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        return { ok: false, error: error as ApiError };
      }
      return {
        ok: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ===========================================================================
  // Event Emitter
  // ===========================================================================

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  private on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  // ===========================================================================
  // Spec Operations
  // ===========================================================================

  async getSpecs(): Promise<Result<SpecMetadata[], ApiError>> {
    return this.wrapRequest<SpecMetadata[]>('GET_SPECS');
  }

  async getSpecDetail(specId: string): Promise<Result<SpecDetail, ApiError>> {
    return this.wrapRequest<SpecDetail>('GET_SPEC_DETAIL', { specId });
  }

  async executePhase(specId: string, phase: WorkflowPhase): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_PHASE', { specId, phase });
  }

  async updateApproval(
    specPath: string,
    phase: Phase,
    approved: boolean
  ): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('UPDATE_APPROVAL', { specPath, phase, approved });
  }

  // ===========================================================================
  // Bug Operations
  // ===========================================================================

  async getBugs(): Promise<Result<BugMetadata[], ApiError>> {
    return this.wrapRequest<BugMetadata[]>('GET_BUGS');
  }

  async getBugDetail(bugPath: string): Promise<Result<BugDetail, ApiError>> {
    return this.wrapRequest<BugDetail>('GET_BUG_DETAIL', { bugPath });
  }

  async executeBugPhase(bugName: string, action: BugAction): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_BUG_PHASE', { bugName, action });
  }

  // ===========================================================================
  // Agent Operations
  // ===========================================================================

  async getAgents(): Promise<Result<AgentInfo[], ApiError>> {
    return this.wrapRequest<AgentInfo[]>('GET_AGENTS');
  }

  async stopAgent(agentId: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('STOP_AGENT', { agentId });
  }

  async resumeAgent(agentId: string): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('RESUME_AGENT', { agentId });
  }

  async sendAgentInput(agentId: string, text: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('SEND_AGENT_INPUT', { agentId, text });
  }

  async getAgentLogs(specId: string, agentId: string): Promise<Result<LogEntry[], ApiError>> {
    return this.wrapRequest<LogEntry[]>('GET_AGENT_LOGS', { specId, agentId });
  }

  // ===========================================================================
  // Review Operations
  // ===========================================================================

  async executeDocumentReview(specId: string): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_DOCUMENT_REVIEW', { specId });
  }

  async executeInspection(specId: string): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_INSPECTION', { specId });
  }

  // ===========================================================================
  // Auto Execution Operations
  // ===========================================================================

  async startAutoExecution(
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>> {
    return this.wrapRequest<AutoExecutionState>('START_AUTO_EXECUTION', {
      specPath,
      specId,
      options,
    });
  }

  async stopAutoExecution(specPath: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('STOP_AUTO_EXECUTION', { specPath });
  }

  async getAutoExecutionStatus(
    specPath: string
  ): Promise<Result<AutoExecutionState | null, ApiError>> {
    return this.wrapRequest<AutoExecutionState | null>('GET_AUTO_EXECUTION_STATUS', { specPath });
  }

  // ===========================================================================
  // Bug Auto Execution Operations
  // Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
  // ===========================================================================

  /**
   * Get bug auto execution status
   * @param bugPath - Full path to bug directory
   */
  async getBugAutoExecutionStatus(
    bugPath: string
  ): Promise<Result<BugAutoExecutionState | null, ApiError>> {
    interface BugAutoExecutionStatusResponse {
      bugPath: string;
      state: BugAutoExecutionState | null;
    }
    const response = await this.wrapRequest<BugAutoExecutionStatusResponse>(
      'GET_BUG_AUTO_EXECUTION_STATUS',
      { bugPath }
    );
    if (response.ok) {
      return { ok: true, value: response.value.state };
    }
    return response;
  }

  // ===========================================================================
  // File Operations
  // ===========================================================================

  async saveFile(filePath: string, content: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('SAVE_FILE', { filePath, content });
  }

  // ===========================================================================
  // Profile Operations (header-profile-badge feature)
  // Requirements: 3.1, 5.1
  // ===========================================================================

  /**
   * Get installed profile configuration
   * @returns ProfileConfig or null if not installed
   */
  async getProfile(): Promise<Result<{ name: string; installedAt: string } | null, ApiError>> {
    return this.wrapRequest<{ name: string; installedAt: string } | null>('GET_PROFILE');
  }

  // ===========================================================================
  // Event Subscriptions
  // ===========================================================================

  onSpecsUpdated(callback: (specs: SpecMetadata[]) => void): () => void {
    return this.on('specsUpdated', (data) => callback(data as SpecMetadata[]));
  }

  onBugsUpdated(callback: (bugs: BugMetadata[]) => void): () => void {
    return this.on('bugsUpdated', (data) => callback(data as BugMetadata[]));
  }

  onAgentOutput(
    callback: (agentId: string, stream: 'stdout' | 'stderr' | 'stdin', data: string) => void
  ): () => void {
    return this.on('agentOutput', (data) => {
      const payload = data as { agentId: string; stream: 'stdout' | 'stderr' | 'stdin'; data: string };
      callback(payload.agentId, payload.stream, payload.data);
    });
  }

  onAgentStatusChange(callback: (agentId: string, status: AgentStatus) => void): () => void {
    return this.on('agentStatusChange', (data) => {
      const payload = data as { agentId: string; status: AgentStatus };
      callback(payload.agentId, payload.status);
    });
  }

  onAutoExecutionStatusChanged(callback: (data: AutoExecutionStatusEvent) => void): () => void {
    return this.on('autoExecutionStatusChanged', (data) => {
      callback(data as AutoExecutionStatusEvent);
    });
  }
}
