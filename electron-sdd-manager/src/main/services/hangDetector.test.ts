/**
 * HangDetector Tests
 * Requirements: 5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HangDetector } from './hangDetector';
import { AgentRegistry, AgentInfo } from './agentRegistry';

describe('HangDetector', () => {
  let registry: AgentRegistry;
  let detector: HangDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new AgentRegistry();
    detector = new HangDetector(registry);
  });

  afterEach(() => {
    detector.stop();
    vi.useRealTimers();
  });

  // Task 25.1: 定期チェックタイマー
  describe('start/stop', () => {
    it('should start hang detection timer', () => {
      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000); // 5 min threshold, 1 min interval

      // Should not trigger yet
      expect(callback).not.toHaveBeenCalled();
    });

    it('should stop hang detection timer', () => {
      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000);
      detector.stop();

      // Advance time beyond interval
      vi.advanceTimersByTime(120000);

      // Should not trigger after stop
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('hang detection', () => {
    it('should detect hanging agents', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Register an agent with old lastActivityAt
      const hangingAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(), // 10 min ago
        lastActivityAt: new Date(now - 600000).toISOString(), // 10 min ago
        command: 'claude',
      };

      registry.register(hangingAgent);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000); // 5 min threshold, 1 min interval

      // Advance time by 1 minute (interval)
      vi.advanceTimersByTime(60000);

      // Should detect the hanging agent
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        agentId: 'agent-001',
      }));
    });

    it('should not detect active agents', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Register an active agent
      const activeAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 120000).toISOString(), // 2 min ago
        lastActivityAt: new Date(now - 60000).toISOString(), // 1 min ago
        command: 'claude',
      };

      registry.register(activeAgent);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000); // 5 min threshold, 1 min interval

      // Advance time by 1 minute (interval)
      vi.advanceTimersByTime(60000);

      // Should not detect the active agent
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not detect completed agents', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Register a completed agent with old lastActivityAt
      const completedAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'completed',
        startedAt: new Date(now - 600000).toISOString(), // 10 min ago
        lastActivityAt: new Date(now - 600000).toISOString(), // 10 min ago
        command: 'claude',
      };

      registry.register(completedAgent);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000);

      vi.advanceTimersByTime(60000);

      // Should not detect completed agents
      expect(callback).not.toHaveBeenCalled();
    });

    it('should update agent status to hang when detected', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const hangingAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(),
        lastActivityAt: new Date(now - 600000).toISOString(),
        command: 'claude',
      };

      registry.register(hangingAgent);

      detector.start(300000, 60000);
      vi.advanceTimersByTime(60000);

      // Check that status was updated
      const agent = registry.get('agent-001');
      expect(agent?.status).toBe('hang');
    });

    it('should only detect each hanging agent once', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const hangingAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(),
        lastActivityAt: new Date(now - 600000).toISOString(),
        command: 'claude',
      };

      registry.register(hangingAgent);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(300000, 60000);

      // Advance by multiple intervals
      vi.advanceTimersByTime(60000);
      vi.advanceTimersByTime(60000);
      vi.advanceTimersByTime(60000);

      // Should only be called once (status changes to 'hang' after first detection)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('setThreshold', () => {
    it('should update threshold', () => {
      detector.setThreshold(600000); // 10 minutes

      const now = Date.now();
      vi.setSystemTime(now);

      // Agent hanging for 7 minutes (below new threshold)
      const agent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-001',
        status: 'running',
        startedAt: new Date(now - 420000).toISOString(), // 7 min ago
        lastActivityAt: new Date(now - 420000).toISOString(), // 7 min ago
        command: 'claude',
      };

      registry.register(agent);

      const callback = vi.fn();
      detector.onHangDetected(callback);
      detector.start(600000, 60000);

      vi.advanceTimersByTime(60000);

      // Should not detect (7 min < 10 min threshold)
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
