/**
 * EventBus - 集約EventEmitterサービス
 * Task 9.1: tRPC Subscriptionのためのイベントバス
 * Requirements: 8.1, 8.2
 *
 * 既存のBrowserWindow.webContents.send()呼び出しを
 * EventEmitterベースのイベントバスに集約する。
 * tRPC Subscriptionはobservable()内でこのEventBusをリスンし、
 * イベントをSubscription経由でRendererに配信する。
 *
 * Design: DD-003 - tRPC SubscriptionによるMain->Rendererイベント通知
 */
import { EventEmitter } from 'events';

/**
 * イベント名定数
 * IPC_CHANNELSと1:1対応するが、tRPC Subscription用に整理された名前を使用
 */
export const EVENT_NAMES = {
  // Agent Events (6)
  AGENT_OUTPUT: 'events:agent-output',
  AGENT_STATUS_CHANGE: 'events:agent-status-change',
  AGENT_LOG: 'events:agent-log',
  AGENT_START_ERROR: 'events:agent-start-error',
  AGENT_EXIT_ERROR: 'events:agent-exit-error',
  AGENT_RECORD_CHANGED: 'events:agent-record-changed',

  // Spec/Bug Events (2)
  // startup-project-selection-race-condition: PROJECT_SELECTED removed (Pull model)
  SPECS_CHANGED: 'events:specs-changed',
  BUGS_CHANGED: 'events:bugs-changed',

  // Auto Execution Events (5)
  AUTO_EXECUTION_STATUS_CHANGED: 'events:auto-execution-status-changed',
  AUTO_EXECUTION_PHASE_STARTED: 'events:auto-execution-phase-started',
  AUTO_EXECUTION_PHASE_COMPLETED: 'events:auto-execution-phase-completed',
  AUTO_EXECUTION_ERROR: 'events:auto-execution-error',
  AUTO_EXECUTION_COMPLETED: 'events:auto-execution-completed',

  // Bug Auto Execution Events (6)
  BUG_AUTO_EXECUTION_STATUS_CHANGED: 'events:bug-auto-execution-status-changed',
  BUG_AUTO_EXECUTION_PHASE_STARTED: 'events:bug-auto-execution-phase-started',
  BUG_AUTO_EXECUTION_PHASE_COMPLETED: 'events:bug-auto-execution-phase-completed',
  BUG_AUTO_EXECUTION_ERROR: 'events:bug-auto-execution-error',
  BUG_AUTO_EXECUTION_COMPLETED: 'events:bug-auto-execution-completed',
  BUG_AUTO_EXECUTION_EXECUTE_PHASE: 'events:bug-auto-execution-execute-phase',

  // Server/Tunnel Events (3)
  REMOTE_SERVER_STATUS_CHANGED: 'events:remote-server-status-changed',
  REMOTE_CLIENT_COUNT_CHANGED: 'events:remote-client-count-changed',
  CLOUDFLARE_TUNNEL_STATUS_CHANGED: 'events:cloudflare-tunnel-status-changed',

  // File Events (2)
  GIT_CHANGES_DETECTED: 'events:git-changes-detected',
  PROJECT_FILE_CHANGED: 'events:project-file-changed',

  // Schedule Task Events (1)
  SCHEDULE_TASK_STATUS_CHANGED: 'events:schedule-task-status-changed',

  // MCP Events (1)
  MCP_STATUS_CHANGED: 'events:mcp-status-changed',

  // Metrics Events (1)
  METRICS_UPDATED: 'events:metrics-updated',

  // SSH Events (1)
  SSH_STATUS_CHANGED: 'events:ssh-status-changed',

  // Menu Events (8)
  MENU_OPEN_PROJECT: 'events:menu-open-project',
  MENU_RESET_LAYOUT: 'events:menu-reset-layout',
  MENU_INSTALL_CLI: 'events:menu-install-cli',
  MENU_INSTALL_COMMANDSET: 'events:menu-install-commandset',
  MENU_INSTALL_EXPERIMENTAL_DEBUG: 'events:menu-install-experimental-debug',
  MENU_INSTALL_EXPERIMENTAL_GEMINI: 'events:menu-install-experimental-gemini',
  MENU_SET_COMMAND_PREFIX: 'events:menu-set-command-prefix',
  MENU_TOGGLE_REMOTE_SERVER: 'events:menu-toggle-remote-server',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/**
 * EventBusの型定義
 * Node.js EventEmitterをそのまま使用
 */
export type EventBus = EventEmitter;

/**
 * 新しいEventBusインスタンスを作成する
 *
 * @returns EventEmitter instance for event-based communication
 */
export function createEventBus(): EventBus {
  const emitter = new EventEmitter();
  // Max listeners to accommodate many subscriptions
  emitter.setMaxListeners(100);
  return emitter;
}
