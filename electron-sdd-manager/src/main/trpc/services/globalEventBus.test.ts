/**
 * GlobalEventBus Tests
 * Task 9.2: グローバルEventBusシングルトンのテスト
 * Requirements: 8.3, 8.4
 *
 * Main Process全体で共有されるEventBusシングルトンのテスト。
 * tRPC Subscriptionのイベント配信元として機能する。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getGlobalEventBus, resetGlobalEventBus } from './globalEventBus';
import { EVENT_NAMES } from './eventBus';

describe('GlobalEventBus', () => {
  beforeEach(() => {
    resetGlobalEventBus();
  });

  it('should return an EventBus instance', () => {
    const bus = getGlobalEventBus();
    expect(bus).toBeDefined();
    expect(typeof bus.on).toBe('function');
    expect(typeof bus.emit).toBe('function');
    expect(typeof bus.removeListener).toBe('function');
  });

  it('should return the same instance on subsequent calls (singleton)', () => {
    const bus1 = getGlobalEventBus();
    const bus2 = getGlobalEventBus();
    expect(bus1).toBe(bus2);
  });

  it('should create a new instance after reset', () => {
    const bus1 = getGlobalEventBus();
    resetGlobalEventBus();
    const bus2 = getGlobalEventBus();
    expect(bus1).not.toBe(bus2);
  });

  it('should emit and receive events', () => {
    const bus = getGlobalEventBus();
    const received: unknown[] = [];

    bus.on(EVENT_NAMES.AGENT_OUTPUT, (data: unknown) => {
      received.push(data);
    });

    const testData = { agentId: 'test-1', stream: 'stdout', data: 'hello' };
    bus.emit(EVENT_NAMES.AGENT_OUTPUT, testData);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(testData);
  });

  it('should support multiple listeners for the same event', () => {
    const bus = getGlobalEventBus();
    let count = 0;

    bus.on(EVENT_NAMES.SPECS_CHANGED, () => { count++; });
    bus.on(EVENT_NAMES.SPECS_CHANGED, () => { count++; });

    bus.emit(EVENT_NAMES.SPECS_CHANGED, {});

    expect(count).toBe(2);
  });

  it('should not affect listeners after reset', () => {
    const bus1 = getGlobalEventBus();
    let called = false;

    bus1.on(EVENT_NAMES.AGENT_OUTPUT, () => { called = true; });

    resetGlobalEventBus();

    const bus2 = getGlobalEventBus();
    bus2.emit(EVENT_NAMES.AGENT_OUTPUT, {});

    // Listener was on bus1, not bus2
    expect(called).toBe(false);
  });
});
