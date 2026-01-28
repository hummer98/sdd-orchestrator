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
  // main-process-log-parser Task 10.3: LogEntry import removed - now using ParsedLogEntry
  BugMetadata,
  BugDetail,
  BugAction,
  BugAutoExecutionState,
  BugAutoExecutionPermissions,
  BugsChangeEvent,
  // main-process-log-parser Task 10.2: Import ParsedLogEntry for onAgentLog
  ParsedLogEntry,
} from './types';
import type { ExecuteOptions } from '../types/executeOptions';

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
const MAX_RECONNECT_ATTEMPTS = 5;

// =============================================================================
// safari-websocket-stability: Heartbeat Configuration
// Requirements: 1.1, 1.5, 1.6, 1.7
// =============================================================================

/** Heartbeat interval in milliseconds (20 seconds) */
const HEARTBEAT_INTERVAL = 20000;
/** Maximum consecutive missed PONGs before forcing reconnect (2) */
const MAX_MISSED_PONGS = 2;
/** Visibility change PING timeout in milliseconds (10 seconds) */
const VISIBILITY_PING_TIMEOUT = 10000;

// =============================================================================
// safari-websocket-stability: Exponential Backoff Configuration
// Requirements: 3.1, 3.2, 3.3
// =============================================================================

/** Initial backoff delay in milliseconds (1 second) */
const INITIAL_BACKOFF = 1000;
/** Maximum backoff delay in milliseconds (30 seconds) */
const MAX_BACKOFF = 30000;
/** Backoff multiplier for exponential growth */
const BACKOFF_MULTIPLIER = 2;

// =============================================================================
// Debug Logging
// =============================================================================

/**
 * Check if debug logging is enabled
 * Enable via: localStorage.setItem('WS_API_DEBUG', 'true')
 * Or window.__WS_API_DEBUG = true
 */
function isDebugEnabled(): boolean {
  if (typeof window !== 'undefined') {
    // Check window flag (for E2E tests)
    if ((window as unknown as { __WS_API_DEBUG?: boolean }).__WS_API_DEBUG) {
      return true;
    }
    // Check localStorage
    try {
      return localStorage.getItem('WS_API_DEBUG') === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Debug log helper
 */
function debugLog(category: string, message: string, data?: unknown): void {
  if (isDebugEnabled()) {
    const timestamp = new Date().toISOString();
    if (data !== undefined) {
      console.log(`[WS-API][${timestamp}][${category}] ${message}`, data);
    } else {
      console.log(`[WS-API][${timestamp}][${category}] ${message}`);
    }
  }
}

// =============================================================================
// Bug Change Detection (bugs-view-unification)
// Task 1.3: WebSocket event format normalization
// Requirements: 4.7
// =============================================================================

/**
 * Detect changes between previous and current bug lists
 * Converts WebSocket full-update format to BugsChangeEvent[] for differential updates
 * @param previousBugs - Previous bug list
 * @param currentBugs - Current bug list
 * @returns Array of BugsChangeEvent
 */
export function detectBugsChanges(
  previousBugs: BugMetadata[],
  currentBugs: BugMetadata[]
): BugsChangeEvent[] {
  const events: BugsChangeEvent[] = [];
  const prevMap = new Map(previousBugs.map(b => [b.name, b]));
  const currMap = new Map(currentBugs.map(b => [b.name, b]));

  // Detect additions and changes
  for (const [name, bug] of currMap) {
    const prev = prevMap.get(name);
    if (!prev) {
      // New bug added
      events.push({ type: 'add', path: '', bugName: name });
    } else if (prev.updatedAt !== bug.updatedAt || prev.phase !== bug.phase) {
      // Bug changed (updatedAt or phase changed)
      events.push({ type: 'change', path: '', bugName: name });
    }
  }

  // Detect deletions
  for (const [name] of prevMap) {
    if (!currMap.has(name)) {
      events.push({ type: 'unlinkDir', path: '', bugName: name });
    }
  }

  return events;
}

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
  // bugs-view-unification: Track previous bugs for differential update detection
  private previousBugs: BugMetadata[] = [];

  // ===========================================================================
  // safari-websocket-stability: Heartbeat State
  // Requirements: 1.1, 1.5, 1.6, 1.7
  // ===========================================================================
  /** Heartbeat interval timer */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  /** Count of consecutive missed PONG responses */
  private missedPongCount = 0;
  /** Timestamp of last PING sent (for RTT calculation in handlePong) */
  private lastPingTime: number | null = null;
  /** Visibility change PING timeout */
  private visibilityPingTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Flag for pending visibility PING */
  private pendingVisibilityPing = false;
  /** Bound visibility change handler for cleanup */
  private boundVisibilityHandler: (() => void) | null = null;

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
    debugLog('CONNECT', 'connect() called', { readyState: this.ws?.readyState });

    if (this.ws?.readyState === WebSocket.OPEN) {
      debugLog('CONNECT', 'already connected');
      return { ok: true, value: undefined };
    }

    if (this.connectionPromise) {
      debugLog('CONNECT', 'waiting for existing connection promise');
      await this.connectionPromise;
      return { ok: true, value: undefined };
    }

    try {
      debugLog('CONNECT', 'creating new connection');
      this.connectionPromise = this.createConnection();
      await this.connectionPromise;
      this.reconnectAttempts = 0;
      debugLog('CONNECT', 'connection established successfully');
      // safari-websocket-stability: Start heartbeat and visibility monitor on successful connection
      this.startHeartbeat();
      this.startVisibilityMonitor();
      return { ok: true, value: undefined };
    } catch (error) {
      debugLog('CONNECT', 'connection failed', error);
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
    // safari-websocket-stability: Stop heartbeat and visibility monitor on disconnect
    this.stopHeartbeat();
    this.stopVisibilityMonitor();

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
    // safari-websocket-stability: Stop heartbeat on disconnect
    this.stopHeartbeat();

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      // safari-websocket-stability: Use exponential backoff for reconnection delay
      const delay = this.calculateBackoffDelay(this.reconnectAttempts);
      debugLog('RECONNECT', `scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      this.emit('reconnectScheduled', { attempt: this.reconnectAttempts, delay });
      setTimeout(() => {
        this.reconnect();
      }, delay);
    }
  }

  // ===========================================================================
  // safari-websocket-stability: Exponential Backoff
  // Requirements: 3.1, 3.2, 3.3
  // ===========================================================================

  /**
   * Calculate backoff delay using exponential backoff
   * Formula: min(INITIAL_BACKOFF * BACKOFF_MULTIPLIER^(attempt-1), MAX_BACKOFF)
   * Result: 1s -> 2s -> 4s -> 8s -> 16s -> 30s (capped)
   * @param attempt - Current reconnection attempt number (1-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = INITIAL_BACKOFF * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
    return Math.min(delay, MAX_BACKOFF);
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
      debugLog('MESSAGE', `received: ${message.type}`, {
        requestId: message.requestId,
        hasPayload: !!message.payload,
        hasError: !!message.error,
      });

      // Handle response to a request
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        debugLog('MESSAGE', `matched pending request: ${message.requestId}`);
        const pending = this.pendingRequests.get(message.requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.error) {
          debugLog('MESSAGE', `request error: ${message.requestId}`, message.error);
          pending.reject(message.error);
        } else {
          debugLog('MESSAGE', `request success: ${message.requestId}`);
          pending.resolve(message.payload);
        }
        return;
      }

      // Handle push messages (events)
      debugLog('MESSAGE', `push message: ${message.type}`);
      this.handlePushMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      debugLog('MESSAGE', 'parse error', { error, data: data.substring(0, 200) });
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
          // bugs-view-unification: Initialize previousBugs for differential update detection
          this.previousBugs = [...initPayload.bugs];
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
        // bugs-view-unification: Also emit bugsChanged for differential update subscribers
        // Handle both array format and object format with bugs field
        if (Array.isArray(message.payload)) {
          this.emit('bugsChanged', message.payload);
        } else if (message.payload && typeof message.payload === 'object' && 'bugs' in message.payload) {
          this.emit('bugsChanged', (message.payload as { bugs: BugMetadata[] }).bugs);
        }
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
      // remote-ui-bug-advanced-features Task 2.2: Added STARTED, STOPPED events
      case 'BUG_AUTO_EXECUTION_STARTED':
        this.emit('bugAutoExecutionStarted', message.payload);
        break;
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
      case 'BUG_AUTO_EXECUTION_STOPPED':
        this.emit('bugAutoExecutionStopped', message.payload);
        break;
      // header-profile-badge feature: profile updates from server
      case 'PROFILE_UPDATED':
        this.emit('profileUpdated', message.payload);
        break;
      // safari-websocket-stability: Handle PONG response for heartbeat
      // Requirements: 1.3, 1.4
      case 'PONG': {
        const pongPayload = message.payload as { timestamp?: number } | undefined;
        this.handlePong(pongPayload?.timestamp);
        break;
      }
    }
  }

  // ===========================================================================
  // Request/Response
  // ===========================================================================

  private generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestCounter}`;
  }

  private async sendRequest<T>(type: string, payload?: unknown): Promise<T> {
    debugLog('REQUEST', `sendRequest: ${type}`, { payload });

    if (!this.isConnected()) {
      debugLog('REQUEST', 'not connected, connecting first');
      const connectResult = await this.connect();
      if (!connectResult.ok) {
        debugLog('REQUEST', 'connection failed', connectResult.error);
        throw connectResult.error;
      }
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();
    debugLog('REQUEST', `sending: ${type}`, { requestId, payload });

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        debugLog('REQUEST', `TIMEOUT: ${type}`, { requestId, elapsed, pendingCount: this.pendingRequests.size });
        this.pendingRequests.delete(requestId);
        reject({ type: 'TIMEOUT', message: `Request ${type} timed out after ${elapsed}ms` } as ApiError);
      }, DEFAULT_TIMEOUT);

      this.pendingRequests.set(requestId, {
        resolve: (value: unknown) => {
          const elapsed = Date.now() - startTime;
          debugLog('REQUEST', `resolved: ${type}`, { requestId, elapsed });
          resolve(value as T);
        },
        reject: (error: ApiError) => {
          const elapsed = Date.now() - startTime;
          debugLog('REQUEST', `rejected: ${type}`, { requestId, elapsed, error });
          reject(error);
        },
        timeout,
      });

      const message: WebSocketMessage = {
        type,
        requestId,
        payload,
      };

      this.ws!.send(JSON.stringify(message));
      debugLog('REQUEST', `sent: ${type}`, { requestId });
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
  // safari-websocket-stability: Heartbeat Management
  // Requirements: 1.1, 1.2, 1.5, 1.6, 1.7
  // ===========================================================================

  /**
   * Start heartbeat timer to send PING every HEARTBEAT_INTERVAL
   * Should be called after successful connection
   */
  private startHeartbeat(): void {
    // Stop any existing heartbeat first
    this.stopHeartbeat();

    debugLog('HEARTBEAT', 'starting heartbeat timer');
    this.missedPongCount = 0;

    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat timer
   * Should be called on disconnect or before reconnection
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      debugLog('HEARTBEAT', 'stopping heartbeat timer');
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    // Also clear visibility ping timeout
    if (this.visibilityPingTimeout) {
      clearTimeout(this.visibilityPingTimeout);
      this.visibilityPingTimeout = null;
    }
    this.pendingVisibilityPing = false;
  }

  /**
   * Send a PING message to the server
   * Format: { type: 'PING', timestamp: <number> }
   */
  private sendPing(): void {
    if (!this.isConnected()) {
      debugLog('HEARTBEAT', 'cannot send PING - not connected');
      return;
    }

    const timestamp = Date.now();
    this.lastPingTime = timestamp;
    this.missedPongCount++;

    debugLog('HEARTBEAT', `sending PING (missedPongCount: ${this.missedPongCount})`, { timestamp });

    // Check if connection is dead (consecutive PONG misses)
    if (this.missedPongCount >= MAX_MISSED_PONGS) {
      debugLog('HEARTBEAT', 'connection dead - forcing reconnect');
      this.emit('connectionDead', undefined);
      this.forceReconnect();
      return;
    }

    // Send PING message
    const message = {
      type: 'PING',
      timestamp,
    };

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      debugLog('HEARTBEAT', 'failed to send PING', error);
    }
  }

  /**
   * Handle PONG response from server
   * Resets the missed PONG counter
   * @param timestamp - The timestamp echoed back from PING (optional)
   */
  private handlePong(timestamp?: number): void {
    // Calculate latency using echoed timestamp or lastPingTime
    const pingTime = timestamp ?? this.lastPingTime;
    const latency = pingTime ? Date.now() - pingTime : null;
    debugLog('HEARTBEAT', 'received PONG', { timestamp, latency });

    // Clear lastPingTime after processing
    this.lastPingTime = null;

    // Reset missed count on successful PONG
    this.missedPongCount = 0;

    // Clear visibility ping timeout if waiting for PONG
    if (this.pendingVisibilityPing) {
      this.pendingVisibilityPing = false;
      if (this.visibilityPingTimeout) {
        clearTimeout(this.visibilityPingTimeout);
        this.visibilityPingTimeout = null;
      }
      debugLog('HEARTBEAT', 'visibility ping confirmed - connection healthy');
    }
  }

  /**
   * Send immediate PING for visibility recovery
   * Used when page becomes visible to quickly verify connection
   * @param timeoutMs - Timeout for PONG response (default: VISIBILITY_PING_TIMEOUT)
   * @returns Promise that resolves to true if PONG received, false if timeout
   */
  private sendImmediatePing(timeoutMs: number = VISIBILITY_PING_TIMEOUT): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve(false);
        return;
      }

      this.pendingVisibilityPing = true;
      const timestamp = Date.now();

      debugLog('HEARTBEAT', 'sending immediate PING for visibility check', { timestamp, timeoutMs });

      // Set timeout for PONG response
      this.visibilityPingTimeout = setTimeout(() => {
        if (this.pendingVisibilityPing) {
          debugLog('HEARTBEAT', 'visibility ping timeout - forcing reconnect');
          this.pendingVisibilityPing = false;
          this.forceReconnect();
          resolve(false);
        }
      }, timeoutMs);

      // Send PING
      const message = {
        type: 'PING',
        timestamp,
      };

      try {
        this.ws!.send(JSON.stringify(message));
        // Note: handlePong will clear timeout and resolve true
        // This promise just tracks the timeout case
      } catch (error) {
        debugLog('HEARTBEAT', 'failed to send immediate PING', error);
        this.pendingVisibilityPing = false;
        if (this.visibilityPingTimeout) {
          clearTimeout(this.visibilityPingTimeout);
          this.visibilityPingTimeout = null;
        }
        resolve(false);
      }
    });
  }

  /**
   * Force reconnection by closing current connection
   */
  private forceReconnect(): void {
    debugLog('RECONNECT', 'forcing reconnection');
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      // Note: onclose handler will trigger handleDisconnect -> reconnect
    }
  }

  // ===========================================================================
  // safari-websocket-stability: Visibility Change Monitor
  // Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
  // ===========================================================================

  /**
   * Start monitoring document visibility changes
   * Used to detect when page becomes visible after being hidden
   */
  private startVisibilityMonitor(): void {
    if (typeof document === 'undefined') {
      debugLog('VISIBILITY', 'document not available - skipping visibility monitor');
      return;
    }

    // Clean up existing handler if any
    this.stopVisibilityMonitor();

    this.boundVisibilityHandler = () => {
      this.handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    debugLog('VISIBILITY', 'started visibility monitor');
  }

  /**
   * Stop monitoring document visibility changes
   */
  private stopVisibilityMonitor(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
      debugLog('VISIBILITY', 'stopped visibility monitor');
    }
  }

  /**
   * Handle document visibility change event
   * When page becomes visible:
   * - If disconnected: immediately try to reconnect
   * - If connected: send immediate PING to verify connection health
   */
  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const visibilityState = document.visibilityState;
    debugLog('VISIBILITY', `visibility changed to: ${visibilityState}`);

    if (visibilityState === 'visible') {
      // Page became visible - check connection
      if (!this.isConnected()) {
        // Connection is down - try to reconnect immediately
        debugLog('VISIBILITY', 'page visible but disconnected - reconnecting');
        this.reconnect();
      } else {
        // Connection appears up - send immediate PING to verify
        debugLog('VISIBILITY', 'page visible and connected - verifying with PING');
        this.sendImmediatePing();
      }
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

  /**
   * Unified execute method with ExecuteOptions
   * execute-method-unification: Task 6.2
   */
  async execute(options: ExecuteOptions): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE', { options });
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

  async executeBugPhase(
    bugName: string,
    action: BugAction,
    options?: { useWorktree?: boolean }
  ): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_BUG_PHASE', {
      bugName,
      action,
      useWorktree: options?.useWorktree,
    });
  }

  /**
   * Create a new bug
   * Requirements: 5.1 (remote-ui-bug-advanced-features Task 2.1)
   * @param name - Bug name (directory name)
   * @param description - Bug description
   */
  async createBug(name: string, description: string): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('CREATE_BUG', { name, description });
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

  /**
   * Get logs for a specific agent
   * main-process-log-parser Task 10.3: Updated to return ParsedLogEntry[]
   */
  async getAgentLogs(specId: string, agentId: string): Promise<Result<ParsedLogEntry[], ApiError>> {
    // main-process-log-parser Task 10.3: Server now returns ParsedLogEntry[]
    return this.wrapRequest<ParsedLogEntry[]>('GET_AGENT_LOGS', { specId, agentId });
  }

  /**
   * Execute project-level command
   * release-button-api-fix: Task 5.3 - Stub implementation
   * Requirements: 1.1
   * Remote UI support is out of scope - returns NOT_IMPLEMENTED error
   * @param _command - Command string to execute (unused in stub)
   * @param _title - Display title for Agent list (unused in stub)
   */
  async executeProjectCommand(
    _command: string,
    _title: string
  ): Promise<Result<AgentInfo, ApiError>> {
    return {
      ok: false,
      error: {
        type: 'NOT_IMPLEMENTED',
        message: 'executeProjectCommand is not yet supported via WebSocket',
      },
    };
  }

  /**
   * Execute project-level ask command (DEPRECATED)
   * release-button-api-fix: Kept for Remote UI backward compatibility
   * Remote UI migration is out of scope - will be migrated in a future release
   * @deprecated Use executeProjectCommand with '/kiro:project-ask "${prompt}"' instead
   * @param prompt - Question/prompt to ask
   */
  async executeAskProject(prompt: string): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_ASK_PROJECT', { prompt });
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

  /**
   * Update document review scheme for a spec
   * gemini-document-review: Remote UI scheme change support
   * @param specPath - Full path to spec directory
   * @param scheme - New reviewer scheme
   */
  async updateDocumentReviewScheme(
    specPath: string,
    scheme: string
  ): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('UPDATE_DOCUMENT_REVIEW_SCHEME', { specPath, scheme });
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
    // Message type matches WebSocketHandler.handleAutoExecuteStart
    const response = await this.wrapRequest<{ state: AutoExecutionState }>('AUTO_EXECUTE_START', {
      projectPath,
      specPath,
      specId,
      options,
    });
    if (response.ok) {
      return { ok: true, value: response.value.state };
    }
    return response;
  }

  async stopAutoExecution(specPath: string): Promise<Result<void, ApiError>> {
    // Message type matches WebSocketHandler.handleAutoExecuteStop
    return this.wrapRequest<void>('AUTO_EXECUTE_STOP', { specPath });
  }

  async getAutoExecutionStatus(
    specPath: string
  ): Promise<Result<AutoExecutionState | null, ApiError>> {
    // Message type matches WebSocketHandler.handleAutoExecuteStatus
    const response = await this.wrapRequest<{ specPath: string; state: AutoExecutionState | null }>('AUTO_EXECUTE_STATUS', { specPath });
    if (response.ok) {
      return { ok: true, value: response.value.state };
    }
    return response;
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

  /**
   * Start bug auto execution
   * Requirements: 4.1 (remote-ui-bug-advanced-features Task 1.2)
   * @param bugPath - Full path to bug directory
   * @param permissions - Permissions for each phase
   */
  async startBugAutoExecution(
    bugPath: string,
    permissions: BugAutoExecutionPermissions
  ): Promise<Result<BugAutoExecutionState, ApiError>> {
    interface BugAutoExecutionStartedResponse {
      bugPath: string;
      state: BugAutoExecutionState;
    }
    const response = await this.wrapRequest<BugAutoExecutionStartedResponse>(
      'START_BUG_AUTO_EXECUTION',
      { bugPath, permissions }
    );
    if (response.ok) {
      return { ok: true, value: response.value.state };
    }
    return response;
  }

  /**
   * Stop bug auto execution
   * Requirements: 4.2 (remote-ui-bug-advanced-features Task 1.2)
   * @param bugPath - Full path to bug directory
   */
  async stopBugAutoExecution(bugPath: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('STOP_BUG_AUTO_EXECUTION', { bugPath });
  }

  // ===========================================================================
  // File Operations
  // ===========================================================================

  async saveFile(filePath: string, content: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('SAVE_FILE', { filePath, content });
  }

  /**
   * Get artifact content
   * remote-ui-artifact-editor: For Remote UI ArtifactEditor
   * @param specId - Spec/Bug identifier
   * @param artifactType - Artifact type (requirements, design, tasks, research, etc.)
   * @param entityType - Entity type (spec or bug), defaults to 'spec'
   */
  async getArtifactContent(
    specId: string,
    artifactType: string,
    entityType: 'spec' | 'bug' = 'spec'
  ): Promise<Result<string, ApiError>> {
    const response = await this.wrapRequest<{ content: string }>('GET_ARTIFACT_CONTENT', {
      specId,
      artifactType,
      entityType,
    });
    if (response.ok) {
      // Handle case where content might be nested or directly returned
      const content = response.value?.content ?? (typeof response.value === 'string' ? response.value : '');
      return { ok: true, value: content };
    }
    return response;
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
    return this.on('bugsUpdated', (data) => {
      // Handle both array format (INIT) and object format (BUGS_UPDATED broadcast)
      if (Array.isArray(data)) {
        callback(data as BugMetadata[]);
      } else if (data && typeof data === 'object' && 'bugs' in data) {
        callback((data as { bugs: BugMetadata[] }).bugs);
      }
    });
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

  // ===========================================================================
  // main-process-log-parser Task 10.2: onAgentLog implementation
  // Requirements: 3.1, 3.2
  // ===========================================================================

  onAgentLog(callback: (agentId: string, log: ParsedLogEntry) => void): () => void {
    return this.on('agent-log', (data) => {
      const payload = data as { agentId: string; log: ParsedLogEntry };
      callback(payload.agentId, payload.log);
    });
  }

  onAutoExecutionStatusChanged(callback: (data: AutoExecutionStatusEvent) => void): () => void {
    return this.on('autoExecutionStatusChanged', (data) => {
      callback(data as AutoExecutionStatusEvent);
    });
  }

  // ===========================================================================
  // Worktree Operations (convert-spec-to-worktree feature)
  // Requirements: 4.1, 4.2, 4.3
  // ===========================================================================

  // ===========================================================================
  // Spec Plan Operations (remote-ui-create-buttons feature)
  // Requirements: 3.2
  // ===========================================================================

  /**
   * Execute spec-plan to create a new spec via interactive dialogue
   * @param description - Spec description for planning dialogue
   * @param worktreeMode - Whether to create in worktree mode
   * @returns AgentInfo on success
   */
  async executeSpecPlan(
    description: string,
    worktreeMode: boolean
  ): Promise<Result<AgentInfo, ApiError>> {
    return this.wrapRequest<AgentInfo>('EXECUTE_SPEC_PLAN', {
      description,
      worktreeMode,
    });
  }

  // ===========================================================================
  // Spec JSON Operations (auto-execution-ssot feature)
  // ===========================================================================

  /**
   * Update spec.json with partial updates
   * auto-execution-ssot: Enable Remote UI to update spec.json directly
   * @param specId - Spec identifier (feature name)
   * @param updates - Partial spec.json updates to apply
   */
  async updateSpecJson(
    specId: string,
    updates: Record<string, unknown>
  ): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('UPDATE_SPEC_JSON', { specId, updates });
  }

  async convertToWorktree(specId: string, featureName: string): Promise<Result<{
    path: string;
    absolutePath: string;
    branch: string;
    created_at: string;
  }, ApiError>> {
    interface ConvertResponse {
      type: string;
      payload?: {
        code?: string;
        message?: string;
        worktreeInfo?: {
          path: string;
          absolutePath: string;
          branch: string;
          created_at: string;
        };
      };
    }

    const response = await this.sendRequest<ConvertResponse>('CONVERT_TO_WORKTREE', {
      specId,
      featureName,
    });

    if (response.type === 'ERROR') {
      const error = response.payload as { code: string; message: string };
      return {
        ok: false,
        error: {
          type: error.code || 'CONVERT_ERROR',
          message: error.message || 'Failed to convert to worktree',
        },
      };
    }

    const worktreeInfo = response.payload?.worktreeInfo;
    if (!worktreeInfo) {
      return {
        ok: false,
        error: {
          type: 'INVALID_RESPONSE',
          message: 'Invalid response from server',
        },
      };
    }
    return { ok: true, value: worktreeInfo };
  }

  // ===========================================================================
  // Bug Monitoring Operations (bugs-view-unification)
  // Task 1.3: WebSocketApiClient implementation
  // Requirements: 4.6, 4.7
  // ===========================================================================

  async switchAgentWatchScope(specId: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('SWITCH_AGENT_WATCH_SCOPE', { specId });
  }

  async startBugsWatcher(): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('START_BUGS_WATCHER');
  }

  async stopBugsWatcher(): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('STOP_BUGS_WATCHER');
  }

  onBugsChanged(listener: (event: BugsChangeEvent) => void): () => void {
    // Subscribe to bugsChanged event
    // WebSocket sends full BugMetadata[] array, we convert to BugsChangeEvent[]
    return this.on('bugsChanged', (data) => {
      const currentBugs = data as BugMetadata[];
      const events = detectBugsChanges(this.previousBugs, currentBugs);

      // Update previous bugs for next comparison
      this.previousBugs = [...currentBugs];

      // Emit each event to listener
      for (const event of events) {
        listener(event);
      }
    });
  }

  // ===========================================================================
  // Git Diff Viewer Operations (Task 15.8)
  // Requirements: 10.3
  // ===========================================================================

  async getGitStatus(projectPath: string): Promise<Result<import('./types').GitStatusResult, ApiError>> {
    return this.wrapRequest<import('./types').GitStatusResult>('GIT_GET_STATUS', { projectPath });
  }

  async getGitDiff(projectPath: string, filePath: string): Promise<Result<string, ApiError>> {
    return this.wrapRequest<string>('GIT_GET_DIFF', { projectPath, filePath });
  }

  async startWatching(projectPath: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('GIT_WATCH_CHANGES', { projectPath });
  }

  async stopWatching(projectPath: string): Promise<Result<void, ApiError>> {
    return this.wrapRequest<void>('GIT_UNWATCH_CHANGES', { projectPath });
  }

  // ===========================================================================
  // Worktree Operations (worktree-rebase-from-main)
  // Task 5.1b: WebSocketApiClient.rebaseFromMain
  // Requirements: 8.2
  // ===========================================================================

  async rebaseFromMain(specOrBugPath: string): Promise<Result<{
    success: true;
    alreadyUpToDate?: boolean;
  } | {
    success: false;
    conflict?: boolean;
    error?: string;
  }, ApiError>> {
    return this.wrapRequest<{
      success: true;
      alreadyUpToDate?: boolean;
    } | {
      success: false;
      conflict?: boolean;
      error?: string;
    }>('worktree:rebase-from-main', { specOrBugPath });
  }
}
