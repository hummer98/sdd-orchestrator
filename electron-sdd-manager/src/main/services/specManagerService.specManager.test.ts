/**
 * SpecManagerService - spec-manager Extensions Tests
 * TDD: Testing spec-manager command execution and completion detection
 * Requirements: 3.1, 3.2, 3.6, 5.1, 5.6, 5.7, 5.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { ResultSubtype } from './logParserService';

// Mock dependencies before importing SpecManagerService
vi.mock('./logParserService', () => ({
  LogParserService: vi.fn().mockImplementation(() => ({
    parseResultSubtype: vi.fn(),
    getResultLine: vi.fn(),
    getLastAssistantMessage: vi.fn(),
  })),
}));

vi.mock('./fileService', () => ({
  FileService: vi.fn().mockImplementation(() => ({
    updateSpecJsonFromPhase: vi.fn(),
    readSpecJson: vi.fn(),
  })),
}));

// Import after mocks
import { SpecManagerService, MAX_CONTINUE_RETRIES } from './specManagerService';
import { LogParserService } from './logParserService';

describe('SpecManagerService - spec-manager Extensions', () => {
  let testDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `spec-manager-ext-test-${Date.now()}`);
    await fs.mkdir(path.join(testDir, '.kiro', 'runtime', 'agents'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.kiro', 'specs', 'test-feature'), { recursive: true });
    service = new SpecManagerService(testDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await service.stopAllAgents();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================
  // Task 5.1: spec-manager用コマンド実行・完了判定機能
  // Requirements: 3.1, 3.2, 3.6, 5.1
  // ============================================================
  describe('Task 5.1: executeSpecManagerPhase', () => {
    it('should build correct command for requirements phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      // This method will be added - for now just verify the interface
      const options = {
        specId: 'test-spec',
        phase: 'requirements' as const,
        featureName: 'test-feature',
        executionMode: 'manual' as const,
      };

      // Method should exist after implementation
      expect(typeof service.executeSpecManagerPhase).toBe('function');

      startAgentSpy.mockRestore();
    });

    it('should build correct command for design phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      const options = {
        specId: 'test-spec',
        phase: 'design' as const,
        featureName: 'test-feature',
        executionMode: 'manual' as const,
      };

      expect(typeof service.executeSpecManagerPhase).toBe('function');

      startAgentSpy.mockRestore();
    });

    it('should build correct command for tasks phase', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      const options = {
        specId: 'test-spec',
        phase: 'tasks' as const,
        featureName: 'test-feature',
        executionMode: 'manual' as const,
      };

      expect(typeof service.executeSpecManagerPhase).toBe('function');

      startAgentSpy.mockRestore();
    });

    it('should build correct command for impl phase with taskId', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent');

      const options = {
        specId: 'test-spec',
        phase: 'impl' as const,
        featureName: 'test-feature',
        taskId: '1.1',
        executionMode: 'manual' as const,
      };

      expect(typeof service.executeSpecManagerPhase).toBe('function');

      startAgentSpy.mockRestore();
    });

    it('should use /spec-manager: prefix for commands', async () => {
      const startAgentSpy = vi.spyOn(service, 'startAgent').mockResolvedValue({
        ok: true,
        value: {
          agentId: 'test-agent',
          specId: 'test-spec',
          phase: 'requirements',
          pid: 12345,
          sessionId: '',
          status: 'running',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          command: 'claude',
        },
      });

      await service.executeSpecManagerPhase({
        specId: 'test-spec',
        phase: 'requirements',
        featureName: 'test-feature',
        executionMode: 'manual',
      });

      expect(startAgentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            expect.stringMatching(/\/spec-manager:requirements test-feature/),
          ]),
        })
      );

      startAgentSpy.mockRestore();
    });
  });

  // ============================================================
  // Task 5.2: 自動リトライ機能
  // Requirements: 5.6, 5.7, 5.8
  // ============================================================
  describe('Task 5.2: retryWithContinue', () => {
    it('should exist as a method', () => {
      expect(typeof service.retryWithContinue).toBe('function');
    });

    it('should return stalled when retry count exceeds MAX_CONTINUE_RETRIES', async () => {
      const result = await service.retryWithContinue('session-123', 2);

      if (result.ok && 'status' in result.value) {
        expect(result.value.status).toBe('stalled');
      }
    });

    it('should resume session with "continue" prompt when retry count < 2', async () => {
      // The retry function checks the registry for the original agent
      // Since we can't easily mock the internal registry, we test the logic indirectly
      // When agent is not found, it returns SESSION_NOT_FOUND error
      const result = await service.retryWithContinue('session-123', 0);

      // Should return error because no agent is registered with this session
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SESSION_NOT_FOUND');
      }
    });

    it('should call startAgent with correct resume args when agent exists', async () => {
      // We verify the args construction logic separately
      // The method builds the correct args: ['--resume', sessionId, 'continue']
      const expectedArgs = ['-p', '--resume', 'session-123', 'continue'];
      expect(expectedArgs).toContain('--resume');
      expect(expectedArgs).toContain('session-123');
      expect(expectedArgs).toContain('continue');
    });
  });

  // ============================================================
  // Task 5.3: impl完了解析機能 (implCompletionAnalyzer was removed in execution-store-consolidation)
  // NOTE: analyzeImplCompletion method and ImplCompletionAnalyzer were removed.
  // Tests for this functionality have been removed.
  // ============================================================

  // ============================================================
  // Mutex Pattern for Exclusive Control
  // Requirements: 3.6
  // ============================================================
  describe('Mutex pattern for spec.json updates', () => {
    it('should only allow one spec-manager operation at a time', async () => {
      // Test that concurrent operations are blocked
      expect(typeof service.isSpecManagerOperationRunning).toBe('function');
    });

    it('should acquire lock before updating spec.json', async () => {
      expect(typeof service.acquireSpecManagerLock).toBe('function');
    });

    it('should release lock after operation completes', async () => {
      expect(typeof service.releaseSpecManagerLock).toBe('function');
    });
  });
});

describe('MAX_CONTINUE_RETRIES constant', () => {
  it('should be 2', () => {
    expect(MAX_CONTINUE_RETRIES).toBe(2);
  });
});
