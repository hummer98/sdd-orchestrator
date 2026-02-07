/**
 * Agent Start Error Classification Integration Tests
 * agent-error-notification Task 9.1
 * Requirements: 5.1, 5.2
 * trpc-full-migration Task 11.2: IPC_CHANNELS removed, EVENT_NAMES used instead
 *
 * Tests the error classification flow:
 * 1. Mock child_process.spawn to emit ENOENT error
 * 2. Verify classifySpawnError is called
 * 3. Verify EVENT_NAMES.AGENT_START_ERROR is defined for EventBus
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifySpawnError, classifyExitError } from './agentStartErrorClassifier';
import type { AgentStartError, AgentStartErrorType } from '../../shared/types/agentStartError';
import { EVENT_NAMES } from '../trpc/services/eventBus';

// Mock projectLogger
vi.mock('./projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Agent Start Error Classification Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================
  // Task 9.1: Spawn error classification flow
  // Requirements: 5.1 - statusCallbacks for failed notification
  // ============================================================

  describe('Task 9.1: Spawn error classification flow', () => {
    it('should classify ENOENT error as COMMAND_NOT_FOUND', () => {
      // Simulate ENOENT spawn error
      const error = new Error('spawn claude ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      error.errno = -2;
      error.syscall = 'spawn';
      error.path = 'claude';

      // Test classifySpawnError
      const result = classifySpawnError(error, 'claude');

      expect(result.type).toBe('COMMAND_NOT_FOUND');
      expect(result.message).toContain('Command not found');
      expect(result.message).toContain('claude');
      expect(result.details?.command).toBe('claude');
    });

    it('should classify other spawn errors as SPAWN_ERROR', () => {
      // Simulate non-ENOENT spawn error (e.g., EACCES)
      const error = new Error('spawn claude EACCES') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      error.errno = -13;
      error.syscall = 'spawn';
      error.path = 'claude';

      const result = classifySpawnError(error, 'claude');

      expect(result.type).toBe('SPAWN_ERROR');
      expect(result.message).toContain('EACCES');
      expect(result.details?.command).toBe('claude');
    });
  });

  // ============================================================
  // Task 9.1: Immediate exit classification flow
  // Requirements: 5.2 - AGENT_START_ERROR additional notification
  // ============================================================

  describe('Task 9.1: Immediate exit classification flow', () => {
    it('should classify "not logged in" stderr as AUTH_REQUIRED', () => {
      const stderr = 'Error: You are not logged in. Please run `claude login` first.';
      const result = classifyExitError(1, stderr, 'claude');

      expect(result.type).toBe('AUTH_REQUIRED');
      expect(result.message).toContain('authentication required');
      expect(result.details?.exitCode).toBe(1);
      expect(result.details?.stderr).toBe(stderr);
    });

    it('should classify "API key" stderr as API_KEY_MISSING', () => {
      const stderr = 'Error: ANTHROPIC_API_KEY environment variable is not set.';
      const result = classifyExitError(1, stderr, 'claude');

      expect(result.type).toBe('API_KEY_MISSING');
      expect(result.message).toContain('API key');
      expect(result.details?.exitCode).toBe(1);
      expect(result.details?.stderr).toBe(stderr);
    });

    it('should classify unrecognized stderr as UNKNOWN_ERROR', () => {
      const stderr = 'Some random error message';
      const result = classifyExitError(1, stderr, 'claude');

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe(stderr);
      expect(result.details?.exitCode).toBe(1);
    });
  });

  // ============================================================
  // EventBus Event Name Definition Test
  // Requirements: 5.2 - Verify event name exists for tRPC Subscription
  // ============================================================

  describe('EventBus Event Name Definition', () => {
    it('should have AGENT_START_ERROR event name defined', () => {
      expect(EVENT_NAMES.AGENT_START_ERROR).toBeDefined();
      expect(EVENT_NAMES.AGENT_START_ERROR).toBe('events:agent-start-error');
    });

    it('should have both AGENT_STATUS_CHANGE and AGENT_START_ERROR for dual notification', () => {
      // Both event names should be defined for dual notification pattern
      expect(EVENT_NAMES.AGENT_STATUS_CHANGE).toBeDefined();
      expect(EVENT_NAMES.AGENT_START_ERROR).toBeDefined();

      // They should be different event names
      expect(EVENT_NAMES.AGENT_STATUS_CHANGE).not.toBe(EVENT_NAMES.AGENT_START_ERROR);
    });
  });

  // ============================================================
  // Error type coverage test
  // Requirements: 2.1-2.5 - All error types should be classifiable
  // ============================================================

  describe('Error type coverage', () => {
    const errorTypes: AgentStartErrorType[] = [
      'COMMAND_NOT_FOUND',
      'AUTH_REQUIRED',
      'API_KEY_MISSING',
      'SPAWN_ERROR',
      'UNKNOWN_ERROR',
    ];

    it('should support all defined error types', () => {
      // Verify error types match the type definition
      const classifiedTypes = new Set<AgentStartErrorType>();

      // COMMAND_NOT_FOUND via spawn error
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
      enoent.code = 'ENOENT';
      classifiedTypes.add(classifySpawnError(enoent, 'cmd').type);

      // SPAWN_ERROR via other spawn error
      const eacces = new Error('EACCES') as NodeJS.ErrnoException;
      eacces.code = 'EACCES';
      classifiedTypes.add(classifySpawnError(eacces, 'cmd').type);

      // AUTH_REQUIRED via stderr
      classifiedTypes.add(classifyExitError(1, 'not logged in', 'cmd').type);

      // API_KEY_MISSING via stderr
      classifiedTypes.add(classifyExitError(1, 'API key required', 'cmd').type);

      // UNKNOWN_ERROR via unrecognized stderr
      classifiedTypes.add(classifyExitError(1, 'random error', 'cmd').type);

      // Verify all error types are covered
      for (const type of errorTypes) {
        expect(classifiedTypes.has(type)).toBe(true);
      }
    });
  });
});
