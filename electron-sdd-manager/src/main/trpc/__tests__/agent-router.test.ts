/**
 * Agent Router tests
 * Task 6.1: agentルーターとZodスキーマを実装する
 * Requirements: 5.1, 5.2, 5.3
 * Method: agentRouter, agentProcess, agentRegistry
 * Verify: Grep "agentRouter" in router.ts
 *
 * Tests all 11 procedures:
 * - start (mutation): Start an agent
 * - stop (mutation): Stop an agent
 * - resume (mutation): Resume a stopped agent
 * - delete (mutation): Delete an agent
 * - getAgents (query): Get agents for a spec
 * - getAllAgents (query): Get all agents across specs
 * - sendInput (mutation): Send input to a running agent
 * - getLogs (query): Get parsed logs for an agent
 * - getRunningAgentCounts (query): Get running agent counts per spec
 * - checkFolderExists (query): Check if agent folder exists
 * - deleteFolder (mutation): Delete agent folder
 *
 * Legacy handler: agentHandlers.ts (10 channels)
 * All services accessed via ctx.services for testability (DD-006).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

describe('Agent Router', () => {
  let mockServices: ContextServices;

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ============================================================
  // start
  // ============================================================

  describe('start', () => {
    it('should start an agent and return agent info', async () => {
      const mockResult = { agentId: 'agent-001', specId: 'test-spec', phase: 'impl' };
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.start({
        specId: 'test-spec',
        phase: 'impl',
        args: ['/kiro:spec-impl "test-spec"'],
      });

      expect(result).toEqual(mockResult);
      expect(mockSpecManager.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        specId: 'test-spec',
        phase: 'impl',
        args: ['/kiro:spec-impl "test-spec"'],
        engineId: 'claude',
      }));
    });

    it('should pass optional group, sessionId, and engineId', async () => {
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-002' } }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await caller.agent.start({
        specId: 'test-spec',
        phase: 'requirements',
        args: ['/kiro:spec-requirements "test-spec"'],
        group: 'doc',
        sessionId: 'session-001',
        engineId: 'gemini',
      });

      expect(mockSpecManager.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        group: 'doc',
        sessionId: 'session-001',
        engineId: 'gemini',
      }));
    });

    it('should default engineId to claude when not provided', async () => {
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-003' } }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await caller.agent.start({
        specId: '',
        phase: 'spec-init',
        args: ['/kiro:spec-init "description"'],
      });

      expect(mockSpecManager.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        engineId: 'claude',
      }));
    });

    it('should throw when startAgent returns error', async () => {
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AGENT_ERROR', message: 'Failed' },
        }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.start({
        specId: 'test-spec',
        phase: 'impl',
        args: ['/kiro:spec-impl'],
      })).rejects.toThrow();
    });

    it('should validate input - empty phase should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.start({
        specId: 'test',
        phase: '',
        args: [],
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // stop
  // ============================================================

  describe('stop', () => {
    it('should stop an agent via agentStop service', async () => {
      mockServices.agentStop = vi.fn().mockResolvedValue(undefined);

      const caller = createTestCaller(mockServices);
      await caller.agent.stop({ agentId: 'agent-001' });

      expect(mockServices.agentStop).toHaveBeenCalledWith('agent-001');
    });

    it('should throw when agentStop is not initialized', async () => {
      mockServices.agentStop = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.stop({ agentId: 'agent-001' }))
        .rejects.toThrow();
    });

    it('should throw when agentStop returns error', async () => {
      mockServices.agentStop = vi.fn().mockRejectedValue(new Error('Failed to stop agent'));

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.stop({ agentId: 'agent-001' }))
        .rejects.toThrow();
    });

    it('should validate input - empty agentId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.stop({ agentId: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // resume
  // ============================================================

  describe('resume', () => {
    it('should resume an agent and return agent info', async () => {
      const mockResult = { agentId: 'agent-001', specId: 'test-spec', phase: 'impl' };
      const mockSpecManager = {
        resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.resume({ agentId: 'agent-001' });

      expect(result).toEqual(mockResult);
      expect(mockSpecManager.resumeAgent).toHaveBeenCalledWith('agent-001', undefined);
    });

    it('should pass optional prompt', async () => {
      const mockSpecManager = {
        resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-001' } }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await caller.agent.resume({ agentId: 'agent-001', prompt: 'continue with task 2' });

      expect(mockSpecManager.resumeAgent).toHaveBeenCalledWith('agent-001', 'continue with task 2');
    });

    it('should throw when resumeAgent returns error', async () => {
      const mockSpecManager = {
        resumeAgent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AGENT_NOT_FOUND' },
        }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.resume({ agentId: 'nonexistent' }))
        .rejects.toThrow();
    });

    it('should validate input - empty agentId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.resume({ agentId: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // delete
  // ============================================================

  describe('delete', () => {
    it('should delete an agent', async () => {
      const mockSpecManager = {
        deleteAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await caller.agent.delete({ specId: 'test-spec', agentId: 'agent-001' });

      expect(mockSpecManager.deleteAgent).toHaveBeenCalledWith('test-spec', 'agent-001');
    });

    it('should throw when deleteAgent returns error', async () => {
      const mockSpecManager = {
        deleteAgent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AGENT_NOT_FOUND' },
        }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.delete({ specId: 'test-spec', agentId: 'nonexistent' }))
        .rejects.toThrow();
    });

    it('should validate input - empty agentId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.delete({ specId: 'test', agentId: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // getAgents
  // ============================================================

  describe('getAgents', () => {
    it('should return agents for a given specId', async () => {
      const mockAgents = [
        { agentId: 'agent-001', specId: 'test-spec', phase: 'impl', status: 'running' },
        { agentId: 'agent-002', specId: 'test-spec', phase: 'design', status: 'completed' },
      ];
      const mockSpecManager = {
        getAgents: vi.fn().mockResolvedValue(mockAgents),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getAgents({ specId: 'test-spec' });

      expect(result).toEqual(mockAgents);
      expect(mockSpecManager.getAgents).toHaveBeenCalledWith('test-spec');
    });

    it('should return empty array when no agents exist', async () => {
      const mockSpecManager = {
        getAgents: vi.fn().mockResolvedValue([]),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getAgents({ specId: 'empty-spec' });

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // getAllAgents
  // ============================================================

  describe('getAllAgents', () => {
    it('should return all agents as a Record (serialized from Map)', async () => {
      const agentsMap = new Map<string, any[]>();
      agentsMap.set('spec-a', [{ agentId: 'agent-001' }]);
      agentsMap.set('spec-b', [{ agentId: 'agent-002' }, { agentId: 'agent-003' }]);

      const mockSpecManager = {
        getAllAgents: vi.fn().mockResolvedValue(agentsMap),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getAllAgents();

      expect(result).toEqual({
        'spec-a': [{ agentId: 'agent-001' }],
        'spec-b': [{ agentId: 'agent-002' }, { agentId: 'agent-003' }],
      });
    });

    it('should return empty object when no agents exist', async () => {
      const mockSpecManager = {
        getAllAgents: vi.fn().mockResolvedValue(new Map()),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getAllAgents();

      expect(result).toEqual({});
    });
  });

  // ============================================================
  // sendInput
  // ============================================================

  describe('sendInput', () => {
    it('should send input to a running agent', async () => {
      const mockSpecManager = {
        sendInput: vi.fn().mockReturnValue({ ok: true, value: undefined }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await caller.agent.sendInput({ agentId: 'agent-001', input: 'yes' });

      expect(mockSpecManager.sendInput).toHaveBeenCalledWith('agent-001', 'yes');
    });

    it('should throw when sendInput returns error', async () => {
      const mockSpecManager = {
        sendInput: vi.fn().mockReturnValue({
          ok: false,
          error: { type: 'AGENT_NOT_FOUND' },
        }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.sendInput({ agentId: 'nonexistent', input: 'yes' }))
        .rejects.toThrow();
    });

    it('should validate input - empty agentId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.sendInput({ agentId: '', input: 'yes' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // getLogs
  // ============================================================

  describe('getLogs', () => {
    it('should return parsed logs for an agent', async () => {
      const mockLogs = [
        { timestamp: '2026-01-01T00:00:00Z', stream: 'stdout', data: 'Starting...' },
        { timestamp: '2026-01-01T00:00:01Z', stream: 'stdout', data: 'Done.' },
      ];
      mockServices.agentGetLogs = vi.fn().mockResolvedValue(mockLogs);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getLogs({ specId: 'test-spec', agentId: 'agent-001' });

      expect(result).toEqual(mockLogs);
      expect(mockServices.agentGetLogs).toHaveBeenCalledWith('test-spec', 'agent-001');
    });

    it('should return empty array when no logs exist', async () => {
      mockServices.agentGetLogs = vi.fn().mockResolvedValue([]);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getLogs({ specId: 'test-spec', agentId: 'agent-001' });

      expect(result).toEqual([]);
    });

    it('should throw when agentGetLogs is not initialized', async () => {
      mockServices.agentGetLogs = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.getLogs({ specId: 'test-spec', agentId: 'agent-001' }))
        .rejects.toThrow();
    });

    it('should validate input - empty agentId should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.getLogs({ specId: 'test', agentId: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // getRunningAgentCounts
  // ============================================================

  describe('getRunningAgentCounts', () => {
    it('should return running agent counts as a Record', async () => {
      mockServices.agentGetRunningCounts = vi.fn().mockResolvedValue({ 'spec-a': 2, 'spec-b': 1 });

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getRunningAgentCounts();

      expect(result).toEqual({ 'spec-a': 2, 'spec-b': 1 });
    });

    it('should return empty object when no agents are running', async () => {
      mockServices.agentGetRunningCounts = vi.fn().mockResolvedValue({});

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getRunningAgentCounts();

      expect(result).toEqual({});
    });

    it('should return empty object when service is not initialized', async () => {
      mockServices.agentGetRunningCounts = undefined;

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getRunningAgentCounts();

      expect(result).toEqual({});
    });
  });

  // ============================================================
  // checkFolderExists
  // ============================================================

  describe('checkFolderExists', () => {
    it('should return true when agent folder exists', async () => {
      mockServices.agentCheckFolderExists = vi.fn().mockResolvedValue(true);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.checkFolderExists({ projectPath: '/test/project' });

      expect(result).toBe(true);
      expect(mockServices.agentCheckFolderExists).toHaveBeenCalledWith('/test/project');
    });

    it('should return false when agent folder does not exist', async () => {
      mockServices.agentCheckFolderExists = vi.fn().mockResolvedValue(false);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.checkFolderExists({ projectPath: '/test/project' });

      expect(result).toBe(false);
    });

    it('should return false when service is not initialized', async () => {
      mockServices.agentCheckFolderExists = undefined;

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.checkFolderExists({ projectPath: '/test/project' });

      expect(result).toBe(false);
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.checkFolderExists({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // deleteFolder
  // ============================================================

  describe('deleteFolder', () => {
    it('should delete agent folder and return success', async () => {
      mockServices.agentDeleteFolder = vi.fn().mockResolvedValue({ ok: true });

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.deleteFolder({ projectPath: '/test/project' });

      expect(result).toEqual({ ok: true });
      expect(mockServices.agentDeleteFolder).toHaveBeenCalledWith('/test/project');
    });

    it('should return error when deletion fails', async () => {
      mockServices.agentDeleteFolder = vi.fn().mockResolvedValue({ ok: false, error: 'Permission denied' });

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.deleteFolder({ projectPath: '/test/project' });

      expect(result.ok).toBe(false);
    });

    it('should throw when service is not initialized', async () => {
      mockServices.agentDeleteFolder = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.deleteFolder({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.agent.deleteFolder({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Edge cases inherited from legacy agentHandlers.test.ts (Task 6.3)
  // ============================================================

  describe('edge cases (legacy handler knowledge)', () => {
    it('start: error message should include error type', async () => {
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AGENT_ERROR', message: 'Failed' },
        }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.start({
        specId: 'test-spec',
        phase: 'impl',
        args: ['/kiro:spec-impl'],
      })).rejects.toThrow('AGENT_ERROR');
    });

    it('getRunningAgentCounts: should return empty object when service throws error', async () => {
      mockServices.agentGetRunningCounts = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getRunningAgentCounts();

      expect(result).toEqual({});
    });

    it('getLogs: should throw when service throws runtime error', async () => {
      mockServices.agentGetLogs = vi.fn().mockRejectedValue(new Error('Log read failed'));

      const caller = createTestCaller(mockServices);
      await expect(caller.agent.getLogs({ specId: 'test-spec', agentId: 'agent-001' }))
        .rejects.toThrow();
    });

    it('getAllAgents: should correctly serialize Map with multiple spec entries', async () => {
      const agentsMap = new Map<string, any[]>();
      agentsMap.set('spec-a', [
        { agentId: 'agent-001', specId: 'spec-a', phase: 'impl', status: 'running' },
      ]);
      agentsMap.set('spec-b', [
        { agentId: 'agent-002', specId: 'spec-b', phase: 'design', status: 'completed' },
        { agentId: 'agent-003', specId: 'spec-b', phase: 'requirements', status: 'running' },
      ]);
      agentsMap.set('bug:test-bug', [
        { agentId: 'agent-004', specId: 'bug:test-bug', phase: 'fix', status: 'running' },
      ]);

      const mockSpecManager = {
        getAllAgents: vi.fn().mockResolvedValue(agentsMap),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.agent.getAllAgents();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['spec-a']).toHaveLength(1);
      expect(result['spec-b']).toHaveLength(2);
      expect(result['bug:test-bug']).toHaveLength(1);
    });

    it('sendInput: should validate non-empty input string is allowed', async () => {
      const mockSpecManager = {
        sendInput: vi.fn().mockReturnValue({ ok: true, value: undefined }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      // Empty string input should be allowed (just agentId must be non-empty)
      await caller.agent.sendInput({ agentId: 'agent-001', input: '' });

      expect(mockSpecManager.sendInput).toHaveBeenCalledWith('agent-001', '');
    });
  });

  // ============================================================
  // Router registration
  // ============================================================

  describe('router registration', () => {
    it('should have agent namespace accessible from appRouter', async () => {
      const caller = createTestCaller(mockServices);
      expect(caller.agent).toBeDefined();
    });

    it('should have all 11 procedures defined', async () => {
      const caller = createTestCaller(mockServices);
      expect(typeof caller.agent.start).toBe('function');
      expect(typeof caller.agent.stop).toBe('function');
      expect(typeof caller.agent.resume).toBe('function');
      expect(typeof caller.agent.delete).toBe('function');
      expect(typeof caller.agent.getAgents).toBe('function');
      expect(typeof caller.agent.getAllAgents).toBe('function');
      expect(typeof caller.agent.sendInput).toBe('function');
      expect(typeof caller.agent.getLogs).toBe('function');
      expect(typeof caller.agent.getRunningAgentCounts).toBe('function');
      expect(typeof caller.agent.checkFolderExists).toBe('function');
      expect(typeof caller.agent.deleteFolder).toBe('function');
    });
  });

  // ============================================================
  // Zod schema validation
  // ============================================================

  describe('Zod schema validation', () => {
    it('should export startAgentInputSchema with required fields', async () => {
      const { startAgentInputSchema } = await import('../routers/agent');
      expect(startAgentInputSchema).toBeDefined();

      // Valid input
      expect(startAgentInputSchema.safeParse({
        specId: 'test',
        phase: 'impl',
        args: ['/kiro:spec-impl'],
      }).success).toBe(true);

      // engineId defaults to 'claude'
      const parsed = startAgentInputSchema.safeParse({
        specId: 'test',
        phase: 'impl',
        args: [],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.engineId).toBe('claude');
      }

      // Invalid: empty phase
      expect(startAgentInputSchema.safeParse({
        specId: 'test',
        phase: '',
        args: [],
      }).success).toBe(false);
    });

    it('should export stopAgentInputSchema', async () => {
      const { stopAgentInputSchema } = await import('../routers/agent');
      expect(stopAgentInputSchema).toBeDefined();

      expect(stopAgentInputSchema.safeParse({ agentId: 'agent-001' }).success).toBe(true);
      expect(stopAgentInputSchema.safeParse({ agentId: '' }).success).toBe(false);
    });

    it('should export resumeAgentInputSchema', async () => {
      const { resumeAgentInputSchema } = await import('../routers/agent');
      expect(resumeAgentInputSchema).toBeDefined();

      // Valid with prompt
      expect(resumeAgentInputSchema.safeParse({ agentId: 'agent-001', prompt: 'continue' }).success).toBe(true);

      // Valid without prompt
      expect(resumeAgentInputSchema.safeParse({ agentId: 'agent-001' }).success).toBe(true);

      // Invalid: empty agentId
      expect(resumeAgentInputSchema.safeParse({ agentId: '' }).success).toBe(false);
    });

    it('should export deleteAgentInputSchema', async () => {
      const { deleteAgentInputSchema } = await import('../routers/agent');
      expect(deleteAgentInputSchema).toBeDefined();

      expect(deleteAgentInputSchema.safeParse({ specId: 'test', agentId: 'agent-001' }).success).toBe(true);
      expect(deleteAgentInputSchema.safeParse({ specId: 'test', agentId: '' }).success).toBe(false);
    });

    it('should export getAgentsInputSchema', async () => {
      const { getAgentsInputSchema } = await import('../routers/agent');
      expect(getAgentsInputSchema).toBeDefined();

      // specId can be empty string (for project-level agents)
      expect(getAgentsInputSchema.safeParse({ specId: '' }).success).toBe(true);
      expect(getAgentsInputSchema.safeParse({ specId: 'test-spec' }).success).toBe(true);
    });

    it('should export sendInputSchema', async () => {
      const { sendInputSchema } = await import('../routers/agent');
      expect(sendInputSchema).toBeDefined();

      expect(sendInputSchema.safeParse({ agentId: 'agent-001', input: 'yes' }).success).toBe(true);
      expect(sendInputSchema.safeParse({ agentId: '', input: 'yes' }).success).toBe(false);
    });

    it('should export getLogsInputSchema', async () => {
      const { getLogsInputSchema } = await import('../routers/agent');
      expect(getLogsInputSchema).toBeDefined();

      expect(getLogsInputSchema.safeParse({ specId: 'test', agentId: 'agent-001' }).success).toBe(true);
      expect(getLogsInputSchema.safeParse({ specId: 'test', agentId: '' }).success).toBe(false);
    });

    it('should export projectPathInputSchema', async () => {
      const { projectPathInputSchema } = await import('../routers/agent');
      expect(projectPathInputSchema).toBeDefined();

      expect(projectPathInputSchema.safeParse({ projectPath: '/test' }).success).toBe(true);
      expect(projectPathInputSchema.safeParse({ projectPath: '' }).success).toBe(false);
    });
  });
});
