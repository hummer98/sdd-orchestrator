/**
 * Integration Test: EventBus Filtering
 * multi-window-integration Task 9.2
 * Requirements: 4.2, 4.3, 4.4
 * Integration Point: Design.md "Test 2: EventBusフィルタリング"
 *
 * Tests that project-scoped events are only delivered to matching windows,
 * while app-scoped events are broadcast to all windows.
 *
 * Components under test:
 * - EventBus (real)
 * - events router with filtering (real)
 * - shouldDeliverEvent filter helper (real)
 * - tRPC Subscription observable (real)
 *
 * Mock boundaries:
 * - tRPC Subscription observer (mock observer for asserting next() calls)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import type { Observable } from '@trpc/server/observable';
import { appRouter } from '../router';
import { createEventBus, EVENT_NAMES } from '../services/eventBus';
import { createTestContext } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

// Mock projectLogger (needed by events router internals)
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================
// Test Helper: waitFor pattern
// ============================================================

/**
 * Wait for a condition to become true, polling at short intervals.
 * No fixed sleeps -- uses waitFor pattern as specified.
 */
async function waitFor(
  condition: () => boolean,
  { timeout = 500, interval = 5 } = {},
): Promise<void> {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Subscribe to a tRPC subscription and collect received data.
 * Returns received array and unsubscribe function.
 */
async function subscribeAndCollect<T>(
  subscriptionFn: () => Promise<Observable<T, unknown>>,
): Promise<{ received: T[]; unsubscribe: () => void }> {
  const received: T[] = [];
  const obs = await subscriptionFn();
  const sub = obs.subscribe({
    next: (data: T) => received.push(data),
  });
  return { received, unsubscribe: () => sub.unsubscribe() };
}

// ============================================================
// Integration Tests
// ============================================================

const callerFactory = createCallerFactory()(appRouter);

describe('Task 9.2: EventBusフィルタリングの統合テスト', () => {
  let eventBus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createEventBus();
  });

  describe('プロジェクトスコープイベントのウィンドウ別配信', () => {
    it('SPECS_CHANGEDがプロジェクトAのウィンドウにのみ配信されること', async () => {
      // Window A: project /project/A
      const callerA = callerFactory(
        createTestContext({
          eventBus,
          getCurrentProjectPath: vi.fn().mockReturnValue('/project/A'),
        }),
      );

      // Window B: project /project/B
      const callerB = callerFactory(
        createTestContext({
          eventBus,
          getCurrentProjectPath: vi.fn().mockReturnValue('/project/B'),
        }),
      );

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      // Emit project-scoped event for project A
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/A',
        specs: [{ name: 'feature-1' }],
      });

      // waitForパターン: ウィンドウAが受信するまで待つ
      await waitFor(() => subsA.received.length >= 1);

      // Short additional wait to ensure B doesn't receive
      await waitFor(() => subsB.received.length >= 1, { timeout: 100 });

      // Assertions
      expect(subsA.received.length).toBe(1);
      expect(subsA.received[0]).toEqual({
        projectPath: '/project/A',
        specs: [{ name: 'feature-1' }],
      });
      expect(subsB.received.length).toBe(0);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });

    it('AGENT_OUTPUTが対象プロジェクトのウィンドウにのみ配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onAgentOutput() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onAgentOutput() as Promise<
            Observable<any, unknown>
          >,
      );

      const payload = {
        agentId: 'agent-1',
        stream: 'stdout',
        data: 'implementation complete',
        projectPath: '/project/A',
      };
      eventBus.emit(EVENT_NAMES.AGENT_OUTPUT, payload);

      await waitFor(() => subsA.received.length >= 1);
      await waitFor(() => subsB.received.length >= 1, { timeout: 100 });

      expect(subsA.received.length).toBe(1);
      expect(subsA.received[0]).toEqual(payload);
      expect(subsB.received.length).toBe(0);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });

    it('AUTO_EXECUTION_STATUS_CHANGEDが対象プロジェクトにのみ配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onAutoExecutionStatusChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onAutoExecutionStatusChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      eventBus.emit(EVENT_NAMES.AUTO_EXECUTION_STATUS_CHANGED, {
        specPath: '/project/A/.kiro/specs/feature',
        state: { status: 'running' },
        projectPath: '/project/A',
      });

      await waitFor(() => subsA.received.length >= 1);
      await waitFor(() => subsB.received.length >= 1, { timeout: 100 });

      expect(subsA.received.length).toBe(1);
      expect(subsB.received.length).toBe(0);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });

    it('BUGS_CHANGEDがプロジェクトBのウィンドウにのみ配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onBugsChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onBugsChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      // Emit for project B this time
      eventBus.emit(EVENT_NAMES.BUGS_CHANGED, {
        projectPath: '/project/B',
        bugs: [{ name: 'bug-fix-1' }],
      });

      await waitFor(() => subsB.received.length >= 1);
      await waitFor(() => subsA.received.length >= 1, { timeout: 100 });

      expect(subsB.received.length).toBe(1);
      expect(subsA.received.length).toBe(0);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });
  });

  describe('アプリスコープイベントの全ウィンドウブロードキャスト', () => {
    it('REMOTE_SERVER_STATUS_CHANGEDが両ウィンドウに配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onRemoteServerStatusChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onRemoteServerStatusChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      eventBus.emit(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED, {
        running: true,
        port: 3000,
        url: 'http://localhost:3000',
      });

      await waitFor(
        () => subsA.received.length >= 1 && subsB.received.length >= 1,
      );

      expect(subsA.received.length).toBe(1);
      expect(subsB.received.length).toBe(1);
      // Both should receive the same data
      expect(subsA.received[0]).toEqual(subsB.received[0]);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });

    it('SSH_STATUS_CHANGEDが両ウィンドウに配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onSshStatusChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onSshStatusChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      eventBus.emit(EVENT_NAMES.SSH_STATUS_CHANGED, {
        connected: true,
        host: 'remote.server.com',
      });

      await waitFor(
        () => subsA.received.length >= 1 && subsB.received.length >= 1,
      );

      expect(subsA.received.length).toBe(1);
      expect(subsB.received.length).toBe(1);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });

    it('MENU_OPEN_PROJECTが両ウィンドウに配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onMenuOpenProject() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onMenuOpenProject() as Promise<
            Observable<any, unknown>
          >,
      );

      eventBus.emit(EVENT_NAMES.MENU_OPEN_PROJECT, {
        projectPath: '/project/C',
      });

      await waitFor(
        () => subsA.received.length >= 1 && subsB.received.length >= 1,
      );

      expect(subsA.received.length).toBe(1);
      expect(subsB.received.length).toBe(1);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });
  });

  describe('複合シナリオ: 複数イベント連続発火', () => {
    it('プロジェクトAの複数イベントがウィンドウAにのみ蓄積されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      // Emit 3 events for project A in sequence
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/A',
        specs: [{ name: 'spec-1' }],
      });
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/A',
        specs: [{ name: 'spec-2' }],
      });
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/A',
        specs: [{ name: 'spec-3' }],
      });

      await waitFor(() => subsA.received.length >= 3);
      await waitFor(() => subsB.received.length >= 1, { timeout: 100 });

      expect(subsA.received.length).toBe(3);
      expect(subsB.received.length).toBe(0);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });

    it('プロジェクトAとBのイベントが混在しても正しくルーティングされること', async () => {
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

      const specsA = await subscribeAndCollect(
        () =>
          callerA.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const specsB = await subscribeAndCollect(
        () =>
          callerB.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      // Interleave events for both projects
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/A',
        type: 'a1',
      });
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/B',
        type: 'b1',
      });
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/A',
        type: 'a2',
      });
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        projectPath: '/project/B',
        type: 'b2',
      });

      await waitFor(
        () =>
          specsA.received.length >= 2 && specsB.received.length >= 2,
      );

      expect(specsA.received.length).toBe(2);
      expect(specsB.received.length).toBe(2);

      // Verify correct routing
      expect(specsA.received[0]).toHaveProperty('type', 'a1');
      expect(specsA.received[1]).toHaveProperty('type', 'a2');
      expect(specsB.received[0]).toHaveProperty('type', 'b1');
      expect(specsB.received[1]).toHaveProperty('type', 'b2');

      specsA.unsubscribe();
      specsB.unsubscribe();
    });
  });

  describe('projectPathがnullのイベント（移行期間の安全策）', () => {
    it('projectPathなしのプロジェクトスコープイベントが全ウィンドウに配信されること', async () => {
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

      const subsA = await subscribeAndCollect(
        () =>
          callerA.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );
      const subsB = await subscribeAndCollect(
        () =>
          callerB.events.onSpecsChanged() as Promise<
            Observable<any, unknown>
          >,
      );

      // Emit WITHOUT projectPath (migration safety net)
      eventBus.emit(EVENT_NAMES.SPECS_CHANGED, {
        specs: [{ name: 'legacy-spec' }],
      });

      await waitFor(
        () => subsA.received.length >= 1 && subsB.received.length >= 1,
      );

      expect(subsA.received.length).toBe(1);
      expect(subsB.received.length).toBe(1);

      subsA.unsubscribe();
      subsB.unsubscribe();
    });
  });
});
