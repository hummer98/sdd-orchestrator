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
import type { ExecuteOptions } from '../../shared/types/executeOptions';
// spec-event-log: Event log service import
import { getDefaultEventLogService } from './eventLogService';

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
 * bug-deploy-phase: Requirements 1.1 - added deployed phase
 */
export type BugPhase = 'reported' | 'analyzed' | 'fixed' | 'verified' | 'deployed';

/**
 * Bug worktree configuration for state distribution
 * remote-ui-bug-list-optimization: Include worktree info in GET_BUGS response
 */
export interface BugWorktreeInfo {
  readonly path: string;
  readonly branch: string;
  readonly created_at: string;
}

/**
 * Bug information for state distribution
 * Requirements: 1.2 (Task 1.2 - BugInfo interface)
 * remote-ui-bug-list-optimization: Added worktree and worktreeBasePath fields
 */
export interface BugInfo {
  readonly name: string;
  readonly path: string;
  readonly phase: BugPhase;
  readonly updatedAt: string;
  readonly reportedAt: string;
  /** Worktree configuration (optional) - for UI display */
  readonly worktree?: BugWorktreeInfo;
  /** Worktree base path (directory mode) */
  readonly worktreeBasePath?: string;
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
/**
 * Profile configuration from sdd-orchestrator.json
 * Requirements: header-profile-badge 1.4, 3.1
 */
export interface ProfileConfig {
  readonly name: 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';
  readonly installedAt: string;
}

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
  /** Get the installed profile configuration (optional for backward compatibility) */
  getProfile?(): Promise<ProfileConfig | null>;
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
  readonly documentReviewFlag: 'run' | 'pause';
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
 * Bug Auto Execution State for Remote UI
 * Requirements: 6.2, 6.3 (bug-auto-execution-per-bug-state Task 6.1, 6.2)
 */
export interface BugAutoExecutionStateWS {
  readonly bugPath: string;
  readonly bugName: string;
  readonly status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  readonly currentPhase: string | null;
  readonly executedPhases: string[];
  readonly errors: string[];
  readonly startTime: number;
  readonly lastActivityTime: number;
  readonly retryCount: number;
  readonly lastFailedPhase: string | null;
}

/**
 * Bug Auto Execution Error for Remote UI
 * Requirements: 6.2 (bug-auto-execution-per-bug-state Task 6.1)
 */
export interface BugAutoExecutionErrorWS {
  readonly type: string;
  readonly message?: string;
  readonly phase?: string;
}

/**
 * Bug Auto Execution Permissions for Remote UI
 * Requirements: 4.1 (remote-ui-bug-advanced-features Task 1.1)
 */
export interface BugAutoExecutionPermissionsWS {
  readonly analyze: boolean;
  readonly fix: boolean;
  readonly verify: boolean;
}

/**
 * Workflow controller interface for executing workflow operations
 * Requirements: 6.2, 6.3, 6.4 (internal-webserver-sync Tasks 2.1, 2.2, 2.3)
 * execute-method-unification: Task 6.1 - Added unified execute method
 */
export interface WorkflowController {
  /** Execute a workflow phase (legacy - use execute for new code) */
  executePhase(specId: string, phase: string): Promise<WorkflowResult<AgentInfo>>;
  /** Unified execute method with ExecuteOptions */
  execute?(options: ExecuteOptions): Promise<WorkflowResult<AgentInfo>>;
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

  // Bug auto execution methods (bug-auto-execution-per-bug-state feature)
  // Requirements: 6.2, 6.3 (Task 6.1, 6.2)
  /** Get bug auto execution status */
  bugAutoExecuteStatus?(bugPath: string): Promise<BugAutoExecutionStateWS | null>;
  // Bug auto execution start/stop methods (remote-ui-bug-advanced-features feature)
  // Requirements: 4.1, 4.2 (Task 1.1)
  /** Start bug auto execution */
  startBugAutoExecution?(bugPath: string, permissions: BugAutoExecutionPermissionsWS): Promise<WorkflowResult<BugAutoExecutionStateWS>>;
  /** Stop bug auto execution */
  stopBugAutoExecution?(bugPath: string): Promise<WorkflowResult<void>>;

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

  // Release methods (steering-release-integration feature)
  // Requirements: 3.4, 3.5
  /** Check if release.md exists */
  checkReleaseMd?(): Promise<{ releaseMdExists: boolean }>;
  /** Generate release.md by launching steering-release agent */
  generateReleaseMd?(): Promise<WorkflowResult<AgentInfo>>;

  // Spec Plan methods (remote-ui-create-buttons feature)
  // Requirements: 3.3, 3.4
  /** Execute spec-plan to create a new spec via interactive dialogue */
  executeSpecPlan?(description: string, worktreeMode: boolean): Promise<WorkflowResult<AgentInfo>>;
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
 * Bug artifact info for detail result
 * Requirements: Bug management E2E test support
 */
export interface BugArtifactInfo {
  readonly exists: boolean;
  readonly path: string;
  readonly updatedAt: string | null;
  readonly content?: string;
}

/**
 * Bug detail result type - matches BugDetail in @renderer/types/bug
 * Requirements: Bug management E2E test support
 */
export interface BugDetailResult {
  readonly metadata: {
    readonly name: string;
    readonly path: string;
    readonly phase: BugPhase;
    readonly reportedAt: string;
    readonly updatedAt: string;
  };
  readonly artifacts: {
    readonly report: BugArtifactInfo | null;
    readonly analysis: BugArtifactInfo | null;
    readonly fix: BugArtifactInfo | null;
    readonly verification: BugArtifactInfo | null;
  };
}

/**
 * Bug detail provider interface for retrieving bug details
 * Requirements: Bug management E2E test support
 */
export interface BugDetailProvider {
  /** Get detailed information for a bug */
  getBugDetail(
    bugPath: string
  ): Promise<{ ok: true; value: BugDetailResult } | { ok: false; error: { type: string; message?: string } }>;
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
  private bugDetailProvider: BugDetailProvider | null = null;

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
   * Set the bug detail provider for retrieving bug details
   * Requirements: Bug management E2E test support
   *
   * @param provider Bug detail provider implementation
   */
  setBugDetailProvider(provider: BugDetailProvider): void {
    this.bugDetailProvider = provider;
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
    this.debugLog('INIT', 'preparing INIT message', {
      clientId: client.id,
      hasStateProvider: !!this.stateProvider,
    });

    const project = this.stateProvider?.getProjectPath() || '';
    const specs = this.stateProvider ? await this.stateProvider.getSpecs() : [];
    const bugs = this.stateProvider?.getBugs ? await this.stateProvider.getBugs() : [];
    const agents = this.stateProvider?.getAgents ? await this.stateProvider.getAgents() : [];
    const version = this.stateProvider?.getVersion ? this.stateProvider.getVersion() : '';
    const logs = this.config.logBuffer.getAll();

    this.debugLog('INIT', 'sending INIT message', {
      clientId: client.id,
      project,
      specCount: specs.length,
      bugCount: bugs.length,
      agentCount: agents.length,
      logCount: logs.length,
    });

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
   * Debug log helper - logs when WS_HANDLER_DEBUG env is set
   */
  private debugLog(category: string, message: string, data?: unknown): void {
    if (process.env.WS_HANDLER_DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      if (data !== undefined) {
        console.log(`[WS-Handler][${timestamp}][${category}] ${message}`, JSON.stringify(data));
      } else {
        console.log(`[WS-Handler][${timestamp}][${category}] ${message}`);
      }
    }
  }

  /**
   * Handle incoming message from a client
   *
   * @param client Client information
   * @param data Raw message data
   */
  private async handleMessage(client: ClientInfo, data: Buffer | string): Promise<void> {
    const startTime = Date.now();

    // Rate limiting check
    const allowed = await this.config.rateLimiter.consume(client.ip);
    if (!allowed) {
      const resetTime = await this.config.rateLimiter.getResetTime(client.ip);
      this.debugLog('RATE', `rate limited: ${client.id}`);
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
      this.debugLog('RECV', `received: ${message.type}`, {
        clientId: client.id,
        requestId: message.requestId,
        hasPayload: !!message.payload,
      });
    } catch {
      // Invalid JSON - send error response
      this.debugLog('ERROR', 'invalid JSON from client', { clientId: client.id });
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_JSON', message: 'Invalid JSON format' },
        timestamp: Date.now(),
      });
      return;
    }

    // Validate message structure
    if (!this.isValidMessage(message)) {
      this.debugLog('ERROR', 'invalid message structure', {
        clientId: client.id,
        receivedType: (message as { type?: unknown }).type,
      });
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_MESSAGE', message: 'Invalid message structure' },
        timestamp: Date.now(),
      });
      return;
    }

    // Route message to appropriate handler
    try {
      await this.routeMessage(client, message);
      const elapsed = Date.now() - startTime;
      this.debugLog('DONE', `handled: ${message.type}`, { clientId: client.id, elapsed });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.debugLog('ERROR', `handler error: ${message.type}`, {
        clientId: client.id,
        elapsed,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
      // execute-method-unification: Task 6.1 - Unified execute handler
      case 'EXECUTE':
        await this.handleExecute(client, message);
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
      // Spec Plan handler (remote-ui-create-buttons feature)
      // Requirements: 3.3, 3.4
      case 'EXECUTE_SPEC_PLAN':
        await this.handleExecuteSpecPlan(client, message);
        break;
      // File operations handlers (remote-ui-react-migration Task 6.2)
      case 'SAVE_FILE':
        await this.handleSaveFile(client, message);
        break;
      // Spec detail handlers (remote-ui-react-migration Task 6.3)
      case 'GET_SPEC_DETAIL':
        await this.handleGetSpecDetail(client, message);
        break;
      // Bug detail handlers (Bug management E2E test support)
      case 'GET_BUG_DETAIL':
        await this.handleGetBugDetail(client, message);
        break;
      // Profile handlers (header-profile-badge feature)
      case 'GET_PROFILE':
        await this.handleGetProfile(client, message);
        break;
      // Bug auto execution handlers (bug-auto-execution-per-bug-state Task 6.2)
      case 'GET_BUG_AUTO_EXECUTION_STATUS':
        await this.handleGetBugAutoExecutionStatus(client, message);
        break;
      // Bug auto execution start/stop handlers (remote-ui-bug-advanced-features Task 1.1)
      // Requirements: 4.1, 4.2
      case 'START_BUG_AUTO_EXECUTION':
        await this.handleStartBugAutoExecution(client, message);
        break;
      case 'STOP_BUG_AUTO_EXECUTION':
        await this.handleStopBugAutoExecution(client, message);
        break;
      // Release handlers (steering-release-integration feature)
      case 'CHECK_RELEASE_MD':
        await this.handleCheckReleaseMd(client, message);
        break;
      case 'GENERATE_RELEASE_MD':
        await this.handleGenerateReleaseMd(client, message);
        break;
      // Convert to Worktree handler (convert-spec-to-worktree feature)
      case 'CONVERT_TO_WORKTREE':
        await this.handleConvertToWorktree(client, message);
        break;
      // Event Log handler (spec-event-log feature)
      // Requirements: 5.3
      case 'GET_EVENT_LOG':
        await this.handleGetEventLog(client, message);
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
   * Note: timestamp is optional for client-sent messages (clients may omit it)
   */
  private isValidMessage(message: unknown): message is WebSocketMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    const msg = message as Record<string, unknown>;
    // Type is required, timestamp is optional for incoming messages
    return (
      typeof msg.type === 'string' &&
      (msg.timestamp === undefined || typeof msg.timestamp === 'number')
    );
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
   * Response payload is the specs array directly for compatibility with wrapRequest
   */
  private async handleGetSpecs(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    this.debugLog('GET_SPECS', 'fetching specs', {
      clientId: client.id,
      requestId: message.requestId,
      hasStateProvider: !!this.stateProvider,
    });

    const specs = this.stateProvider ? await this.stateProvider.getSpecs() : [];

    this.debugLog('GET_SPECS', 'sending response', {
      clientId: client.id,
      requestId: message.requestId,
      specCount: specs.length,
    });

    this.send(client.id, {
      type: 'SPECS_UPDATED',
      // Type assertion: payload is normally Record but arrays work with JSON.stringify
      payload: specs as unknown as Record<string, unknown>,
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle GET_BUGS message
   * Requirements: 2.2 (Task 2.2 - GET_BUGS message handler)
   * Response payload is the bugs array directly for compatibility with wrapRequest
   */
  private async handleGetBugs(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    this.debugLog('GET_BUGS', 'fetching bugs', {
      clientId: client.id,
      requestId: message.requestId,
      hasStateProvider: !!this.stateProvider,
      hasBugsMethod: !!this.stateProvider?.getBugs,
    });

    const bugs = this.stateProvider?.getBugs ? await this.stateProvider.getBugs() : [];

    this.debugLog('GET_BUGS', 'sending response', {
      clientId: client.id,
      requestId: message.requestId,
      bugCount: bugs.length,
    });

    this.send(client.id, {
      type: 'BUGS_UPDATED',
      // Type assertion: payload is normally Record but arrays work with JSON.stringify
      payload: bugs as unknown as Record<string, unknown>,
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle GET_AGENTS message
   * Response payload is the agents array directly for compatibility with wrapRequest
   */
  private async handleGetAgents(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const agents = this.stateProvider?.getAgents ? await this.stateProvider.getAgents() : [];

    this.send(client.id, {
      type: 'AGENT_LIST',
      // Type assertion: payload is normally Record but arrays work with JSON.stringify
      payload: agents as unknown as Record<string, unknown>,
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
   * Handle EXECUTE message (unified execute API)
   * execute-method-unification: Task 6.1
   */
  private async handleExecute(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.execute) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Unified execute not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const options = payload.options as ExecuteOptions | undefined;

    if (!options || !options.type || !options.specId || !options.featureName) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing or invalid options' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.execute(options);

    if (result.ok) {
      this.send(client.id, {
        type: 'PHASE_STARTED',
        payload: {
          specId: options.specId,
          phase: options.type,
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
          message: result.error.message || 'Execution failed',
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
  // Spec Plan Handlers (remote-ui-create-buttons feature)
  // Requirements: 3.3, 3.4
  // ============================================================

  /**
   * Handle EXECUTE_SPEC_PLAN message
   * Requirements: remote-ui-create-buttons
   * Executes spec-plan to create a new spec via interactive dialogue
   */
  private async handleExecuteSpecPlan(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.executeSpecPlan) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Spec plan execution not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const description = payload.description as string;
    const worktreeMode = (payload.worktreeMode as boolean) ?? false;

    if (!description) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing description' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.executeSpecPlan(description, worktreeMode);

    if (result.ok) {
      this.send(client.id, {
        type: 'SPEC_PLAN_EXECUTED',
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
          message: result.error.message || 'Spec plan execution failed',
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
      // Client expects SpecDetail directly as payload
      this.send(client.id, {
        type: 'SPEC_DETAIL',
        payload: result.value,
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

  // ============================================================
  // Bug Detail Handlers (Bug management E2E test support)
  // ============================================================

  /**
   * Handle GET_BUG_DETAIL message
   * Requirements: Bug management E2E test support
   * Retrieves detailed bug information
   */
  private async handleGetBugDetail(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.bugDetailProvider) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_CONFIGURED', message: 'Bug detail provider not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const bugPath = payload.bugPath as string;

    if (!bugPath) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing bugPath' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.bugDetailProvider.getBugDetail(bugPath);

    if (result.ok) {
      // Client expects BugDetail directly as payload
      this.send(client.id, {
        type: 'BUG_DETAIL',
        payload: result.value as unknown as Record<string, unknown>,
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Failed to get bug detail',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Profile Handlers (header-profile-badge feature)
  // Requirements: 1.4, 3.1, 3.2
  // ============================================================

  /**
   * Handle GET_PROFILE message
   * Requirements: header-profile-badge 3.1
   * Retrieves installed profile configuration
   */
  private async handleGetProfile(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const profile = this.stateProvider?.getProfile ? await this.stateProvider.getProfile() : null;

    this.send(client.id, {
      type: 'PROFILE_UPDATED',
      payload: { profile },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  // ============================================================
  // Bug Auto Execution Handlers (bug-auto-execution-per-bug-state Task 6.2)
  // Requirements: 6.2, 6.3
  // ============================================================

  /**
   * Handle GET_BUG_AUTO_EXECUTION_STATUS message
   * Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
   * Retrieves bug auto execution status for Remote UI
   */
  private async handleGetBugAutoExecutionStatus(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.bugAutoExecuteStatus) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Bug auto execution status not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const bugPath = payload.bugPath as string;

    if (!bugPath) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing bugPath' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const state = await this.workflowController.bugAutoExecuteStatus(bugPath);

    this.send(client.id, {
      type: 'BUG_AUTO_EXECUTION_STATUS',
      payload: { bugPath, state },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle START_BUG_AUTO_EXECUTION message
   * Requirements: 4.1 (remote-ui-bug-advanced-features Task 1.1)
   * Starts bug auto execution with specified permissions
   */
  private async handleStartBugAutoExecution(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.startBugAutoExecution) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Bug auto execution start not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const bugPath = payload.bugPath as string;
    const permissions = payload.permissions as BugAutoExecutionPermissionsWS | undefined;

    if (!bugPath || !permissions) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing bugPath or permissions' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.startBugAutoExecution(bugPath, permissions);

    if (result.ok) {
      this.send(client.id, {
        type: 'BUG_AUTO_EXECUTION_STARTED',
        payload: { bugPath, state: result.value },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Bug auto execution start failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle STOP_BUG_AUTO_EXECUTION message
   * Requirements: 4.2 (remote-ui-bug-advanced-features Task 1.1)
   * Stops bug auto execution for a specified bug
   */
  private async handleStopBugAutoExecution(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_CONTROLLER', message: 'Workflow controller not configured' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.workflowController.stopBugAutoExecution) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Bug auto execution stop not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const payload = message.payload || {};
    const bugPath = payload.bugPath as string;

    if (!bugPath) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'Missing bugPath' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.stopBugAutoExecution(bugPath);

    if (result.ok) {
      this.send(client.id, {
        type: 'BUG_AUTO_EXECUTION_STOPPED',
        payload: { bugPath },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } else {
      this.send(client.id, {
        type: 'ERROR',
        payload: {
          code: result.error.type,
          message: result.error.message || 'Bug auto execution stop failed',
        },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Bug Auto Execution Broadcast Methods (bug-auto-execution-per-bug-state Task 6.1)
  // Requirements: 6.2
  // ============================================================

  /**
   * Broadcast bug auto execution status change to all connected clients
   * Requirements: 6.2 (bug-auto-execution-per-bug-state Task 6.1)
   *
   * @param bugPath Bug path
   * @param state Current bug auto execution state
   */
  broadcastBugAutoExecutionStatus(bugPath: string, state: BugAutoExecutionStateWS): void {
    this.broadcast({
      type: 'BUG_AUTO_EXECUTION_STATUS',
      payload: { bugPath, state },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast bug auto execution phase completed to all connected clients
   * Requirements: 6.2 (bug-auto-execution-per-bug-state Task 6.1)
   *
   * @param bugPath Bug path
   * @param phase Completed phase
   */
  broadcastBugAutoExecutionPhaseCompleted(bugPath: string, phase: string): void {
    this.broadcast({
      type: 'BUG_AUTO_EXECUTION_PHASE_COMPLETED',
      payload: { bugPath, phase },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast bug auto execution completed to all connected clients
   * Requirements: 6.2 (bug-auto-execution-per-bug-state Task 6.1)
   *
   * @param bugPath Bug path
   */
  broadcastBugAutoExecutionCompleted(bugPath: string): void {
    this.broadcast({
      type: 'BUG_AUTO_EXECUTION_COMPLETED',
      payload: { bugPath },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast bug auto execution error to all connected clients
   * Requirements: 6.2 (bug-auto-execution-per-bug-state Task 6.1)
   *
   * @param bugPath Bug path
   * @param error Error details
   */
  broadcastBugAutoExecutionError(bugPath: string, error: BugAutoExecutionErrorWS): void {
    this.broadcast({
      type: 'BUG_AUTO_EXECUTION_ERROR',
      payload: { bugPath, error },
      timestamp: Date.now(),
    });
  }

  // ============================================================
  // Release Handlers (steering-release-integration feature)
  // Requirements: 3.4, 3.5
  // ============================================================

  /**
   * Handle CHECK_RELEASE_MD message
   * Requirements: 3.4 (steering-release-integration)
   * Checks if release.md exists in the project
   */
  private async handleCheckReleaseMd(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController?.checkReleaseMd) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Release check not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.checkReleaseMd();

    this.send(client.id, {
      type: 'RELEASE_CHECK_RESULT',
      payload: { releaseCheck: result },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle GENERATE_RELEASE_MD message
   * Requirements: 3.4 (steering-release-integration)
   * Launches steering-release agent to generate release.md
   */
  private async handleGenerateReleaseMd(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    if (!this.workflowController?.generateReleaseMd) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NOT_SUPPORTED', message: 'Release generation not supported' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.workflowController.generateReleaseMd();

    if (!result.ok) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'GENERATE_FAILED', message: result.error?.message || 'Failed to generate release.md' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    this.send(client.id, {
      type: 'GENERATE_RELEASE_MD_RESULT',
      payload: { agentInfo: result.value },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle CONVERT_TO_WORKTREE message
   * Converts a normal spec to worktree mode
   * Requirements: 4.1-4.3 (convert-spec-to-worktree)
   */
  private async handleConvertToWorktree(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const payload = message.payload as { specId?: string; specPath?: string; featureName?: string } | undefined;
    const specId = payload?.specId;
    const specPath = payload?.specPath;
    const featureName = payload?.featureName;

    if (!specId || !featureName) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'INVALID_PAYLOAD', message: 'specId and featureName are required' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const projectPath = this.stateProvider?.getProjectPath();
    if (!projectPath) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_PROJECT', message: 'No project path set' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    const resolvedSpecPath = specPath || `${projectPath}/.kiro/specs/${specId}`;

    try {
      // Use the ConvertWorktreeService via WorktreeService
      const { WorktreeService } = await import('./worktreeService');
      const { FileService } = await import('./fileService');
      const { ConvertWorktreeService, getConvertErrorMessage } = await import('./convertWorktreeService');

      const worktreeService = new WorktreeService(projectPath);
      const fileService = new FileService();
      const convertService = new ConvertWorktreeService(worktreeService, fileService);

      const result = await convertService.convertToWorktree(projectPath, resolvedSpecPath, featureName);

      if (!result.ok) {
        // Use getConvertErrorMessage to get a human-readable error message
        const errorMessage = getConvertErrorMessage(result.error);
        this.send(client.id, {
          type: 'ERROR',
          payload: {
            code: 'CONVERT_FAILED',
            message: errorMessage,
          },
          requestId: message.requestId,
          timestamp: Date.now(),
        });
        return;
      }

      this.send(client.id, {
        type: 'CONVERT_TO_WORKTREE_RESULT',
        payload: { worktreeInfo: result.value },
        requestId: message.requestId,
        timestamp: Date.now(),
      });

      // Broadcast spec updated to refresh the spec detail on clients
      this.broadcastSpecUpdated(specId, { worktree: result.value });
    } catch (error) {
      console.error('[WebSocketHandler] Convert to worktree failed', {
        specId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'CONVERT_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================================
  // Event Log Handler (spec-event-log feature)
  // Requirements: 5.3
  // ============================================================

  /**
   * Handle GET_EVENT_LOG request
   * Returns event log entries for a spec
   */
  private async handleGetEventLog(client: ClientInfo, message: WebSocketMessage): Promise<void> {
    const payload = message.payload as { specId?: string } | undefined;
    const specId = payload?.specId;

    if (!specId) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'MISSING_SPEC_ID', message: 'specId is required' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.stateProvider) {
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'NO_PROJECT', message: 'No project loaded' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const projectPath = this.stateProvider.getProjectPath();
      if (!projectPath) {
        this.send(client.id, {
          type: 'ERROR',
          payload: { code: 'NO_PROJECT', message: 'No project loaded' },
          requestId: message.requestId,
          timestamp: Date.now(),
        });
        return;
      }

      const eventLogService = getDefaultEventLogService();
      const result = await eventLogService.readEvents(projectPath, specId);

      if (result.ok) {
        this.send(client.id, {
          type: 'EVENT_LOG',
          payload: { events: result.value },
          requestId: message.requestId,
          timestamp: Date.now(),
        });
      } else {
        this.send(client.id, {
          type: 'ERROR',
          payload: { code: result.error.type, message: JSON.stringify(result.error) },
          requestId: message.requestId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('[WebSocketHandler] Get event log failed', {
        specId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.send(client.id, {
        type: 'ERROR',
        payload: { code: 'IO_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }
}
