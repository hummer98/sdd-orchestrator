/**
 * Tests for AgentRegistry
 * Requirements: 1.3, 5.4, 6.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from './agentRegistry';
import type { AgentHandle } from './agentHandle';

// Mock AgentHandle for testing
const createMockHandle = (partial: Partial<AgentHandle>): AgentHandle => {
  return {
    agentId: 'test-agent',
    specId: 'test-spec',
    phase: 'impl',
    pid: 1234,
    sessionId: 'session-1',
    state: 'running',
    isReattached: false,
    startedAt: new Date().toISOString(),
    processStartTime: null,
    exitReason: null,
    onOutput: () => {},
    onExit: () => {},
    onError: () => {},
    ...partial,
  };
};

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register and get', () => {
    it('should register and retrieve an agent', () => {
      const handle = createMockHandle({ agentId: 'agent-1' });
      registry.register(handle);

      const retrieved = registry.get('agent-1');
      expect(retrieved).toBe(handle);
    });

    it('should return undefined for non-existent agent', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should overwrite existing agent on re-register', () => {
      const handle1 = createMockHandle({ agentId: 'agent-1', pid: 1234 });
      const handle2 = createMockHandle({ agentId: 'agent-1', pid: 5678 });

      registry.register(handle1);
      registry.register(handle2);

      const retrieved = registry.get('agent-1');
      expect(retrieved?.pid).toBe(5678);
    });
  });

  describe('unregister', () => {
    it('should remove an agent', () => {
      const handle = createMockHandle({ agentId: 'agent-1' });
      registry.register(handle);

      registry.unregister('agent-1');
      expect(registry.get('agent-1')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent agent', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no agents', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered agents', () => {
      const handle1 = createMockHandle({ agentId: 'agent-1' });
      const handle2 = createMockHandle({ agentId: 'agent-2' });
      const handle3 = createMockHandle({ agentId: 'agent-3' });

      registry.register(handle1);
      registry.register(handle2);
      registry.register(handle3);

      const all = registry.getAll();
      expect(all).toHaveLength(3);
      expect(all).toContain(handle1);
      expect(all).toContain(handle2);
      expect(all).toContain(handle3);
    });
  });

  describe('getBySpec', () => {
    it('should return empty array for spec with no agents', () => {
      expect(registry.getBySpec('non-existent-spec')).toEqual([]);
    });

    it('should return agents for specific spec', () => {
      const spec1Handle1 = createMockHandle({ agentId: 'agent-1', specId: 'spec-1' });
      const spec1Handle2 = createMockHandle({ agentId: 'agent-2', specId: 'spec-1' });
      const spec2Handle = createMockHandle({ agentId: 'agent-3', specId: 'spec-2' });

      registry.register(spec1Handle1);
      registry.register(spec1Handle2);
      registry.register(spec2Handle);

      const spec1Agents = registry.getBySpec('spec-1');
      expect(spec1Agents).toHaveLength(2);
      expect(spec1Agents).toContain(spec1Handle1);
      expect(spec1Agents).toContain(spec1Handle2);

      const spec2Agents = registry.getBySpec('spec-2');
      expect(spec2Agents).toHaveLength(1);
      expect(spec2Agents).toContain(spec2Handle);
    });
  });

  describe('registerReattached', () => {
    it('should register a reattached agent handle', () => {
      const record = {
        agentId: 'reattached-agent',
        specId: 'spec-1',
        phase: 'impl',
        pid: 1234,
        sessionId: 'session-1',
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude code',
        processStartTime: 'Mon Jan 27 10:00:00 2026',
      };

      registry.registerReattached(record);

      const handle = registry.get('reattached-agent');
      expect(handle).toBeDefined();
      expect(handle?.isReattached).toBe(true);
      expect(handle?.agentId).toBe('reattached-agent');
      expect(handle?.pid).toBe(1234);
    });
  });

  describe('clear', () => {
    it('should remove all agents', () => {
      const handle1 = createMockHandle({ agentId: 'agent-1' });
      const handle2 = createMockHandle({ agentId: 'agent-2' });

      registry.register(handle1);
      registry.register(handle2);

      expect(registry.getAll()).toHaveLength(2);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.get('agent-1')).toBeUndefined();
      expect(registry.get('agent-2')).toBeUndefined();
    });
  });
});
