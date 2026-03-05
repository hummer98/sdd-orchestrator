/**
 * Events Router Filtering - ウィンドウ別イベントフィルタリングのユニットテスト
 * multi-window-integration Task 4.3, 4.4
 * Requirements: 4.2, 4.3, 4.4
 *
 * テスト方針:
 * - プロジェクトスコープイベント: 同一projectPathのウィンドウにのみ配信
 * - プロジェクトスコープイベント: 異なるprojectPathのウィンドウには配信されない
 * - アプリスコープイベント: 全ウィンドウに配信
 * - projectPathがnullのイベント: 全ウィンドウに配信（安全策）
 *
 * events.ts の createFilteredEventSubscription を使用して、
 * Subscription内でのフィルタリング動作を検証する。
 */
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { createCallerFactory } from '@trpc/server';
import type { Observable } from '@trpc/server/observable';
import { createEventBus, EVENT_NAMES } from '../services/eventBus';
import { createMockServices, createTestContext } from '../helpers/test-helpers';
import { appRouter } from '../router';

// ============================================================
// ヘルパー: Subscriptionテスト用ユーティリティ
// ============================================================

/**
 * tRPC caller subscription の結果（Observable）を subscribe し、
 * EventBus にイベントを発火して受信を確認するヘルパー。
 */
async function subscribeAndCollect<T>(
  subscriptionFn: () => Promise<Observable<T, unknown>>,
  emitFn: () => void,
  options?: { timeout?: number; expectCount?: number },
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
  const expectCount = options?.expectCount ?? 1;
  const start = Date.now();
  while (received.length < expectCount && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  return { received, unsubscribe: () => sub.unsubscribe() };
}

// ============================================================
// Task 4.3/4.4: ウィンドウ別フィルタリングテスト
// ============================================================

const callerFactory = createCallerFactory()(appRouter);

describe('Task 4.3/4.4: プロジェクトスコープイベントのウィンドウ別フィルタリング', () => {
  it('同一projectPathのウィンドウにはSPECS_CHANGEDが配信されること', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onSpecsChanged() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.SPECS_CHANGED, { projectPath: '/project/A', specs: [] }),
    );

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ projectPath: '/project/A', specs: [] });
    unsubscribe();
  });

  it('異なるprojectPathのウィンドウにはSPECS_CHANGEDが配信されないこと', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/B'),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onSpecsChanged() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.SPECS_CHANGED, { projectPath: '/project/A', specs: [] }),
      { timeout: 150, expectCount: 0 },
    );

    expect(received.length).toBe(0);
    unsubscribe();
  });

  it('同一projectPathのウィンドウにはAGENT_OUTPUTが配信されること', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );

    const payload = { agentId: 'agent-1', stream: 'stdout', data: 'hello', projectPath: '/project/A' };
    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onAgentOutput() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.AGENT_OUTPUT, payload),
    );

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(payload);
    unsubscribe();
  });

  it('異なるprojectPathのウィンドウにはAGENT_OUTPUTが配信されないこと', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/B'),
      }),
    );

    const payload = { agentId: 'agent-1', stream: 'stdout', data: 'hello', projectPath: '/project/A' };
    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onAgentOutput() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.AGENT_OUTPUT, payload),
      { timeout: 150, expectCount: 0 },
    );

    expect(received.length).toBe(0);
    unsubscribe();
  });

  it('BUGS_CHANGEDがフィルタリングされること', async () => {
    const eventBus = createEventBus();
    const callerA = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );
    const callerB = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/B'),
      }),
    );

    const receivedA: any[] = [];
    const receivedB: any[] = [];

    const obsA = await (callerA.events.onBugsChanged() as Promise<Observable<any, unknown>>);
    const obsB = await (callerB.events.onBugsChanged() as Promise<Observable<any, unknown>>);
    const subA = obsA.subscribe({ next: (d: any) => receivedA.push(d) });
    const subB = obsB.subscribe({ next: (d: any) => receivedB.push(d) });

    // プロジェクトAのイベントを発火
    eventBus.emit(EVENT_NAMES.BUGS_CHANGED, { projectPath: '/project/A', bugs: ['bug-1'] });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedA.length).toBe(1);
    expect(receivedB.length).toBe(0);

    subA.unsubscribe();
    subB.unsubscribe();
  });
});

describe('Task 4.3/4.4: アプリスコープイベントのブロードキャスト', () => {
  it('REMOTE_SERVER_STATUS_CHANGEDが全ウィンドウに配信されること', async () => {
    const eventBus = createEventBus();
    const callerA = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );
    const callerB = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/B'),
      }),
    );

    const receivedA: any[] = [];
    const receivedB: any[] = [];

    const obsA = await (callerA.events.onRemoteServerStatusChanged() as Promise<Observable<any, unknown>>);
    const obsB = await (callerB.events.onRemoteServerStatusChanged() as Promise<Observable<any, unknown>>);
    const subA = obsA.subscribe({ next: (d: any) => receivedA.push(d) });
    const subB = obsB.subscribe({ next: (d: any) => receivedB.push(d) });

    eventBus.emit(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED, { running: true, port: 3000 });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedA.length).toBe(1);
    expect(receivedB.length).toBe(1);

    subA.unsubscribe();
    subB.unsubscribe();
  });

  it('MCP_STATUS_CHANGEDがprojectPath不一致のウィンドウにも配信されること', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onMcpStatusChanged() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.MCP_STATUS_CHANGED, { isRunning: true, port: 3001, url: 'http://localhost:3001' }),
    );

    expect(received.length).toBe(1);
    unsubscribe();
  });

  it('MENU_OPEN_PROJECTが全ウィンドウに配信されること', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onMenuOpenProject() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.MENU_OPEN_PROJECT, { projectPath: '/project/B' }),
    );

    expect(received.length).toBe(1);
    unsubscribe();
  });
});

describe('Task 4.3/4.4: projectPathがnullのイベント（移行期間の安全策）', () => {
  it('projectPathがnullのプロジェクトスコープイベントは全ウィンドウに配信されること', async () => {
    const eventBus = createEventBus();
    const callerA = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );
    const callerB = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/B'),
      }),
    );

    const receivedA: any[] = [];
    const receivedB: any[] = [];

    const obsA = await (callerA.events.onSpecsChanged() as Promise<Observable<any, unknown>>);
    const obsB = await (callerB.events.onSpecsChanged() as Promise<Observable<any, unknown>>);
    const subA = obsA.subscribe({ next: (d: any) => receivedA.push(d) });
    const subB = obsB.subscribe({ next: (d: any) => receivedB.push(d) });

    // projectPathなしでイベント発火（移行期間の安全策）
    eventBus.emit(EVENT_NAMES.SPECS_CHANGED, { specs: ['spec-1'] });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedA.length).toBe(1);
    expect(receivedB.length).toBe(1);

    subA.unsubscribe();
    subB.unsubscribe();
  });

  it('projectPathがundefinedのプロジェクトスコープイベントは全ウィンドウに配信されること', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onAgentOutput() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.AGENT_OUTPUT, { agentId: 'a1', stream: 'stdout', data: 'test' }),
    );

    // projectPathがundefined → 全ウィンドウに配信
    expect(received.length).toBe(1);
    unsubscribe();
  });
});

describe('Task 4.3/4.4: プロジェクト未選択ウィンドウのフィルタリング', () => {
  it('プロジェクト未選択ウィンドウにはプロジェクトスコープイベントが配信されないこと', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onSpecsChanged() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.SPECS_CHANGED, { projectPath: '/project/A', specs: [] }),
      { timeout: 150, expectCount: 0 },
    );

    expect(received.length).toBe(0);
    unsubscribe();
  });

  it('プロジェクト未選択ウィンドウにもアプリスコープイベントは配信されること', async () => {
    const eventBus = createEventBus();
    const caller = callerFactory(
      createTestContext({
        eventBus,
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      }),
    );

    const { received, unsubscribe } = await subscribeAndCollect(
      () => caller.events.onRemoteServerStatusChanged() as Promise<Observable<any, unknown>>,
      () => eventBus.emit(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED, { running: true }),
    );

    expect(received.length).toBe(1);
    unsubscribe();
  });
});
