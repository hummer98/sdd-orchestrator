/**
 * SpecManagerService
 * Manages multiple Spec Managers and their SDD Agents
 * Requirements: 3.1, 3.2, 3.6, 5.1, 5.6, 5.7, 5.8, 6.1, 6.5, 10.1, 10.2
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { AgentRegistry, AgentInfo, AgentStatus } from './agentRegistry';
import { createAgentProcess, AgentProcess, getClaudeCommand } from './agentProcess';
import {
  createProviderAgentProcess,
  getProviderTypeFromPath,
  type AgentProcess as ProviderAgentProcess,
} from './providerAgentProcess';
import { AgentRecordService } from './agentRecordService';
import { LogFileService, LogEntry } from './logFileService';
import { LogParserService, ResultSubtype } from './logParserService';
import { ImplCompletionAnalyzer, CheckImplResult, createImplCompletionAnalyzer, AnalyzeError } from './implCompletionAnalyzer';
import { logger } from './logger';
import type { ProviderType } from './ssh/providerFactory';

/** Maximum number of continue retries */
export const MAX_CONTINUE_RETRIES = 2;

// ============================================================
// Claude CLI Arguments Builder
// ============================================================

/**
 * Claude CLI共通フラグ
 * 全てのClaude CLI実行で必要な基本オプション
 */
const CLAUDE_CLI_BASE_FLAGS = ['-p', '--verbose', '--output-format', 'stream-json'] as const;

/**
 * Claude CLI引数構築オプション
 */
export interface ClaudeArgsOptions {
  /** スラッシュコマンド（例: '/kiro:spec-requirements feature-name'） */
  command?: string;
  /** セッションID（resumeモード用） */
  resumeSessionId?: string;
  /** resumeモードのプロンプト */
  resumePrompt?: string;
  /** 許可するツールのリスト（--allowedToolsフラグ用） */
  allowedTools?: string[];
}

/**
 * Claude CLI引数を構築する
 *
 * 全てのClaude CLI実行で共通フラグ（-p, --verbose, --output-format stream-json）を保証する
 *
 * @example
 * // 通常のコマンド実行
 * buildClaudeArgs({ command: '/kiro:spec-requirements my-feature' })
 * // => ['-p', '--verbose', '--output-format', 'stream-json', '/kiro:spec-requirements my-feature']
 *
 * // セッションのresume
 * buildClaudeArgs({ resumeSessionId: 'session-123', resumePrompt: 'continue' })
 * // => ['-p', '--verbose', '--output-format', 'stream-json', '--resume', 'session-123', 'continue']
 *
 * // resume時にallowedToolsを指定
 * buildClaudeArgs({ resumeSessionId: 'session-123', resumePrompt: 'continue', allowedTools: ['Read', 'Write'] })
 * // => ['-p', '--verbose', '--output-format', 'stream-json', '--allowedTools', 'Read', 'Write', '--resume', 'session-123', 'continue']
 */
export function buildClaudeArgs(options: ClaudeArgsOptions): string[] {
  const args: string[] = [...CLAUDE_CLI_BASE_FLAGS];

  // allowedToolsは--resumeより前に配置（CLIの引数解析順序を考慮）
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push('--allowedTools', ...options.allowedTools);
  }

  if (options.resumeSessionId) {
    args.push('--resume', options.resumeSessionId);
    if (options.resumePrompt) {
      args.push(options.resumePrompt);
    }
  }

  if (options.command) {
    args.push(options.command);
  }

  return args;
}

export type ExecutionGroup = 'doc' | 'validate' | 'impl';

/** ワークフローフェーズ */
export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy';

/** バリデーションタイプ */
export type ValidationType = 'gap' | 'design' | 'impl';

/** コマンドプレフィックス */
export type CommandPrefix = 'kiro' | 'spec-manager';

/** プレフィックス別フェーズ実行コマンドマッピング */
const PHASE_COMMANDS_BY_PREFIX: Record<CommandPrefix, Record<WorkflowPhase, string>> = {
  kiro: {
    requirements: '/kiro:spec-requirements',
    design: '/kiro:spec-design',
    tasks: '/kiro:spec-tasks',
    impl: '/kiro:spec-impl',
    inspection: '/kiro:validate-impl',
    deploy: '/kiro:deployment',
  },
  'spec-manager': {
    requirements: '/spec-manager:requirements',
    design: '/spec-manager:design',
    tasks: '/spec-manager:tasks',
    impl: '/spec-manager:impl',
    inspection: '/spec-manager:validate-impl',
    deploy: '/spec-manager:deployment',
  },
};

/** プレフィックス別バリデーションコマンドマッピング */
const VALIDATION_COMMANDS_BY_PREFIX: Record<CommandPrefix, Record<ValidationType, string>> = {
  kiro: {
    gap: '/kiro:validate-gap',
    design: '/kiro:validate-design',
    impl: '/kiro:validate-impl',
  },
  'spec-manager': {
    gap: '/spec-manager:validate-gap',
    design: '/spec-manager:validate-design',
    impl: '/spec-manager:validate-impl',
  },
};

/** spec-status コマンドマッピング */
const SPEC_STATUS_COMMANDS: Record<CommandPrefix, string> = {
  kiro: '/kiro:spec-status',
  'spec-manager': '/spec-manager:status',
};

/** spec-init コマンドマッピング */
export const SPEC_INIT_COMMANDS: Record<CommandPrefix, string> = {
  kiro: '/kiro:spec-init',
  'spec-manager': '/spec-manager:init',
};

/**
 * フェーズ別allowed-toolsマッピング
 * スラッシュコマンドのフロントマターで定義されているallowed-toolsと一致させる
 * resume時に--allowedToolsフラグとして渡すために使用
 */
const PHASE_ALLOWED_TOOLS: Record<string, string[]> = {
  // kiro系コマンド
  'requirements': ['Read', 'Task'],
  'spec-manager-requirements': ['Read', 'Write', 'Glob'],
  'design': ['Read', 'Task'],
  'spec-manager-design': ['Read', 'Write', 'Glob'],
  'tasks': ['Read', 'Task'],
  'spec-manager-tasks': ['Read', 'Write', 'Glob'],
  'impl': ['Read', 'Task'],
  'spec-manager-impl': ['Read', 'Write', 'Edit', 'Glob', 'Bash'],
  'inspection': ['Read', 'Task'],
  'validate-gap': ['Read', 'Task'],
  'validate-design': ['Read', 'Task'],
  'validate-impl': ['Read', 'Task'],
  'status': ['Bash', 'Read', 'Glob', 'Write', 'Edit', 'MultiEdit', 'Update'],
  // document-review系
  'document-review': ['Read', 'Write', 'Glob', 'Grep'],
  'document-review-reply': ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
  'document-review-fix': ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
  // bug系
  'bug-create': ['Bash', 'Read', 'Write', 'Glob'],
  'bug-analyze': ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
  'bug-fix': ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
  'bug-verify': ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
  'bug-status': ['Read', 'Glob'],
};

/**
 * フェーズ名からallowed-toolsを取得する
 * impl-taskX形式のフェーズ名にも対応
 */
export function getAllowedToolsForPhase(phase: string): string[] | undefined {
  // 完全一致を優先
  if (PHASE_ALLOWED_TOOLS[phase]) {
    return PHASE_ALLOWED_TOOLS[phase];
  }
  // impl-taskX形式の場合はimplのallowed-toolsを返す
  if (phase.startsWith('impl-')) {
    return PHASE_ALLOWED_TOOLS['impl'];
  }
  // spec-manager-impl-taskX形式の場合
  if (phase.startsWith('spec-manager-impl-')) {
    return PHASE_ALLOWED_TOOLS['spec-manager-impl'];
  }
  return undefined;
}

/** フェーズからExecutionGroupへのマッピング */
const PHASE_GROUPS: Record<WorkflowPhase, ExecutionGroup> = {
  requirements: 'doc',
  design: 'doc',
  tasks: 'doc',
  impl: 'impl',
  inspection: 'validate',
  deploy: 'doc',
};

export interface StartAgentOptions {
  specId: string;
  phase: string;
  command: string;
  args: string[];
  group?: ExecutionGroup;
  sessionId?: string;
  /** Provider type for local/SSH transparency (defaults to 'local') */
  providerType?: ProviderType;
}

export interface ExecutePhaseOptions {
  specId: string;
  phase: WorkflowPhase;
  featureName: string;
  commandPrefix?: CommandPrefix;
}

export interface ExecuteValidationOptions {
  specId: string;
  type: ValidationType;
  featureName: string;
  commandPrefix?: CommandPrefix;
}

export interface ExecuteTaskImplOptions {
  specId: string;
  featureName: string;
  taskId: string;
  commandPrefix?: CommandPrefix;
}

/** Document Review execution options (Requirements: 6.1) */
export interface ExecuteDocumentReviewOptions {
  specId: string;
  featureName: string;
  commandPrefix?: CommandPrefix;
}

/** Document Review Reply execution options (Requirements: 6.1) */
export interface ExecuteDocumentReviewReplyOptions {
  specId: string;
  featureName: string;
  reviewNumber: number;
  commandPrefix?: CommandPrefix;
}

/** Document Review Fix execution options (apply --fix from existing reply) */
export interface ExecuteDocumentReviewFixOptions {
  specId: string;
  featureName: string;
  reviewNumber: number;
  commandPrefix?: CommandPrefix;
}

/** spec-manager用フェーズタイプ */
export type SpecManagerPhase = 'requirements' | 'design' | 'tasks' | 'impl';

/** impl用タスクステータス */
export type ImplTaskStatus =
  | 'pending'      // 未実行
  | 'running'      // 実行中
  | 'continuing'   // continue中（リトライ中）
  | 'success'      // 完了
  | 'error'        // エラー終了
  | 'stalled';     // リトライ上限到達（完了報告なし）

/** spec-manager用コマンド実行オプション */
export interface ExecuteSpecManagerOptions {
  readonly specId: string;
  readonly phase: SpecManagerPhase;
  readonly featureName: string;
  readonly taskId?: string; // impl時のみ
  readonly executionMode: 'auto' | 'manual';
}

/** impl実行結果 */
export interface ExecuteImplResult {
  readonly status: ImplTaskStatus;
  readonly completedTasks: readonly string[];
  readonly retryCount: number;
  readonly stats?: {
    readonly num_turns: number;
    readonly duration_ms: number;
    readonly total_cost_usd: number;
  };
}

/** spec-managerフェーズコマンドマッピング */
const SPEC_MANAGER_COMMANDS: Record<SpecManagerPhase, string> = {
  requirements: '/spec-manager:requirements',
  design: '/spec-manager:design',
  tasks: '/spec-manager:tasks',
  impl: '/spec-manager:impl',
};

export type AgentError =
  | { type: 'SPAWN_ERROR'; message: string }
  | { type: 'NOT_FOUND'; agentId: string }
  | { type: 'ALREADY_RUNNING'; specId: string; phase: string }
  | { type: 'SESSION_NOT_FOUND'; agentId: string }
  | { type: 'GROUP_CONFLICT'; runningGroup: ExecutionGroup; requestedGroup: ExecutionGroup }
  | { type: 'SPEC_MANAGER_LOCKED'; lockedBy: string }
  | { type: 'PARSE_ERROR'; message: string }
  | { type: 'ANALYZE_ERROR'; error: AnalyzeError };

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Service for managing Spec Managers and their SDD Agents
 * Now supports both local and SSH providers for transparent remote execution
 */
export class SpecManagerService {
  private registry: AgentRegistry;
  private recordService: AgentRecordService;
  private logService: LogFileService;
  private logParserService: LogParserService;
  private implAnalyzer: ImplCompletionAnalyzer | null = null;
  private processes: Map<string, AgentProcess | ProviderAgentProcess> = new Map();
  private projectPath: string;
  private outputCallbacks: ((agentId: string, stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private statusCallbacks: ((agentId: string, status: AgentStatus) => void)[] = [];

  // Provider type for local/SSH transparency (defaults to 'local')
  private providerType: ProviderType = 'local';

  // Mutex for spec-manager operations
  private specManagerLock: string | null = null;
  private specManagerLockResolve: (() => void) | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    // Determine provider type from project path
    this.providerType = getProviderTypeFromPath(projectPath);
    this.registry = new AgentRegistry();
    this.recordService = new AgentRecordService(
      path.join(projectPath, '.kiro', 'runtime', 'agents')
    );
    // Log files are stored at .kiro/specs/{specId}/logs/{agentId}.log
    this.logService = new LogFileService(
      path.join(projectPath, '.kiro', 'specs')
    );
    this.logParserService = new LogParserService();

    // Initialize ImplCompletionAnalyzer if API key is available
    const analyzerResult = createImplCompletionAnalyzer();
    if (analyzerResult.ok) {
      this.implAnalyzer = analyzerResult.value;
      logger.info('[SpecManagerService] ImplCompletionAnalyzer initialized');
    } else {
      logger.warn('[SpecManagerService] ImplCompletionAnalyzer not available', { error: analyzerResult.error });
    }
  }

  /**
   * Get the current provider type
   * Requirements: 3.1, 4.1
   */
  getProviderType(): ProviderType {
    return this.providerType;
  }

  /**
   * Set the provider type for process execution
   * Requirements: 3.1, 4.1, 7.1
   * @param providerType - 'local' for local filesystem, 'ssh' for SSH remote
   */
  setProviderType(providerType: ProviderType): void {
    logger.info('[SpecManagerService] Provider type changed', {
      from: this.providerType,
      to: providerType,
    });
    this.providerType = providerType;
  }

  /**
   * Check if currently using SSH provider
   * Requirements: 5.1
   */
  isSSHProvider(): boolean {
    return this.providerType === 'ssh';
  }

  /**
   * Generate a unique agent ID
   */
  private generateAgentId(): string {
    return `agent-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Get the currently running execution group for a specific spec
   * @param specId - The spec ID to check (if null, checks all specs)
   */
  private getRunningGroup(specId?: string): ExecutionGroup | null {
    const agents = specId
      ? this.registry.getBySpec(specId)
      : this.registry.getAll();
    const runningAgents = agents.filter((a) => a.status === 'running');

    for (const agent of runningAgents) {
      // Check agent's phase to determine group
      if (agent.phase.startsWith('validate-')) {
        return 'validate';
      }
      if (agent.phase.startsWith('impl-') || agent.phase === 'impl') {
        return 'impl';
      }
      if (['requirement', 'requirements', 'design', 'tasks'].includes(agent.phase)) {
        return 'doc';
      }
    }

    return null;
  }

  /**
   * Check if an agent is already running for the given spec and phase
   */
  private isPhaseRunning(specId: string, phase: string): boolean {
    const agents = this.registry.getBySpec(specId);
    return agents.some((a) => a.phase === phase && a.status === 'running');
  }

  /**
   * Start a new SDD Agent
   * Requirements: 5.1, 6.1
   * Now supports both local and SSH providers for transparent remote execution
   */
  async startAgent(options: StartAgentOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, command, args, group, sessionId, providerType } = options;
    const effectiveProviderType = providerType ?? this.providerType;
    logger.info('[SpecManagerService] startAgent called', {
      specId, phase, command, args, group, sessionId, providerType: effectiveProviderType,
    });

    // Check if phase is already running
    if (this.isPhaseRunning(specId, phase)) {
      logger.warn('[SpecManagerService] Phase already running', { specId, phase });
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', specId, phase },
      };
    }

    // Check for group conflicts (validate vs impl) within the same spec
    if (group === 'validate' || group === 'impl') {
      const runningGroup = this.getRunningGroup(specId);
      if (runningGroup && runningGroup !== group) {
        if ((runningGroup === 'validate' && group === 'impl') ||
            (runningGroup === 'impl' && group === 'validate')) {
          return {
            ok: false,
            error: { type: 'GROUP_CONFLICT', runningGroup, requestedGroup: group },
          };
        }
      }
    }

    const agentId = this.generateAgentId();
    const now = new Date().toISOString();

    try {
      logger.info('[SpecManagerService] Creating agent process', {
        agentId, command, args, cwd: this.projectPath, providerType: effectiveProviderType,
      });

      // Create the agent process using provider-aware factory for SSH, or direct for local
      let process: AgentProcess | ProviderAgentProcess;

      if (effectiveProviderType === 'ssh') {
        // Use provider-aware process for SSH
        const providerResult = await createProviderAgentProcess({
          agentId,
          command,
          args,
          cwd: this.projectPath,
          sessionId,
          providerType: 'ssh',
        });

        if (!providerResult.ok) {
          logger.error('[SpecManagerService] Provider spawn failed', {
            agentId,
            error: providerResult.error,
          });
          return {
            ok: false,
            error: {
              type: 'SPAWN_ERROR',
              message: providerResult.error.message,
            },
          };
        }
        process = providerResult.value;
      } else {
        // Use existing local process for backward compatibility
        process = createAgentProcess({
          agentId,
          command,
          args,
          cwd: this.projectPath,
          sessionId,
        });
      }

      logger.info('[SpecManagerService] Agent process created', { agentId, pid: process.pid });

      // Create agent info
      const agentInfo: AgentInfo = {
        agentId,
        specId,
        phase,
        pid: process.pid,
        sessionId: sessionId || '',
        status: 'running',
        startedAt: now,
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      };

      // Register the agent
      this.registry.register(agentInfo);
      this.processes.set(agentId, process);

      // Write agent record
      await this.recordService.writeRecord({
        agentId,
        specId,
        phase,
        pid: process.pid,
        sessionId: sessionId || '',
        status: 'running',
        startedAt: now,
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      });

      // Set up event handlers
      process.onOutput((stream, data) => {
        logger.debug('[SpecManagerService] Process output received', { agentId, stream, dataLength: data.length });
        this.registry.updateActivity(agentId);

        // Parse sessionId from Claude Code init message
        if (stream === 'stdout') {
          this.parseAndUpdateSessionId(agentId, specId, data);

          // Bug Fix: Check for result message and force kill if process doesn't exit
          // See docs/memo/claude-cli-process-not-exiting.md
          if (data.includes('"type":"result"')) {
            setTimeout(() => {
              if (this.processes.has(agentId)) {
                logger.warn('[SpecManagerService] Force killing hanging process after result', { agentId });
                process.kill();
              }
            }, 5000);
          }
        }

        // Save log to file
        const logEntry: LogEntry = {
          timestamp: new Date().toISOString(),
          stream,
          data,
        };
        this.logService.appendLog(specId, agentId, logEntry).catch((err) => {
          logger.warn('[SpecManagerService] Failed to write log file', { agentId, error: err.message });
        });

        logger.debug('[SpecManagerService] Calling output callbacks', { agentId, callbackCount: this.outputCallbacks.length });
        this.outputCallbacks.forEach((cb) => cb(agentId, stream, data));
      });

      process.onExit((code) => {
        // Check current status - if already interrupted (by stopAgent), don't change
        const currentAgent = this.registry.get(agentId);
        if (currentAgent?.status === 'interrupted') {
          this.processes.delete(agentId);
          return;
        }

        const newStatus: AgentStatus = code === 0 ? 'completed' : 'failed';
        this.registry.updateStatus(agentId, newStatus);
        this.statusCallbacks.forEach((cb) => cb(agentId, newStatus));
        this.processes.delete(agentId);

        // Update agent record
        this.recordService.updateRecord(specId, agentId, {
          status: newStatus,
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record on exit
        });
      });

      process.onError(() => {
        this.registry.updateStatus(agentId, 'failed');
        this.statusCallbacks.forEach((cb) => cb(agentId, 'failed'));
        this.processes.delete(agentId);

        // Update agent record on error
        this.recordService.updateRecord(specId, agentId, {
          status: 'failed',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record on error
        });
      });

      return { ok: true, value: agentInfo };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'SPAWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Stop a running agent
   * Requirements: 5.1
   */
  async stopAgent(agentId: string): Promise<Result<void, AgentError>> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    const process = this.processes.get(agentId);
    if (process) {
      process.kill();
      this.processes.delete(agentId);
    }

    // Update status
    this.registry.updateStatus(agentId, 'interrupted');
    this.statusCallbacks.forEach((cb) => cb(agentId, 'interrupted'));

    // Update agent record
    try {
      await this.recordService.updateRecord(agent.specId, agentId, {
        status: 'interrupted',
        lastActivityAt: new Date().toISOString(),
      });
    } catch {
      // Ignore errors
    }

    return { ok: true, value: undefined };
  }

  /**
   * Stop all running agents
   */
  async stopAllAgents(): Promise<void> {
    const allAgents = this.registry.getAll();
    const runningAgents = allAgents.filter((a) => a.status === 'running');

    for (const agent of runningAgents) {
      await this.stopAgent(agent.agentId);
    }
  }

  /**
   * Delete an agent record and remove from registry
   * Bug fix: global-agent-display-issues
   * @param specId - The spec ID (empty string for global agents)
   * @param agentId - The ID of the agent to delete
   */
  async deleteAgent(specId: string, agentId: string): Promise<Result<void, AgentError>> {
    const agent = this.registry.get(agentId);

    // Don't allow deleting running or hang agents (only check if agent exists in registry)
    if (agent && (agent.status === 'running' || agent.status === 'hang')) {
      return {
        ok: false,
        error: { type: 'SPAWN_ERROR', message: 'Cannot delete running or hang agents' },
      };
    }

    // Delete the agent record file (try even if not in registry)
    try {
      await this.recordService.deleteRecord(specId, agentId);
      logger.info('[SpecManagerService] Agent record deleted', { specId, agentId });
    } catch (error) {
      logger.error('[SpecManagerService] Failed to delete agent record', { specId, agentId, error });
      // Continue even if file deletion fails (file might not exist)
    }

    // Remove from registry if exists
    if (agent) {
      this.registry.unregister(agentId);
      logger.info('[SpecManagerService] Agent unregistered', { specId, agentId });
    }

    return { ok: true, value: undefined };
  }

  /**
   * Restore agents from agent records after restart
   * Requirements: 5.6, 5.7
   * Now also restores completed/failed agents as history
   */
  async restoreAgents(): Promise<void> {
    const records = await this.recordService.readAllRecords();

    for (const record of records) {
      const isAlive = this.recordService.checkProcessAlive(record.pid);

      // Determine the correct status based on process state
      let status = record.status;
      if (!isAlive && record.status === 'running') {
        // Process died unexpectedly while running - mark as interrupted
        status = 'interrupted';
        console.log(`[SpecManagerService] Agent process died unexpectedly: ${record.agentId} (pid: ${record.pid}), marking as interrupted`);

        // Update the agent record with the new status
        await this.recordService.updateRecord(record.specId, record.agentId, {
          status: 'interrupted',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record
        });
      }

      const agentInfo: AgentInfo = {
        agentId: record.agentId,
        specId: record.specId,
        phase: record.phase,
        pid: record.pid,
        sessionId: record.sessionId,
        status,
        startedAt: record.startedAt,
        lastActivityAt: record.lastActivityAt,
        command: record.command,
      };

      // Register all agents (including completed/failed) as history
      this.registry.register(agentInfo);
      console.log(`[SpecManagerService] Restored agent: ${record.agentId} (pid: ${record.pid}, status: ${status}, alive: ${isAlive})`);
    }
  }

  /**
   * Resume an interrupted agent
   * Requirements: 5.8
   * @param agentId - The ID of the agent to resume
   * @param prompt - Optional custom prompt to send (defaults to '続けて')
   */
  async resumeAgent(
    agentId: string,
    prompt?: string
  ): Promise<Result<AgentInfo, AgentError>> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    if (!agent.sessionId) {
      return {
        ok: false,
        error: { type: 'SESSION_NOT_FOUND', agentId },
      };
    }

    // Check if already running
    if (agent.status === 'running' || agent.status === 'hang') {
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', specId: agent.specId, phase: agent.phase },
      };
    }

    const resumePrompt = prompt || '続けて';
    // フェーズに対応するallowed-toolsを取得してresume時にも適用
    const allowedTools = getAllowedToolsForPhase(agent.phase);
    const args = buildClaudeArgs({
      resumeSessionId: agent.sessionId,
      resumePrompt,
      allowedTools,
    });
    const command = getClaudeCommand();
    const now = new Date().toISOString();

    try {
      logger.info('[SpecManagerService] Resuming agent', {
        agentId,
        sessionId: agent.sessionId,
        prompt: resumePrompt,
        phase: agent.phase,
        allowedTools,
      });

      // Create a new process but keep the same agentId
      const process = createAgentProcess({
        agentId,
        command,
        args,
        cwd: this.projectPath,
        sessionId: agent.sessionId,
      });

      // Update agent info (keep same agentId)
      const updatedAgentInfo: AgentInfo = {
        ...agent,
        pid: process.pid,
        status: 'running',
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      };

      // Update registry
      this.registry.updateStatus(agentId, 'running');
      this.registry.updateActivity(agentId);
      this.processes.set(agentId, process);

      // Update agent record
      await this.recordService.updateRecord(agent.specId, agentId, {
        pid: process.pid,
        status: 'running',
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      });

      // Set up event handlers (same as startAgent)
      process.onOutput((stream, data) => {
        this.registry.updateActivity(agentId);

        if (stream === 'stdout' && data.includes('"type":"result"')) {
          setTimeout(() => {
            if (this.processes.has(agentId)) {
              logger.warn('[SpecManagerService] Force killing hanging process after result', { agentId });
              process.kill();
            }
          }, 5000);
        }

        // Save log to file (append to existing logs)
        const logEntry: LogEntry = {
          timestamp: new Date().toISOString(),
          stream,
          data,
        };
        this.logService.appendLog(agent.specId, agentId, logEntry).catch((err) => {
          logger.warn('[SpecManagerService] Failed to write log file', { agentId, error: err.message });
        });

        this.outputCallbacks.forEach((cb) => cb(agentId, stream, data));
      });

      process.onExit((code) => {
        const currentAgent = this.registry.get(agentId);
        if (currentAgent?.status === 'interrupted') {
          this.processes.delete(agentId);
          return;
        }

        const newStatus: AgentStatus = code === 0 ? 'completed' : 'failed';
        this.registry.updateStatus(agentId, newStatus);
        this.statusCallbacks.forEach((cb) => cb(agentId, newStatus));
        this.processes.delete(agentId);

        this.recordService.updateRecord(agent.specId, agentId, {
          status: newStatus,
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {});
      });

      process.onError(() => {
        this.registry.updateStatus(agentId, 'failed');
        this.statusCallbacks.forEach((cb) => cb(agentId, 'failed'));
        this.processes.delete(agentId);

        this.recordService.updateRecord(agent.specId, agentId, {
          status: 'failed',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {});
      });

      // Notify status change
      this.statusCallbacks.forEach((cb) => cb(agentId, 'running'));

      return { ok: true, value: updatedAgentInfo };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'SPAWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Send input to a running agent's stdin
   * Requirements: 10.1, 10.2
   */
  sendInput(agentId: string, input: string): Result<void, AgentError> {
    const process = this.processes.get(agentId);
    if (!process) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    process.writeStdin(input);
    this.registry.updateActivity(agentId);

    return { ok: true, value: undefined };
  }

  /**
   * Get agents for a specific spec
   */
  getAgents(specId: string): AgentInfo[] {
    return this.registry.getBySpec(specId);
  }

  /**
   * Get all agents grouped by spec
   */
  getAllAgents(): Map<string, AgentInfo[]> {
    const result = new Map<string, AgentInfo[]>();
    const allAgents = this.registry.getAll();

    for (const agent of allAgents) {
      const existing = result.get(agent.specId) || [];
      existing.push(agent);
      result.set(agent.specId, existing);
    }

    return result;
  }

  /**
   * Register output callback
   */
  onOutput(callback: (agentId: string, stream: 'stdout' | 'stderr', data: string) => void): void {
    this.outputCallbacks.push(callback);
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback: (agentId: string, status: AgentStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Execute a workflow phase
   * Builds the claude command internally
   */
  async executePhase(options: ExecutePhaseOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, featureName, commandPrefix = 'kiro' } = options;
    const slashCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix][phase];
    const group = PHASE_GROUPS[phase];

    logger.info('[SpecManagerService] executePhase called', { specId, phase, featureName, slashCommand, group, commandPrefix });

    return this.startAgent({
      specId,
      phase,
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
      group,
    });
  }

  /**
   * Execute a validation
   * Builds the claude command internally
   */
  async executeValidation(options: ExecuteValidationOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, type, featureName, commandPrefix = 'kiro' } = options;
    const slashCommand = VALIDATION_COMMANDS_BY_PREFIX[commandPrefix][type];
    const phase = `validate-${type}`;

    logger.info('[SpecManagerService] executeValidation called', { specId, type, featureName, slashCommand, commandPrefix });

    return this.startAgent({
      specId,
      phase,
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
      group: 'validate',
    });
  }

  /**
   * Execute spec-status command
   */
  async executeSpecStatus(specId: string, featureName: string, commandPrefix: CommandPrefix = 'kiro'): Promise<Result<AgentInfo, AgentError>> {
    const slashCommand = SPEC_STATUS_COMMANDS[commandPrefix];
    logger.info('[SpecManagerService] executeSpecStatus called', { specId, featureName, commandPrefix, slashCommand });

    return this.startAgent({
      specId,
      phase: 'status',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
      group: 'doc',
    });
  }

  /**
   * Execute a specific task implementation
   * Builds the claude command with task ID
   */
  async executeTaskImpl(options: ExecuteTaskImplOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, taskId, commandPrefix = 'kiro' } = options;
    const implCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].impl;

    logger.info('[SpecManagerService] executeTaskImpl called', { specId, featureName, taskId, commandPrefix, implCommand });

    return this.startAgent({
      specId,
      phase: `impl-${taskId}`,
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${implCommand} ${featureName} ${taskId}` }),
      group: 'impl',
    });
  }

  // ============================================================
  // Document Review Execution (Requirements: 6.1 - Document Review Workflow)
  // ============================================================

  /**
   * Execute document-review agent
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async executeDocumentReview(options: ExecuteDocumentReviewOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, commandPrefix = 'kiro' } = options;
    const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review' : '/spec-manager:document-review';

    logger.info('[SpecManagerService] executeDocumentReview called', { specId, featureName, slashCommand, commandPrefix });

    return this.startAgent({
      specId,
      phase: 'document-review',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
      group: 'doc',
    });
  }

  /**
   * Execute document-review-reply agent
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  async executeDocumentReviewReply(options: ExecuteDocumentReviewReplyOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, reviewNumber, commandPrefix = 'kiro' } = options;
    const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review-reply' : '/spec-manager:document-review-reply';

    logger.info('[SpecManagerService] executeDocumentReviewReply called', { specId, featureName, reviewNumber, slashCommand, commandPrefix });

    return this.startAgent({
      specId,
      phase: 'document-review-reply',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName} ${reviewNumber}` }),
      group: 'doc',
    });
  }

  /**
   * Execute document-review-reply --fix agent (apply fixes from existing reply)
   * This runs document-review-reply with --fix flag to apply modifications without re-evaluating
   */
  async executeDocumentReviewFix(options: ExecuteDocumentReviewFixOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, reviewNumber, commandPrefix = 'kiro' } = options;
    const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review-reply' : '/spec-manager:document-review-reply';

    logger.info('[SpecManagerService] executeDocumentReviewFix called', { specId, featureName, reviewNumber, slashCommand, commandPrefix });

    return this.startAgent({
      specId,
      phase: 'document-review-fix',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName} ${reviewNumber} --fix` }),
      group: 'doc',
    });
  }

  /**
   * Parse sessionId from Claude Code stream-json output
   * Claude Code outputs session_id in the first "system/init" message
   */
  private parseAndUpdateSessionId(agentId: string, specId: string, data: string): void {
    // Already have sessionId for this agent
    const agent = this.registry.get(agentId);
    if (agent?.sessionId) {
      return;
    }

    try {
      // Claude Code outputs JSON lines, try to parse each line
      const lines = data.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          // Check for system/init message with session_id
          if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
            logger.info('[SpecManagerService] Extracted sessionId from Claude Code output', {
              agentId,
              sessionId: parsed.session_id,
            });

            // Update registry
            this.registry.updateSessionId(agentId, parsed.session_id);

            // Update agent record
            this.recordService.updateRecord(specId, agentId, {
              sessionId: parsed.session_id,
            }).catch((err) => {
              logger.warn('[SpecManagerService] Failed to update agent record with sessionId', {
                agentId,
                error: err.message,
              });
            });

            return;
          }
        } catch {
          // Not valid JSON, skip this line
        }
      }
    } catch (err) {
      // Parsing error, ignore
      logger.debug('[SpecManagerService] Failed to parse output for sessionId', { agentId });
    }
  }

  // ============================================================
  // spec-manager Extensions
  // Requirements: 3.1, 3.2, 3.6, 5.1, 5.6, 5.7, 5.8
  // ============================================================

  /**
   * Check if a spec-manager operation is currently running
   * Requirements: 3.6
   */
  isSpecManagerOperationRunning(): boolean {
    return this.specManagerLock !== null;
  }

  /**
   * Acquire spec-manager lock for exclusive control
   * Requirements: 3.6
   */
  async acquireSpecManagerLock(lockId: string): Promise<Result<void, AgentError>> {
    if (this.specManagerLock !== null) {
      return {
        ok: false,
        error: { type: 'SPEC_MANAGER_LOCKED', lockedBy: this.specManagerLock },
      };
    }

    this.specManagerLock = lockId;
    // Store resolve callback for later use when releasing lock
    new Promise<void>((resolve) => {
      this.specManagerLockResolve = resolve;
    });

    logger.info('[SpecManagerService] Acquired spec-manager lock', { lockId });
    return { ok: true, value: undefined };
  }

  /**
   * Release spec-manager lock
   * Requirements: 3.6
   */
  releaseSpecManagerLock(lockId: string): void {
    if (this.specManagerLock === lockId) {
      this.specManagerLock = null;
      if (this.specManagerLockResolve) {
        this.specManagerLockResolve();
        this.specManagerLockResolve = null;
      }
      logger.info('[SpecManagerService] Released spec-manager lock', { lockId });
    }
  }

  /**
   * Execute spec-manager phase command
   * Requirements: 3.1, 3.2, 3.6, 5.1
   *
   * For requirements/design/tasks: uses LogParserService.parseResultSubtype for algorithmic determination
   * For impl: uses ImplCompletionAnalyzer.analyzeCompletion() for LLM analysis (Structured Output)
   */
  async executeSpecManagerPhase(
    options: ExecuteSpecManagerOptions
  ): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, featureName, taskId, executionMode } = options;
    const lockId = `${specId}-${phase}-${Date.now()}`;

    logger.info('[SpecManagerService] executeSpecManagerPhase called', {
      specId,
      phase,
      featureName,
      taskId,
      executionMode,
    });

    // Acquire lock for exclusive control
    const lockResult = await this.acquireSpecManagerLock(lockId);
    if (!lockResult.ok) {
      return lockResult;
    }

    try {
      // Build command
      const slashCommand = SPEC_MANAGER_COMMANDS[phase];
      const command = phase === 'impl' && taskId
        ? `${slashCommand} ${featureName} ${taskId}`
        : `${slashCommand} ${featureName}`;
      const commandArgs = buildClaudeArgs({ command });

      // Start agent
      const result = await this.startAgent({
        specId,
        phase: phase === 'impl' && taskId ? `spec-manager-impl-${taskId}` : `spec-manager-${phase}`,
        command: getClaudeCommand(),
        args: commandArgs,
        group: phase === 'impl' ? 'impl' : 'doc',
      });

      if (!result.ok) {
        this.releaseSpecManagerLock(lockId);
        return result;
      }

      // Note: Lock will be released when the agent completes and completion is checked
      // For now, we release immediately after starting the agent
      // The completion checking will be done asynchronously via callbacks
      this.releaseSpecManagerLock(lockId);

      return result;
    } catch (error) {
      this.releaseSpecManagerLock(lockId);
      throw error;
    }
  }

  /**
   * Retry with continue for no_result detection
   * Requirements: 5.6, 5.7, 5.8
   *
   * @param sessionId - Original session ID to resume
   * @param retryCount - Current retry count (0-based)
   * @returns New AgentInfo if retrying, or { status: 'stalled' } if max retries exceeded
   */
  async retryWithContinue(
    sessionId: string,
    retryCount: number
  ): Promise<Result<AgentInfo | { status: 'stalled' }, AgentError>> {
    logger.info('[SpecManagerService] retryWithContinue called', { sessionId, retryCount });

    // Check if max retries exceeded
    if (retryCount >= MAX_CONTINUE_RETRIES) {
      logger.warn('[SpecManagerService] Max retries exceeded, returning stalled', {
        sessionId,
        retryCount,
        maxRetries: MAX_CONTINUE_RETRIES,
      });
      return { ok: true, value: { status: 'stalled' } };
    }

    // Find the original agent by sessionId
    const allAgents = this.registry.getAll();
    const originalAgent = allAgents.find((a) => a.sessionId === sessionId);

    if (!originalAgent) {
      return {
        ok: false,
        error: { type: 'SESSION_NOT_FOUND', agentId: sessionId },
      };
    }

    // フェーズに対応するallowed-toolsを取得してretry時にも適用
    const allowedTools = getAllowedToolsForPhase(originalAgent.phase);
    logger.info('[SpecManagerService] retryWithContinue allowedTools', {
      phase: originalAgent.phase,
      allowedTools,
    });

    // Start a new agent with session resume and "continue" prompt
    return this.startAgent({
      specId: originalAgent.specId,
      phase: originalAgent.phase,
      command: getClaudeCommand(),
      args: buildClaudeArgs({
        resumeSessionId: sessionId,
        resumePrompt: 'continue',
        allowedTools,
      }),
      sessionId,
    });
  }

  /**
   * Analyze impl completion using ImplCompletionAnalyzer
   * Requirements: 2.4, 5.1
   *
   * @param logPath - Path to the impl execution log
   * @returns CheckImplResult from ImplCompletionAnalyzer
   */
  async analyzeImplCompletion(
    logPath: string
  ): Promise<Result<CheckImplResult, AgentError>> {
    logger.info('[SpecManagerService] analyzeImplCompletion called', { logPath });

    // Check if analyzer is available
    if (!this.implAnalyzer) {
      return {
        ok: false,
        error: {
          type: 'ANALYZE_ERROR',
          error: { type: 'API_ERROR', message: 'ImplCompletionAnalyzer not initialized - API key may not be set' },
        },
      };
    }

    // Get result line from log
    const resultLineResult = await this.logParserService.getResultLine(logPath);
    if (!resultLineResult.ok) {
      return {
        ok: false,
        error: { type: 'PARSE_ERROR', message: `Failed to get result line: ${resultLineResult.error.type}` },
      };
    }

    // Get last assistant message from log
    const lastMessageResult = await this.logParserService.getLastAssistantMessage(logPath);
    if (!lastMessageResult.ok) {
      return {
        ok: false,
        error: { type: 'PARSE_ERROR', message: `Failed to get last assistant message: ${lastMessageResult.error.type}` },
      };
    }

    // Analyze using ImplCompletionAnalyzer
    const analyzeResult = await this.implAnalyzer.analyzeCompletion(
      resultLineResult.value,
      lastMessageResult.value
    );

    if (!analyzeResult.ok) {
      return {
        ok: false,
        error: { type: 'ANALYZE_ERROR', error: analyzeResult.error },
      };
    }

    return { ok: true, value: analyzeResult.value };
  }

  /**
   * Check completion status for a spec-manager phase
   * Requirements: 3.1, 3.2, 5.1
   *
   * For requirements/design/tasks: uses LogParserService.parseResultSubtype
   * For impl: uses analyzeImplCompletion
   */
  async checkSpecManagerCompletion(
    specId: string,
    phase: SpecManagerPhase,
    logPath: string
  ): Promise<Result<{ subtype: ResultSubtype; implResult?: CheckImplResult }, AgentError>> {
    logger.info('[SpecManagerService] checkSpecManagerCompletion called', { specId, phase, logPath });

    if (phase === 'impl') {
      // For impl, use ImplCompletionAnalyzer
      const implResult = await this.analyzeImplCompletion(logPath);
      if (!implResult.ok) {
        return implResult;
      }
      return { ok: true, value: { subtype: 'success', implResult: implResult.value } };
    } else {
      // For requirements/design/tasks, use LogParserService
      const subtypeResult = await this.logParserService.parseResultSubtype(logPath);
      if (!subtypeResult.ok) {
        return {
          ok: false,
          error: { type: 'PARSE_ERROR', message: `Failed to parse result subtype: ${subtypeResult.error.type}` },
        };
      }
      return { ok: true, value: { subtype: subtypeResult.value } };
    }
  }

  /**
   * Get log path for an agent
   */
  getAgentLogPath(specId: string, agentId: string): string {
    return path.join(this.projectPath, '.kiro', 'specs', specId, 'logs', `${agentId}.ndjson`);
  }
}
