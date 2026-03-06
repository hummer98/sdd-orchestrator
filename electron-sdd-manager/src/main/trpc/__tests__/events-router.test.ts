/**
 * Events Router tests
 * Task 9.1: eventsルーターとSubscriptionプロシージャを実装する
 * Task 9.3: Subscriptionの統合テストを作成する
 * Requirements: 8.1, 8.2, 8.5
 * Method: eventsRouter, observable, EventEmitter
 * Verify: Grep "useSubscription|observable" in __tests__/events-router.test.ts
 *
 * テスト方針:
 * - observable()を使ったSubscriptionプロシージャの動作検証
 * - EventEmitter発火時にSubscription経由でデータが配信されること
 * - unsubscribe時にEventEmitterリスナーが解除されること（cleanup検証）
 * - 各Subscriptionのzodスキーマバリデーション
 * - 主要イベント（Agent出力、Spec変更、AutoExecution状態変更）の統合テスト
 * - 連続イベント配信、複数Subscriber、cleanup挙動の検証
 */
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { createCallerFactory } from '@trpc/server';
import type { Observable } from '@trpc/server/observable';

// ============================================================
// ヘルパー: Subscriptionテスト用ユーティリティ
// ============================================================

/**
 * tRPC caller subscription の結果（Observable）を subscribe し、
 * EventBus にイベントを発火して受信を確認するヘルパー。
 * waitForパターンを使用し、固定sleepを回避。
 */
async function subscribeAndCollect<T>(
  subscriptionFn: () => Promise<Observable<T, unknown>>,
  emitFn: () => void,
  options?: { timeout?: number },
): Promise<{ received: T[]; unsubscribe: () => void }> {
  const received: T[] = [];
  const obs = await subscriptionFn();
  const sub = obs.subscribe({
    next: (data: T) => received.push(data),
  });

  // イベント発火
  emitFn();

  // waitForパターン: データ受信を待つ（最大timeout ms）
  const timeout = options?.timeout ?? 200;
  const start = Date.now();
  while (received.length === 0 && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return { received, unsubscribe: () => sub.unsubscribe() };
}

// ============================================================
// 1. EventBus: 集約EventEmitter サービスのテスト
// ============================================================

describe('EventBus - 集約EventEmitterサービス', () => {
  it('should export createEventBus function', async () => {
    const { createEventBus } = await import('../services/eventBus');
    expect(createEventBus).toBeDefined();
    expect(typeof createEventBus).toBe('function');
  });

  it('should return an EventEmitter instance', async () => {
    const { createEventBus } = await import('../services/eventBus');
    const bus = createEventBus();
    expect(bus).toBeInstanceOf(EventEmitter);
  });

  it('should export EVENT_NAMES constant with all event names', async () => {
    const { EVENT_NAMES } = await import('../services/eventBus');
    expect(EVENT_NAMES).toBeDefined();

    // Agent Events
    expect(EVENT_NAMES.AGENT_OUTPUT).toBeDefined();
    expect(EVENT_NAMES.AGENT_STATUS_CHANGE).toBeDefined();
    expect(EVENT_NAMES.AGENT_LOG).toBeDefined();
    expect(EVENT_NAMES.AGENT_START_ERROR).toBeDefined();
    expect(EVENT_NAMES.AGENT_EXIT_ERROR).toBeDefined();
    expect(EVENT_NAMES.AGENT_RECORD_CHANGED).toBeDefined();

    // Spec/Bug Events
    expect(EVENT_NAMES.SPECS_CHANGED).toBeDefined();
    expect(EVENT_NAMES.BUGS_CHANGED).toBeDefined();

    // Auto Execution Events
    expect(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED).toBeDefined();
    expect(EVENT_NAMES.AUTO_EXECUTION_PHASE_STARTED).toBeDefined();
    expect(EVENT_NAMES.AUTO_EXECUTION_PHASE_COMPLETED).toBeDefined();
    expect(EVENT_NAMES.AUTO_EXECUTION_ERROR).toBeDefined();
    expect(EVENT_NAMES.AUTO_EXECUTION_COMPLETED).toBeDefined();

    // Bug Auto Execution Events
    expect(EVENT_NAMES.BUG_AUTO_EXECUTION_STATUS_CHANGED).toBeDefined();
    expect(EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_STARTED).toBeDefined();
    expect(EVENT_NAMES.BUG_AUTO_EXECUTION_PHASE_COMPLETED).toBeDefined();
    expect(EVENT_NAMES.BUG_AUTO_EXECUTION_ERROR).toBeDefined();
    expect(EVENT_NAMES.BUG_AUTO_EXECUTION_COMPLETED).toBeDefined();
    expect(EVENT_NAMES.BUG_AUTO_EXECUTION_EXECUTE_PHASE).toBeDefined();

    // Server/Tunnel Events
    expect(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED).toBeDefined();
    expect(EVENT_NAMES.REMOTE_CLIENT_COUNT_CHANGED).toBeDefined();
    expect(EVENT_NAMES.CLOUDFLARE_TUNNEL_STATUS_CHANGED).toBeDefined();

    // File Events
    expect(EVENT_NAMES.GIT_CHANGES_DETECTED).toBeDefined();
    expect(EVENT_NAMES.PROJECT_FILE_CHANGED).toBeDefined();

    // Schedule Task Events
    expect(EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED).toBeDefined();

    // MCP Events
    expect(EVENT_NAMES.MCP_STATUS_CHANGED).toBeDefined();

    // Metrics Events
    expect(EVENT_NAMES.METRICS_UPDATED).toBeDefined();

    // SSH Events
    expect(EVENT_NAMES.SSH_STATUS_CHANGED).toBeDefined();

    // Menu Events
    expect(EVENT_NAMES.MENU_OPEN_PROJECT).toBeDefined();
    expect(EVENT_NAMES.MENU_RESET_LAYOUT).toBeDefined();
    expect(EVENT_NAMES.MENU_INSTALL_CLI).toBeDefined();
    expect(EVENT_NAMES.MENU_INSTALL_COMMANDSET).toBeDefined();
    expect(EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_DEBUG).toBeDefined();
    expect(EVENT_NAMES.MENU_INSTALL_EXPERIMENTAL_GEMINI).toBeDefined();
    expect(EVENT_NAMES.MENU_SET_COMMAND_PREFIX).toBeDefined();
    expect(EVENT_NAMES.MENU_TOGGLE_REMOTE_SERVER).toBeDefined();
  });

  it('should emit and receive events correctly', async () => {
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on(EVENT_NAMES.AGENT_OUTPUT, handler);
    bus.emit(EVENT_NAMES.AGENT_OUTPUT, { agentId: 'test', stream: 'stdout', data: 'hello' });
    expect(handler).toHaveBeenCalledWith({ agentId: 'test', stream: 'stdout', data: 'hello' });
  });

  it('should support removeListener for cleanup', async () => {
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on(EVENT_NAMES.SPECS_CHANGED, handler);
    bus.removeListener(EVENT_NAMES.SPECS_CHANGED, handler);
    bus.emit(EVENT_NAMES.SPECS_CHANGED, { type: 'update' });
    expect(handler).not.toHaveBeenCalled();
  });
});

// ============================================================
// 2. Events Router: Subscriptionプロシージャの存在テスト
// ============================================================

describe('Events Router - Subscriptionプロシージャ', () => {
  it('should export eventsRouter', async () => {
    const { eventsRouter } = await import('../routers/events');
    expect(eventsRouter).toBeDefined();
  });

  it('should be registered in appRouter as events namespace', async () => {
    const { appRouter } = await import('../router');
    const routerDef = (appRouter as any)._def;
    expect(routerDef.record?.events).toBeDefined();
  });
});

// ============================================================
// 3. Agent系Subscriptionのテスト
// ============================================================

describe('Events Router - Agent Subscriptions', () => {
  it('onAgentOutput should emit agent output events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentOutput(),
      () => bus.emit(EVENT_NAMES.AGENT_OUTPUT, {
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'Hello world',
      }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0]).toEqual({
      agentId: 'agent-1',
      stream: 'stdout',
      data: 'Hello world',
    });

    unsubscribe();
  });

  it('onAgentStatusChange should emit agent status change events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentStatusChange(),
      () => bus.emit(EVENT_NAMES.AGENT_STATUS_CHANGE, {
        agentId: 'agent-1',
        status: 'running',
      }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0]).toMatchObject({
      agentId: 'agent-1',
      status: 'running',
    });

    unsubscribe();
  });

  it('onAgentLog should emit parsed log entries', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentLog(),
      () => bus.emit(EVENT_NAMES.AGENT_LOG, {
        agentId: 'agent-1',
        parsedLog: { timestamp: '2026-01-01T00:00:00Z', level: 'info', message: 'test' },
      }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0]).toMatchObject({ agentId: 'agent-1' });

    unsubscribe();
  });
});

// ============================================================
// 4. Cleanup（unsubscribe時のEventEmitterリスナー解除）テスト
// ============================================================

describe('Events Router - Subscription Cleanup', () => {
  it('should remove EventEmitter listener on unsubscribe', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const initialListenerCount = bus.listenerCount(EVENT_NAMES.AGENT_OUTPUT);

    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const obs = await callerFactory(ctx).events.onAgentOutput();
    const sub = obs.subscribe({ next: () => {} });

    // subscribe後、リスナーが追加されていること
    const afterSubscribeCount = bus.listenerCount(EVENT_NAMES.AGENT_OUTPUT);
    expect(afterSubscribeCount).toBe(initialListenerCount + 1);

    sub.unsubscribe();

    // unsubscribe後、リスナーが除去されていること
    const afterUnsubscribeCount = bus.listenerCount(EVENT_NAMES.AGENT_OUTPUT);
    expect(afterUnsubscribeCount).toBe(initialListenerCount);
  });
});

// ============================================================
// 5. Spec/Bug/AutoExecution系Subscriptionの基本テスト
// ============================================================

describe('Events Router - Spec/Bug Subscriptions', () => {
  it('onSpecsChanged should emit specs change events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onSpecsChanged(),
      () => bus.emit(EVENT_NAMES.SPECS_CHANGED, { type: 'update', specs: [] }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });

  it('onBugsChanged should emit bugs change events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onBugsChanged(),
      () => bus.emit(EVENT_NAMES.BUGS_CHANGED, { type: 'update', bugs: [] }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });
});

describe('Events Router - Auto Execution Subscriptions', () => {
  it('onAutoExecutionStatusChanged should emit status events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAutoExecutionStatusChanged(),
      () => bus.emit(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED, { specPath: '/test', status: 'running' }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });
});

// ============================================================
// 6. Menu系Subscriptionのテスト
// ============================================================

describe('Events Router - Menu Subscriptions', () => {
  it('onMenuOpenProject should emit project path', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onMenuOpenProject(),
      () => bus.emit(EVENT_NAMES.MENU_OPEN_PROJECT, { projectPath: '/path/to/project' }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0]).toMatchObject({ projectPath: '/path/to/project' });
    unsubscribe();
  });

  it('onMenuSetCommandPrefix should emit prefix string', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onMenuSetCommandPrefix(),
      () => bus.emit(EVENT_NAMES.MENU_SET_COMMAND_PREFIX, { prefix: 'kiro' }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0]).toMatchObject({ prefix: 'kiro' });
    unsubscribe();
  });
});

// ============================================================
// 7. Server/Tunnel/File/Schedule/MCP/Metrics/SSH 系の基本テスト
// ============================================================

describe('Events Router - Infrastructure Subscriptions', () => {
  it('onRemoteServerStatusChanged should emit server status events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onRemoteServerStatusChanged(),
      () => bus.emit(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED, { status: 'running', port: 3000 }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });

  it('onMcpStatusChanged should emit MCP status events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onMcpStatusChanged(),
      () => bus.emit(EVENT_NAMES.MCP_STATUS_CHANGED, { status: 'running', port: 5100 }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });

  it('onScheduleTaskStatusChanged should emit schedule task events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onScheduleTaskStatusChanged(),
      () => bus.emit(EVENT_NAMES.SCHEDULE_TASK_STATUS_CHANGED, { taskId: 'task-1', status: 'completed' }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });

  it('onSshStatusChanged should emit SSH status events', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onSshStatusChanged(),
      () => bus.emit(EVENT_NAMES.SSH_STATUS_CHANGED, { status: 'connected', host: 'example.com' }),
    );

    expect(received.length).toBeGreaterThanOrEqual(1);
    unsubscribe();
  });
});

// ============================================================
// 8. 全Subscriptionプロシージャの存在確認テスト
// ============================================================

describe('Events Router - 全Subscriptionプロシージャの存在確認', () => {
  const expectedSubscriptions = [
    // Agent系 (6)
    'onAgentOutput',
    'onAgentStatusChange',
    'onAgentLog',
    'onAgentStartError',
    'onAgentExitError',
    'onAgentRecordChanged',

    // Spec系 (2)
    // startup-project-selection-race-condition: onProjectSelected removed (Pull model)
    'onSpecsChanged',
    'onBugsChanged', // Retained for backward compatibility

    // Auto Execution系 (5)
    'onAutoExecutionStatusChanged',
    'onAutoExecutionPhaseStarted',
    'onAutoExecutionPhaseCompleted',
    'onAutoExecutionError',
    'onAutoExecutionCompleted',

    // Bug Auto Execution系 removed (github-issue-integration)

    // Server/Tunnel系 (3)
    'onRemoteServerStatusChanged',
    'onRemoteClientCountChanged',
    'onCloudflareTunnelStatusChanged',

    // File系 (2)
    'onGitChangesDetected',
    'onProjectFileChanged',

    // Schedule Task系 (1)
    'onScheduleTaskStatusChanged',

    // MCP系 (1)
    'onMcpStatusChanged',

    // Metrics系 (1)
    'onMetricsUpdated',

    // SSH系 (1)
    'onSshStatusChanged',

    // Menu系 (8)
    'onMenuOpenProject',
    'onMenuResetLayout',
    'onMenuInstallCli',
    'onMenuInstallCommandset',
    'onMenuInstallExperimentalDebug',
    'onMenuInstallExperimentalGemini',
    'onMenuSetCommandPrefix',
    'onMenuToggleRemoteServer',
  ];

  it(`should have all ${expectedSubscriptions.length} subscription procedures defined`, async () => {
    const { eventsRouter } = await import('../routers/events');
    const routerDef = (eventsRouter as any)._def;
    const procedureNames = Object.keys(routerDef.record || routerDef.procedures || {});

    for (const name of expectedSubscriptions) {
      expect(procedureNames, `Missing subscription: ${name}`).toContain(name);
    }
    expect(procedureNames.length).toBe(expectedSubscriptions.length);
  });
});

// ============================================================
// 9. Context内eventBusプロパティのテスト
// ============================================================

describe('Context - eventBus プロパティ', () => {
  it('should accept eventBus in ContextServices', async () => {
    const { createContext } = await import('../context');
    const { createEventBus } = await import('../services/eventBus');
    const bus = createEventBus();

    const ctx = createContext({ eventBus: bus });
    expect(ctx.services.eventBus).toBe(bus);
  });
});

// ============================================================
// ヘルパー: 統合テスト用 waitForCount ユーティリティ
// ============================================================

/**
 * tRPC Subscription を購読し、指定数のイベントを waitFor パターンで収集するヘルパー。
 * subscribeAndCollect とは異なり、subscribe後にemitFnを呼び、expectedCount個の
 * イベントが到着するまでpollingする。固定sleepは使用しない。
 */
async function subscribeAndCollectMultiple<T>(
  subscriptionFn: () => Promise<Observable<T, unknown>>,
  emitFn: () => void,
  expectedCount: number,
  options?: { timeout?: number },
): Promise<{ received: T[]; unsubscribe: () => void }> {
  const received: T[] = [];
  const obs = await subscriptionFn();
  const sub = obs.subscribe({
    next: (data: T) => received.push(data),
  });

  // イベント発火
  emitFn();

  // waitForパターン: 指定数のデータ受信を待つ
  const timeout = options?.timeout ?? 500;
  const start = Date.now();
  while (received.length < expectedCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return { received, unsubscribe: () => sub.unsubscribe() };
}

// ============================================================
// 10. 統合テスト: Agent出力イベントの詳細検証 (Task 9.3 - 高優先度)
// ============================================================

describe('統合テスト - Agent出力イベント配信', () => {
  it('Agent stdout出力がSubscription経由で正しいペイロードで配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      agentId: 'agent-integration-1',
      stream: 'stdout',
      data: 'Phase: requirements\nProcessing spec...',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentOutput(),
      () => bus.emit(EVENT_NAMES.AGENT_OUTPUT, payload),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
    expect(received[0]).toHaveProperty('agentId', 'agent-integration-1');
    expect(received[0]).toHaveProperty('stream', 'stdout');
    expect(received[0]).toHaveProperty('data');
    unsubscribe();
  });

  it('Agent stderr出力がSubscription経由で配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      agentId: 'agent-err-1',
      stream: 'stderr',
      data: 'Warning: deprecated API usage',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentOutput(),
      () => bus.emit(EVENT_NAMES.AGENT_OUTPUT, payload),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
    unsubscribe();
  });

  it('連続した複数のAgent出力イベントが全て配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const events = [
      { agentId: 'agent-burst-1', stream: 'stdout', data: 'line 1' },
      { agentId: 'agent-burst-1', stream: 'stdout', data: 'line 2' },
      { agentId: 'agent-burst-1', stream: 'stdout', data: 'line 3' },
    ];

    const { received, unsubscribe } = await subscribeAndCollectMultiple(
      () => callerFactory(ctx).events.onAgentOutput(),
      () => {
        for (const event of events) {
          bus.emit(EVENT_NAMES.AGENT_OUTPUT, event);
        }
      },
      3,
    );

    expect(received).toHaveLength(3);
    expect(received[0]).toEqual(events[0]);
    expect(received[1]).toEqual(events[1]);
    expect(received[2]).toEqual(events[2]);
    unsubscribe();
  });

  it('AgentStartErrorイベントがエラー詳細と共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      agentId: 'agent-fail-1',
      specId: 'test-spec',
      error: { code: 'SPAWN_ERROR', message: 'Claude CLI not found' },
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentStartError(),
      () => bus.emit(EVENT_NAMES.AGENT_START_ERROR, payload),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
    unsubscribe();
  });

  it('AgentExitErrorイベントがエラーメッセージと共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      agentId: 'agent-exit-1',
      error: 'Process exited with code 1',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentExitError(),
      () => bus.emit(EVENT_NAMES.AGENT_EXIT_ERROR, payload),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
    unsubscribe();
  });

  it('AgentRecordChangedイベントが変更種別と共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      type: 'added',
      data: { agentId: 'agent-new-1', specId: 'my-feature', status: 'running' },
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAgentRecordChanged(),
      () => bus.emit(EVENT_NAMES.AGENT_RECORD_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: 'added' });
    unsubscribe();
  });
});

// ============================================================
// 11. 統合テスト: Spec変更イベントの詳細検証 (Task 9.3 - 高優先度)
// ============================================================

describe('統合テスト - Spec変更イベント配信', () => {
  it('Spec一覧更新イベントがペイロード詳細と共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      type: 'update',
      specs: [
        { name: 'trpc-migration', phase: 'tasks-generated' },
        { name: 'new-feature', phase: 'requirements' },
      ],
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onSpecsChanged(),
      () => bus.emit(EVENT_NAMES.SPECS_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: 'update' });
    expect((received[0] as any).specs).toHaveLength(2);
    unsubscribe();
  });

  it('Bugs変更イベントがバグ一覧付きで配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      type: 'update',
      bugs: [
        { name: 'fix-login', status: 'reported' },
        { name: 'fix-crash', status: 'analyzing' },
      ],
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onBugsChanged(),
      () => bus.emit(EVENT_NAMES.BUGS_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).bugs).toHaveLength(2);
    unsubscribe();
  });

  // startup-project-selection-race-condition: onProjectSelected test removed (Pull model)
});

// ============================================================
// 12. 統合テスト: AutoExecution状態変更イベント (Task 9.3 - 高優先度)
// ============================================================

describe('統合テスト - AutoExecution状態変更イベント', () => {
  it('AutoExecution開始時のステータス変更が配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      specPath: '/project/.kiro/specs/my-feature',
      specId: 'my-feature',
      status: 'running',
      currentPhase: 'requirements',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAutoExecutionStatusChanged(),
      () => bus.emit(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).status).toBe('running');
    expect((received[0] as any).specId).toBe('my-feature');
    unsubscribe();
  });

  it('AutoExecutionフェーズ開始/完了イベントが順番に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    // フェーズ開始イベント
    const phaseStarted = {
      specPath: '/project/.kiro/specs/test',
      phase: 'design',
      startedAt: '2026-02-06T09:00:00Z',
    };

    const { received: startReceived, unsubscribe: unsubStart } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAutoExecutionPhaseStarted(),
      () => bus.emit(EVENT_NAMES.AUTO_EXECUTION_PHASE_STARTED, phaseStarted),
    );

    expect(startReceived).toHaveLength(1);
    expect((startReceived[0] as any).phase).toBe('design');
    unsubStart();

    // フェーズ完了イベント
    const phaseCompleted = {
      specPath: '/project/.kiro/specs/test',
      phase: 'design',
      completedAt: '2026-02-06T09:05:00Z',
      success: true,
    };

    const { received: completedReceived, unsubscribe: unsubComplete } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAutoExecutionPhaseCompleted(),
      () => bus.emit(EVENT_NAMES.AUTO_EXECUTION_PHASE_COMPLETED, phaseCompleted),
    );

    expect(completedReceived).toHaveLength(1);
    expect((completedReceived[0] as any).phase).toBe('design');
    expect((completedReceived[0] as any).success).toBe(true);
    unsubComplete();
  });

  it('AutoExecutionエラーイベントがエラー詳細と共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      specPath: '/project/.kiro/specs/test',
      error: 'Agent process exited unexpectedly',
      phase: 'impl',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAutoExecutionError(),
      () => bus.emit(EVENT_NAMES.AUTO_EXECUTION_ERROR, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).error).toBe('Agent process exited unexpectedly');
    unsubscribe();
  });

  it('AutoExecution完了イベントが結果と共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      specPath: '/project/.kiro/specs/test',
      specId: 'test',
      success: true,
      executedPhases: ['requirements', 'design', 'tasks', 'impl'],
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onAutoExecutionCompleted(),
      () => bus.emit(EVENT_NAMES.AUTO_EXECUTION_COMPLETED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).success).toBe(true);
    expect((received[0] as any).executedPhases).toHaveLength(4);
    unsubscribe();
  });
});

// BugAutoExecution integration tests removed (github-issue-integration)















































































































































// ============================================================
// 14. 統合テスト: ファイルイベント配信 (Task 9.3)
// ============================================================

describe('統合テスト - ファイルイベント配信', () => {
  it('GitChangesDetectedイベントがファイルリスト付きで配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    // multi-window-integration: provide matching projectPath for window-based filtering
    const ctx = createContext({ eventBus: bus, getCurrentProjectPath: () => '/project' });

    const payload = {
      projectPath: '/project',
      files: [
        { path: 'src/main.ts', status: 'modified' },
        { path: 'src/new-file.ts', status: 'added' },
      ],
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onGitChangesDetected(),
      () => bus.emit(EVENT_NAMES.GIT_CHANGES_DETECTED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).files).toHaveLength(2);
    unsubscribe();
  });

  it('ProjectFileChangedイベントが変更パス付きで配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      type: 'change',
      path: '.kiro/specs/my-feature/tasks.md',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onProjectFileChanged(),
      () => bus.emit(EVENT_NAMES.PROJECT_FILE_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).type).toBe('change');
    expect((received[0] as any).path).toContain('tasks.md');
    unsubscribe();
  });
});

// ============================================================
// 15. 統合テスト: 複数Subscriberが同一イベントを受信 (Task 9.3)
// ============================================================

describe('統合テスト - 複数Subscriberの同時受信', () => {
  it('複数のSubscriberが同一イベントを全て受信すること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const received1: unknown[] = [];
    const received2: unknown[] = [];
    const received3: unknown[] = [];

    // 3つのSubscriberを設定
    const obs1 = await callerFactory(ctx).events.onAgentOutput();
    const sub1 = obs1.subscribe({ next: (data) => received1.push(data) });

    const obs2 = await callerFactory(ctx).events.onAgentOutput();
    const sub2 = obs2.subscribe({ next: (data) => received2.push(data) });

    const obs3 = await callerFactory(ctx).events.onAgentOutput();
    const sub3 = obs3.subscribe({ next: (data) => received3.push(data) });

    // イベント発火
    const payload = { agentId: 'agent-multi', stream: 'stdout', data: 'broadcast test' };
    bus.emit(EVENT_NAMES.AGENT_OUTPUT, payload);

    // waitForパターン: 全Subscriberがデータを受信するまで待つ
    const timeout = 500;
    const start = Date.now();
    while (
      (received1.length === 0 || received2.length === 0 || received3.length === 0) &&
      Date.now() - start < timeout
    ) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
    expect(received3).toHaveLength(1);
    expect(received1[0]).toEqual(payload);
    expect(received2[0]).toEqual(payload);
    expect(received3[0]).toEqual(payload);

    sub1.unsubscribe();
    sub2.unsubscribe();
    sub3.unsubscribe();
  });
});

// ============================================================
// 16. 統合テスト: Cleanup（unsubscribe後のイベント不達）(Task 9.3)
// ============================================================

describe('統合テスト - Cleanup・unsubscribe動作', () => {
  it('unsubscribe後にイベントが配信されないこと', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const received: unknown[] = [];
    const obs = await callerFactory(ctx).events.onSpecsChanged();
    const sub = obs.subscribe({ next: (data) => received.push(data) });

    // 1回目: 正常配信
    bus.emit(EVENT_NAMES.SPECS_CHANGED, { type: 'update', specs: [{ name: 'spec-1' }] });
    const start1 = Date.now();
    while (received.length === 0 && Date.now() - start1 < 200) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(received).toHaveLength(1);

    // unsubscribe
    sub.unsubscribe();

    // 2回目: unsubscribe後は配信されない
    bus.emit(EVENT_NAMES.SPECS_CHANGED, { type: 'update', specs: [{ name: 'spec-2' }] });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(received).toHaveLength(1); // 変化なし
  });

  it('複数Subscriptionのうち1つをunsubscribeしても他は継続すること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const received1: unknown[] = [];
    const received2: unknown[] = [];

    const obs1 = await callerFactory(ctx).events.onAutoExecutionStatusChanged();
    const sub1 = obs1.subscribe({ next: (data) => received1.push(data) });

    const obs2 = await callerFactory(ctx).events.onAutoExecutionStatusChanged();
    const sub2 = obs2.subscribe({ next: (data) => received2.push(data) });

    // 1回目: 両方受信
    bus.emit(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED, { status: 'running' });
    const start1 = Date.now();
    while ((received1.length === 0 || received2.length === 0) && Date.now() - start1 < 200) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);

    // sub1のみunsubscribe
    sub1.unsubscribe();

    // 2回目: sub2のみ受信
    bus.emit(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED, { status: 'completed' });
    const start2 = Date.now();
    while (received2.length < 2 && Date.now() - start2 < 200) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(received1).toHaveLength(1); // 変化なし
    expect(received2).toHaveLength(2);
    expect((received2[1] as any).status).toBe('completed');

    sub2.unsubscribe();
  });

  it('全Subscriberをunsubscribeした後にEventEmitterリスナーが残らないこと', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const initialCount = bus.listenerCount(EVENT_NAMES.SPECS_CHANGED);

    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    // 3つのSubscriptionを作成
    const obs1 = await callerFactory(ctx).events.onSpecsChanged();
    const sub1 = obs1.subscribe({ next: () => {} });
    const obs2 = await callerFactory(ctx).events.onSpecsChanged();
    const sub2 = obs2.subscribe({ next: () => {} });
    const obs3 = await callerFactory(ctx).events.onSpecsChanged();
    const sub3 = obs3.subscribe({ next: () => {} });

    expect(bus.listenerCount(EVENT_NAMES.SPECS_CHANGED)).toBe(initialCount + 3);

    // 全てunsubscribe
    sub1.unsubscribe();
    sub2.unsubscribe();
    sub3.unsubscribe();

    expect(bus.listenerCount(EVENT_NAMES.SPECS_CHANGED)).toBe(initialCount);
  });
});

// ============================================================
// 17. 統合テスト: EventBus未設定時のグレースフルデグレーション (Task 9.3)
// ============================================================

describe('統合テスト - EventBus未設定時の動作', () => {
  it('eventBusがundefinedの場合、Subscriptionは安全にno-opとなること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');

    // eventBus未設定のコンテキスト
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({}); // eventBusなし

    const received: unknown[] = [];
    const obs = await callerFactory(ctx).events.onAgentOutput();
    const sub = obs.subscribe({ next: (data) => received.push(data) });

    // 少し待機しても何も配信されないことを確認
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(received).toHaveLength(0);

    sub.unsubscribe();
  });
});

// ============================================================
// 18. 統合テスト: 異なるイベント種別の独立性 (Task 9.3)
// ============================================================

describe('統合テスト - イベント種別の独立性', () => {
  it('異なるSubscriptionは互いのイベントを受信しないこと', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const agentReceived: unknown[] = [];
    const specReceived: unknown[] = [];

    const obs1 = await callerFactory(ctx).events.onAgentOutput();
    const sub1 = obs1.subscribe({ next: (data) => agentReceived.push(data) });

    const obs2 = await callerFactory(ctx).events.onSpecsChanged();
    const sub2 = obs2.subscribe({ next: (data) => specReceived.push(data) });

    // Agent出力イベントのみ発火
    bus.emit(EVENT_NAMES.AGENT_OUTPUT, { agentId: 'a1', stream: 'stdout', data: 'test' });

    const start1 = Date.now();
    while (agentReceived.length === 0 && Date.now() - start1 < 200) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Agentのみ受信、Specは受信しない
    expect(agentReceived).toHaveLength(1);
    expect(specReceived).toHaveLength(0);

    // Spec変更イベントのみ発火
    bus.emit(EVENT_NAMES.SPECS_CHANGED, { type: 'update', specs: [] });

    const start2 = Date.now();
    while (specReceived.length === 0 && Date.now() - start2 < 200) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Specのみ追加受信、Agentは変化なし
    expect(agentReceived).toHaveLength(1);
    expect(specReceived).toHaveLength(1);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });
});

// ============================================================
// 19. 統合テスト: Server/Tunnel/Metricsイベントの詳細検証 (Task 9.3)
// ============================================================

describe('統合テスト - Server/Tunnel/Metricsイベント', () => {
  it('RemoteClientCountChangedイベントがクライアント数と共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = { count: 3 };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onRemoteClientCountChanged(),
      () => bus.emit(EVENT_NAMES.REMOTE_CLIENT_COUNT_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).count).toBe(3);
    unsubscribe();
  });

  it('CloudflareTunnelStatusChangedイベントがステータスとURL付きで配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      status: 'connected',
      url: 'https://my-tunnel.trycloudflare.com',
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onCloudflareTunnelStatusChanged(),
      () => bus.emit(EVENT_NAMES.CLOUDFLARE_TUNNEL_STATUS_CHANGED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).status).toBe('connected');
    expect((received[0] as any).url).toContain('trycloudflare.com');
    unsubscribe();
  });

  it('MetricsUpdatedイベントがメトリクスデータと共に配信されること', async () => {
    const { eventsRouter } = await import('../routers/events');
    const { createContext } = await import('../context');
    const { router } = await import('../trpc');
    const { createEventBus, EVENT_NAMES } = await import('../services/eventBus');

    const bus = createEventBus();
    const testRouter = router({ events: eventsRouter });
    const callerFactory = createCallerFactory()(testRouter);
    const ctx = createContext({ eventBus: bus });

    const payload = {
      totalAgents: 5,
      runningAgents: 2,
      cpuUsage: 45.3,
      memoryUsage: 1024,
    };

    const { received, unsubscribe } = await subscribeAndCollect(
      () => callerFactory(ctx).events.onMetricsUpdated(),
      () => bus.emit(EVENT_NAMES.METRICS_UPDATED, payload),
    );

    expect(received).toHaveLength(1);
    expect((received[0] as any).totalAgents).toBe(5);
    expect((received[0] as any).runningAgents).toBe(2);
    unsubscribe();
  });
});

// ============================================================
// 20. 統合テスト: Zodスキーマエクスポート検証 (Task 9.3)
// ============================================================

describe('統合テスト - Zodスキーマエクスポートの検証', () => {
  it('主要なZodスキーマがevents.tsからエクスポートされていること', async () => {
    const events = await import('../routers/events');

    // Agent系スキーマ
    expect(events.agentOutputSchema).toBeDefined();
    expect(events.agentStatusChangeSchema).toBeDefined();
    expect(events.agentLogSchema).toBeDefined();
    expect(events.agentStartErrorSchema).toBeDefined();
    expect(events.agentExitErrorSchema).toBeDefined();
    expect(events.agentRecordChangedSchema).toBeDefined();

    // Spec/Bug系スキーマ
    expect(events.specsChangedSchema).toBeDefined();
    expect(events.bugsChangedSchema).toBeDefined();
    // startup-project-selection-race-condition: projectSelectedSchema removed (Pull model)

    // AutoExecution系スキーマ
    expect(events.autoExecutionStatusChangedSchema).toBeDefined();
    expect(events.autoExecutionPhaseEventSchema).toBeDefined();
    expect(events.autoExecutionErrorSchema).toBeDefined();
    expect(events.autoExecutionCompletedSchema).toBeDefined();

    // BugAutoExecution系スキーマ removed (github-issue-integration)

    // Server/Tunnel系スキーマ
    expect(events.serverStatusSchema).toBeDefined();
    expect(events.clientCountSchema).toBeDefined();
    expect(events.tunnelStatusSchema).toBeDefined();

    // File系スキーマ
    expect(events.gitChangeSchema).toBeDefined();
    expect(events.projectFileChangeSchema).toBeDefined();

    // その他スキーマ
    expect(events.scheduleTaskStatusSchema).toBeDefined();
    expect(events.mcpStatusSchema).toBeDefined();
    expect(events.metricsUpdateSchema).toBeDefined();
    expect(events.sshStatusSchema).toBeDefined();

    // Menu系スキーマ
    expect(events.menuOpenProjectSchema).toBeDefined();
    expect(events.menuVoidSchema).toBeDefined();
    expect(events.menuSetCommandPrefixSchema).toBeDefined();
  });

  it('agentOutputSchemaがZodスキーマとしてparseできること', async () => {
    const { agentOutputSchema } = await import('../routers/events');
    const valid = { agentId: 'a1', stream: 'stdout', data: 'test output' };
    const result = agentOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('agentOutputSchemaが不正な入力をrejectすること', async () => {
    const { agentOutputSchema } = await import('../routers/events');
    const invalid = { agentId: 123, stream: 'stdout' }; // agentIdは数値、dataが欠けている
    const result = agentOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('agentStatusChangeSchemaがZodスキーマとしてparseできること', async () => {
    const { agentStatusChangeSchema } = await import('../routers/events');
    const valid = { agentId: 'a1', status: 'running' };
    const result = agentStatusChangeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('menuOpenProjectSchemaがZodスキーマとしてparseできること', async () => {
    const { menuOpenProjectSchema } = await import('../routers/events');
    const valid = { projectPath: '/path/to/project' };
    const result = menuOpenProjectSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('menuOpenProjectSchemaがパス欠落をrejectすること', async () => {
    const { menuOpenProjectSchema } = await import('../routers/events');
    const invalid = {};
    const result = menuOpenProjectSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
