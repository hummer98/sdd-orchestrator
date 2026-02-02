/**
 * Tests for AgentStartErrorClassifier service
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 (Error classification)
 *
 * agent-error-notification feature
 */

import { describe, it, expect } from 'vitest';
import { classifySpawnError, classifyExitError } from './agentStartErrorClassifier';

describe('AgentStartErrorClassifier', () => {
  describe('classifySpawnError', () => {
    it('should classify ENOENT error as COMMAND_NOT_FOUND', () => {
      // Requirement 2.1: ENOENT -> COMMAND_NOT_FOUND
      const error = new Error('spawn claude ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';

      const result = classifySpawnError(error, 'claude');

      expect(result.type).toBe('COMMAND_NOT_FOUND');
      expect(result.message).toContain('ENOENT');
      expect(result.details?.command).toBe('claude');
    });

    it('should classify EACCES error as SPAWN_ERROR', () => {
      const error = new Error('spawn claude EACCES') as NodeJS.ErrnoException;
      error.code = 'EACCES';

      const result = classifySpawnError(error, 'claude');

      expect(result.type).toBe('SPAWN_ERROR');
      expect(result.message).toContain('EACCES');
      expect(result.details?.command).toBe('claude');
    });

    it('should classify unknown spawn error as SPAWN_ERROR', () => {
      const error = new Error('spawn failed') as NodeJS.ErrnoException;

      const result = classifySpawnError(error, 'claude');

      expect(result.type).toBe('SPAWN_ERROR');
      expect(result.message).toBe('spawn failed');
      expect(result.details?.command).toBe('claude');
    });
  });

  describe('classifyExitError', () => {
    it('should classify stderr containing "not logged in" as AUTH_REQUIRED', () => {
      // Requirement 2.3: "not logged in" -> AUTH_REQUIRED
      const result = classifyExitError(1, 'Error: not logged in', 'claude');

      expect(result.type).toBe('AUTH_REQUIRED');
      expect(result.details?.exitCode).toBe(1);
      expect(result.details?.stderr).toBe('Error: not logged in');
    });

    it('should classify stderr containing "NOT LOGGED IN" (case insensitive) as AUTH_REQUIRED', () => {
      // Case insensitive matching
      const result = classifyExitError(1, 'NOT LOGGED IN - please authenticate', 'claude');

      expect(result.type).toBe('AUTH_REQUIRED');
    });

    it('should classify stderr containing "API key" as API_KEY_MISSING', () => {
      // Requirement 2.4: "API key" -> API_KEY_MISSING
      const result = classifyExitError(1, 'API key not set', 'claude');

      expect(result.type).toBe('API_KEY_MISSING');
      expect(result.details?.exitCode).toBe(1);
      expect(result.details?.stderr).toBe('API key not set');
    });

    it('should classify stderr containing "api_key" (case insensitive) as API_KEY_MISSING', () => {
      const result = classifyExitError(1, 'Missing api_key in environment', 'claude');

      expect(result.type).toBe('API_KEY_MISSING');
    });

    it('should classify stderr containing "ANTHROPIC_API_KEY" as API_KEY_MISSING', () => {
      const result = classifyExitError(1, 'ANTHROPIC_API_KEY is not set', 'claude');

      expect(result.type).toBe('API_KEY_MISSING');
    });

    it('should classify unrecognized stderr as UNKNOWN_ERROR', () => {
      // Requirement 2.5: Unclassified -> UNKNOWN_ERROR
      const result = classifyExitError(1, 'Something went wrong', 'claude');

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('Something went wrong');
      expect(result.details?.exitCode).toBe(1);
      expect(result.details?.stderr).toBe('Something went wrong');
      expect(result.details?.command).toBe('claude');
    });

    it('should classify empty stderr as UNKNOWN_ERROR', () => {
      const result = classifyExitError(1, '', 'claude');

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.details?.exitCode).toBe(1);
    });

    it('should preserve full error details in all cases', () => {
      const result = classifyExitError(127, 'command not found', '/usr/local/bin/claude');

      expect(result.details?.exitCode).toBe(127);
      expect(result.details?.stderr).toBe('command not found');
      expect(result.details?.command).toBe('/usr/local/bin/claude');
    });
  });
});
