/**
 * SpecManagerService
 * Manages multiple Spec Managers and their SDD Agents
 * Requirements: 3.1, 3.2, 3.6, 5.1, 5.6, 5.7, 5.8, 6.1, 6.5, 10.1, 10.2
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { createAgentProcess, AgentProcess, getClaudeCommand } from './agentProcess';
import {
  createProviderAgentProcess,
  getProviderTypeFromPath,
  type AgentProcess as ProviderAgentProcess,
} from './providerAgentProcess';
import { AgentRecordService, AgentInfo, AgentStatus } from './agentRecordService';
import { LogFileService, LogEntry } from './logFileService';
import { FileService } from './fileService';
import { LogParserService, ResultSubtype } from './logParserService';
// execution-store-consolidation: ImplCompletionAnalyzer REMOVED (Req 6.2)
// import { ImplCompletionAnalyzer, CheckImplResult, createImplCompletionAnalyzer, AnalyzeError } from './implCompletionAnalyzer';
import { logger } from './logger';
import type { ProviderType } from './ssh/providerFactory';
import { getWorktreeCwd } from '../ipc/worktreeImplHandlers';
import { BugService } from './bugService';
// gemini-document-review Task 4.1, 4.2: Multi-engine support
// debatex-document-review Task 2.1: BuildArgsContext support
import { getReviewEngine, type ReviewerScheme, type BuildArgsContext } from '../../shared/registry/reviewEngineRegistry';
import { DocumentReviewService } from './documentReviewService';
// spec-event-log: Event logging for agent activities
import { getDefaultEventLogService } from './eventLogService';
import type { EventLogInput } from '../../shared/types';
// spec-productivity-metrics: Direct metrics tracking in service
import { getDefaultMetricsService } from './metricsService';
// MetricsWorkflowPhase import removed - now using AgentPhase (string) for all phases

// execution-store-consolidation: AnalyzeError type retained for backward compatibility
export type AnalyzeError =
  | { type: 'API_ERROR'; message: string }
  | { type: 'RATE_LIMITED' }
  | { type: 'TIMEOUT' }
  | { type: 'INVALID_INPUT'; message: string };

// execution-store-consolidation: CheckImplResult type DEPRECATED (Req 6.1)
// Retained for backward compatibility, but no longer used for task completion tracking
// Task completion state is now managed via TaskProgress from tasks.md
export interface CheckImplResult {
  readonly status: 'success';
  readonly completedTasks: readonly string[];
  readonly stats: {
    readonly num_turns: number;
    readonly duration_ms: number;
    readonly total_cost_usd: number;
  };
}

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
  /** パーミッションチェックをスキップするフラグ（--dangerously-skip-permissions） */
  skipPermissions?: boolean;
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

  // --dangerously-skip-permissions は他のオプションより前に配置
  if (options.skipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  // AskUserQuestionは常に無効化（stream-jsonモードでは応答できないため）
  // See: https://github.com/anthropics/claude-code/issues/16712
  // Note: --disallowedTools は <tools...> 形式（可変長引数）のため、
  // 別引数として渡すと後続のコマンド引数もツール名として解釈される
  // そのため = を使って1つの引数として結合する
  args.push('--disallowedTools=AskUserQuestion');

  // allowedToolsは--resumeより前に配置（CLIの引数解析順序を考慮）
  // Note: --allowedTools も <tools...> 形式のため、カンマ区切りで結合する
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push(`--allowedTools=${options.allowedTools.join(',')}`);
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

/**
 * Extract prompt from args array
 * Claude CLI args format: [...baseFlags, '-p', ...userArgs]
 * The userArgs typically contain the slash command with prompt
 */
export function extractPromptFromArgs(args: string[]): string | undefined {
  // userArgs are typically after '-p' flag, joined as a single string or multiple strings
  // Example: ['-p', '--output-format', 'stream-json', '--verbose', '/kiro:spec-requirements "feature-name"']
  // The last argument is usually the command with prompt
  if (args.length === 0) {
    return undefined;
  }

  // Look for the actual command argument (starts with '/' for slash commands)
  const commandArg = args.find((arg) => arg.startsWith('/'));
  if (commandArg) {
    return commandArg;
  }

  // Fallback: return the last argument if it's not a flag
  const lastArg = args[args.length - 1];
  if (lastArg && !lastArg.startsWith('-') && !lastArg.startsWith('--')) {
    return lastArg;
  }

  return undefined;
}

export type ExecutionGroup = 'doc' | 'impl';

/**
 * agent-exit-robustness: Agent exit error callback type
 * Called when handleAgentExit encounters an error (e.g., readRecord failure)
 * Requirements: 3.1
 */
export type AgentExitErrorCallback = (agentId: string, error: Error) => void;

/**
 * Worktree lifecycle phases - phases that modify worktree existence
 * These phases MUST run in projectPath (not worktreeCwd) because:
 * - They delete/create the worktree directory itself
 * - Running in worktreeCwd would cause the process to hang (cwd deleted)
 *
 * agent-exit-robustness: Requirements 1.1, 1.4
 * bug-merge-cwd-fix: Added 'bug-merge' for bug worktree merge operations
 */
export const WORKTREE_LIFECYCLE_PHASES = ['spec-merge', 'bug-merge'] as const;

export type WorktreeLifecyclePhase = typeof WORKTREE_LIFECYCLE_PHASES[number];

/**
 * ワークフローフェーズ
 * document-review-phase Task 1.1: 'document-review' を追加
 * Requirements: 1.2
 */
export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'document-review' | 'impl' | 'inspection' | 'deploy';

/** コマンドプレフィックス */
export type CommandPrefix = 'kiro' | 'spec-manager';

/**
 * プレフィックス別フェーズ実行コマンドマッピング
 * document-review-phase Task 1.3: 'document-review' コマンドを追加
 * Requirements: 1.4
 */
const PHASE_COMMANDS_BY_PREFIX: Record<CommandPrefix, Record<WorkflowPhase, string>> = {
  kiro: {
    requirements: '/kiro:spec-requirements',
    design: '/kiro:spec-design',
    tasks: '/kiro:spec-tasks',
    'document-review': '/kiro:spec-document-review',
    impl: '/kiro:spec-impl',
    inspection: '/kiro:spec-inspection',  // Requirements: 13.1 - spec-inspection command
    deploy: '/commit',  // Changed from /kiro:deployment to /commit
  },
  'spec-manager': {
    requirements: '/spec-manager:requirements',
    design: '/spec-manager:design',
    tasks: '/spec-manager:tasks',
    'document-review': '/spec-manager:document-review',
    impl: '/spec-manager:impl',
    inspection: '/spec-manager:inspection',  // Requirements: 13.3 - spec-manager inspection command
    deploy: '/commit',  // Changed from /spec-manager:deployment to /commit
  },
};

/** spec-init コマンドマッピング */
export const SPEC_INIT_COMMANDS: Record<CommandPrefix, string> = {
  kiro: '/kiro:spec-init',
  'spec-manager': '/spec-manager:init',
};

/** spec-merge コマンドマッピング (git-worktree-support feature) */
export const SPEC_MERGE_COMMANDS: Record<CommandPrefix, string> = {
  kiro: '/kiro:spec-merge',
  'spec-manager': '/spec-manager:spec-merge',
};

/** spec-plan コマンドマッピング (spec-plan-ui-integration feature) */
export const SPEC_PLAN_COMMANDS: Record<CommandPrefix, string | undefined> = {
  kiro: '/kiro:spec-plan',
  'spec-manager': undefined, // 将来的に追加予定 (DD-002)
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
  // spec-plan系 (spec-plan-ui-integration feature)
  'spec-plan': ['Read', 'Write', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task'],
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

export interface StartAgentOptions {
  specId: string;
  phase: string;
  command: string;
  args: string[];
  group?: ExecutionGroup;
  sessionId?: string;
  /** Provider type for local/SSH transparency (defaults to 'local') */
  providerType?: ProviderType;
  /** Skip permissions check flag (--dangerously-skip-permissions) */
  skipPermissions?: boolean;
  /** Working directory override for worktree mode (git-worktree-support) */
  worktreeCwd?: string;
  /** Prompt used to start the agent (for recording in agent metadata) */
  prompt?: string;
}

/** Document Review execution options (Requirements: 6.1) */
// gemini-document-review Task 4.2: Added scheme field for multi-engine support
export interface ExecuteDocumentReviewOptions {
  specId: string;
  featureName: string;
  commandPrefix?: CommandPrefix;
  /** Reviewer scheme (default: 'claude-code') - gemini-document-review Req 6.1, 6.2, 6.3 */
  scheme?: ReviewerScheme;
}

/** Document Review Reply execution options (Requirements: 6.1, autofix: auto-execution-document-review-autofix) */
export interface ExecuteDocumentReviewReplyOptions {
  specId: string;
  featureName: string;
  reviewNumber: number;
  commandPrefix?: CommandPrefix;
  /** When true, appends --autofix flag to document-review-reply command */
  autofix?: boolean;
}

/** Document Review Fix execution options (apply --fix from existing reply) */
export interface ExecuteDocumentReviewFixOptions {
  specId: string;
  featureName: string;
  reviewNumber: number;
  commandPrefix?: CommandPrefix;
}

/** Inspection execution options (inspection-workflow-ui feature) */
export interface ExecuteInspectionOptions {
  specId: string;
  featureName: string;
  commandPrefix?: CommandPrefix;
}

/** Inspection Fix execution options (inspection-workflow-ui feature) */
export interface ExecuteInspectionFixOptions {
  specId: string;
  featureName: string;
  roundNumber: number;
  commandPrefix?: CommandPrefix;
}

/** Spec Merge execution options (git-worktree-support feature) */
export interface ExecuteSpecMergeOptions {
  specId: string;
  featureName: string;
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
 * Interface for layoutConfigService dependency (DI)
 * skip-permissions-main-process: Required methods for skipPermissions management
 */
export interface LayoutConfigServiceDependency {
  loadSkipPermissions(projectPath: string): Promise<boolean>;
}

/**
 * Options for SpecManagerService constructor (DI container)
 */
export interface SpecManagerServiceOptions {
  layoutConfigService?: LayoutConfigServiceDependency;
}

/**
 * Service for managing Spec Managers and their SDD Agents
 * Now supports both local and SSH providers for transparent remote execution
 */
export class SpecManagerService {
  private recordService: AgentRecordService;
  private logService: LogFileService;
  private logParserService: LogParserService;
  // execution-store-consolidation: implAnalyzer REMOVED (Req 6.2)
  private processes: Map<string, AgentProcess | ProviderAgentProcess> = new Map();
  private projectPath: string;
  private outputCallbacks: ((agentId: string, stream: 'stdout' | 'stderr', data: string) => void)[] = [];
  private statusCallbacks: ((agentId: string, status: AgentStatus) => void)[] = [];

  /**
   * agent-exit-robustness: Agent exit error callbacks
   * Called when handleAgentExit encounters an error (e.g., readRecord failure)
   * Requirements: 3.1
   */
  private agentExitErrorCallbacks: AgentExitErrorCallback[] = [];

  // Provider type for local/SSH transparency (defaults to 'local')
  private providerType: ProviderType = 'local';

  // Mutex for spec-manager operations
  private specManagerLock: string | null = null;
  private specManagerLockResolve: (() => void) | null = null;

  // Track agents forced killed after success result
  private forcedKillSuccess: Set<string> = new Set();

  // Buffer for sessionId parsing across chunked stdout data
  private sessionIdParseBuffers: Map<string, string> = new Map();

  // skip-permissions-main-process: DI for layoutConfigService
  private layoutConfigService: LayoutConfigServiceDependency | null = null;

  constructor(projectPath: string, options?: SpecManagerServiceOptions) {
    this.projectPath = projectPath;
    // Determine provider type from project path
    this.providerType = getProviderTypeFromPath(projectPath);
    // agent-state-file-ssot: AgentRecordService is SSOT for agent state
    this.recordService = new AgentRecordService(
      path.join(projectPath, '.kiro', 'runtime', 'agents')
    );
    // Log files are stored at .kiro/specs/{specId}/logs/{agentId}.log
    this.logService = new LogFileService(
      path.join(projectPath, '.kiro', 'specs')
    );
    this.logParserService = new LogParserService();

    // skip-permissions-main-process: Accept layoutConfigService via DI
    this.layoutConfigService = options?.layoutConfigService ?? null;

    // execution-store-consolidation: ImplCompletionAnalyzer initialization REMOVED (Req 6.2)
    // Task completion state is now managed via TaskProgress from tasks.md
  }

  // ============================================================
  // spec-event-log: Event Logging Helper
  // ============================================================

  /**
   * Log an agent event using EventLogService
   * Fire-and-forget pattern: errors are logged but not propagated
   * Requirements: 1.1, 1.2, 1.3 (spec-event-log)
   */
  private logAgentEvent(specId: string, event: EventLogInput): void {
    getDefaultEventLogService().logEvent(
      this.projectPath,
      specId,
      event
    ).catch(() => {
      // Errors are logged internally by EventLogService
    });
  }

  /**
   * Get the current provider type
   * Requirements: 3.1, 4.1
   */
  getProviderType(): ProviderType {
    return this.providerType;
  }

  /**
   * Get the project path
   * git-worktree-support: Exposed for external callers needing to resolve worktree paths
   */
  getProjectPath(): string {
    return this.projectPath;
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
   * Get the worktree cwd for a spec or bug by reading spec.json/bug.json
   * git-worktree-support: Helper to resolve worktree path for agent execution
   * spec-worktree-early-creation: Uses FileService.resolveSpecPath as SSOT for path resolution
   * bug-auto-execution-worktree-cwd: Added support for bug: prefix
   *
   * @param specId - The spec ID (directory name) or bug:bugName format
   * @returns Worktree cwd if in worktree mode, or projectPath as fallback
   */
  private async getSpecWorktreeCwd(specId: string): Promise<string> {
    try {
      // bug-auto-execution-worktree-cwd: Handle bug: prefix
      if (specId.startsWith('bug:')) {
        const bugName = specId.slice(4); // Remove 'bug:' prefix
        const bugService = new BugService();

        // Use resolveBugPath to find the actual bug directory (worktree or main)
        const bugPath = await bugService.resolveBugPath(this.projectPath, bugName);

        // Use getAgentCwd to resolve worktree path from bug.json
        const worktreeCwd = await bugService.getAgentCwd(bugPath, this.projectPath);

        if (worktreeCwd !== this.projectPath) {
          logger.info('[SpecManagerService] getSpecWorktreeCwd: bug worktree resolved', {
            specId,
            bugName,
            bugPath,
            worktreeCwd,
          });
        }

        return worktreeCwd;
      }

      // spec-worktree-early-creation: Use FileService.resolveSpecPath as SSOT
      // This handles both main spec path and worktree spec path (worktree takes priority)
      const fileService = new FileService();
      const resolveResult = await fileService.resolveSpecPath(this.projectPath, specId);

      if (!resolveResult.ok) {
        // Spec not found in either location
        logger.warn('[SpecManagerService] getSpecWorktreeCwd: spec not found, using projectPath', {
          specId,
          error: resolveResult.error,
        });
        return this.projectPath;
      }

      // Read spec.json from the resolved path
      const specJsonPath = path.join(resolveResult.value, 'spec.json');
      const content = await readFile(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);
      return getWorktreeCwd(this.projectPath, specJson);
    } catch (error) {
      // If spec.json cannot be read, fall back to project path
      logger.warn('[SpecManagerService] getSpecWorktreeCwd failed, using projectPath', {
        specId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.projectPath;
    }
  }

  /**
   * Get the currently running execution group for a specific spec
   * agent-state-file-ssot: Now reads from file system via recordService (SSOT)
   * @param specId - The spec ID to check (if null, checks all specs)
   */
  private async getRunningGroup(specId?: string): Promise<ExecutionGroup | null> {
    let agents: AgentInfo[];
    if (specId) {
      agents = await this.getAgents(specId);
    } else {
      const allAgentsMap = await this.getAllAgents();
      agents = Array.from(allAgentsMap.values()).flat();
    }
    const runningAgents = agents.filter((a) => a.status === 'running');

    for (const agent of runningAgents) {
      // Check agent's phase to determine group
      if (agent.phase.startsWith('impl-') || agent.phase === 'impl' || agent.phase === 'inspection') {
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
   * agent-state-file-ssot: Now reads from file system via recordService (SSOT)
   */
  private async isPhaseRunning(specId: string, phase: string): Promise<boolean> {
    const agents = await this.getAgents(specId);
    return agents.some((a) => a.phase === phase && a.status === 'running');
  }

  /**
   * Normalize Claude CLI arguments to ensure base flags are always present
   * This is the Single Source of Truth (SSOT) for Claude CLI flag normalization.
   *
   * Handles various input formats from different callers:
   * - `[cmd]` → `['-p', '--verbose', '--output-format', 'stream-json', cmd]`
   * - `['-p', cmd]` → `['-p', '--verbose', '--output-format', 'stream-json', cmd]`
   * - `['-p', '--output-format', 'stream-json', '--verbose', cmd]` → same (idempotent)
   *
   * @param args - Original arguments from caller
   * @param skipPermissions - Whether to add --dangerously-skip-permissions flag
   * @returns Normalized arguments with base flags guaranteed
   */
  private normalizeClaudeArgs(args: string[], skipPermissions?: boolean): string[] {
    // Fast path: If args already contain --disallowedTools=, they came from buildClaudeArgs
    // and are already properly formatted. Just handle skipPermissions if needed.
    const disallowedIndex = args.findIndex(arg => arg.startsWith('--disallowedTools='));
    if (disallowedIndex !== -1) {
      if (skipPermissions && !args.includes('--dangerously-skip-permissions')) {
        const result = [...args];
        // Insert after --output-format stream-json but before --disallowedTools=
        result.splice(disallowedIndex, 0, '--dangerously-skip-permissions');
        return result;
      }
      return args;
    }

    // Legacy path: args don't have modern flags, need full normalization
    // Extract command part: filter out known base flags to get the actual command
    const standaloneFlags = new Set(['-p', '--verbose', '--dangerously-skip-permissions']);
    // Flags that take exactly one value
    const singleValueFlags = new Set(['--output-format']);
    // Flags that take multiple values (until next flag starting with - or command starting with /)
    const multiValueFlags = new Set(['--allowedTools', '--resume']);

    const commandParts: string[] = [];

    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      if (standaloneFlags.has(arg)) {
        // Skip standalone flags
        i += 1;
      } else if (singleValueFlags.has(arg)) {
        // Skip flag and its single value
        i += 2;
      } else if (multiValueFlags.has(arg)) {
        // Skip flag and its values (until next flag or command starting with /)
        i += 1;
        while (i < args.length && !args[i].startsWith('-') && !args[i].startsWith('/')) {
          i += 1;
        }
      } else {
        // This is a command part
        commandParts.push(arg);
        i += 1;
      }
    }

    // Rebuild args using buildClaudeArgs to ensure consistency
    // Join command parts to form the full command string
    const command = commandParts.join(' ');
    return buildClaudeArgs({ command: command || undefined, skipPermissions });
  }

  /**
   * Start a new SDD Agent
   * Requirements: 5.1, 6.1
   * Now supports both local and SSH providers for transparent remote execution
   */
  async startAgent(options: StartAgentOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, command, args, group, sessionId, providerType, skipPermissions: _legacySkipPermissions, worktreeCwd } = options;
    const effectiveProviderType = providerType ?? this.providerType;
    // Extract prompt from options or args
    const effectivePrompt = options.prompt ?? extractPromptFromArgs(args);

    // execute-method-unification: Task 3.1 - worktreeCwd auto-resolution
    // spec-worktree-early-creation: Task 9.1 - cwd auto-resolution for all phases (impl and doc)
    // agent-exit-robustness: Requirements 1.1, 1.2, 1.3, 1.5 - WORKTREE_LIFECYCLE_PHASES check
    // Requirements: 3.1, 3.2, 3.3, 3.4, 8.2, 8.4
    let effectiveCwd: string;

    // agent-exit-robustness: Check if phase is in WORKTREE_LIFECYCLE_PHASES
    // These phases MUST run in projectPath to avoid hanging when worktree is deleted
    const isWorktreeLifecyclePhase = (WORKTREE_LIFECYCLE_PHASES as readonly string[]).includes(phase);

    if (worktreeCwd) {
      // 3.2: Explicit worktreeCwd takes priority
      effectiveCwd = worktreeCwd;
    } else if (isWorktreeLifecyclePhase) {
      // agent-exit-robustness: Worktree lifecycle phases use projectPath
      // This prevents the process from hanging when it deletes its own cwd
      effectiveCwd = this.projectPath;
      logger.info('[SpecManagerService] Using projectPath for worktree lifecycle phase', {
        specId,
        phase,
        projectPath: this.projectPath,
      });
    } else if (specId) {
      // spec-worktree-early-creation: Auto-resolve for any group when specId is provided
      // This enables worktree mode for requirements/design/tasks phases as well as impl
      effectiveCwd = await this.getSpecWorktreeCwd(specId);
      if (effectiveCwd !== this.projectPath) {
        // 3.4: Log when worktreeCwd is auto-resolved
        logger.info('[SpecManagerService] worktreeCwd auto-resolved', { specId, group, worktreeCwd: effectiveCwd });
      }
    } else {
      // 3.3: No specId, use projectPath (e.g., spec-init, spec-plan)
      effectiveCwd = this.projectPath;
    }

    // Check if this is a Claude CLI command
    const isClaudeCommand = command === 'claude' || command === getClaudeCommand();

    // skip-permissions-main-process: Auto-fetch skipPermissions from layoutConfigService
    // Only fetch for Claude commands to avoid unnecessary IO for non-Claude processes
    let effectiveSkipPermissions = false;
    if (isClaudeCommand && this.layoutConfigService) {
      try {
        effectiveSkipPermissions = await this.layoutConfigService.loadSkipPermissions(this.projectPath);
        logger.debug('[SpecManagerService] skipPermissions loaded from layoutConfigService', {
          skipPermissions: effectiveSkipPermissions,
        });
      } catch (error) {
        logger.warn('[SpecManagerService] Failed to load skipPermissions, defaulting to false', { error });
      }
    }

    // Normalize args only for Claude CLI commands
    // This prevents breaking non-Claude commands (like 'sleep' in tests)
    let effectiveArgs = isClaudeCommand
      ? this.normalizeClaudeArgs(args, effectiveSkipPermissions)
      : args;

    logger.info('[SpecManagerService] startAgent called', {
      specId, phase, command, args: effectiveArgs, group, sessionId, providerType: effectiveProviderType, skipPermissions: effectiveSkipPermissions,
    });

    // Check if phase is already running
    // agent-state-file-ssot: Now async since it reads from files
    // Skip duplicate check for 'ask' phase - multiple ask agents can run concurrently
    if (phase !== 'ask' && await this.isPhaseRunning(specId, phase)) {
      logger.warn('[SpecManagerService] Phase already running', { specId, phase });
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', specId, phase },
      };
    }

    // Check for group conflicts (doc vs impl) within the same spec
    if (group === 'impl') {
      // agent-state-file-ssot: Now async since it reads from files
      const runningGroup = await this.getRunningGroup(specId);
      if (runningGroup && runningGroup !== group) {
        return {
          ok: false,
          error: { type: 'GROUP_CONFLICT', runningGroup, requestedGroup: group },
        };
      }
    }

    const agentId = this.generateAgentId();
    const now = new Date().toISOString();

    try {
      logger.info('[SpecManagerService] Creating agent process', {
        agentId, command, args: effectiveArgs, cwd: effectiveCwd, providerType: effectiveProviderType,
      });

      // Create the agent process using provider-aware factory for SSH, or direct for local
      let process: AgentProcess | ProviderAgentProcess;

      if (effectiveProviderType === 'ssh') {
        // Use provider-aware process for SSH
        const providerResult = await createProviderAgentProcess({
          agentId,
          command,
          args: effectiveArgs,
          cwd: effectiveCwd,
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
          args: effectiveArgs,
          cwd: effectiveCwd,
          sessionId,
        });
      }

      logger.info('[SpecManagerService] Agent process created', { agentId, pid: process.pid });

      // Create agent info
      // Bug fix: agent-resume-cwd-mismatch - Include cwd for consistency
      const agentInfo: AgentInfo = {
        agentId,
        specId,
        phase,
        pid: process.pid,
        sessionId: sessionId || '',
        status: 'running',
        startedAt: now,
        lastActivityAt: now,
        command: `${command} ${effectiveArgs.join(' ')}`,
        cwd: effectiveCwd,
        prompt: effectivePrompt,
      };

      // agent-state-file-ssot: Store process handle for stdin/kill operations
      this.processes.set(agentId, process);

      // IMPORTANT: Register event handlers BEFORE any async operation
      // This prevents race conditions where the process exits before we register handlers
      // Events that fire before the file is written will wait for the file to exist

      // Track if file has been written (for event handlers)
      let fileWritten = false;
      const pendingEvents: Array<{ type: 'output' | 'exit' | 'error'; data?: unknown }> = [];

      // Set up event handlers synchronously (no await before this)
      process.onOutput((stream, data) => {
        if (!fileWritten) {
          pendingEvents.push({ type: 'output', data: { stream, data } });
          return;
        }
        this.handleAgentOutput(agentId, specId, process, stream, data);
      });

      process.onExit((code) => {
        if (!fileWritten) {
          pendingEvents.push({ type: 'exit', data: code });
          return;
        }
        this.handleAgentExit(agentId, specId, code);
      });

      process.onError(() => {
        if (!fileWritten) {
          pendingEvents.push({ type: 'error' });
          return;
        }
        this.handleAgentError(agentId, specId);
      });

      // agent-state-file-ssot: Write agent record to file (SSOT)
      // Bug fix: agent-resume-cwd-mismatch - Save cwd for resume operations
      await this.recordService.writeRecord({
        agentId,
        specId,
        phase,
        pid: process.pid,
        sessionId: sessionId || '',
        status: 'running',
        startedAt: now,
        lastActivityAt: now,
        command: `${command} ${effectiveArgs.join(' ')}`,
        cwd: effectiveCwd,
        prompt: effectivePrompt,
      });

      // Mark file as written and process any pending events
      fileWritten = true;
      for (const event of pendingEvents) {
        switch (event.type) {
          case 'output': {
            const { stream, data } = event.data as { stream: 'stdout' | 'stderr'; data: string };
            this.handleAgentOutput(agentId, specId, process, stream, data);
            break;
          }
          case 'exit':
            this.handleAgentExit(agentId, specId, event.data as number);
            break;
          case 'error':
            this.handleAgentError(agentId, specId);
            break;
        }
      }

      // spec-event-log: Log agent:start event (Requirement 1.1)
      this.logAgentEvent(specId, {
        type: 'agent:start',
        message: `Agent started: ${phase} phase`,
        agentId,
        phase,
        command: `${command} ${effectiveArgs.join(' ')}`,
      });

      // spec-productivity-metrics: Direct metrics tracking
      // Track AI session start for ALL agent phases (not just core phases)
      const metricsService = getDefaultMetricsService();
      metricsService.startAiSession(specId, phase);
      logger.debug('[SpecManagerService] AI session started for metrics', { specId, phase });

      this.statusCallbacks.forEach((cb) => cb(agentId, 'running'));

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
   * Handle agent output event
   * agent-state-file-ssot: Extracted for reuse with pending events
   */
  private handleAgentOutput(
    agentId: string,
    specId: string,
    process: AgentProcess | ProviderAgentProcess,
    stream: 'stdout' | 'stderr',
    data: string
  ): void {
    logger.debug('[SpecManagerService] Process output received', { agentId, stream, dataLength: data.length });
    // agent-state-file-ssot: Update activity in file (throttled to prevent race conditions)
    // Bug fix: agent-record-json-corruption - Use throttled updates
    this.recordService.updateActivityThrottled(specId, agentId, {
      lastActivityAt: new Date().toISOString(),
    });

    // Parse sessionId from Claude Code init message
    if (stream === 'stdout') {
      this.parseAndUpdateSessionId(agentId, specId, data);

      // Bug Fix: Check for result message and force kill if process doesn't exit
      // See docs/memo/claude-cli-process-not-exiting.md
      if (data.includes('"type":"result"')) {
        setTimeout(() => {
          if (this.processes.has(agentId)) {
            logger.warn('[SpecManagerService] Force killing hanging process after result', { agentId });
            this.forcedKillSuccess.add(agentId);
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
  }

  /**
   * Handle agent exit event
   * agent-state-file-ssot: Extracted for reuse with pending events
   * agent-exit-robustness: Added error handling with fallback and cleanup guarantee
   * Requirements: 2.1, 2.2, 2.3, 2.4, 3.2
   */
  private handleAgentExit(agentId: string, specId: string, code: number): void {
    // Bug fix: agent-record-json-corruption - Clear throttle state on exit
    this.recordService.clearThrottleState(specId, agentId);

    // agent-exit-robustness: Get isForcedSuccess early for fallback handling
    const isForcedSuccess = this.forcedKillSuccess.has(agentId);

    // agent-state-file-ssot: Check current status from file
    // agent-exit-robustness: Wrap in try-catch for robust error handling
    this.recordService.readRecord(specId, agentId).then((currentRecord) => {
      // If already interrupted (by stopAgent), don't change status
      if (currentRecord?.status === 'interrupted') {
        // agent-exit-robustness: Cleanup in finally-like pattern
        this.cleanupAgentResources(agentId);
        return;
      }

      // agent-exit-robustness: Cleanup forcedKillSuccess before status determination
      this.forcedKillSuccess.delete(agentId);

      const newStatus: AgentStatus = (code === 0 || isForcedSuccess) ? 'completed' : 'failed';
      this.statusCallbacks.forEach((cb) => cb(agentId, newStatus));

      // agent-exit-robustness: Cleanup remaining resources
      this.processes.delete(agentId);
      this.sessionIdParseBuffers.delete(agentId);

      // spec-event-log: Log agent:complete or agent:fail event (Requirement 1.2, 1.3)
      const phase = currentRecord?.phase || 'unknown';

      // spec-productivity-metrics: Direct metrics tracking
      // Track AI session end for ALL agent phases (not just core phases)
      const metricsService = getDefaultMetricsService();
      metricsService.endAiSession(specId, phase).catch((err) => {
        logger.warn('[SpecManagerService] Failed to end AI session for metrics', { specId, phase, error: err });
      });
      logger.debug('[SpecManagerService] AI session ended for metrics', { specId, phase });

      if (newStatus === 'completed') {
        this.logAgentEvent(specId, {
          type: 'agent:complete',
          message: `Agent completed: ${phase} phase`,
          agentId,
          phase,
          exitCode: code,
        });
      } else {
        this.logAgentEvent(specId, {
          type: 'agent:fail',
          message: `Agent failed: ${phase} phase (exit code: ${code})`,
          agentId,
          phase,
          exitCode: code,
          errorMessage: `Process exited with code ${code}`,
        });
      }

      // agent-state-file-ssot: Update agent record (SSOT)
      return this.recordService.updateRecord(specId, agentId, {
        status: newStatus,
        lastActivityAt: new Date().toISOString(),
      });
    }).catch((error) => {
      // agent-exit-robustness: Requirements 2.1, 2.2, 2.3
      // Fallback handling when readRecord fails
      logger.error('[SpecManagerService] handleAgentExit readRecord failed', {
        agentId,
        specId,
        code,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 2.2: Determine status based on exit code and forcedKillSuccess
      const newStatus: AgentStatus = (code === 0 || isForcedSuccess) ? 'completed' : 'failed';

      // 2.1: Call statusCallbacks even when readRecord fails
      this.statusCallbacks.forEach((cb) => cb(agentId, newStatus));

      // 3.2: Call agentExitErrorCallbacks
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.agentExitErrorCallbacks.forEach((cb) => cb(agentId, errorObj));

      // 2.4: Cleanup resources in catch block as well
      this.cleanupAgentResources(agentId);
    });
  }

  /**
   * agent-exit-robustness: Cleanup agent resources
   * Extracted helper to ensure consistent cleanup in all code paths
   * Requirements: 2.4
   */
  private cleanupAgentResources(agentId: string): void {
    this.processes.delete(agentId);
    this.forcedKillSuccess.delete(agentId);
    this.sessionIdParseBuffers.delete(agentId);
  }

  /**
   * Handle agent error event
   * agent-state-file-ssot: Extracted for reuse with pending events
   */
  private handleAgentError(agentId: string, specId: string): void {
    this.statusCallbacks.forEach((cb) => cb(agentId, 'failed'));
    this.processes.delete(agentId);
    this.sessionIdParseBuffers.delete(agentId);

    // spec-event-log: Log agent:fail event (Requirement 1.3)
    this.logAgentEvent(specId, {
      type: 'agent:fail',
      message: `Agent failed: process error`,
      agentId,
      phase: 'unknown',
      errorMessage: 'Process error occurred',
    });

    // agent-state-file-ssot: Update agent record on error (SSOT)
    this.recordService.updateRecord(specId, agentId, {
      status: 'failed',
      lastActivityAt: new Date().toISOString(),
    }).catch(() => {
      // Ignore errors when updating agent record on error
    });
  }

  /**
   * Stop a running agent
   * Requirements: 5.1
   * agent-state-file-ssot: Now reads from file system via recordService (SSOT)
   */
  async stopAgent(agentId: string): Promise<Result<void, AgentError>> {
    // agent-state-file-ssot: Find agent by ID from files
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      return {
        ok: false,
        error: { type: 'NOT_FOUND', agentId },
      };
    }

    // agent-state-file-ssot: Update agent record BEFORE killing process
    // This prevents race condition with onExit handler
    try {
      await this.recordService.updateRecord(agent.specId, agentId, {
        status: 'interrupted',
        lastActivityAt: new Date().toISOString(),
      });
    } catch {
      // Ignore errors
    }

    // Kill the process after updating the file
    const process = this.processes.get(agentId);
    if (process) {
      process.kill();
      this.processes.delete(agentId);
    }

    // Notify status change
    this.statusCallbacks.forEach((cb) => cb(agentId, 'interrupted'));

    return { ok: true, value: undefined };
  }

  /**
   * Stop all running agents
   * agent-state-file-ssot: Now reads from file system via recordService (SSOT)
   */
  async stopAllAgents(): Promise<void> {
    const allAgentsMap = await this.getAllAgents();
    const allAgents = Array.from(allAgentsMap.values()).flat();
    const runningAgents = allAgents.filter((a) => a.status === 'running');

    for (const agent of runningAgents) {
      await this.stopAgent(agent.agentId);
    }
  }

  /**
   * Delete an agent record
   * Bug fix: global-agent-display-issues
   * agent-state-file-ssot: Now reads from file system via recordService (SSOT)
   * @param specId - The spec ID (empty string for global agents)
   * @param agentId - The ID of the agent to delete
   */
  async deleteAgent(specId: string, agentId: string): Promise<Result<void, AgentError>> {
    // agent-state-file-ssot: Check agent status from file
    const agent = await this.recordService.readRecord(specId, agentId);

    // Don't allow deleting running or hang agents
    if (agent && (agent.status === 'running' || agent.status === 'hang')) {
      return {
        ok: false,
        error: { type: 'SPAWN_ERROR', message: 'Cannot delete running or hang agents' },
      };
    }

    // agent-state-file-ssot: Delete the agent record file (SSOT)
    try {
      await this.recordService.deleteRecord(specId, agentId);
      logger.info('[SpecManagerService] Agent record deleted', { specId, agentId });
    } catch (error) {
      logger.error('[SpecManagerService] Failed to delete agent record', { specId, agentId, error });
      // Continue even if file deletion fails (file might not exist)
    }

    return { ok: true, value: undefined };
  }

  /**
   * Restore agents from agent records after restart
   * Requirements: 5.6, 5.7
   * agent-state-file-ssot: Updates file records for dead processes, no in-memory registry
   */
  async restoreAgents(): Promise<void> {
    const records = await this.recordService.readAllRecords();

    for (const record of records) {
      const isAlive = this.recordService.checkProcessAlive(record.pid);

      // Determine the correct status based on process state
      if (!isAlive && record.status === 'running') {
        // Process died unexpectedly while running - mark as interrupted in file
        console.log(`[SpecManagerService] Agent process died unexpectedly: ${record.agentId} (pid: ${record.pid}), marking as interrupted`);

        // agent-state-file-ssot: Update the agent record file with the new status
        await this.recordService.updateRecord(record.specId, record.agentId, {
          status: 'interrupted',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {
          // Ignore errors when updating agent record
        });
      }

      // agent-state-file-ssot: No need to register in memory - files are SSOT
      console.log(`[SpecManagerService] Restored agent: ${record.agentId} (pid: ${record.pid}, status: ${record.status}, alive: ${isAlive})`);
    }
  }

  /**
   * Resume an interrupted agent
   * Requirements: 5.8
   * agent-state-file-ssot: Now reads from file system via recordService (SSOT)
   * @param agentId - The ID of the agent to resume
   * @param prompt - Optional custom prompt to send (defaults to '続けて')
   */
  async resumeAgent(
    agentId: string,
    prompt?: string,
    worktreeCwd?: string
  ): Promise<Result<AgentInfo, AgentError>> {
    // agent-state-file-ssot: Find agent by ID from files
    const agent = await this.getAgentById(agentId);
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

    // skip-permissions-main-process: Auto-fetch skipPermissions from layoutConfigService
    let effectiveSkipPermissions = false;
    if (this.layoutConfigService) {
      try {
        effectiveSkipPermissions = await this.layoutConfigService.loadSkipPermissions(this.projectPath);
        logger.debug('[SpecManagerService] skipPermissions loaded for resumeAgent', {
          skipPermissions: effectiveSkipPermissions,
        });
      } catch (error) {
        logger.warn('[SpecManagerService] Failed to load skipPermissions for resume, defaulting to false', { error });
      }
    }

    const resumePrompt = prompt || '続けて';
    // フェーズに対応するallowed-toolsを取得してresume時にも適用
    const allowedTools = getAllowedToolsForPhase(agent.phase);
    const args = buildClaudeArgs({
      resumeSessionId: agent.sessionId,
      resumePrompt,
      allowedTools,
      skipPermissions: effectiveSkipPermissions,
    });
    const command = getClaudeCommand();
    const now = new Date().toISOString();

    // Bug fix: agent-resume-cwd-mismatch
    // Priority: 1. worktreeCwd argument (explicit override)
    //           2. agent.cwd (stored from original start)
    //           3. projectPath (fallback for legacy records without cwd)
    const effectiveCwd = worktreeCwd || agent.cwd || this.projectPath;

    try {
      logger.info('[SpecManagerService] Resuming agent', {
        agentId,
        sessionId: agent.sessionId,
        prompt: resumePrompt,
        phase: agent.phase,
        allowedTools,
        skipPermissions: effectiveSkipPermissions,
        cwd: effectiveCwd,
      });

      // Create a new process but keep the same agentId
      const process = createAgentProcess({
        agentId,
        command,
        args,
        cwd: effectiveCwd,
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

      // agent-state-file-ssot: Store process handle for stdin/kill operations
      this.processes.set(agentId, process);

      // agent-state-file-ssot: Update agent record (SSOT)
      await this.recordService.updateRecord(agent.specId, agentId, {
        pid: process.pid,
        status: 'running',
        lastActivityAt: now,
        command: `${command} ${args.join(' ')}`,
      });

      // Bug fix: Add resume prompt to log as user event
      // Claude CLI doesn't output type:'user' event for --resume prompt,
      // so we manually add it to the log for UI display
      const userEventJson = JSON.stringify({
        type: 'user',
        message: {
          content: [{ type: 'text', text: resumePrompt }],
        },
      });
      const promptLogEntry: LogEntry = {
        timestamp: now,
        stream: 'stdout',
        data: userEventJson + '\n',
      };
      this.logService.appendLog(agent.specId, agentId, promptLogEntry).catch((err) => {
        logger.warn('[SpecManagerService] Failed to write prompt log', { agentId, error: err.message });
      });
      // Also notify UI via output callbacks
      this.outputCallbacks.forEach((cb) => cb(agentId, 'stdout', userEventJson + '\n'));

      // Set up event handlers using shared methods
      process.onOutput((stream, data) => {
        this.handleAgentOutput(agentId, agent.specId, process, stream, data);
      });

      process.onExit((code) => {
        this.handleAgentExit(agentId, agent.specId, code);
      });

      process.onError(() => {
        this.handleAgentError(agentId, agent.specId);
      });

      // spec-productivity-metrics: Direct metrics tracking
      // Track AI session start for ALL agent phases (not just core phases)
      const metricsService = getDefaultMetricsService();
      metricsService.startAiSession(agent.specId, agent.phase);
      logger.debug('[SpecManagerService] AI session started for metrics (resume)', { specId: agent.specId, phase: agent.phase });

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
   * agent-state-file-ssot: Activity update is fire-and-forget via file
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
    // agent-state-file-ssot: Update activity in file (fire and forget)
    // Need to find specId first, then update
    this.recordService.findRecordByAgentId(agentId).then((record) => {
      if (record) {
        return this.recordService.updateRecord(record.specId, agentId, {
          lastActivityAt: new Date().toISOString(),
        });
      }
    }).catch(() => {
      // Ignore errors when updating activity
    });

    return { ok: true, value: undefined };
  }

  /**
   * Get agents for a specific spec
   * Requirements: 3.2 (agent-state-file-ssot) - File-based agent state management
   * Reads from file system via recordService (SSOT)
   */
  async getAgents(specId: string): Promise<AgentInfo[]> {
    const records = await this.recordService.readRecordsForSpec(specId);
    return records.map((record) => this.recordToAgentInfo(record));
  }

  /**
   * Get agent by ID
   * Requirements: 3.4 (agent-state-file-ssot) - File-based agent state management
   * Searches all spec directories via recordService (SSOT)
   */
  async getAgentById(agentId: string): Promise<AgentInfo | undefined> {
    const record = await this.recordService.findRecordByAgentId(agentId);
    if (!record) {
      return undefined;
    }
    return this.recordToAgentInfo(record);
  }

  /**
   * Get all agents grouped by spec
   * Requirements: 3.3 (agent-state-file-ssot) - File-based agent state management
   * Reads from file system via recordService (SSOT)
   */
  async getAllAgents(): Promise<Map<string, AgentInfo[]>> {
    const result = new Map<string, AgentInfo[]>();

    // Get all spec IDs from file system
    const specIds = await this.recordService.getAllSpecIds();

    // Read records for each spec
    for (const specId of specIds) {
      const records = await this.recordService.readRecordsForSpec(specId);
      if (records.length > 0) {
        result.set(specId, records.map((r) => this.recordToAgentInfo(r)));
      }
    }

    // Also read project agents (empty specId)
    const projectAgents = await this.recordService.readProjectAgents();
    if (projectAgents.length > 0) {
      result.set('', projectAgents.map((r) => this.recordToAgentInfo(r)));
    }

    return result;
  }

  /**
   * Convert AgentRecord to AgentInfo
   * Helper method for file-based agent state management
   */
  private recordToAgentInfo(record: import('./agentRecordService').AgentRecord): AgentInfo {
    return {
      agentId: record.agentId,
      specId: record.specId,
      phase: record.phase,
      pid: record.pid,
      sessionId: record.sessionId,
      status: record.status,
      startedAt: record.startedAt,
      lastActivityAt: record.lastActivityAt,
      command: record.command,
      // Bug fix: agent-resume-cwd-mismatch - Preserve cwd for resume operations
      cwd: record.cwd,
    };
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
   * Unregister status change callback
   */
  offStatusChange(callback: (agentId: string, status: AgentStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index !== -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * agent-exit-robustness: Register agent exit error callback
   * Called when handleAgentExit encounters an error (e.g., readRecord failure)
   * Requirements: 3.1
   */
  onAgentExitError(callback: AgentExitErrorCallback): void {
    this.agentExitErrorCallbacks.push(callback);
  }

  /**
   * agent-exit-robustness: Unregister agent exit error callback
   * Requirements: 3.1
   */
  offAgentExitError(callback: AgentExitErrorCallback): void {
    const index = this.agentExitErrorCallbacks.indexOf(callback);
    if (index !== -1) {
      this.agentExitErrorCallbacks.splice(index, 1);
    }
  }

  // ============================================================
  // Document Review Execution (Requirements: 6.1 - Document Review Workflow)
  // gemini-document-review Task 4.1, 4.2: Multi-engine support
  // Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
  // ============================================================

  /**
   * Execute document-review agent
   * Requirements: 2.1, 2.2, 2.3, 2.4
   * gemini-document-review: Now supports multiple reviewer engines via scheme option
   * debatex-document-review Task 2.1: BuildArgsContext support for debatex
   */
  async executeDocumentReview(options: ExecuteDocumentReviewOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, commandPrefix = 'kiro', scheme } = options;

    // Get engine configuration from registry (falls back to claude-code for unknown schemes)
    const engine = getReviewEngine(scheme);

    logger.info('[SpecManagerService] executeDocumentReview called', {
      specId,
      featureName,
      commandPrefix,
      scheme,
      engineLabel: engine.label,
    });

    // For Claude Code, use the standard slash command format
    if (scheme === 'claude-code' || scheme === undefined) {
      const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review' : '/spec-manager:document-review';
      return this.startAgent({
        specId,
        phase: 'document-review',
        command: getClaudeCommand(),
        args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
        group: 'doc',
      });
    }

    // debatex-document-review Task 2.1: For debatex, use BuildArgsContext with specPath and roundNumber
    // Requirements: 2.1, 2.2, 2.3, 2.4
    // spec-worktree-early-creation: Use FileService.resolveSpecPath as SSOT
    if (scheme === 'debatex') {
      const fileService = new FileService();
      const resolveResult = await fileService.resolveSpecPath(this.projectPath, specId);
      const specPath = resolveResult.ok ? resolveResult.value : path.join(this.projectPath, '.kiro', 'specs', specId);
      const documentReviewService = new DocumentReviewService(this.projectPath);
      const roundNumber = await documentReviewService.getNextRoundNumber(specPath);

      const buildArgsContext: BuildArgsContext = {
        featureName,
        specPath,
        roundNumber,
      };

      const args = engine.buildArgs(buildArgsContext);

      logger.info('[SpecManagerService] debatex BuildArgsContext', {
        specId,
        featureName,
        specPath,
        roundNumber,
        args,
      });

      const command = engine.command;
      const cmdString = Array.isArray(command) ? command[0] : command;
      const cmdArgs = Array.isArray(command) ? [...command.slice(1), ...args] : args;

      return this.startAgent({
        specId,
        phase: 'document-review',
        command: cmdString,
        args: cmdArgs,
        group: 'doc',
      });
    }

    // For Gemini CLI, use the engine configuration
    const command = engine.command;
    const args = engine.buildArgs(featureName);
    const cmdString = Array.isArray(command) ? command[0] : command;
    const cmdArgs = Array.isArray(command) ? [...command.slice(1), ...args] : args;

    return this.startAgent({
      specId,
      phase: 'document-review',
      command: cmdString,
      args: cmdArgs,
      group: 'doc',
    });
  }

  /**
   * Execute document-review-reply agent
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   * Requirements: 1.1 (auto-execution-document-review-autofix) - autofix option support
   */
  async executeDocumentReviewReply(options: ExecuteDocumentReviewReplyOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, reviewNumber, commandPrefix = 'kiro', autofix } = options;
    const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review-reply' : '/spec-manager:document-review-reply';

    // Build command with optional --autofix flag
    const commandParts = [slashCommand, featureName, String(reviewNumber)];
    if (autofix === true) {
      commandParts.push('--autofix');
    }
    const fullCommand = commandParts.join(' ');

    logger.info('[SpecManagerService] executeDocumentReviewReply called', { specId, featureName, reviewNumber, slashCommand, commandPrefix, autofix });

    return this.startAgent({
      specId,
      phase: 'document-review-reply',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: fullCommand }),
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

  // ============================================================
  // Inspection Workflow (inspection-workflow-ui feature)
  // Requirements: 4.2, 4.3, 4.5
  // ============================================================

  /**
   * Execute inspection agent (spec-inspection)
   * Requirements: 4.2 (inspection-workflow-ui)
   * git-worktree-support: Now resolves worktree cwd from spec.json
   */
  async executeInspection(options: ExecuteInspectionOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, commandPrefix = 'kiro' } = options;
    const slashCommand = commandPrefix === 'kiro' ? '/kiro:spec-inspection' : '/spec-manager:inspection';
    // git-worktree-support: Resolve worktree cwd for agent execution
    const worktreeCwd = await this.getSpecWorktreeCwd(specId);

    logger.info('[SpecManagerService] executeInspection called', { specId, featureName, slashCommand, commandPrefix, worktreeCwd });

    // spec-event-log: Log inspection:start event (Requirement 1.9)
    this.logAgentEvent(specId, {
      type: 'inspection:start',
      message: 'Inspection started',
      roundNumber: 1, // Initial inspection
    });

    return this.startAgent({
      specId,
      phase: 'inspection',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
      group: 'impl',
      worktreeCwd,
    });
  }

  /**
   * Execute inspection fix agent (spec-inspection with --fix option)
   * Requirements: 4.3 (inspection-workflow-ui)
   * git-worktree-support: Now resolves worktree cwd from spec.json
   *
   * This calls spec-inspection --fix which:
   * 1. Generates fix tasks from inspection findings
   * 2. Invokes spec-impl subagent to execute fixes
   * 3. Updates spec.json with fixedAt timestamp
   */
  async executeInspectionFix(options: ExecuteInspectionFixOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, roundNumber, commandPrefix = 'kiro' } = options;
    const slashCommand = commandPrefix === 'kiro' ? '/kiro:spec-inspection' : '/spec-manager:inspection';
    // git-worktree-support: Resolve worktree cwd for agent execution
    const worktreeCwd = await this.getSpecWorktreeCwd(specId);

    logger.info('[SpecManagerService] executeInspectionFix called', { specId, featureName, roundNumber, slashCommand, commandPrefix, worktreeCwd });

    return this.startAgent({
      specId,
      phase: 'inspection-fix',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName} --fix` }),
      group: 'impl',
      worktreeCwd,
    });
  }

  // ============================================================
  // Spec Merge Workflow (git-worktree-support feature)
  // Requirements: 5.1, 5.2
  // ============================================================

  /**
   * Execute spec-merge agent
   * Requirements: 5.1, 5.2 (git-worktree-support)
   *
   * This executes /kiro:spec-merge (or /spec-manager:spec-merge) which:
   * 1. Checks out the main branch
   * 2. Merges the feature branch from worktree
   * 3. Deletes the worktree
   * 4. Updates spec.json to remove worktree field
   */
  async executeSpecMerge(options: ExecuteSpecMergeOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, commandPrefix = 'kiro' } = options;
    const slashCommand = SPEC_MERGE_COMMANDS[commandPrefix];

    logger.info('[SpecManagerService] executeSpecMerge called', { specId, featureName, slashCommand, commandPrefix });

    return this.startAgent({
      specId,
      phase: 'spec-merge',
      command: getClaudeCommand(),
      args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
      group: 'doc',
    });
  }

  // ============================================================
  // Unified Execute Method (execute-method-unification feature)
  // Requirements: 2.1, 2.2, 2.3, 2.5
  // ============================================================

  /**
   * Unified execute method for all phase types
   *
   * This method consolidates all executePhase, executeTaskImpl, executeDocumentReview,
   * executeInspection, and related methods into a single entry point.
   *
   * Requirements:
   * - 2.1: execute(options) method implementation
   * - 2.2: options.type branching for phase resolution
   * - 2.3: document-review scheme switching
   * - 2.5: execute calls startAgent
   *
   * @param options ExecuteOptions union type with type discriminant
   * @returns Result<AgentInfo, AgentError>
   */
  async execute(options: import('../../shared/types/executeOptions').ExecuteOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, featureName, commandPrefix = 'kiro' } = options;

    logger.info('[SpecManagerService] execute called', { type: options.type, specId, featureName, commandPrefix });

    switch (options.type) {
      // ===== Document Generation Phases (group: 'doc') =====
      case 'requirements': {
        const slashCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].requirements;
        return this.startAgent({
          specId,
          phase: 'requirements',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
          group: 'doc',
        });
      }

      case 'design': {
        const slashCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].design;
        return this.startAgent({
          specId,
          phase: 'design',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
          group: 'doc',
        });
      }

      case 'tasks': {
        const slashCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].tasks;
        return this.startAgent({
          specId,
          phase: 'tasks',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
          group: 'doc',
        });
      }

      case 'deploy': {
        const slashCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].deploy;
        return this.startAgent({
          specId,
          phase: 'deploy',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
          group: 'doc',
        });
      }

      // ===== Impl Phase (group: 'impl') =====
      case 'impl': {
        const implCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].impl;
        // worktreeCwd will be auto-resolved in startAgent for group === 'impl'
        // When taskId is provided: Execute specific task
        // When taskId is omitted: Execute all pending tasks
        const phase = options.taskId ? `impl-${options.taskId}` : 'impl';
        const commandStr = options.taskId
          ? `${implCommand} ${featureName} ${options.taskId}`
          : `${implCommand} ${featureName}`;
        return this.startAgent({
          specId,
          phase,
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: commandStr }),
          group: 'impl',
        });
      }

      // ===== Auto-Impl Phase (group: 'impl') =====
      // spec-auto-impl-command: Autonomous parallel batch execution
      case 'auto-impl': {
        // Only kiro profile supports auto-impl command
        const slashCommand = '/kiro:spec-auto-impl';
        return this.startAgent({
          specId,
          phase: 'auto-impl',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
          group: 'impl',
        });
      }

      // ===== Inspection Phases (group: 'impl') =====
      case 'inspection': {
        const { autofix } = options;
        const slashCommand = commandPrefix === 'kiro' ? '/kiro:spec-inspection' : '/spec-manager:inspection';

        // Build command with optional --autofix flag
        const commandParts = [`${slashCommand} ${featureName}`];
        if (autofix === true) {
          commandParts.push('--autofix');
        }

        return this.startAgent({
          specId,
          phase: 'inspection',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: commandParts.join(' ') }),
          group: 'impl',
        });
      }

      case 'inspection-fix': {
        const slashCommand = commandPrefix === 'kiro' ? '/kiro:spec-inspection' : '/spec-manager:inspection';
        return this.startAgent({
          specId,
          phase: 'inspection-fix',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName} --fix` }),
          group: 'impl',
        });
      }

      // ===== Document Review Phases (group: 'doc') =====
      case 'document-review': {
        const { scheme } = options;
        const engine = getReviewEngine(scheme);

        // For Claude Code (default), use the standard slash command format
        if (scheme === 'claude-code' || scheme === undefined) {
          const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review' : '/spec-manager:document-review';
          return this.startAgent({
            specId,
            phase: 'document-review',
            command: getClaudeCommand(),
            args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
            group: 'doc',
          });
        }

        // debatex-document-review Task 2.1: For debatex, use BuildArgsContext with specPath and roundNumber
        // spec-worktree-early-creation: Use FileService.resolveSpecPath as SSOT
        if (scheme === 'debatex') {
          const fileService = new FileService();
          const resolveResult = await fileService.resolveSpecPath(this.projectPath, specId);
          const specPath = resolveResult.ok ? resolveResult.value : path.join(this.projectPath, '.kiro', 'specs', specId);
          const documentReviewService = new DocumentReviewService(this.projectPath);
          const roundNumber = await documentReviewService.getNextRoundNumber(specPath);

          const buildArgsContext: BuildArgsContext = {
            featureName,
            specPath,
            roundNumber,
          };

          const args = engine.buildArgs(buildArgsContext);
          const command = engine.command;
          const cmdString = Array.isArray(command) ? command[0] : command;
          const cmdArgs = Array.isArray(command) ? [...command.slice(1), ...args] : args;

          return this.startAgent({
            specId,
            phase: 'document-review',
            command: cmdString,
            args: cmdArgs,
            group: 'doc',
          });
        }

        // For Gemini CLI, use the engine configuration
        const command = engine.command;
        const args = engine.buildArgs(featureName);
        const cmdString = Array.isArray(command) ? command[0] : command;
        const cmdArgs = Array.isArray(command) ? [...command.slice(1), ...args] : args;

        return this.startAgent({
          specId,
          phase: 'document-review',
          command: cmdString,
          args: cmdArgs,
          group: 'doc',
        });
      }

      case 'document-review-reply': {
        const { reviewNumber, autofix } = options;
        const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review-reply' : '/spec-manager:document-review-reply';

        // Build command with optional --autofix flag
        const commandParts = [slashCommand, featureName, String(reviewNumber)];
        if (autofix === true) {
          commandParts.push('--autofix');
        }
        const fullCommand = commandParts.join(' ');

        return this.startAgent({
          specId,
          phase: 'document-review-reply',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: fullCommand }),
          group: 'doc',
        });
      }

      case 'document-review-fix': {
        const { reviewNumber } = options;
        const slashCommand = commandPrefix === 'kiro' ? '/kiro:document-review-reply' : '/spec-manager:document-review-reply';

        return this.startAgent({
          specId,
          phase: 'document-review-fix',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName} ${reviewNumber} --fix` }),
          group: 'doc',
        });
      }

      // ===== Spec Merge Phase (group: 'doc') =====
      case 'spec-merge': {
        const slashCommand = SPEC_MERGE_COMMANDS[commandPrefix];
        return this.startAgent({
          specId,
          phase: 'spec-merge',
          command: getClaudeCommand(),
          args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
          group: 'doc',
        });
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = options;
        throw new Error(`Unknown execute option type: ${(_exhaustive as any).type}`);
      }
    }
  }

  /**
   * Set inspection auto execution flag in spec.json
   * Requirements: 4.5 (inspection-workflow-ui)
   */
  /**
   * @deprecated inspection-permission-unification: Use setInspectionPermission instead
   * inspection-permission-unification Task 7.1: Backward compatibility wrapper
   */
  async setInspectionAutoExecutionFlag(specPath: string, flag: 'run' | 'pause'): Promise<void> {
    logger.info('[SpecManagerService] setInspectionAutoExecutionFlag called (deprecated)', { specPath, flag });
    // Convert flag to boolean: 'run' => true, 'pause' => false
    const enabled = flag === 'run';
    await this.setInspectionPermission(specPath, enabled);
  }

  /**
   * Set inspection permission (boolean)
   * inspection-permission-unification Task 7.2: New method for setting inspection permission
   */
  async setInspectionPermission(specPath: string, enabled: boolean): Promise<void> {
    logger.info('[SpecManagerService] setInspectionPermission called', { specPath, enabled });

    const specJsonPath = `${specPath}/spec.json`;

    try {
      const content = await readFile(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);

      // Ensure autoExecution.permissions structure exists
      if (!specJson.autoExecution) {
        specJson.autoExecution = {};
      }
      if (!specJson.autoExecution.permissions) {
        specJson.autoExecution.permissions = {};
      }

      // Set the inspection permission as boolean
      specJson.autoExecution.permissions.inspection = enabled;

      // inspection-permission-unification Task 7.1: Remove inspectionFlag if it exists (migration)
      if (specJson.autoExecution.inspectionFlag !== undefined) {
        delete specJson.autoExecution.inspectionFlag;
        logger.info('[SpecManagerService] Removed deprecated inspectionFlag field', { specPath });
      }

      // Write back to file
      await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');

      logger.info('[SpecManagerService] setInspectionPermission succeeded', { specPath, enabled });
    } catch (error) {
      logger.error('[SpecManagerService] setInspectionPermission failed', { specPath, enabled, error });
      throw error;
    }
  }

  /**
   * Parse sessionId from Claude Code stream-json output
   * Claude Code outputs session_id in the first "system/init" message
   *
   * Uses buffering to handle chunked stdout data where JSON lines may be split
   * across multiple data events (Node.js child process stdout does not guarantee
   * line-aligned chunks).
   */
  private parseAndUpdateSessionId(agentId: string, specId: string, data: string): void {
    // Check if we already found sessionId (buffer would be deleted)
    // We use 'sessionIdFound' marker in buffer to avoid re-reading file
    if (!this.sessionIdParseBuffers.has(agentId) && this.sessionIdParseBuffers.get(agentId) === undefined) {
      // First call for this agent - initialize buffer
      this.sessionIdParseBuffers.set(agentId, '');
    }

    // If buffer was explicitly deleted (sessionId found), skip further processing
    const currentBuffer = this.sessionIdParseBuffers.get(agentId);
    if (currentBuffer === undefined) {
      return;
    }

    // Combine with previous incomplete data from buffer
    const buffer = currentBuffer + data;
    const lines = buffer.split('\n');

    // Last element after split: empty string if buffer ended with \n, otherwise incomplete line
    const lastLine = lines.pop() || '';
    if (lastLine) {
      // Incomplete line - save for next chunk
      this.sessionIdParseBuffers.set(agentId, lastLine);
    } else {
      // Buffer ended with \n - no incomplete data
      this.sessionIdParseBuffers.set(agentId, '');
    }

    // Process complete lines only
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        // Check for system/init message with session_id
        if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
          logger.info('[SpecManagerService] Extracted sessionId from Claude Code output', {
            agentId,
            sessionId: parsed.session_id,
          });

          // agent-state-file-ssot: Update agent record (SSOT)
          this.recordService.updateRecord(specId, agentId, {
            sessionId: parsed.session_id,
          }).catch((err) => {
            logger.warn('[SpecManagerService] Failed to update agent record with sessionId', {
              agentId,
              error: err.message,
            });
          });

          // Cleanup buffer and return
          this.sessionIdParseBuffers.delete(agentId);
          return;
        }
      } catch {
        // Not valid JSON, skip this line
      }
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

    // agent-state-file-ssot: Find the original agent by sessionId from files
    const allAgentsMap = await this.getAllAgents();
    const allAgents = Array.from(allAgentsMap.values()).flat();
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
   * execution-store-consolidation: analyzeImplCompletion DEPRECATED (Req 6.2)
   * Task completion state is now managed via TaskProgress from tasks.md
   *
   * This method is kept for backward compatibility but now returns a placeholder result.
   * @deprecated Use TaskProgress from tasks.md instead
   */
  async analyzeImplCompletion(
    logPath: string
  ): Promise<Result<CheckImplResult, AgentError>> {
    logger.warn('[SpecManagerService] analyzeImplCompletion is deprecated - use TaskProgress instead', { logPath });

    // Return a placeholder result indicating the method is deprecated
    return {
      ok: true,
      value: {
        status: 'success',
        completedTasks: [],
        stats: {
          num_turns: 0,
          duration_ms: 0,
          total_cost_usd: 0,
        },
      },
    };
  }

  /**
   * Check completion status for a spec-manager phase
   * Requirements: 3.1, 3.2, 5.1
   *
   * execution-store-consolidation: For impl phase, now uses LogParserService only (Req 6.2)
   * Task completion details are managed via TaskProgress from tasks.md
   */
  async checkSpecManagerCompletion(
    specId: string,
    phase: SpecManagerPhase,
    logPath: string
  ): Promise<Result<{ subtype: ResultSubtype; implResult?: CheckImplResult }, AgentError>> {
    logger.info('[SpecManagerService] checkSpecManagerCompletion called', { specId, phase, logPath });

    // execution-store-consolidation: All phases now use LogParserService.parseResultSubtype
    // Task completion details for impl are managed via TaskProgress from tasks.md
    const subtypeResult = await this.logParserService.parseResultSubtype(logPath);
    if (!subtypeResult.ok) {
      return {
        ok: false,
        error: { type: 'PARSE_ERROR', message: `Failed to parse result subtype: ${subtypeResult.error.type}` },
      };
    }
    return { ok: true, value: { subtype: subtypeResult.value } };
  }

  /**
   * Get log path for an agent
   */
  getAgentLogPath(specId: string, agentId: string): string {
    return path.join(this.projectPath, '.kiro', 'specs', specId, 'logs', `${agentId}.ndjson`);
  }
}
