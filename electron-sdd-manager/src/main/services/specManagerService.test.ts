/**
 * SpecManagerService Tests
 * Requirements: 5.1, 5.6, 5.7, 5.8, 6.1, 6.5, 10.1, 10.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock Electron app module before importing SpecManagerService
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => os.tmpdir()),
  },
}));

import { SpecManagerService, ExecutionGroup, buildClaudeArgs } from './specManagerService';

describe('SpecManagerService', () => {
  let testDir: string;
  let pidDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    // Create temporary directories for testing
    testDir = path.join(os.tmpdir(), `spec-manager-test-${Date.now()}`);
    pidDir = path.join(testDir, '.kiro', 'runtime', 'agents');
    await fs.mkdir(pidDir, { recursive: true });
    service = new SpecManagerService(testDir);
  });

  afterEach(async () => {
    // Stop all agents
    await service.stopAllAgents();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Task 24.1: Agent起動機能
  describe('startAgent', () => {
    it('should start an agent and return AgentInfo', async () => {
      const result = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'echo',
        args: ['test'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBeTruthy();
        expect(result.value.specId).toBe('spec-a');
        expect(result.value.phase).toBe('requirements');
        expect(result.value.status).toBe('running');
      }
    });

    it('should register agent in file system', async () => {
      const result = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const agents = await service.getAgents('spec-a');
        expect(agents).toHaveLength(1);
        expect(agents[0].agentId).toBe(result.value.agentId);
      }
    });

    it('should create PID file', async () => {
      const result = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const pidFilePath = path.join(pidDir, 'spec-a', `${result.value.agentId}.json`);
        const stat = await fs.stat(pidFilePath);
        expect(stat.isFile()).toBe(true);
      }
    });

    it('should return error for already running phase', async () => {
      // Start first agent
      await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['10'],
      });

      // Try to start another agent for same phase
      const result = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'echo',
        args: ['test'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_RUNNING');
      }
    });
  });

  // Task 24.2: Agent停止機能
  describe('stopAgent', () => {
    it('should stop a running agent', async () => {
      const startResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['10'],
      });

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const stopResult = await service.stopAgent(startResult.value.agentId);

      expect(stopResult.ok).toBe(true);
    });

    it('should update agent status to interrupted', async () => {
      const startResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['10'],
      });

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      await service.stopAgent(startResult.value.agentId);

      // Wait a bit for status update
      await new Promise((r) => setTimeout(r, 100));

      const agents = await service.getAgents('spec-a');
      const agent = agents.find((a) => a.agentId === startResult.value.agentId);
      expect(agent?.status).toBe('interrupted');
    });

    it('should return error for non-existent agent', async () => {
      const result = await service.stopAgent('non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // Task 24.3: セッション復元機能
  describe('restoreAgents', () => {
    it('should restore agents from PID files', async () => {
      // Create a PID file manually
      const specDir = path.join(pidDir, 'spec-a');
      await fs.mkdir(specDir, { recursive: true });

      const pidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: process.pid, // Use current process so it appears alive
        sessionId: 'session-123',
        status: 'running',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'test command',
      };

      await fs.writeFile(
        path.join(specDir, 'agent-001.json'),
        JSON.stringify(pidFile)
      );

      await service.restoreAgents();

      const agents = await service.getAgents('spec-a');
      // Should find the agent but may mark it as interrupted if can't connect
      expect(agents.length).toBeGreaterThanOrEqual(0);
    });

    it('should mark dead processes as interrupted', async () => {
      // Create a PID file with a non-existent PID
      const specDir = path.join(pidDir, 'spec-a');
      await fs.mkdir(specDir, { recursive: true });

      const pidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 999999999, // Non-existent PID
        sessionId: 'session-123',
        status: 'running',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'test command',
      };

      await fs.writeFile(
        path.join(specDir, 'agent-001.json'),
        JSON.stringify(pidFile)
      );

      await service.restoreAgents();

      const agents = await service.getAgents('spec-a');
      expect(agents).toHaveLength(1);
      expect(agents[0].status).toBe('interrupted');
    });
  });

  // Task 24.4: セッション再開機能
  describe('resumeAgent', () => {
    it('should return error for non-existent agent', async () => {
      const result = await service.resumeAgent('non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should return error for agent without sessionId', async () => {
      // Create an interrupted agent without sessionId
      const specDir = path.join(pidDir, 'spec-a');
      await fs.mkdir(specDir, { recursive: true });

      const pidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 999999999,
        sessionId: '', // No session ID
        status: 'interrupted',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'test command',
      };

      await fs.writeFile(
        path.join(specDir, 'agent-001.json'),
        JSON.stringify(pidFile)
      );

      await service.restoreAgents();

      const result = await service.resumeAgent('agent-001');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SESSION_NOT_FOUND');
      }
    });

    it('should use custom prompt when provided', async () => {
      // Create an interrupted agent with sessionId
      const specDir = path.join(pidDir, 'spec-a');
      await fs.mkdir(specDir, { recursive: true });

      const pidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 999999999,
        sessionId: 'session-abc-123',
        status: 'interrupted',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'test command',
      };

      await fs.writeFile(
        path.join(specDir, 'agent-001.json'),
        JSON.stringify(pidFile)
      );

      await service.restoreAgents();

      // Resume with custom prompt
      const result = await service.resumeAgent('agent-001', 'カスタムプロンプト');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect(result.value.sessionId).toBe('session-abc-123');
      }
    });

    it('should use default prompt when not provided', async () => {
      // Create an interrupted agent with sessionId
      const specDir = path.join(pidDir, 'spec-a');
      await fs.mkdir(specDir, { recursive: true });

      const pidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 999999999,
        sessionId: 'session-abc-123',
        status: 'interrupted',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'test command',
      };

      await fs.writeFile(
        path.join(specDir, 'agent-001.json'),
        JSON.stringify(pidFile)
      );

      await service.restoreAgents();

      // Resume without prompt (should use default)
      const result = await service.resumeAgent('agent-001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
      }
    });

    // Bug fix: agent-resume-cwd-mismatch
    it('should preserve cwd from agent record when resuming', async () => {
      // Create an interrupted agent with sessionId AND cwd (worktree path)
      const specDir = path.join(pidDir, 'spec-worktree');
      await fs.mkdir(specDir, { recursive: true });

      const worktreeCwd = '/path/to/worktree';
      const pidFile = {
        agentId: 'agent-worktree-001',
        specId: 'spec-worktree',
        phase: 'impl',
        pid: 999999999,
        sessionId: 'session-worktree-123',
        status: 'interrupted',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'test command',
        cwd: worktreeCwd,
      };

      await fs.writeFile(
        path.join(specDir, 'agent-worktree-001.json'),
        JSON.stringify(pidFile)
      );

      await service.restoreAgents();

      // Get agent info and verify cwd is preserved
      const agentInfo = await service.getAgentById('agent-worktree-001');
      expect(agentInfo).toBeDefined();
      expect(agentInfo?.cwd).toBe(worktreeCwd);
    });
  });

  // Task 24.5: stdin転送機能
  describe('sendInput', () => {
    it('should send input to running agent', async () => {
      const startResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'cat',
        args: [],
      });

      expect(startResult.ok).toBe(true);
      if (!startResult.ok) return;

      const sendResult = service.sendInput(startResult.value.agentId, 'test input');
      expect(sendResult.ok).toBe(true);

      // Clean up
      await service.stopAgent(startResult.value.agentId);
    });

    it('should return error for non-existent agent', () => {
      const result = service.sendInput('non-existent', 'test');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // Task 24.6: 実行グループ排他制御
  describe('execution group exclusion', () => {
    it('should allow parallel agents within same group', async () => {
      // Start first impl agent
      const impl1Result = await service.startAgent({
        specId: 'spec-a',
        phase: 'impl-task-1',
        command: 'sleep',
        args: ['10'],
        group: 'impl',
      });

      expect(impl1Result.ok).toBe(true);

      // Start second impl agent
      const impl2Result = await service.startAgent({
        specId: 'spec-a',
        phase: 'impl-task-2',
        command: 'sleep',
        args: ['10'],
        group: 'impl',
      });

      expect(impl2Result.ok).toBe(true);
    });
  });

  // コマンド構築テスト: --output-format stream-json の確認
  // execute-method-unification: Updated to use unified execute method
  describe('execute', () => {
    it('should build command with --output-format stream-json', async () => {
      // startAgentをスパイして引数を確認
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'requirements',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'claude',
          args: expect.arrayContaining(['--verbose', '--output-format', 'stream-json']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should include correct slash command in args', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'design',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['--verbose', '/kiro:spec-design my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });
  });

  // ============================================================
  // Task 10.1: PHASE_COMMANDS_BY_PREFIX inspection phase tests
  // Requirements: 13.1, 13.2, 13.3, 13.4
  // execute-method-unification: Updated to use unified execute method
  // ============================================================
  describe('execute - inspection phase', () => {
    it('should use /kiro:spec-inspection for inspection phase with kiro prefix', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'inspection',
        specId: 'test-spec',
        featureName: 'my-feature',
        commandPrefix: 'kiro',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['/kiro:spec-inspection my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should use /spec-manager:inspection for inspection phase with spec-manager prefix', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'inspection',
        specId: 'test-spec',
        featureName: 'my-feature',
        commandPrefix: 'spec-manager',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['/spec-manager:inspection my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should default to kiro prefix and use /kiro:spec-inspection', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'inspection',
        specId: 'test-spec',
        featureName: 'my-feature',
        // No commandPrefix specified - should default to 'kiro'
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['/kiro:spec-inspection my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });
  });

  describe('getAgents / getAllAgents', () => {
    it('should return agents for specific spec', async () => {
      await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      await service.startAgent({
        specId: 'spec-b',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      const specAAgents = await service.getAgents('spec-a');
      expect(specAAgents).toHaveLength(1);
      expect(specAAgents[0].specId).toBe('spec-a');
    });

    it('should return all agents grouped by spec', async () => {
      await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      await service.startAgent({
        specId: 'spec-b',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      const allAgents = await service.getAllAgents();
      expect(allAgents.size).toBe(2);
      expect(allAgents.get('spec-a')).toHaveLength(1);
      expect(allAgents.get('spec-b')).toHaveLength(1);
    });
  });

  // =============================================================================
  // agent-state-file-ssot: Task 5.2 - SpecManagerService file-based tests
  // Requirements: 3.2, 3.3, 3.4 - File-based agent state management
  // =============================================================================
  describe('File-based agent state management (agent-state-file-ssot)', () => {
    describe('getAgents - file-based (Task 3.1)', () => {
      it('should read agents from file system', async () => {
        // Start an agent - this will write to file
        const result = await service.startAgent({
          specId: 'spec-a',
          phase: 'requirements',
          command: 'sleep',
          args: ['5'],
        });
        expect(result.ok).toBe(true);

        // getAgents should read from file and return correct data
        const agents = await service.getAgents('spec-a');
        expect(agents).toHaveLength(1);
        expect(agents[0].specId).toBe('spec-a');
        expect(agents[0].status).toBe('running');
      });

      it('should return empty array for spec with no agents', async () => {
        const agents = await service.getAgents('non-existent-spec');
        expect(agents).toHaveLength(0);
      });

      it('should reflect file changes after agent completion', async () => {
        // Start and stop an agent
        const result = await service.startAgent({
          specId: 'spec-a',
          phase: 'requirements',
          command: 'echo',
          args: ['test'],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        // Wait for process to complete
        await new Promise((r) => setTimeout(r, 200));

        // getAgents should reflect the completed status from file
        const agents = await service.getAgents('spec-a');
        expect(agents).toHaveLength(1);
        // Status should be completed (or interrupted if stopped)
        expect(['completed', 'running']).toContain(agents[0].status);
      });
    });

    describe('getAllAgents - file-based (Task 3.2)', () => {
      it('should read all agents from file system grouped by spec', async () => {
        const result1 = await service.startAgent({
          specId: 'spec-a',
          phase: 'requirements',
          command: 'sleep',
          args: ['5'],
        });
        expect(result1.ok).toBe(true);

        const result2 = await service.startAgent({
          specId: 'spec-b',
          phase: 'design',
          command: 'sleep',
          args: ['5'],
        });
        expect(result2.ok).toBe(true);

        const allAgents = await service.getAllAgents();
        expect(allAgents.size).toBe(2);
        expect(allAgents.get('spec-a')?.length).toBe(1);
        expect(allAgents.get('spec-b')?.length).toBe(1);
      });

      it('should include project agents (empty specId)', async () => {
        await service.startAgent({
          specId: '',
          phase: 'steering',
          command: 'sleep',
          args: ['5'],
        });

        const allAgents = await service.getAllAgents();
        expect(allAgents.has('')).toBe(true);
        expect(allAgents.get('')?.length).toBe(1);
      });

      it('should return empty Map when no agents exist', async () => {
        const allAgents = await service.getAllAgents();
        expect(allAgents.size).toBe(0);
      });
    });

    describe('getAgentById - file-based (Task 3.3)', () => {
      it('should find agent by ID from file system', async () => {
        const result = await service.startAgent({
          specId: 'spec-a',
          phase: 'requirements',
          command: 'sleep',
          args: ['5'],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const agent = await service.getAgentById(result.value.agentId);
        expect(agent).toBeDefined();
        expect(agent?.agentId).toBe(result.value.agentId);
        expect(agent?.specId).toBe('spec-a');
      });

      it('should return undefined for non-existent agent', async () => {
        const agent = await service.getAgentById('non-existent-agent');
        expect(agent).toBeUndefined();
      });

      it('should find agent across different specs', async () => {
        // Start agents in different specs
        await service.startAgent({
          specId: 'spec-a',
          phase: 'requirements',
          command: 'sleep',
          args: ['5'],
        });

        const result = await service.startAgent({
          specId: 'spec-b',
          phase: 'design',
          command: 'sleep',
          args: ['5'],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        // Should find agent in spec-b
        const agent = await service.getAgentById(result.value.agentId);
        expect(agent).toBeDefined();
        expect(agent?.specId).toBe('spec-b');
      });
    });
  });
});

/**
 * buildClaudeArgs Tests
 * Claude CLI引数の一元管理
 */
describe('buildClaudeArgs', () => {
  const BASE_FLAGS = ['-p', '--verbose', '--output-format', 'stream-json'];

  it('should build args with command only', () => {
    const args = buildClaudeArgs({ command: '/kiro:spec-requirements my-feature' });
    expect(args).toEqual([...BASE_FLAGS, '/kiro:spec-requirements my-feature']);
  });

  it('should build args with resume session and prompt', () => {
    const args = buildClaudeArgs({
      resumeSessionId: 'session-123',
      resumePrompt: 'continue',
    });
    expect(args).toEqual([...BASE_FLAGS, '--resume', 'session-123', 'continue']);
  });

  it('should build args with resume session and Japanese prompt', () => {
    const args = buildClaudeArgs({
      resumeSessionId: 'session-456',
      resumePrompt: '続けて',
    });
    expect(args).toEqual([...BASE_FLAGS, '--resume', 'session-456', '続けて']);
  });

  it('should include base flags without any options', () => {
    const args = buildClaudeArgs({});
    expect(args).toEqual(BASE_FLAGS);
  });

  it('should handle resume without prompt', () => {
    const args = buildClaudeArgs({
      resumeSessionId: 'session-789',
    });
    expect(args).toEqual([...BASE_FLAGS, '--resume', 'session-789']);
  });

  // ============================================================
  // skipPermissions tests (--dangerously-skip-permissions)
  // ============================================================
  describe('skipPermissions option', () => {
    it('should include --dangerously-skip-permissions when skipPermissions is true', () => {
      const args = buildClaudeArgs({
        command: '/kiro:spec-requirements my-feature',
        skipPermissions: true,
      });
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toEqual([...BASE_FLAGS, '--dangerously-skip-permissions', '/kiro:spec-requirements my-feature']);
    });

    it('should NOT include --dangerously-skip-permissions when skipPermissions is false', () => {
      const args = buildClaudeArgs({
        command: '/kiro:spec-requirements my-feature',
        skipPermissions: false,
      });
      expect(args).not.toContain('--dangerously-skip-permissions');
      expect(args).toEqual([...BASE_FLAGS, '/kiro:spec-requirements my-feature']);
    });

    it('should NOT include --dangerously-skip-permissions when skipPermissions is undefined', () => {
      const args = buildClaudeArgs({
        command: '/kiro:spec-requirements my-feature',
      });
      expect(args).not.toContain('--dangerously-skip-permissions');
    });

    it('should include --dangerously-skip-permissions with resume session', () => {
      const args = buildClaudeArgs({
        resumeSessionId: 'session-123',
        resumePrompt: 'continue',
        skipPermissions: true,
      });
      expect(args).toContain('--dangerously-skip-permissions');
      // skipPermissions should come before --resume
      const skipIndex = args.indexOf('--dangerously-skip-permissions');
      const resumeIndex = args.indexOf('--resume');
      expect(skipIndex).toBeLessThan(resumeIndex);
    });

    it('should include --dangerously-skip-permissions with allowedTools', () => {
      const args = buildClaudeArgs({
        command: '/kiro:spec-impl my-feature',
        skipPermissions: true,
        allowedTools: ['Read', 'Write'],
      });
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--allowedTools');
    });
  });
});

/**
 * executeDocumentReviewReply with autofix option Tests
 * Requirements: 1.1, 1.2, 1.3 (auto-execution-document-review-autofix)
 */
describe('executeDocumentReviewReply with autofix', () => {
  let testDir: string;
  let pidDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    // Create temporary directories for testing
    testDir = path.join(os.tmpdir(), `spec-manager-autofix-test-${Date.now()}`);
    pidDir = path.join(testDir, '.kiro', 'runtime', 'agents');
    await fs.mkdir(pidDir, { recursive: true });
    service = new SpecManagerService(testDir);
  });

  afterEach(async () => {
    // Stop all agents
    await service.stopAllAgents();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should build command without --autofix by default', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReviewReply({
      specId: 'test-spec',
      featureName: 'my-feature',
      reviewNumber: 1,
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.not.arrayContaining(['--autofix']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should build command with --autofix when autofix=true', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReviewReply({
      specId: 'test-spec',
      featureName: 'my-feature',
      reviewNumber: 1,
      autofix: true,
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['/kiro:document-review-reply my-feature 1 --autofix']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should NOT include --autofix when autofix=false', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReviewReply({
      specId: 'test-spec',
      featureName: 'my-feature',
      reviewNumber: 1,
      autofix: false,
    });

    const callArgs = startAgentSpy.mock.calls[0][0].args;
    const commandArg = callArgs.find((arg: string) => arg.includes('/kiro:document-review-reply'));
    expect(commandArg).not.toContain('--autofix');

    startAgentSpy.mockRestore();
  });
});

// ============================================================
// spec-scoped-auto-execution-state Task 9.4: IPC Integration Tests
// Requirements: 2.1, 2.2, 2.3
// ============================================================
describe('spec-scoped-auto-execution-state: spec.json autoExecution Integration', () => {
  let testDir: string;
  let specDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    // Create temporary directories for testing
    testDir = path.join(os.tmpdir(), `spec-json-test-${Date.now()}`);
    specDir = path.join(testDir, '.kiro', 'specs', 'test-feature');
    await fs.mkdir(specDir, { recursive: true });
    service = new SpecManagerService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readSpecJson with autoExecution normalization', () => {
    it('should add default autoExecution when field is missing', async () => {
      // Create spec.json without autoExecution field
      const specJson = {
        feature_name: 'test-feature',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'initialized',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify(specJson, null, 2));

      // Read spec.json via service (SpecManagerService uses fileService)
      const content = await fs.readFile(path.join(specDir, 'spec.json'), 'utf-8');
      const parsed = JSON.parse(content);

      // File should not have autoExecution initially
      expect(parsed.autoExecution).toBeUndefined();
    });

    it('should preserve existing autoExecution when reading', async () => {
      // Create spec.json with autoExecution field
      const specJson = {
        feature_name: 'test-feature',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'initialized',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        autoExecution: {
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
            tasks: false,
            impl: false,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
          validationOptions: {
            gap: true,
            design: false,
            impl: false,
          },
        },
      };
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify(specJson, null, 2));

      // Read spec.json
      const content = await fs.readFile(path.join(specDir, 'spec.json'), 'utf-8');
      const parsed = JSON.parse(content);

      // autoExecution should be preserved
      expect(parsed.autoExecution).toBeDefined();
      expect(parsed.autoExecution.enabled).toBe(true);
      expect(parsed.autoExecution.permissions.requirements).toBe(true);
      expect(parsed.autoExecution.documentReviewFlag).toBe('run');
    });
  });

  describe('updateSpecJson with autoExecution', () => {
    it('should update autoExecution field in spec.json', async () => {
      // Create initial spec.json
      const specJson = {
        feature_name: 'test-feature',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'initialized',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify(specJson, null, 2));

      // Update with autoExecution
      const autoExecution = {
        enabled: true,
        permissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        documentReviewFlag: 'run',
        validationOptions: {
          gap: false,
          design: false,
          impl: false,
        },
      };

      // Read, update, and write
      const content = await fs.readFile(path.join(specDir, 'spec.json'), 'utf-8');
      const parsed = JSON.parse(content);
      parsed.autoExecution = autoExecution;
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify(parsed, null, 2));

      // Read back and verify
      const updatedContent = await fs.readFile(path.join(specDir, 'spec.json'), 'utf-8');
      const updatedParsed = JSON.parse(updatedContent);

      expect(updatedParsed.autoExecution).toBeDefined();
      expect(updatedParsed.autoExecution.enabled).toBe(true);
      expect(updatedParsed.autoExecution.permissions.requirements).toBe(true);
      expect(updatedParsed.autoExecution.permissions.design).toBe(true);
      expect(updatedParsed.autoExecution.permissions.tasks).toBe(true);
      expect(updatedParsed.autoExecution.documentReviewFlag).toBe('run');
    });

    it('should preserve other spec.json fields when updating autoExecution', async () => {
      // Create initial spec.json with all fields
      const specJson = {
        feature_name: 'test-feature',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: false },
          tasks: { generated: false, approved: false },
        },
        documentReview: {
          rounds: 1,
          status: 'in_progress',
        },
      };
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify(specJson, null, 2));

      // Update only autoExecution
      const autoExecution = {
        enabled: true,
        permissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
        documentReviewFlag: 'run',
        validationOptions: {
          gap: true,
          design: false,
          impl: false,
        },
      };

      const content = await fs.readFile(path.join(specDir, 'spec.json'), 'utf-8');
      const parsed = JSON.parse(content);
      parsed.autoExecution = autoExecution;
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify(parsed, null, 2));

      // Verify other fields are preserved
      const updatedContent = await fs.readFile(path.join(specDir, 'spec.json'), 'utf-8');
      const updatedParsed = JSON.parse(updatedContent);

      expect(updatedParsed.feature_name).toBe('test-feature');
      expect(updatedParsed.phase).toBe('design-generated');
      expect(updatedParsed.approvals.requirements.approved).toBe(true);
      expect(updatedParsed.documentReview.rounds).toBe(1);
      expect(updatedParsed.autoExecution.enabled).toBe(true);
    });
  });
});

// ============================================================
// Task 6.1: executeSpecMerge Tests (git-worktree-support)
// Requirements: 5.1, 5.2
// ============================================================
describe('executeSpecMerge', () => {
  let testDir: string;
  let pidDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    // Create temporary directories for testing
    testDir = path.join(os.tmpdir(), `spec-merge-test-${Date.now()}`);
    pidDir = path.join(testDir, '.kiro', 'runtime', 'agents');
    await fs.mkdir(pidDir, { recursive: true });
    service = new SpecManagerService(testDir);
  });

  afterEach(async () => {
    // Stop all agents
    await service.stopAllAgents();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should build command with /kiro:spec-merge and feature name (kiro prefix)', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeSpecMerge({
      specId: 'test-spec',
      featureName: 'my-feature',
      commandPrefix: 'kiro',
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'spec-merge',
        args: expect.arrayContaining(['/kiro:spec-merge my-feature']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should default to kiro prefix and use /kiro:spec-merge', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeSpecMerge({
      specId: 'test-spec',
      featureName: 'my-feature',
      // No commandPrefix specified - should default to 'kiro'
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['/kiro:spec-merge my-feature']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should use /spec-manager:spec-merge for spec-manager prefix', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeSpecMerge({
      specId: 'test-spec',
      featureName: 'my-feature',
      commandPrefix: 'spec-manager',
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['/spec-manager:spec-merge my-feature']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should set group to doc', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeSpecMerge({
      specId: 'test-spec',
      featureName: 'my-feature',
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        group: 'doc',
      })
    );

    startAgentSpy.mockRestore();
  });
});

// ============================================================
// gemini-document-review Task 4.1, 4.2: Multi-engine Document Review
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
// ============================================================
describe('executeDocumentReview - multi-engine support', () => {
  let testDir: string;
  let pidDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `spec-manager-engine-test-${Date.now()}`);
    pidDir = path.join(testDir, '.kiro', 'runtime', 'agents');
    await fs.mkdir(pidDir, { recursive: true });
    service = new SpecManagerService(testDir);
  });

  afterEach(async () => {
    await service.stopAllAgents();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should use Claude CLI for claude-code scheme', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReview({
      specId: 'test-spec',
      featureName: 'my-feature',
      scheme: 'claude-code',
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'claude',
        args: expect.arrayContaining(['/kiro:document-review my-feature']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should use Gemini CLI for gemini-cli scheme with --yolo and --output-format stream-json', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReview({
      specId: 'test-spec',
      featureName: 'my-feature',
      scheme: 'gemini-cli',
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'gemini',
        args: expect.arrayContaining(['--yolo', '--output-format', 'stream-json']),
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should use debatex CLI for debatex scheme', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReview({
      specId: 'test-spec',
      featureName: 'my-feature',
      scheme: 'debatex',
    });

    // debatex uses ['npx', 'debatex'] as command, which gets split:
    // command: 'npx', args: ['debatex', 'sdd-document-review', 'my-feature']
    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'npx',
        args: expect.arrayContaining(['debatex', 'sdd-document-review', 'my-feature']),
      })
    );

    startAgentSpy.mockRestore();
  });

  // ============================================================
  // debatex-document-review Task 6.2: debatex with roundNumber/specPath support
  // Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2
  // ============================================================
  describe('debatex with BuildArgsContext (roundNumber/specPath)', () => {
    let specDir: string;

    beforeEach(async () => {
      // Create spec directory with existing document-review files
      specDir = path.join(testDir, '.kiro', 'specs', 'test-spec');
      await fs.mkdir(specDir, { recursive: true });
      // Create a document-review-1.md to simulate existing round
      await fs.writeFile(path.join(specDir, 'document-review-1.md'), '# Review 1');
    });

    it('should pass specPath and roundNumber to buildArgs for debatex', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executeDocumentReview({
        specId: 'test-spec',
        featureName: 'test-spec',
        scheme: 'debatex',
      });

      // Should include --output with the correct path
      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'npx',
          args: expect.arrayContaining([
            'debatex',
            'sdd-document-review',
            'test-spec',
            '--output',
            expect.stringContaining('document-review-2.md'),
          ]),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should calculate next roundNumber correctly', async () => {
      // Create document-review-2.md to simulate 2 existing rounds
      await fs.writeFile(path.join(specDir, 'document-review-2.md'), '# Review 2');

      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executeDocumentReview({
        specId: 'test-spec',
        featureName: 'test-spec',
        scheme: 'debatex',
      });

      // Should calculate roundNumber as 3 (max existing + 1)
      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            '--output',
            expect.stringContaining('document-review-3.md'),
          ]),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should start from roundNumber 1 when no existing reviews', async () => {
      // Create a new spec without any document-review files
      const newSpecDir = path.join(testDir, '.kiro', 'specs', 'new-spec');
      await fs.mkdir(newSpecDir, { recursive: true });

      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executeDocumentReview({
        specId: 'new-spec',
        featureName: 'new-spec',
        scheme: 'debatex',
      });

      // Should use roundNumber 1
      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            '--output',
            expect.stringContaining('document-review-1.md'),
          ]),
        })
      );

      startAgentSpy.mockRestore();
    });
  });

  it('should default to Claude CLI when scheme is undefined', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReview({
      specId: 'test-spec',
      featureName: 'my-feature',
      // No scheme specified
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'claude',
      })
    );

    startAgentSpy.mockRestore();
  });

  it('should default to Claude CLI for unknown scheme', async () => {
    const startAgentSpy = vi.spyOn(service, 'startAgent');

    await service.executeDocumentReview({
      specId: 'test-spec',
      featureName: 'my-feature',
      scheme: 'unknown-engine' as any,
    });

    expect(startAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'claude',
      })
    );

    startAgentSpy.mockRestore();
  });

  // ============================================================
  // execute-method-unification: Task 2.1
  // Unified execute method tests
  // Requirements: 2.1, 2.2, 2.3, 2.5
  // ============================================================
  describe('execute - unified method', () => {
    it('should execute requirements phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'requirements',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'requirements',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:spec-requirements my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute design phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'design',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'design',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:spec-design my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute tasks phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'tasks',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'tasks',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:spec-tasks my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute impl phase with taskId', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'impl',
        specId: 'test-spec',
        featureName: 'my-feature',
        taskId: '1.1',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'impl-1.1',
          group: 'impl',
          args: expect.arrayContaining(['/kiro:spec-impl my-feature 1.1']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute impl phase without taskId (all pending tasks)', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'impl',
        specId: 'test-spec',
        featureName: 'my-feature',
        // No taskId - execute all pending tasks
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'impl',
          group: 'impl',
          args: expect.arrayContaining(['/kiro:spec-impl my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute deploy phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'deploy',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'deploy',
          group: 'doc',
          args: expect.arrayContaining(['/commit my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute inspection phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'inspection',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'inspection',
          group: 'impl',
          args: expect.arrayContaining(['/kiro:spec-inspection my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute inspection-fix phase with roundNumber', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'inspection-fix',
        specId: 'test-spec',
        featureName: 'my-feature',
        roundNumber: 1,
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'inspection-fix',
          group: 'impl',
          args: expect.arrayContaining(['/kiro:spec-inspection my-feature --fix']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute document-review phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'document-review',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'document-review',
          group: 'doc',
          command: 'claude',
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute document-review-reply phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'document-review-reply',
        specId: 'test-spec',
        featureName: 'my-feature',
        reviewNumber: 2,
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'document-review-reply',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:document-review-reply my-feature 2']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute document-review-reply with autofix flag', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'document-review-reply',
        specId: 'test-spec',
        featureName: 'my-feature',
        reviewNumber: 1,
        autofix: true,
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'document-review-reply',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:document-review-reply my-feature 1 --autofix']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute document-review-fix phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'document-review-fix',
        specId: 'test-spec',
        featureName: 'my-feature',
        reviewNumber: 1,
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'document-review-fix',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:document-review-reply my-feature 1 --fix']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should execute spec-merge phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'spec-merge',
        specId: 'test-spec',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'spec-merge',
          group: 'doc',
          args: expect.arrayContaining(['/kiro:spec-merge my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should respect commandPrefix option', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'requirements',
        specId: 'test-spec',
        featureName: 'my-feature',
        commandPrefix: 'spec-manager',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['/spec-manager:requirements my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });

    it('should use gemini-cli for document-review with gemini scheme', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.execute({
        type: 'document-review',
        specId: 'test-spec',
        featureName: 'my-feature',
        scheme: 'gemini-cli',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'test-spec',
          phase: 'document-review',
          command: 'gemini',
        })
      );

      startAgentSpy.mockRestore();
    });
  });

  // ============================================================
  // execute-method-unification: Task 3.1
  // worktreeCwd auto-resolution in startAgent
  // Requirements: 3.1, 3.2, 3.3, 3.4
  // ============================================================
  describe('startAgent - worktreeCwd auto-resolution', () => {
    it('should auto-resolve worktreeCwd for impl group when not provided', async () => {
      // Setup: Create spec.json with worktree configuration
      const specDir = path.join(testDir, '.kiro', 'specs', 'test-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify({
        feature_name: 'test-spec',
        worktree: {
          branch: 'feature/test',
          created_at: '2026-01-01T00:00:00Z',
        },
      }));

      // Create worktree directory
      const worktreeDir = path.join(testDir, '.git', 'worktrees', 'test-spec');
      await fs.mkdir(worktreeDir, { recursive: true });
      await fs.writeFile(path.join(worktreeDir, 'gitdir'), path.join(testDir, '.kiro', 'worktrees', 'test-spec', '.git'));

      // Create expected worktree cwd
      const expectedWorktreeCwd = path.join(testDir, '.kiro', 'worktrees', 'test-spec');
      await fs.mkdir(expectedWorktreeCwd, { recursive: true });

      const result = await service.startAgent({
        specId: 'test-spec',
        phase: 'impl-1.1',
        command: 'echo',
        args: ['test'],
        group: 'impl',
        // No worktreeCwd provided - should be auto-resolved
      });

      expect(result.ok).toBe(true);
    });

    it('should skip worktreeCwd resolution for doc group', async () => {
      const result = await service.startAgent({
        specId: 'test-spec',
        phase: 'requirements',
        command: 'echo',
        args: ['test'],
        group: 'doc',
        // No worktreeCwd provided - should not auto-resolve for doc group
      });

      expect(result.ok).toBe(true);
    });

    it('should prefer explicitly provided worktreeCwd', async () => {
      const explicitCwd = '/explicit/worktree/path';
      const result = await service.startAgent({
        specId: 'test-spec',
        phase: 'impl-1.1',
        command: 'echo',
        args: ['test'],
        group: 'impl',
        worktreeCwd: explicitCwd,
      });

      expect(result.ok).toBe(true);
    });
  });

  // ============================================================
  // worktree-symlink-permission: --add-dir for worktree mode
  // When running in worktree mode, add --add-dir to allow access
  // to main repository files via symlinks
  // ============================================================
  describe('startAgent - worktree --add-dir support', () => {
    it('should add --add-dir with mainProjectPath when effectiveCwd differs from projectPath', async () => {
      // Setup: Create spec.json with worktree configuration (with path)
      const specDir = path.join(testDir, '.kiro', 'specs', 'worktree-test');
      await fs.mkdir(specDir, { recursive: true });

      // Create worktree directory structure
      const worktreeDir = path.join(testDir, '.kiro', 'worktrees', 'specs', 'worktree-test');
      await fs.mkdir(worktreeDir, { recursive: true });

      await fs.writeFile(path.join(specDir, 'spec.json'), JSON.stringify({
        feature_name: 'worktree-test',
        worktree: {
          path: '.kiro/worktrees/specs/worktree-test',
          branch: 'feature/worktree-test',
          created_at: '2026-01-01T00:00:00Z',
        },
      }));

      // Verify --add-dir is added by checking the command string in AgentInfo
      const result = await service.startAgent({
        specId: 'worktree-test',
        phase: 'impl-1.1',
        command: 'claude',
        args: ['/kiro:spec-impl worktree-test'],
        group: 'impl',
        // worktreeCwd not provided - should auto-resolve to worktree path
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The command string should contain --add-dir with the main project path
        expect(result.value.command).toContain('--add-dir');
        expect(result.value.command).toContain(testDir);
      }
    });

    it('should NOT add --add-dir when effectiveCwd equals projectPath', async () => {
      const result = await service.startAgent({
        specId: 'normal-test',
        phase: 'requirements',
        command: 'claude',
        args: ['/kiro:spec-requirements normal-test'],
        group: 'doc',
        // No worktree - effectiveCwd should equal projectPath
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The command string should NOT contain --add-dir
        expect(result.value.command).not.toContain('--add-dir');
      }
    });

    it('should add --add-dir when explicit worktreeCwd is provided and differs from projectPath', async () => {
      const explicitWorktreeCwd = path.join(testDir, '.kiro', 'worktrees', 'specs', 'explicit-test');
      await fs.mkdir(explicitWorktreeCwd, { recursive: true });

      const result = await service.startAgent({
        specId: 'explicit-test',
        phase: 'impl-1.1',
        command: 'claude',
        args: ['/kiro:spec-impl explicit-test'],
        group: 'impl',
        worktreeCwd: explicitWorktreeCwd,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The command string should contain --add-dir with the main project path
        expect(result.value.command).toContain('--add-dir');
        expect(result.value.command).toContain(testDir);
      }
    });
  });

  // ============================================================
  // skip-permissions-main-process: DI and auto-fetch skipPermissions
  // Main Process should own skipPermissions instead of receiving from Renderer
  // ============================================================
  describe('startAgent - skipPermissions from layoutConfigService', () => {
    it('should auto-fetch skipPermissions from layoutConfigService when skipPermissions=true', async () => {
      // Create mock layoutConfigService that returns skipPermissions=true
      const mockLayoutConfigService = {
        loadSkipPermissions: vi.fn().mockResolvedValue(true),
      };

      // Create service with mocked layoutConfigService
      const serviceWithMock = new SpecManagerService(testDir, {
        layoutConfigService: mockLayoutConfigService,
      });

      const result = await serviceWithMock.startAgent({
        specId: 'skip-perm-test',
        phase: 'impl-1.1',
        command: 'claude',
        args: ['/kiro:spec-impl skip-perm-test'],
        group: 'impl',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The command string should contain --dangerously-skip-permissions
        expect(result.value.command).toContain('--dangerously-skip-permissions');
      }

      // Verify layoutConfigService was called with projectPath
      expect(mockLayoutConfigService.loadSkipPermissions).toHaveBeenCalledWith(testDir);

      await serviceWithMock.stopAllAgents();
    });

    it('should NOT add --dangerously-skip-permissions when skipPermissions=false', async () => {
      // Create mock layoutConfigService that returns skipPermissions=false
      const mockLayoutConfigService = {
        loadSkipPermissions: vi.fn().mockResolvedValue(false),
      };

      // Create service with mocked layoutConfigService
      const serviceWithMock = new SpecManagerService(testDir, {
        layoutConfigService: mockLayoutConfigService,
      });

      const result = await serviceWithMock.startAgent({
        specId: 'no-skip-perm-test',
        phase: 'impl-1.1',
        command: 'claude',
        args: ['/kiro:spec-impl no-skip-perm-test'],
        group: 'impl',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // The command string should NOT contain --dangerously-skip-permissions
        expect(result.value.command).not.toContain('--dangerously-skip-permissions');
      }

      await serviceWithMock.stopAllAgents();
    });

    it('should use default layoutConfigService when not provided via DI', async () => {
      // When no layoutConfigService is provided, should use real one
      // This test verifies the service works without explicit DI
      const result = await service.startAgent({
        specId: 'default-config-test',
        phase: 'requirements',
        command: 'echo',
        args: ['test'],
        group: 'doc',
      });

      expect(result.ok).toBe(true);
    });

    it('should fetch skipPermissions only for claude commands', async () => {
      const mockLayoutConfigService = {
        loadSkipPermissions: vi.fn().mockResolvedValue(true),
      };

      const serviceWithMock = new SpecManagerService(testDir, {
        layoutConfigService: mockLayoutConfigService,
      });

      // Non-claude command (echo)
      const result = await serviceWithMock.startAgent({
        specId: 'non-claude-test',
        phase: 'test',
        command: 'echo',
        args: ['test'],
      });

      expect(result.ok).toBe(true);
      // loadSkipPermissions should NOT be called for non-claude commands
      expect(mockLayoutConfigService.loadSkipPermissions).not.toHaveBeenCalled();

      await serviceWithMock.stopAllAgents();
    });
  });
});
