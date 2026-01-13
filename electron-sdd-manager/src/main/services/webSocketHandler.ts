/**
 * WebSocket Handler Service
 * Manages WebSocket connections and message routing for mobile remote access
 * Requirements: 3.1-3.3, 4.1-4.5, 5.1-5.8, 8.1-8.5, 9.1, 9.3, 9.4
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { isPrivateIP } from '../utils/ipValidator';
import { RateLimiter, defaultRateLimiter } from '../utils/rateLimiter';
import { LogBuffer, defaultLogBuffer } from './logBuffer';

/**
 * WebSocket message structure for communication
 */
export interface WebSocketMessage {
  /** Message type */
  readonly type: string;
  /** Type-specific payload */
  readonly payload?: Record<string, unknown>;
  /** Request-response correlation ID (optional) */
  readonly requestId?: string;
  /** Unix timestamp in milliseconds */
  readonly timestamp: number;
}

/**
 * Client information for tracking connections
 */
interface ClientInfo {
  /** Unique client ID */
  readonly id: string;
  /** Client IP address */
  readonly ip: string;
  /** WebSocket connection */
  readonly ws: WebSocket;
  /** Connection timestamp */
  readonly connectedAt: number;
}

/**
 * Spec information for state distribution
 */
export interface SpecInfo {
  readonly id: string;
  readonly name: string;
  readonly phase: string;
  readonly [key: string]: unknown;
}

/**
 * Bug phase type for bug workflow
 * Requirements: 1.2 (Task 1.2 - BugInfo interface)
 */
export type BugPhase = 'reported' | 'analyzed' | 'fixed' | 'verified';

/**
 * Bug information for state distribution
 * Requirements: 1.2 (Task 1.2 - BugInfo interface)
 */
export interface BugInfo {
  readonly name: string;
  readonly path: string;
  readonly phase: BugPhase;
  readonly updatedAt: string;
  readonly reportedAt: string;
}

/**
 * Log entry from log file (matching LogFileService format)
 */
export interface LogFileEntry {
  readonly timestamp: string;
  readonly stream: 'stdout' | 'stderr';
  readonly data: string;
}

/**
 * Agent logs provider interface for reading agent log files
 * Requirements: Bug fix - remote-ui-agent-log-display
 */
export interface AgentLogsProvider {
  /** Read agent logs from log file */
  readLog(specId: string, agentId: string): Promise<LogFileEntry[]>;
}

/**
 * State provider interface for retrieving project/spec/bug information
 * Requirements: 1.1, 5.5 (Task 1.1 - StateProvider.getBugs())
 */
export interface StateProvider {
  /** Get the current project path */
  getProjectPath(): string;
  /** Get all specs in the project */
  getSpecs(): Promise<SpecInfo[]>;
  /** Get all bugs in the project (optional for backward compatibility) */
  getBugs?(): Promise<BugInfo[]>;
  /** Get all agents (optional for backward compatibility) */
  getAgents?(): Promise<AgentStateInfo[]>;
  /** Get the application version (optional for backward compatibility) */
  getVersion?(): string;
}

/**
 * Agent info for state distribution (Remote UI display)
 */
export interface AgentStateInfo {
  readonly id: string;
  readonly status: string;
  readonly phase?: string;
  readonly specId?: string;
  readonly startedAt?: string;
  readonly lastActivityAt?: string;
}

/**
 * Agent info returned by workflow operations
 */
export interface AgentInfo {
  readonly agentId: string;
  readonly [key: string]: unknown;
}

/**
 * Result type for workflow operations
 */
export type WorkflowResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { type: string; message?: string } };

/**
 * Bug action type for bug workflow
 * Requirements: 6.2 (internal-webserver-sync Task 2.1)
 */
export type BugAction = 'analyze' | 'fix' | 'verify';

/**
 * Auto Execution Options for Remote UI
 * Requirements: 5.1, 5.2, 5.3 (auto-execution-main-process)
 */
export interface AutoExecutionOptionsWS {
  readonly permissions: {
    readonly requirements: boolean;
    readonly design: boolean;
    readonly tasks: boolean;
    readonly impl: boolean;
  };
  readonly documentReviewFlag: 'run' | 'pause' | 'skip';
}

/**
 * Auto Execution State for Remote UI
 * Requirements: 5.4, 5.5, 5.6 (auto-execution-main-process)
 */
export interface AutoExecutionStateWS {
  readonly specPath: string;
  readonly specId: string;
  readonly status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  readonly currentPhase: string | null;
  readonly executedPhases: string[];
  readonly errors: string[];
}

/**
 * Workflow controller interface for executing workflow operations
 * Requirements: 6.2, 6.3, 6.4 (internal-webserver-sync Tasks 2.1, 2.2, 2.3)
 */
export interface WorkflowController {
  /** Execute a workflow phase */
  executePhase(specId: string, phase: string): Promise<WorkflowResult<AgentInfo>>;
  /** Stop a running agent */
  stopAgent(agentId: string): Promise<WorkflowResult<void>>;
  /** Resume a stopped agent */
  resumeAgent(agentId: string): Promise<WorkflowResult<AgentInfo>>;
  /** Auto execute all remaining phases */
  autoExecute?(specId: string): Promise<WorkflowResult<AgentInfo>>;
  /** Send input to a running agent */
  sendAgentInput?(agentId: string, text: string): Promise<WorkflowResult<void>>;

  // New methods for internal-webserver-sync feature
  /** Execute a bug workflow phase (analyze/fix/verify) */
  executeBugPhase?(bugName: string, phase: BugAction): Promise<WorkflowResult<AgentInfo>>;
  /** Execute document review */
  executeDocumentReview?(specId: string): Promise<WorkflowResult<AgentInfo>>;

  // Auto execution methods (auto-execution-main-process feature)
  // Requirements: 5.1, 5.2, 5.3
  /** Start auto execution for a spec */
  autoExecuteStart?(specPath: string, specId: string, options: AutoExecutionOptionsWS): Promise<WorkflowResult<AutoExecutionStateWS>>;
  /** Stop auto execution for a spec */
  autoExecuteStop?(specPath: string): Promise<WorkflowResult<void>>;
  /** Get auto execution status for a spec */
  autoExecuteStatus?(specPath: string): Promise<AutoExecutionStateWS | null>;
  /** Get all auto execution statuses */
  autoExecuteAllStatus?(): Promise<Record<string, AutoExecutionStateWS>>;

  // Inspection workflow methods (inspection-workflow-ui feature)
  // Requirements: 6.1, 6.4 (Task 6.2)
  /** Execute inspection (validate-impl) */
  executeInspection?(specId: string, featureName: string): Promise<WorkflowResult<AgentInfo>>;
  /** Execute inspection fix */
  executeInspectionFix?(specId: string, featureName: string, roundNumber: number): Promise<WorkflowResult<AgentInfo>>;

  // Ask Agent methods (agent-ask-execution feature)
  // Requirements: 5.1-5.6
  /** Execute Project Ask with custom prompt */
  executeAskProject?(projectPath: string, prompt: string): Promise<WorkflowResult<AgentInfo>>;
  /** Execute Spec Ask with custom prompt */
  executeAskSpec?(specId: string, featureName: string, prompt: string): Promise<WorkflowResult<AgentInfo>>;

  // Create methods (remote-ui-missing-create-buttons bug fix)
  /** Create a new spec with spec-init */
  createSpec?(description: string): Promise<WorkflowResult<AgentInfo>>;
  /** Create a new bug with bug-create */
  createBug?(name: string, description: string): Promise<WorkflowResult<AgentInfo>>;
}

/**
 * Access Token Service interface for token validation
 * Requirements: 3.4, 7.3 (cloudflare-tunnel-integration)
 */
export interface AccessTokenServiceInterface {
  validateToken(token: string): boolean;
}

/**
 * File service interface for file operations
 * Requirements: remote-ui-react-migration Task 6.2
 */
export interface FileServiceInterface {
  /** Write file content to disk */
  writeFile(
    filePath: string,
    content: string
  ): Promise<{ ok: true; value: void } | { ok: false; error: { type: string; path: string; message?: string } }>;
}

/**
 * Spec detail result type
 * Requirements: remote-ui-react-migration Task 6.3
 */
export interface SpecDetailResult {
  readonly name: string;
  readonly path: string;
  readonly phase: string;
  readonly specJson: Record<string, unknown>;
  readonly artifacts: Record<string, { exists: boolean; updatedAt?: string }>;
  readonly [key: string]: unknown;
}

/**
 * Spec detail provider interface for retrieving spec details
 * Requirements: remote-ui-react-migration Task 6.3
 */
export interface SpecDetailProvider {
  /** Get detailed information for a spec */
  getSpecDetail(
    specId: string
  ): Promise<{ ok: true; value: SpecDetailResult } | { ok: false; error: { type: string; message?: string } }>;
}

/**
 * Configuration options for WebSocketHandler
 */
export interface WebSocketHandlerConfig {
  /** Maximum number of concurrent clients (default: 10) */
  maxClients?: number;
  /** Rate limiter instance */
  rateLimiter?: RateLimiter;
  /** Log buffer instance */
  logBuffer?: LogBuffer;
  /** Access token service for authentication (optional) */
  accessTokenService?: AccessTokenServiceInterface;
  /** Require token authentication (default: false) */
  requireTokenAuth?: boolean;
  /** Skip token validation for private IPs (default: true) */
  skipTokenForPrivateIp?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  maxClients: 10,
  rateLimiter: defaultRateLimiter,
  logBuffer: defaultLogBuffer,
  accessTokenService: undefined as AccessTokenServiceInterface | undefined,
  requireTokenAuth: false,
  skipTokenForPrivateIp: true,
};

/**
 * WebSocket Handler for mobile remote access
 *
 * Manages WebSocket connections, performs IP validation,
 * handles message routing, and supports broadcast functionality.
 *
 * @example
 * const handler = new WebSocketHandler();
 * handler.initialize(wss);
 * handler.broadcast({ type: 'STATUS_UPDATE', payload: {...}, timestamp: Date.now() });
 */
export class WebSocketHandler {
  private readonly config: typeof DEFAULT_CONFIG;
  private readonly clients: Map<string, ClientInfo> = new Map();
  private wss: WebSocketServer | null = null;
  private clientIdCounter = 0;
  private stateProvider: StateProvider | null = null;
  private workflowController: WorkflowController | null = null;
  private agentLogsProvider: AgentLogsProvider | null = null;
  private fileService: FileServiceInterface | null = null;
  private specDetailProvider: SpecDetailProvider | null = null;

  constructor(config: WebSocketHandlerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the state provider for project/spec information
   *
   * @param provider State provider implementation
   */
  setStateProvider(provider: StateProvider): void {
    this.stateProvider = provider;
  }

  /**
   * Set the workflow controller for executing workflow operations
   *
   * @param controller Workflow controller implementation
   */
  setWorkflowController(controller: WorkflowController): void {
    this.workflowController = controller;
  }

  /**
   * Set the agent logs provider for reading agent log files
   * Requirements: Bug fix - remote-ui-agent-log-display
   *
   * @param provider Agent logs provider implementation
   */
  setAgentLogsProvider(provider: AgentLogsProvider): void {
    this.agentLogsProvider = provider;
  }

  /**
   * Set the file service for file operations
   * Requirements: remote-ui-react-migration Task 6.2
   *
   * @param service File service implementation
   */
  setFileService(service: FileServiceInterface): void {
    this.fileService = service;
  }

  /**
   * Set the spec detail provider for retrieving spec details
   * Requirements: remote-ui-react-migration Task 6.3
   *
   * @param provider Spec detail provider implementation
   */
  setSpecDetailProvider(provider: SpecDetailProvider): void {
    this.specDetailProvider = provider;
  }

  /**
   * Initialize the WebSocket handler with a WebSocketServer
   *
   * @param wss WebSocket server instance
   */
  initialize(wss: WebSocketServer): void {
    this.wss = wss;
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  /**
   * Handle a new WebSocket connection
   *
   * @param ws WebSocket connection
   * @param req HTTP upgrade request
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    // Get client IP address
    const ip = this.getClientIP(req);

    // Get real client IP from Cloudflare headers if present
    const realIp = this.getRealClientIP(req) || ip;

    // Validate IP address (only allow private IPs for direct connections)
    if (!isPrivateIP(ip)) {
      ws.close(1008, 'Connection from non-private IP rejected');
      return;
    }

    // Token authentication
    // Requirements: 3.4, 7.3 (cloudflare-tunnel-integration)
    if (this.config.requireTokenAuth) {
      const isRealIpPrivate = isPrivateIP(realIp);

      // Skip token validation for private IPs if configured
      if (!this.config.skipTokenForPrivateIp || !isRealIpPrivate) {
        const token = this.extractTokenFromRequest(req);

        if (!token) {
          ws.close(4001, 'Unauthorized: Token required');
          return;
        }

        if (this.config.accessTokenService) {
          if (!this.config.accessTokenService.validateToken(token)) {
            ws.close(4001, 'Unauthorized: Invalid token');
            return;
          }
        }
      }
    }

    // Check max connections
    if (this.clients.size >= this.config.maxClients) {
      ws.close(1013, 'Maximum connections reached');
      return;
    }

    // Create client info
    const clientId = this.generateClientId();
    const clientInfo: ClientInfo = {
      id: clientId,
      ip,
      ws,
      connectedAt: Date.now(),
    };

    // Register client
    this.clients.set(clientId, clientInfo);

    // Set up event handlers
    ws.on('close', () => {
      this.clients.delete(clientId);
    });

    ws.on('error', () => {
      this.clients.delete(clientId);
    });

    ws.on('message', (data: Buffer | string) => {
      this.handleMessage(clientInfo, data);
    });

    // Send INIT message with current state
    this.sendInitMessage(clientInfo);
  }

  /**
   * Send INIT message to a newly connected client
   * Requirements: 2.1 (Task 2.1 - INIT message with bugs)
   */
  private async sendInitMessage(client: ClientInfo): Promise<void> {
    const project = this.stateProvider?.getProjectPath() || '';
    const specs = this.stateProvider ? await this.stateProvider.getSpecs() : [];
    const bugs = this.stateProvider?.getBugs ? await this.stateProvider.getBugs() : [];
    const agents = this.stateProvider?.getAgents ? await this.stateProvider.getAgents() : [];
    const version = this.stateProvider?.getVersion ? this.stateProvider.getVersion() : '';
    const logs = this.config.logBuffer.getAll();

    this.send(client.id, {
      type: 'INIT',
      payload: {
        project,
        specs,
        bugs,
        agents,
        version,
        logs,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle incoming message from a client
   *
   * @param client Client information
   * @param data Raw message data
   */
  private async handleMessage(client: ClientInfo, data: Buffer | string): Promise<void> {
    // Rate limiting check
    const allowed = await this.config.rateLimiter.consume(client.ip);
    if (!allowed) {
      const resetTime = await this.config.rateLimiter.getResetTime(client.ip);
      this.send(client.id, {
        type: 'RATE_LIMITED',
        payload: { retryAfter: resetTime },
        timestamp: Date.now(),
      });
      return;
    }

    // Parse message
    let message: WebSocketMessage;
    try {
      const messageStr = typeof data === 'string' ? data : data.toString('utf-8');
      message = JSON.parse(messageStr);
    } catch {
      // Invalid JSON - send error response
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_JSON', message: 'Invalid JSON format' },
        timestamp: Date.now(),
      });
      return;
    }

    // Validate message structure
    if (!this.isValidMessage(message)) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_MESSAGE', message: 'Invalid message structure' },
        timestamp: Date.now(),
      });
      return;
    }

    // Route message to appropriate handler
    await this.routeMessage(client, message);
  }

  /**
   * Route a message to the appropriate handler
   *
   * @param client Client information
   * @param message Parsed WebSocket message
   */
  private async routeMessage(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'GET_SPECS':
        await this.handleGetSpecs(client, message);
        break;
      case 'GET_BUGS':
        await this.handleGetBugs(client, message);
        break;
      case 'GET_AGENTS':
        await this.handleGetAgents(client, message);
        break;
      case 'SELECT_SPEC':
        await this.handleSelectSpec(client, message);
        break;
      case 'SELECT_AGENT':
        await this.handleSelectAgent(client, message);
        break;
      case 'EXECUTE_PHASE':
        await this.handleExecutePhase(client, message);
        break;
      case 'STOP_WORKFLOW':
        await this.handleStopWorkflow(client, message);
        break;
      case 'RESUME_WORKFLOW':
        await this.handleResumeWorkflow(client, message);
        break;
      case 'AUTO_EXECUTE':
        await this.handleAutoExecute(client, message);
        break;
      case 'AGENT_INPUT':
        await this.handleAgentInput(client, message);
        break;
      case 'EXECUTE_BUG_PHASE':
        await this.handleExecuteBugPhase(client, message);
        break;
      case 'EXECUTE_DOCUMENT_REVIEW':
        await this.handleExecuteDocumentReview(client, message);
        break;
      // Inspection handlers (inspection-workflow-ui feature)
      case 'INSPECTION_START':
        await this.handleInspectionStart(client, message);
        break;
      case 'INSPECTION_FIX':
        await this.handleInspectionFix(client, message);
        break;
      // Auto Execution handlers (auto-execution-main-process feature)
      case 'AUTO_EXECUTE_START':
        await this.handleAutoExecuteStart(client, message);
        break;
      case 'AUTO_EXECUTE_STOP':
        await this.handleAutoExecuteStop(client, message);
        break;
      case 'AUTO_EXECUTE_STATUS':
        await this.handleAutoExecuteStatus(client, message);
        break;
      case 'AUTO_EXECUTE_ALL_STATUS':
        await this.handleAutoExecuteAllStatus(client, message);
        break;
      // Ask Agent handlers (agent-ask-execution feature)
      case 'ASK_PROJECT':
        await this.handleAskProject(client, message);
        break;
      case 'ASK_SPEC':
        await this.handleAskSpec(client, message);
        break;
      // Create handlers (remote-ui-missing-create-buttons bug fix)
      case 'CREATE_SPEC':
        await this.handleCreateSpec(client, message);
        break;
      case 'CREATE_BUG':
        await this.handleCreateBug(client, message);
        break;
      // File operations handlers (remote-ui-react-migration Task 6.2)
      case 'SAVE_FILE':
        await this.handleSaveFile(client, message);
        break;
      // Spec detail handlers (remote-ui-react-migration Task 6.3)
      case 'GET_SPEC_DETAIL':
        await this.handleGetSpecDetail(client, message);
        break;
      default:
        this.send(client.id, {
          type: 'ERROR',
          payload: { code: 'UNKNOWN_MESSAGE_TYPE', message: `Unknown message type: ${message.type}` },
          requestId: message.requestId,
          timestamp: Date.now(),
        });
    }
  }

  /**
   * Validate message structure
   */
  private isValidMessage(message: unknown): message is WebSocketMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    const msg = message as Record<string, unknown>;
    return typeof msg.type === 'string' && typeof msg.timestamp === 'number';
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: IncomingMessage): string {
    // Check X-Forwarded-For header first (for reverse proxy scenarios)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
      return ips[0].trim();
    }
    // Fall back to socket remote address
    return req.socket.remoteAddress || '127.0.0.1';
  }

  /**
   * Get real client IP from Cloudflare headers
   * Requirements: 7.3 (cloudflare-tunnel-integration)
   *
   * Cloudflare adds cf-connecting-ip header with the real client IP
   * when connections come through Cloudflare Tunnel
   */
  private getRealClientIP(req: IncomingMessage): string | null {
    // Check Cloudflare header
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) {
      return Array.isArray(cfIp) ? cfIp[0] : cfIp;
    }
    return null;
  }

  /**
   * Extract access token from request URL query parameters
   * Requirements: 3.4, 7.3 (cloudflare-tunnel-integration)
   */
  private extractTokenFromRequest(req: IncomingMessage): string | null {
    if (!req.url) {
      return null;
    }

    try {
      // Parse URL to extract query parameters
      const url = new URL(req.url, 'http://localhost');
      return url.searchParams.get('token');
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${++this.clientIdCounter}`;
  }

  /**
   * Broadcast a message to all connected clients
   *
   * @param message Message to broadcast
   */
  broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  /**
   * Send a message to a specific client
   *
   * @param clientId Target client ID
   * @param message Message to send
   */
  send(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Disconnect all connected clients
   */
  disconnectAll(): void {
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();
  }

  // ============================================================
  // Real-time Log Distribution (Task 3.5)
  // ============================================================

  /**
   * Broadcast agent output to all connected clients
   *
   * @param agentId Agent identifier
   * @param stream Output stream (stdout or stderr)
   * @param data Log message content
   * @param type Log type (info, warning, error, agent)
   */
  broadcastAgentOutput(
    agentId: string,
    stream: 'stdout' | 'stderr',
    data: string,
    type: 'info' | 'warning' | 'error' | 'agent' = 'agent'
  ): void {
    const timestamp = Date.now();

    // Add to log buffer
    this.config.logBuffer.add({
      timestamp,
      agentId,
      stream,
      data,
      type,
    });

    // Broadcast to all clients
    this.broadcast({
      type: 'AGENT_OUTPUT',
      payload: {
        agentId,
        stream,
        data,
        logType: type,
      },
      timestamp,
    });
  }

  /**
   * Broadcast agent status change to all connected clients
   *
   * @param agentId Agent identifier
   * @param status New agent status
   * @param agentInfo Optional full agent info for rich display (matches Electron version)
   */
  broadcastAgentStatus(agentId: string, status: string, agentInfo?: {
    specId?: string;
    phase?: string;
    startedAt?: string;
    lastActivityAt?: string;
  }): void {
    this.broadcast({
      type: 'AGENT_STATUS',
      payload: {
        agentId,
        status,
        // Include full agent info for remote-ui to display same content as Electron version
        ...(agentInfo && {
          specId: agentInfo.specId,
          phase: agentInfo.phase,
          startedAt: agentInfo.startedAt,
          lastActivityAt: agentInfo.lastActivityAt,
        }),
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast phase completion to all connected clients
   *
   * @param specId Specification identifier
   * @param phase Completed phase
   * @param result Phase result data
   */
  broadcastPhaseCompleted(
    specId: string,
    phase: string,
    result: Record<string, unknown>
  ): void {
    this.broadcast({
      type: 'PHASE_COMPLETED',
      payload: { specId, phase, result },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast bugs updated to all connected clients
   * Requirements: 2.3 (Task 2.3 - BUGS_UPDATED broadcast)
   *
   * @param bugs Updated list of bugs
   */
  broadcastBugsUpdated(bugs: BugInfo[]): void {
    this.broadcast({
      type: 'BUGS_UPDATED',
      payload: { bugs },
      timestamp: Date.now(),
    });
  }

  // ============================================================
  // Message Handlers (stubs for now, will be implemented in 3.3-3.5)
  // ============================================================

  /**
   * Handle GET_SPECS message
   */
  private async handleGetSpecs(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const specs = this.stateProvider ? await this.stateProvider.getSpecs() : [];

    this.send(client.id, {
      type: 'SPECS_UPDATED',
      payload: { specs },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle GET_BUGS message
   * Requirements: 2.2 (Task 2.2 - GET_BUGS message handler)
   */
  private async handleGetBugs(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const bugs = this.stateProvider?.getBugs ? await this.stateProvider.getBugs() : [];

    this.send(client.id, {
      type: 'BUGS_UPDATED',
      payload: { bugs },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle GET_AGENTS message
   */
  private async handleGetAgents(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const agents = this.stateProvider?.getAgents ? await this.stateProvider.getAgents() : [];

    this.send(client.id, {
      type: 'AGENT_LIST',
      payload: { agents },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle SELECT_SPEC message
   */
  private async handleSelectSpec(_client: ClientInfo, _message: WebSocketMessage): Promise<void> {
    // TODO: Implement in task 3.3
  }

  /**
   * Handle SELECT_AGENT message
   * Requirements: Bug fix - remote-ui-agent-log-display
   * Reads agent log file and returns logs to the client
   */
  private async handleSelectAgent(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const payload = message.payload || {};
    const specId = payload.specId as string;
    const agentId = payload.agentId as string;

    if (!specId || !agentId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId or agentId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.agentLogsProvider) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_CONFIGURED', message: 'Agent logs provider not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const logs = await this.agentLogsProvider.readLog(specId, agentId);

      this.send(client.id, {
        type: 'AGENT_LOGS',
        payload: {
          specId,
          agentId,
          logs,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: 'LOG_READ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to read agent logs',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle EXECUTE_PHASE message
   */
  private async handleExecutePhase(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;
    const phase = payload.phase as string;

    if (!specId || !phase) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId or phase' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executePhase(specId, phase);

    if (result.ok) {
      this.send(client.id, {
        type: 'PHASE_STARTED',
        payload: {
          specId,
          phase,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Phase execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle STOP_WORKFLOW message
   */
  private async handleStopWorkflow(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const agentId = payload.agentId as string;

    if (!agentId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing agentId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.stopAgent(agentId);

    if (result.ok) {
      this.send(client.id, {
        type: 'WORKFLOW_STOPPED',
        payload: { agentId },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Failed to stop workflow',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle RESUME_WORKFLOW message
   */
  private async handleResumeWorkflow(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const agentId = payload.agentId as string;

    if (!agentId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing agentId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.resumeAgent(agentId);

    if (result.ok) {
      this.send(client.id, {
        type: 'WORKFLOW_RESUMED',
        payload: { agentId: result.value.agentId },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Failed to resume workflow',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle AUTO_EXECUTE message
   */
  private async handleAutoExecute(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.autoExecute) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Auto execute not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;

    if (!specId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.autoExecute(specId);

    if (result.ok) {
      this.send(client.id, {
        type: 'AUTO_EXECUTE_STARTED',
        payload: {
          specId,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Auto execute failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle AGENT_INPUT message
   */
  private async handleAgentInput(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.sendAgentInput) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Agent input not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const agentId = payload.agentId as string;
    const text = payload.text as string;

    if (!agentId || !text) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing agentId or text' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.sendAgentInput(agentId, text);

    if (result.ok) {
      this.send(client.id, {
        type: 'AGENT_INPUT_SENT',
        payload: { agentId },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Failed to send input to agent',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Bug/Validation/Review Handlers (internal-webserver-sync Tasks 3.1.2, 3.2, 3.3)
  // ============================================================

  /**
   * Handle EXECUTE_BUG_PHASE message
   * Requirements: 6.2 (internal-webserver-sync Task 3.1.2)
   */
  private async handleExecuteBugPhase(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeBugPhase) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Bug phase execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const bugName = payload.bugName as string;
    const phase = payload.phase as BugAction;

    if (!bugName || !phase) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing bugName or phase' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeBugPhase(bugName, phase);

    if (result.ok) {
      this.send(client.id, {
        type: 'BUG_PHASE_STARTED',
        payload: {
          bugName,
          phase,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Bug phase execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle EXECUTE_DOCUMENT_REVIEW message
   * Requirements: 6.4 (internal-webserver-sync Task 3.3)
   */
  private async handleExecuteDocumentReview(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeDocumentReview) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Document review execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;

    if (!specId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeDocumentReview(specId);

    if (result.ok) {
      this.send(client.id, {
        type: 'DOCUMENT_REVIEW_STARTED',
        payload: {
          specId,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Document review execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Inspection Handlers (inspection-workflow-ui Task 6.2)
  // Requirements: 6.1, 6.4
  // ============================================================

  /**
   * Handle INSPECTION_START message
   * Requirements: 6.1, 6.4 (inspection-workflow-ui Task 6.2)
   */
  private async handleInspectionStart(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeInspection) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Inspection execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;
    const featureName = (payload.featureName as string) || specId;

    if (!specId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeInspection(specId, featureName);

    if (result.ok) {
      this.send(client.id, {
        type: 'INSPECTION_STARTED',
        payload: {
          specId,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Inspection execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle INSPECTION_FIX message
   * Requirements: 6.1, 6.4 (inspection-workflow-ui Task 6.2)
   */
  private async handleInspectionFix(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeInspectionFix) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Inspection fix execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;
    const featureName = (payload.featureName as string) || specId;
    const roundNumber = payload.roundNumber as number;

    if (!specId || typeof roundNumber !== 'number') {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId or roundNumber' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeInspectionFix(specId, featureName, roundNumber);

    if (result.ok) {
      this.send(client.id, {
        type: 'INSPECTION_FIX_STARTED',
        payload: {
          specId,
          roundNumber,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Inspection fix execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Broadcast Methods for Task Progress and Spec Updates (internal-webserver-sync Task 3.4)
  // ============================================================

  /**
   * Broadcast task progress to all connected clients
   * Requirements: 6.5 (internal-webserver-sync Task 3.4)
   *
   * @param specId Specification identifier
   * @param taskId Task identifier
   * @param status Task status
   */
  broadcastTaskProgress(specId: string, taskId: string, status: string): void {
    this.broadcast({
      type: 'TASK_PROGRESS',
      payload: { specId, taskId, status },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast spec updated to all connected clients
   * Requirements: 6.6 (internal-webserver-sync Task 3.4)
   *
   * @param specId Specification identifier
   * @param updates Updated spec data
   */
  broadcastSpecUpdated(specId: string, updates: Record<string, unknown>): void {
    this.broadcast({
      type: 'SPEC_UPDATED',
      payload: { specId, ...updates },
      timestamp: Date.now(),
    });
  }

  // ============================================================
  // Auto Execution Handlers (auto-execution-main-process Tasks 3.1, 3.2, 3.3)
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
  // ============================================================

  /**
   * Handle AUTO_EXECUTE_START message
   * Requirements: 5.1 (auto-execution-main-process Task 3.2)
   */
  private async handleAutoExecuteStart(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.autoExecuteStart) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Auto execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specPath = payload.specPath as string;
    const specId = payload.specId as string;
    const options = payload.options as AutoExecutionOptionsWS | undefined;

    if (!specPath || !specId || !options) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specPath, specId, or options' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.autoExecuteStart(specPath, specId, options);

    if (result.ok) {
      this.send(client.id, {
        type: 'AUTO_EXECUTION_STARTED',
        payload: { state: result.value },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Auto execution start failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle AUTO_EXECUTE_STOP message
   * Requirements: 5.2 (auto-execution-main-process Task 3.2)
   */
  private async handleAutoExecuteStop(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.autoExecuteStop) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Auto execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specPath = payload.specPath as string;

    if (!specPath) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specPath' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.autoExecuteStop(specPath);

    if (result.ok) {
      this.send(client.id, {
        type: 'AUTO_EXECUTION_STOPPED',
        payload: { specPath },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Auto execution stop failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle AUTO_EXECUTE_STATUS message
   * Requirements: 5.3 (auto-execution-main-process Task 3.2)
   */
  private async handleAutoExecuteStatus(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.autoExecuteStatus) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Auto execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specPath = payload.specPath as string;

    if (!specPath) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specPath' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const state = await this.workflowController.autoExecuteStatus(specPath);

    this.send(client.id, {
      type: 'AUTO_EXECUTION_STATUS',
      payload: { specPath, state },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle AUTO_EXECUTE_ALL_STATUS message
   * Requirements: 5.3 (auto-execution-main-process Task 3.2)
   */
  private async handleAutoExecuteAllStatus(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.autoExecuteAllStatus) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Auto execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const statuses = await this.workflowController.autoExecuteAllStatus();

    this.send(client.id, {
      type: 'AUTO_EXECUTION_ALL_STATUS',
      payload: { statuses },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  // ============================================================
  // Auto Execution Broadcast Methods (auto-execution-main-process Task 3.3)
  // Requirements: 5.4, 5.5, 5.6, 7.2
  // ============================================================

  /**
   * Broadcast auto execution status change to all connected clients
   * Requirements: 5.4 (auto-execution-main-process Task 3.3)
   *
   * @param specPath Specification path
   * @param state Current auto execution state
   */
  broadcastAutoExecutionStatus(specPath: string, state: AutoExecutionStateWS): void {
    this.broadcast({
      type: 'AUTO_EXECUTION_STATUS',
      payload: { specPath, state },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast auto execution phase completed to all connected clients
   * Requirements: 5.5 (auto-execution-main-process Task 3.3)
   *
   * @param specPath Specification path
   * @param phase Completed phase
   */
  broadcastAutoExecutionPhaseCompleted(specPath: string, phase: string): void {
    this.broadcast({
      type: 'AUTO_EXECUTION_PHASE_COMPLETED',
      payload: { specPath, phase },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast auto execution error to all connected clients
   * Requirements: 5.6 (auto-execution-main-process Task 3.3)
   *
   * @param specPath Specification path
   * @param error Error details
   */
  broadcastAutoExecutionError(specPath: string, error: { type: string; message?: string }): void {
    this.broadcast({
      type: 'AUTO_EXECUTION_ERROR',
      payload: { specPath, error },
      timestamp: Date.now(),
    });
  }

  // ============================================================
  // Ask Agent Handlers (agent-ask-execution feature)
  // Requirements: 5.1-5.6
  // ============================================================

  /**
   * Handle ASK_PROJECT message
   * Requirements: 5.1-5.3 (agent-ask-execution)
   */
  private async handleAskProject(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeAskProject) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Project Ask execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const projectPath = payload.projectPath as string;
    const prompt = payload.prompt as string;

    if (!projectPath || !prompt) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing projectPath or prompt' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeAskProject(projectPath, prompt);

    if (result.ok) {
      this.send(client.id, {
        type: 'ASK_PROJECT_STARTED',
        payload: {
          projectPath,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Project Ask execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle ASK_SPEC message
   * Requirements: 5.4-5.6 (agent-ask-execution)
   */
  private async handleAskSpec(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeAskSpec) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Spec Ask execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;
    const featureName = (payload.featureName as string) || specId;
    const prompt = payload.prompt as string;

    if (!specId || !prompt) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId or prompt' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeAskSpec(specId, featureName, prompt);

    if (result.ok) {
      this.send(client.id, {
        type: 'ASK_SPEC_STARTED',
        payload: {
          specId,
          featureName,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Spec Ask execution failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Create Handlers (remote-ui-missing-create-buttons bug fix)
  // ============================================================

  /**
   * Handle CREATE_SPEC message
   * Bug fix: remote-ui-missing-create-buttons
   * Creates a new spec using spec-init command
   */
  private async handleCreateSpec(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.createSpec) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Spec creation not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const description = payload.description as string;

    if (!description) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing description' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.createSpec(description);

    if (result.ok) {
      this.send(client.id, {
        type: 'SPEC_CREATED',
        payload: {
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Spec creation failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle CREATE_BUG message
   * Bug fix: remote-ui-missing-create-buttons
   * Creates a new bug using bug-create command
   */
  private async handleCreateBug(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.createBug) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Bug creation not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const name = payload.name as string;
    const description = payload.description as string;

    if (!name || !description) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing name or description' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.createBug(name, description);

    if (result.ok) {
      this.send(client.id, {
        type: 'BUG_CREATED',
        payload: {
          name,
          agentId: result.value.agentId,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Bug creation failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // File Operations Handlers (remote-ui-react-migration Task 6.2)
  // Requirements: 2.5, 7.4, 10.2
  // ============================================================

  /**
   * Handle SAVE_FILE message
   * Requirements: remote-ui-react-migration Task 6.2
   * Saves file content via fileService
   */
  private async handleSaveFile(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.fileService) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_CONFIGURED', message: 'File service not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const filePath = payload.filePath as string;
    const content = payload.content as string;

    if (!filePath || content === undefined || content === null) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing filePath or content' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.fileService.writeFile(filePath, content);

    if (result.ok) {
      this.send(client.id, {
        type: 'FILE_SAVED',
        payload: { filePath, success: true },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'File save failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Spec Detail Handlers (remote-ui-react-migration Task 6.3)
  // Requirements: 10.2
  // ============================================================

  /**
   * Handle GET_SPEC_DETAIL message
   * Requirements: remote-ui-react-migration Task 6.3
   * Retrieves detailed spec information
   */
  private async handleGetSpecDetail(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.specDetailProvider) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_CONFIGURED', message: 'Spec detail provider not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const specId = payload.specId as string;

    if (!specId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing specId' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.specDetailProvider.getSpecDetail(specId);

    if (result.ok) {
      this.send(client.id, {
        type: 'SPEC_DETAIL',
        payload: {
          specId,
          detail: result.value,
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Failed to get spec detail',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }
}
