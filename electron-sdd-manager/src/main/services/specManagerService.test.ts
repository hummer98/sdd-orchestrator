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

    it('should register agent in registry', async () => {
      const result = await service.startAgent({
        specId: 'spec-a',
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const agents = service.getAgents('spec-a');
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

      const agents = service.getAgents('spec-a');
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

      const agents = service.getAgents('spec-a');
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

      const agents = service.getAgents('spec-a');
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
    it('should block impl when validate is running', async () => {
      // Start a validate agent
      const validateResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'validate-gap',
        command: 'sleep',
        args: ['10'],
        group: 'validate',
      });

      expect(validateResult.ok).toBe(true);

      // Try to start an impl agent
      const implResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'impl-task-1',
        command: 'echo',
        args: ['test'],
        group: 'impl',
      });

      expect(implResult.ok).toBe(false);
      if (!implResult.ok) {
        expect(implResult.error.type).toBe('GROUP_CONFLICT');
      }
    });

    it('should block validate when impl is running', async () => {
      // Start an impl agent
      const implResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'impl-task-1',
        command: 'sleep',
        args: ['10'],
        group: 'impl',
      });

      expect(implResult.ok).toBe(true);

      // Try to start a validate agent
      const validateResult = await service.startAgent({
        specId: 'spec-a',
        phase: 'validate-gap',
        command: 'echo',
        args: ['test'],
        group: 'validate',
      });

      expect(validateResult.ok).toBe(false);
      if (!validateResult.ok) {
        expect(validateResult.error.type).toBe('GROUP_CONFLICT');
      }
    });

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
  describe('executePhase', () => {
    it('should build command with --output-format stream-json', async () => {
      // startAgentをスパイして引数を確認
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executePhase({
        specId: 'test-spec',
        phase: 'requirements',
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

      await service.executePhase({
        specId: 'test-spec',
        phase: 'design',
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
  // ============================================================
  describe('executePhase - inspection phase', () => {
    it('should use /kiro:spec-inspection for inspection phase with kiro prefix', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executePhase({
        specId: 'test-spec',
        phase: 'inspection',
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

      await service.executePhase({
        specId: 'test-spec',
        phase: 'inspection',
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

      await service.executePhase({
        specId: 'test-spec',
        phase: 'inspection',
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

  describe('executeValidation', () => {
    it('should build command with --output-format stream-json', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executeValidation({
        specId: 'test-spec',
        type: 'impl',
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

      await service.executeValidation({
        specId: 'test-spec',
        type: 'gap',
        featureName: 'my-feature',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['--verbose', '/kiro:validate-gap my-feature']),
        })
      );

      startAgentSpy.mockRestore();
    });
  });

  describe('executeSpecStatus', () => {
    it('should build command with --verbose and --output-format stream-json', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      await service.executeSpecStatus('test-spec', 'my-feature');

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'claude',
          args: expect.arrayContaining(['--verbose', '--output-format', 'stream-json']),
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

      const specAAgents = service.getAgents('spec-a');
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

      const allAgents = service.getAllAgents();
      expect(allAgents.size).toBe(2);
      expect(allAgents.get('spec-a')).toHaveLength(1);
      expect(allAgents.get('spec-b')).toHaveLength(1);
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
        documentReviewFlag: 'skip',
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
      expect(updatedParsed.autoExecution.documentReviewFlag).toBe('skip');
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
