/**
 * EventBus Filter - ウィンドウ別イベントルーティング基盤
 * multi-window-integration Task 4.1, 4.2
 * Requirements: 4.1, 4.2, 4.3, 4.4
 *
 * イベントカテゴリ分類定数とフィルタヘルパー関数を提供する。
 * プロジェクトスコープイベントはprojectPathでフィルタリングし、
 * アプリスコープイベントは全ウィンドウにブロードキャストする。
 *
 * Design: DD-004 - EventBusフィルタリングの実装層
 * Subscription（events router）側でフィルタリングを実行する。
 */
import { EVENT_NAMES, type EventName } from './eventBus';

// ============================================================
// Task 4.1: イベントカテゴリ分類定数
// ============================================================

/**
 * プロジェクトスコープイベント（22件）
 * これらのイベントはprojectPathでフィルタリングされ、
 * 該当プロジェクトを開いているウィンドウにのみ配信される。
 */
export const PROJECT_SCOPED_EVENTS: readonly EventName[] = [
  // Agent Events (6)
  EVENT_NAMES.AGENT_OUTPUT,
  EVENT_NAMES.AGENT_STATUS_CHANGE,
  EVENT_NAMES.AGENT_LOG,
  EVENT_NAMES.AGENT_START_ERROR,
  EVENT_NAMES.AGENT_EXIT_ERROR,
  EVENT_NAMES.AGENT_RECORD_CHANGED,

  // Spec/Bug Events (2)
  EVENT_NAMES.SPECS_CHANGED,
  EVENT_NAMES.BUGS_CHANGED,

  // Auto Execution Events (5)
  EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED,
  EVENT_NAMES.AUTO_EXECUTION_PHASE_STARTED,
  EVENT_NAMES.AUTO_EXECUTION_PHASE_COMPLETED,
  EVENT_NAMES.AUTO_EXECUTION_ERROR,
  EVENT_NAMES.AUTO_EXECUTION_COMPLETED,

  // Bug Auto Execution Events (6)
  EVENT_NAMES.BUG_AUTO_EXECUTION_STATUS_CHANGED,
  EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_STARTED,
  EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_COMPLETED,
  EVENT_NAMES.BUG_AUTO_EXECUTION_ERROR,
  EVENT_NAMES.BUG_AUTO_EXECUTION_COMPLETED,
  EVENT_NAMES.BUG_AUTO_EXECUTION_EXECUTE_PHASE,

  // File Events (2)
  EVENT_NAMES.GIT_CHANGES_DETECTED,
  EVENT_NAMES.PROJECT_FILE_CHANGED,

  // Metrics Events (1)
  EVENT_NAMES.METRICS_UPDATED,
] as const;

/**
 * アプリスコープイベント（14件）
 * これらのイベントはフィルタリングなしで全ウィンドウに配信される。
 */
export const APP_SCOPED_EVENTS: readonly EventName[] = [
  // Server/Tunnel Events (3)
  EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED,
  EVENT_NAMES.REMOTE_CLIENT_COUNT_CHANGED,
  EVENT_NAMES.CLOUDFLARE_TUNNEL_STATUS_CHANGED,

  // SSH Events (1)
  EVENT_NAMES.SSH_STATUS_CHANGED,

  // MCP Events (1)
  EVENT_NAMES.MCP_STATUS_CHANGED,

  // Schedule Task Events (1)
  EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED,

  // Menu Events (8)
  EVENT_NAMES.MENU_OPEN_PROJECT,
  EVENT_NAMES.MENU_RESET_LAYOUT,
  EVENT_NAMES.MENU_INSTALL_CLI,
  EVENT_NAMES.MENU_INSTALL_COMMANDSET,
  EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_DEBUG,
  EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_GEMINI,
  EVENT_NAMES.MENU_SET_COMMAND_PREFIX,
  EVENT_NAMES.MENU_TOGGLE_REMOTE_SERVER,
] as const;

// O(1)ルックアップ用Set
const projectScopedEventSet = new Set<string>(PROJECT_SCOPED_EVENTS);

// ============================================================
// Task 4.2: フィルタヘルパー関数
// ============================================================

/**
 * イベントがプロジェクトスコープかを判定する。
 *
 * @param eventName - EVENT_NAMES定数のイベント名
 * @returns プロジェクトスコープの場合true、アプリスコープまたは未知の場合false
 */
export function isProjectScopedEvent(eventName: string): boolean {
  return projectScopedEventSet.has(eventName);
}

/**
 * イベントを特定のウィンドウに配信すべきかを判定する。
 *
 * ルール:
 * 1. アプリスコープイベント → 全ウィンドウに配信（true）
 * 2. プロジェクトスコープイベント:
 *    a. イベントのprojectPathがnull/undefined → 全ウィンドウに配信（移行期間の安全策）
 *    b. ウィンドウのprojectPathがnull → 配信しない（プロジェクト未選択ウィンドウ）
 *    c. projectPathが一致 → 配信する
 *    d. projectPathが不一致 → 配信しない
 *
 * @param eventProjectPath - イベントに付与されたprojectPath（nullの場合は移行期間の安全策で全配信）
 * @param windowProjectPath - ウィンドウに紐づいたprojectPath（nullの場合はプロジェクト未選択）
 * @param eventName - イベント名
 * @returns 配信すべき場合true
 */
export function shouldDeliverEvent(
  eventProjectPath: string | null | undefined,
  windowProjectPath: string | null | undefined,
  eventName: string,
): boolean {
  // アプリスコープイベント（および未知のイベント）は全ウィンドウに配信
  if (!isProjectScopedEvent(eventName)) {
    return true;
  }

  // プロジェクトスコープイベント: eventのprojectPathがnull/undefined → 全ウィンドウに配信（安全策）
  if (eventProjectPath == null) {
    return true;
  }

  // プロジェクトスコープイベント: ウィンドウのprojectPathがnull → 配信しない
  if (windowProjectPath == null) {
    return false;
  }

  // プロジェクトスコープイベント: projectPath一致で配信
  return eventProjectPath === windowProjectPath;
}
