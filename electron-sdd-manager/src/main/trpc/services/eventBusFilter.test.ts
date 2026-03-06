/**
 * EventBus Filter - ウィンドウ別イベントルーティングのユニットテスト
 * multi-window-integration Task 4.1, 4.2, 4.4
 * Requirements: 4.1, 4.2, 4.3, 4.4
 *
 * テスト方針:
 * - Task 4.1: EventBusイベント型にprojectPathメタデータが追加されていること
 * - Task 4.2: イベントカテゴリ分類定数とフィルタヘルパー関数の検証
 * - Task 4.4: EventBusフィルタリングの動作検証
 */
import { describe, it, expect } from 'vitest';
import { EVENT_NAMES } from './eventBus';
import {
  PROJECT_SCOPED_EVENTS,
  APP_SCOPED_EVENTS,
  isProjectScopedEvent,
  shouldDeliverEvent,
} from './eventBusFilter';

// ============================================================
// Task 4.1: EventBusイベント型にprojectPathメタデータ
// ============================================================

describe('Task 4.1: EventBusイベント型のprojectPathメタデータ', () => {
  it('PROJECT_SCOPED_EVENTSにプロジェクトスコープ全22イベントが含まれること', () => {
    const expectedProjectScopedEvents = [
      EVENT_NAMES.AGENT_OUTPUT,
      EVENT_NAMES.AGENT_STATUS_CHANGE,
      EVENT_NAMES.AGENT_LOG,
      EVENT_NAMES.AGENT_START_ERROR,
      EVENT_NAMES.AGENT_EXIT_ERROR,
      EVENT_NAMES.AGENT_RECORD_CHANGED,
      EVENT_NAMES.SPECS_CHANGED,
      EVENT_NAMES.BUGS_CHANGED,
      EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED,
      EVENT_NAMES.AUTO_EXECUTION_PHASE_STARTED,
      EVENT_NAMES.AUTO_EXECUTION_PHASE_COMPLETED,
      EVENT_NAMES.AUTO_EXECUTION_ERROR,
      EVENT_NAMES.AUTO_EXECUTION_COMPLETED,
      EVENT_NAMES.BUG_AUTO_EXECUTION_STATUS_CHANGED,
      EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_STARTED,
      EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_COMPLETED,
      EVENT_NAMES.BUG_AUTO_EXECUTION_ERROR,
      EVENT_NAMES.BUG_AUTO_EXECUTION_COMPLETED,
      EVENT_NAMES.BUG_AUTO_EXECUTION_EXECUTE_PHASE,
      EVENT_NAMES.GIT_CHANGES_DETECTED,
      EVENT_NAMES.PROJECT_FILE_CHANGED,
      EVENT_NAMES.METRICS_UPDATED,
    ];

    for (const event of expectedProjectScopedEvents) {
      expect(PROJECT_SCOPED_EVENTS).toContain(event);
    }
    expect(PROJECT_SCOPED_EVENTS).toHaveLength(22);
  });

  it('APP_SCOPED_EVENTSにアプリスコープ全14イベントが含まれること', () => {
    const expectedAppScopedEvents = [
      EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED,
      EVENT_NAMES.REMOTE_CLIENT_COUNT_CHANGED,
      EVENT_NAMES.CLOUDFLARE_TUNNEL_STATUS_CHANGED,
      EVENT_NAMES.SSH_STATUS_CHANGED,
      EVENT_NAMES.MCP_STATUS_CHANGED,
      EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED,
      EVENT_NAMES.MENU_OPEN_PROJECT,
      EVENT_NAMES.MENU_RESET_LAYOUT,
      EVENT_NAMES.MENU_INSTALL_CLI,
      EVENT_NAMES.MENU_INSTALL_COMMANDSET,
      EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_DEBUG,
      EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_GEMINI,
      EVENT_NAMES.MENU_SET_COMMAND_PREFIX,
      EVENT_NAMES.MENU_TOGGLE_REMOTE_SERVER,
    ];

    for (const event of expectedAppScopedEvents) {
      expect(APP_SCOPED_EVENTS).toContain(event);
    }
    expect(APP_SCOPED_EVENTS).toHaveLength(14);
  });

  it('全EVENT_NAMESがプロジェクトスコープかアプリスコープのいずれかに分類されること（未分類の新規イベントを除く）', () => {
    const allEventNames = Object.values(EVENT_NAMES);
    const allCategorized = new Set([...PROJECT_SCOPED_EVENTS, ...APP_SCOPED_EVENTS]);

    // github-issue-integration: 新規GitHub関連イベントはまだ未分類
    const NOT_YET_CATEGORIZED = new Set([
      EVENT_NAMES.ISSUE_LIST_UPDATED,
      EVENT_NAMES.ISSUE_DETAIL_UPDATED,
      EVENT_NAMES.PR_LIST_UPDATED,
      EVENT_NAMES.GITHUB_CONNECTION_CHANGED,
    ]);

    for (const eventName of allEventNames) {
      if (!NOT_YET_CATEGORIZED.has(eventName)) {
        expect(allCategorized.has(eventName)).toBe(true);
      }
    }
    // 重複がないこと（分類済みイベントのみ）
    expect(PROJECT_SCOPED_EVENTS.length + APP_SCOPED_EVENTS.length).toBe(allEventNames.length - NOT_YET_CATEGORIZED.size);
  });
});

// ============================================================
// Task 4.2: イベントカテゴリ分類定数とフィルタヘルパー関数
// ============================================================

describe('Task 4.2: isProjectScopedEvent', () => {
  it('プロジェクトスコープイベントに対してtrueを返すこと', () => {
    expect(isProjectScopedEvent(EVENT_NAMES.SPECS_CHANGED)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.BUGS_CHANGED)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.AGENT_OUTPUT)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.BUG_AUTO_EXECUTION_COMPLETED)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.GIT_CHANGES_DETECTED)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.PROJECT_FILE_CHANGED)).toBe(true);
    expect(isProjectScopedEvent(EVENT_NAMES.METRICS_UPDATED)).toBe(true);
  });

  it('アプリスコープイベントに対してfalseを返すこと', () => {
    expect(isProjectScopedEvent(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.REMOTE_CLIENT_COUNT_CHANGED)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.CLOUDFLARE_TUNNEL_STATUS_CHANGED)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.SSH_STATUS_CHANGED)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.MCP_STATUS_CHANGED)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.MENU_OPEN_PROJECT)).toBe(false);
    expect(isProjectScopedEvent(EVENT_NAMES.MENU_TOGGLE_REMOTE_SERVER)).toBe(false);
  });

  it('未知のイベント名に対してfalseを返すこと', () => {
    expect(isProjectScopedEvent('events:unknown-event')).toBe(false);
  });
});

describe('Task 4.2: shouldDeliverEvent', () => {
  const projectPathA = '/path/to/projectA';
  const projectPathB = '/path/to/projectB';

  it('プロジェクトスコープイベント: 同一projectPathのウィンドウにのみ配信される', () => {
    expect(
      shouldDeliverEvent(projectPathA, projectPathA, EVENT_NAMES.SPECS_CHANGED),
    ).toBe(true);
  });

  it('プロジェクトスコープイベント: 異なるprojectPathのウィンドウには配信されない', () => {
    expect(
      shouldDeliverEvent(projectPathA, projectPathB, EVENT_NAMES.SPECS_CHANGED),
    ).toBe(false);
  });

  it('アプリスコープイベント: 全ウィンドウに配信される', () => {
    expect(
      shouldDeliverEvent(projectPathA, projectPathB, EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED),
    ).toBe(true);
    expect(
      shouldDeliverEvent(null, projectPathA, EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED),
    ).toBe(true);
  });

  it('projectPathがnullのプロジェクトスコープイベント: 全ウィンドウに配信される（安全策）', () => {
    expect(
      shouldDeliverEvent(null, projectPathA, EVENT_NAMES.SPECS_CHANGED),
    ).toBe(true);
    expect(
      shouldDeliverEvent(undefined, projectPathA, EVENT_NAMES.AGENT_OUTPUT),
    ).toBe(true);
  });

  it('ウィンドウのprojectPathがnullの場合: プロジェクトスコープイベントは配信しない', () => {
    expect(
      shouldDeliverEvent(projectPathA, null, EVENT_NAMES.SPECS_CHANGED),
    ).toBe(false);
  });

  it('ウィンドウのprojectPathがnullの場合: アプリスコープイベントは配信される', () => {
    expect(
      shouldDeliverEvent(null, null, EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED),
    ).toBe(true);
  });

  it('未知のイベント名はアプリスコープとして扱い全ウィンドウに配信される', () => {
    expect(
      shouldDeliverEvent(projectPathA, projectPathB, 'events:unknown-event'),
    ).toBe(true);
  });
});
