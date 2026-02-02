/**
 * Tests for AgentStartError types
 * Requirements: 2.6 (AgentStartError type definition)
 */

import { describe, it, expect } from 'vitest';
import type { AgentStartError, AgentStartErrorType } from './agentStartError';

describe('AgentStartError Types', () => {
  describe('AgentStartErrorType', () => {
    it('should allow COMMAND_NOT_FOUND type', () => {
      const errorType: AgentStartErrorType = 'COMMAND_NOT_FOUND';
      expect(errorType).toBe('COMMAND_NOT_FOUND');
    });

    it('should allow AUTH_REQUIRED type', () => {
      const errorType: AgentStartErrorType = 'AUTH_REQUIRED';
      expect(errorType).toBe('AUTH_REQUIRED');
    });

    it('should allow API_KEY_MISSING type', () => {
      const errorType: AgentStartErrorType = 'API_KEY_MISSING';
      expect(errorType).toBe('API_KEY_MISSING');
    });

    it('should allow SPAWN_ERROR type', () => {
      const errorType: AgentStartErrorType = 'SPAWN_ERROR';
      expect(errorType).toBe('SPAWN_ERROR');
    });

    it('should allow UNKNOWN_ERROR type', () => {
      const errorType: AgentStartErrorType = 'UNKNOWN_ERROR';
      expect(errorType).toBe('UNKNOWN_ERROR');
    });
  });

  describe('AgentStartError', () => {
    it('should allow error with type and message only', () => {
      const error: AgentStartError = {
        type: 'COMMAND_NOT_FOUND',
        message: 'Command not found: claude',
      };
      expect(error.type).toBe('COMMAND_NOT_FOUND');
      expect(error.message).toBe('Command not found: claude');
      expect(error.details).toBeUndefined();
    });

    it('should allow error with all details', () => {
      const error: AgentStartError = {
        type: 'UNKNOWN_ERROR',
        message: 'Agent failed to start',
        details: {
          exitCode: 1,
          stderr: 'Error output',
          command: 'claude',
        },
      };
      expect(error.type).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('Agent failed to start');
      expect(error.details?.exitCode).toBe(1);
      expect(error.details?.stderr).toBe('Error output');
      expect(error.details?.command).toBe('claude');
    });

    it('should allow error with partial details', () => {
      const error: AgentStartError = {
        type: 'AUTH_REQUIRED',
        message: 'Authentication required',
        details: {
          stderr: 'not logged in',
        },
      };
      expect(error.details?.stderr).toBe('not logged in');
      expect(error.details?.exitCode).toBeUndefined();
      expect(error.details?.command).toBeUndefined();
    });
  });
});
