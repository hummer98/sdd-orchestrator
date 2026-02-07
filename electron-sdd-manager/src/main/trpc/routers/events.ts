/**
 * Events Router - tRPC Subscription procedures for Main -> Renderer event notifications
 * Task 9.1: eventsルーターとSubscriptionプロシージャを実装する
 * Requirements: 8.1, 8.2
 * Design: DD-003 - tRPC SubscriptionによるMain->Rendererイベント通知
 *
 * observable()ヘルパーを使い、既存EventEmitter/コールバックをSubscriptionに変換する。
 * 各SubscriptionはEventBus上のイベントをリスンし、Rendererにデータを配信する。
 * unsubscribe時にEventEmitterリスナーを正しく解除する（BrowserWindowクローズ時cleanup）。
 */
import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc';
import { EVENT_NAMES } from '../services/eventBus';

// ============================================================
// Zod Schemas - イベントペイロード定義
// ============================================================

// --- Agent Events ---
export const agentOutputSchema = z.object({
  agentId: z.string(),
  stream: z.string(),
  data: z.string(),
});

export const agentStatusChangeSchema = z.object({
  agentId: z.string(),
  status: z.string(),
});

export const agentLogSchema = z.object({
  agentId: z.string(),
  parsedLog: z.record(z.unknown()),
});

export const agentStartErrorSchema = z.object({
  agentId: z.string(),
  specId: z.string(),
  error: z.record(z.unknown()),
});

export const agentExitErrorSchema = z.object({
  agentId: z.string(),
  error: z.string(),
});

export const agentRecordChangedSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()).optional(),
});

// --- Spec/Bug Events ---
export const specsChangedSchema = z.record(z.unknown());

export const bugsChangedSchema = z.record(z.unknown());

// startup-project-selection-race-condition: projectSelectedSchema removed (Pull model, no Subscription)

// --- Auto Execution Events ---
export const autoExecutionStatusChangedSchema = z.record(z.unknown());
export const autoExecutionPhaseEventSchema = z.record(z.unknown());
export const autoExecutionErrorSchema = z.record(z.unknown());
export const autoExecutionCompletedSchema = z.record(z.unknown());

// --- Bug Auto Execution Events ---
export const bugAutoExecutionStatusChangedSchema = z.record(z.unknown());
export const bugAutoExecutionPhaseEventSchema = z.record(z.unknown());
export const bugAutoExecutionErrorSchema = z.record(z.unknown());
export const bugAutoExecutionCompletedSchema = z.record(z.unknown());

// --- Server/Tunnel Events ---
export const serverStatusSchema = z.record(z.unknown());
export const clientCountSchema = z.record(z.unknown());
export const tunnelStatusSchema = z.record(z.unknown());

// --- File Events ---
export const gitChangeSchema = z.record(z.unknown());
export const projectFileChangeSchema = z.record(z.unknown());

// --- Schedule Task Events ---
export const scheduleTaskStatusSchema = z.record(z.unknown());

// --- MCP Events ---
export const mcpStatusSchema = z.object({
  isRunning: z.boolean(),
  port: z.number().nullable(),
  url: z.string().nullable(),
});

// --- Metrics Events ---
export const metricsUpdateSchema = z.record(z.unknown());

// --- SSH Events ---
export const sshStatusSchema = z.record(z.unknown());

// --- Menu Events ---
export const menuOpenProjectSchema = z.object({
  projectPath: z.string(),
});

export const menuVoidSchema = z.object({});

export const menuSetCommandPrefixSchema = z.object({
  prefix: z.string(),
});

// ============================================================
// Helper: EventBusベースのSubscription生成ユーティリティ
// ============================================================

/**
 * EventBusイベントをtRPC Subscriptionに変換するヘルパー
 *
 * @param eventName - EVENT_NAMES定数のイベント名
 * @returns observable()で生成されたtRPC Subscription
 */
function createEventSubscription<T>(eventName: string) {
  return publicProcedure.subscription(({ ctx }) => {
    return observable<T>((emit) => {
      const eventBus = ctx.services.eventBus;
      if (!eventBus) {
        return () => {};
      }

      const handler = (data: T) => {
        emit.next(data);
      };

      eventBus.on(eventName, handler);

      // cleanup: unsubscribe時にEventEmitterリスナーを解除
      return () => {
        eventBus.removeListener(eventName, handler);
      };
    });
  });
}

// ============================================================
// Events Router
// ============================================================

export const eventsRouter = router({
  // ============================================================
  // Agent Events (6)
  // ============================================================

  /** Agent output (stdout/stderr) */
  onAgentOutput: createEventSubscription<z.infer<typeof agentOutputSchema>>(
    EVENT_NAMES.AGENT_OUTPUT,
  ),

  /** Agent status change (running, stopped, etc.) */
  onAgentStatusChange: createEventSubscription<z.infer<typeof agentStatusChangeSchema>>(
    EVENT_NAMES.AGENT_STATUS_CHANGE,
  ),

  /** Parsed agent log entry */
  onAgentLog: createEventSubscription<z.infer<typeof agentLogSchema>>(
    EVENT_NAMES.AGENT_LOG,
  ),

  /** Agent start error notification */
  onAgentStartError: createEventSubscription<z.infer<typeof agentStartErrorSchema>>(
    EVENT_NAMES.AGENT_START_ERROR,
  ),

  /** Agent exit error notification */
  onAgentExitError: createEventSubscription<z.infer<typeof agentExitErrorSchema>>(
    EVENT_NAMES.AGENT_EXIT_ERROR,
  ),

  /** Agent record changed (file watcher) */
  onAgentRecordChanged: createEventSubscription<z.infer<typeof agentRecordChangedSchema>>(
    EVENT_NAMES.AGENT_RECORD_CHANGED,
  ),

  // ============================================================
  // Spec/Bug Events (2)
  // startup-project-selection-race-condition: onProjectSelected removed (Pull model)
  // ============================================================

  /** Specs changed notification */
  onSpecsChanged: createEventSubscription<z.infer<typeof specsChangedSchema>>(
    EVENT_NAMES.SPECS_CHANGED,
  ),

  /** Bugs changed notification */
  onBugsChanged: createEventSubscription<z.infer<typeof bugsChangedSchema>>(
    EVENT_NAMES.BUGS_CHANGED,
  ),

  // ============================================================
  // Auto Execution Events (5)
  // ============================================================

  /** Auto execution status changed */
  onAutoExecutionStatusChanged: createEventSubscription<z.infer<typeof autoExecutionStatusChangedSchema>>(
    EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED,
  ),

  /** Auto execution phase started */
  onAutoExecutionPhaseStarted: createEventSubscription<z.infer<typeof autoExecutionPhaseEventSchema>>(
    EVENT_NAMES.AUTO_EXECUTION_PHASE_STARTED,
  ),

  /** Auto execution phase completed */
  onAutoExecutionPhaseCompleted: createEventSubscription<z.infer<typeof autoExecutionPhaseEventSchema>>(
    EVENT_NAMES.AUTO_EXECUTION_PHASE_COMPLETED,
  ),

  /** Auto execution error */
  onAutoExecutionError: createEventSubscription<z.infer<typeof autoExecutionErrorSchema>>(
    EVENT_NAMES.AUTO_EXECUTION_ERROR,
  ),

  /** Auto execution completed */
  onAutoExecutionCompleted: createEventSubscription<z.infer<typeof autoExecutionCompletedSchema>>(
    EVENT_NAMES.AUTO_EXECUTION_COMPLETED,
  ),

  // ============================================================
  // Bug Auto Execution Events (6)
  // ============================================================

  /** Bug auto execution status changed */
  onBugAutoExecutionStatusChanged: createEventSubscription<z.infer<typeof bugAutoExecutionStatusChangedSchema>>(
    EVENT_NAMES.BUG_AUTO_EXECUTION_STATUS_CHANGED,
  ),

  /** Bug auto execution phase started */
  onBugAutoExecutionPhaseStarted: createEventSubscription<z.infer<typeof bugAutoExecutionPhaseEventSchema>>(
    EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_STARTED,
  ),

  /** Bug auto execution phase completed */
  onBugAutoExecutionPhaseCompleted: createEventSubscription<z.infer<typeof bugAutoExecutionPhaseEventSchema>>(
    EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_COMPLETED,
  ),

  /** Bug auto execution error */
  onBugAutoExecutionError: createEventSubscription<z.infer<typeof bugAutoExecutionErrorSchema>>(
    EVENT_NAMES.BUG_AUTO_EXECUTION_ERROR,
  ),

  /** Bug auto execution completed */
  onBugAutoExecutionCompleted: createEventSubscription<z.infer<typeof bugAutoExecutionCompletedSchema>>(
    EVENT_NAMES.BUG_AUTO_EXECUTION_COMPLETED,
  ),

  /** Bug auto execution execute phase */
  onBugAutoExecutionExecutePhase: createEventSubscription<z.infer<typeof bugAutoExecutionPhaseEventSchema>>(
    EVENT_NAMES.BUG_AUTO_EXECUTION_EXECUTE_PHASE,
  ),

  // ============================================================
  // Server/Tunnel Events (3)
  // ============================================================

  /** Remote server status changed */
  onRemoteServerStatusChanged: createEventSubscription<z.infer<typeof serverStatusSchema>>(
    EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED,
  ),

  /** Remote client count changed */
  onRemoteClientCountChanged: createEventSubscription<z.infer<typeof clientCountSchema>>(
    EVENT_NAMES.REMOTE_CLIENT_COUNT_CHANGED,
  ),

  /** Cloudflare tunnel status changed */
  onCloudflareTunnelStatusChanged: createEventSubscription<z.infer<typeof tunnelStatusSchema>>(
    EVENT_NAMES.CLOUDFLARE_TUNNEL_STATUS_CHANGED,
  ),

  // ============================================================
  // File Events (2)
  // ============================================================

  /** Git changes detected */
  onGitChangesDetected: createEventSubscription<z.infer<typeof gitChangeSchema>>(
    EVENT_NAMES.GIT_CHANGES_DETECTED,
  ),

  /** Project file changed */
  onProjectFileChanged: createEventSubscription<z.infer<typeof projectFileChangeSchema>>(
    EVENT_NAMES.PROJECT_FILE_CHANGED,
  ),

  // ============================================================
  // Schedule Task Events (1)
  // ============================================================

  /** Schedule task status changed */
  onScheduleTaskStatusChanged: createEventSubscription<z.infer<typeof scheduleTaskStatusSchema>>(
    EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED,
  ),

  // ============================================================
  // MCP Events (1)
  // ============================================================

  /** MCP server status changed */
  onMcpStatusChanged: createEventSubscription<z.infer<typeof mcpStatusSchema>>(
    EVENT_NAMES.MCP_STATUS_CHANGED,
  ),

  // ============================================================
  // Metrics Events (1)
  // ============================================================

  /** Metrics updated */
  onMetricsUpdated: createEventSubscription<z.infer<typeof metricsUpdateSchema>>(
    EVENT_NAMES.METRICS_UPDATED,
  ),

  // ============================================================
  // SSH Events (1)
  // ============================================================

  /** SSH connection status changed */
  onSshStatusChanged: createEventSubscription<z.infer<typeof sshStatusSchema>>(
    EVENT_NAMES.SSH_STATUS_CHANGED,
  ),

  // ============================================================
  // Menu Events (8)
  // ============================================================

  /** Menu: Open project */
  onMenuOpenProject: createEventSubscription<z.infer<typeof menuOpenProjectSchema>>(
    EVENT_NAMES.MENU_OPEN_PROJECT,
  ),

  /** Menu: Reset layout */
  onMenuResetLayout: createEventSubscription<z.infer<typeof menuVoidSchema>>(
    EVENT_NAMES.MENU_RESET_LAYOUT,
  ),

  /** Menu: Install CLI command */
  onMenuInstallCli: createEventSubscription<z.infer<typeof menuVoidSchema>>(
    EVENT_NAMES.MENU_INSTALL_CLI,
  ),

  /** Menu: Install commandset */
  onMenuInstallCommandset: createEventSubscription<z.infer<typeof menuVoidSchema>>(
    EVENT_NAMES.MENU_INSTALL_COMMANDSET,
  ),

  /** Menu: Install experimental debug */
  onMenuInstallExperimentalDebug: createEventSubscription<z.infer<typeof menuVoidSchema>>(
    EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_DEBUG,
  ),

  /** Menu: Install experimental Gemini */
  onMenuInstallExperimentalGemini: createEventSubscription<z.infer<typeof menuVoidSchema>>(
    EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_GEMINI,
  ),

  /** Menu: Set command prefix */
  onMenuSetCommandPrefix: createEventSubscription<z.infer<typeof menuSetCommandPrefixSchema>>(
    EVENT_NAMES.MENU_SET_COMMAND_PREFIX,
  ),

  /** Menu: Toggle remote server */
  onMenuToggleRemoteServer: createEventSubscription<z.infer<typeof menuVoidSchema>>(
    EVENT_NAMES.MENU_TOGGLE_REMOTE_SERVER,
  ),
});
