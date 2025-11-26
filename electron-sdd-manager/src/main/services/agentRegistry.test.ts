/**
 * AgentRegistry Tests
 * Requirements: 5.1, 5.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, AgentInfo, AgentStatus } from './agentRegistry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('should register a new agent', () => {
      const agent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(agent);

      const retrieved = registry.get('agent-001');
      expect(retrieved).toEqual(agent);
    });

    it('should overwrite existing agent with same id', () => {
      const agent1: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      const agent2: AgentInfo = {
        ...agent1,
        status: 'completed',
      };

      registry.register(agent1);
      registry.register(agent2);

      const retrieved = registry.get('agent-001');
      expect(retrieved?.status).toBe('completed');
    });
  });

  describe('unregister', () => {
    it('should remove an agent from registry', () => {
      const agent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(agent);
      registry.unregister('agent-001');

      expect(registry.get('agent-001')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent agent', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent agent', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getBySpec', () => {
    it('should return all agents for a given spec', () => {
      const agent1: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      const agent2: AgentInfo = {
        agentId: 'agent-002',
        specId: 'spec-a',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'completed',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude -p "/kiro:spec-design"',
      };

      const agent3: AgentInfo = {
        agentId: 'agent-003',
        specId: 'spec-b',
        phase: 'requirements',
        pid: 12347,
        sessionId: 'session-uuid-003',
        status: 'running',
        startedAt: '2025-11-26T10:02:00Z',
        lastActivityAt: '2025-11-26T10:02:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(agent1);
      registry.register(agent2);
      registry.register(agent3);

      const specAAgents = registry.getBySpec('spec-a');
      expect(specAAgents).toHaveLength(2);
      expect(specAAgents.map((a) => a.agentId)).toContain('agent-001');
      expect(specAAgents.map((a) => a.agentId)).toContain('agent-002');
    });

    it('should return empty array for spec with no agents', () => {
      const agents = registry.getBySpec('non-existent-spec');
      expect(agents).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all registered agents', () => {
      const agent1: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      const agent2: AgentInfo = {
        agentId: 'agent-002',
        specId: 'spec-b',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'completed',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude -p "/kiro:spec-design"',
      };

      registry.register(agent1);
      registry.register(agent2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no agents registered', () => {
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  // Task 20.2: Status update functionality
  describe('updateStatus', () => {
    it('should update agent status', () => {
      const agent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(agent);
      registry.updateStatus('agent-001', 'completed');

      const retrieved = registry.get('agent-001');
      expect(retrieved?.status).toBe('completed');
    });

    it('should not throw when updating non-existent agent', () => {
      expect(() => registry.updateStatus('non-existent', 'completed')).not.toThrow();
    });

    it('should support all status transitions', () => {
      const agent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(agent);

      const statuses: AgentStatus[] = ['completed', 'interrupted', 'hang', 'failed', 'running'];
      for (const status of statuses) {
        registry.updateStatus('agent-001', status);
        expect(registry.get('agent-001')?.status).toBe(status);
      }
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivityAt timestamp', () => {
      const agent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(agent);
      registry.updateActivity('agent-001');

      const retrieved = registry.get('agent-001');
      expect(retrieved?.lastActivityAt).not.toBe('2025-11-26T10:00:00Z');
      // Verify it's a valid ISO 8601 timestamp
      expect(() => new Date(retrieved!.lastActivityAt)).not.toThrow();
    });

    it('should not throw when updating non-existent agent', () => {
      expect(() => registry.updateActivity('non-existent')).not.toThrow();
    });
  });

  // Task 20.3: Hang detection functionality
  describe('checkHangAgents', () => {
    it('should return agents that have exceeded threshold', () => {
      const now = Date.now();
      const thresholdMs = 300000; // 5 minutes

      // Agent that is hanging (last activity 10 minutes ago)
      const hangingAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: new Date(now - 600000).toISOString(), // 10 min ago
        lastActivityAt: new Date(now - 600000).toISOString(), // 10 min ago
        command: 'claude -p "/kiro:spec-requirements"',
      };

      // Agent that is active (last activity 1 minute ago)
      const activeAgent: AgentInfo = {
        agentId: 'agent-002',
        specId: 'spec-a',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'running',
        startedAt: new Date(now - 120000).toISOString(), // 2 min ago
        lastActivityAt: new Date(now - 60000).toISOString(), // 1 min ago
        command: 'claude -p "/kiro:spec-design"',
      };

      registry.register(hangingAgent);
      registry.register(activeAgent);

      const hangAgents = registry.checkHangAgents(thresholdMs);
      expect(hangAgents).toHaveLength(1);
      expect(hangAgents[0].agentId).toBe('agent-001');
    });

    it('should only check running agents', () => {
      const now = Date.now();
      const thresholdMs = 300000; // 5 minutes

      // Completed agent that is old
      const completedAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'completed',
        startedAt: new Date(now - 600000).toISOString(),
        lastActivityAt: new Date(now - 600000).toISOString(),
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(completedAgent);

      const hangAgents = registry.checkHangAgents(thresholdMs);
      expect(hangAgents).toHaveLength(0);
    });

    it('should return empty array when no agents registered', () => {
      const hangAgents = registry.checkHangAgents(300000);
      expect(hangAgents).toHaveLength(0);
    });

    it('should return empty array when no agents are hanging', () => {
      const now = Date.now();
      const thresholdMs = 300000; // 5 minutes

      const recentAgent: AgentInfo = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: new Date(now - 60000).toISOString(),
        lastActivityAt: new Date(now - 60000).toISOString(),
        command: 'claude -p "/kiro:spec-requirements"',
      };

      registry.register(recentAgent);

      const hangAgents = registry.checkHangAgents(thresholdMs);
      expect(hangAgents).toHaveLength(0);
    });
  });
});
