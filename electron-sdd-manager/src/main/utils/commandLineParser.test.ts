/**
 * Command Line Parser Tests
 * Tests for parsing command line arguments including SSH URIs
 * Requirements: 1.4, 10.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseProjectArg, isSSHUri, parseInitialConnection } from './commandLineParser';

describe('Command Line Parser', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  beforeEach(() => {
    process.argv = ['node', 'app'];
    process.env = { ...originalEnv };
    delete process.env.SDD_PROJECT_PATH;
    delete process.env.SDD_SSH_URI;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('parseProjectArg', () => {
    it('should parse --project=<path> format', () => {
      process.argv = ['node', 'app', '--project=/path/to/project'];

      const result = parseProjectArg();

      expect(result).toBe('/path/to/project');
    });

    it('should parse --project <path> format', () => {
      process.argv = ['node', 'app', '--project', '/path/to/project'];

      const result = parseProjectArg();

      expect(result).toBe('/path/to/project');
    });

    it('should parse SSH URI from --project', () => {
      process.argv = ['node', 'app', '--project=ssh://user@host.com/path/to/project'];

      const result = parseProjectArg();

      expect(result).toBe('ssh://user@host.com/path/to/project');
    });

    it('should return null when no project argument', () => {
      process.argv = ['node', 'app', '--other-flag'];

      const result = parseProjectArg();

      expect(result).toBeNull();
    });

    it('should use SDD_PROJECT_PATH environment variable', () => {
      process.env.SDD_PROJECT_PATH = '/env/project/path';

      const result = parseProjectArg();

      expect(result).toBe('/env/project/path');
    });

    it('should use SDD_SSH_URI environment variable for SSH', () => {
      process.env.SDD_SSH_URI = 'ssh://user@host.com/path';

      const result = parseProjectArg();

      expect(result).toBe('ssh://user@host.com/path');
    });

    it('should prefer SDD_SSH_URI over SDD_PROJECT_PATH', () => {
      process.env.SDD_PROJECT_PATH = '/local/path';
      process.env.SDD_SSH_URI = 'ssh://user@host.com/path';

      const result = parseProjectArg();

      expect(result).toBe('ssh://user@host.com/path');
    });
  });

  describe('isSSHUri', () => {
    it('should return true for valid SSH URI', () => {
      expect(isSSHUri('ssh://user@host.com/path')).toBe(true);
    });

    it('should return true for SSH URI with port', () => {
      expect(isSSHUri('ssh://user@host.com:2222/path')).toBe(true);
    });

    it('should return false for local path', () => {
      expect(isSSHUri('/local/path')).toBe(false);
    });

    it('should return false for http URL', () => {
      expect(isSSHUri('http://example.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSSHUri('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSSHUri(null)).toBe(false);
    });
  });

  describe('parseInitialConnection', () => {
    it('should return local type for local path', () => {
      process.argv = ['node', 'app', '--project=/local/path'];

      const result = parseInitialConnection();

      expect(result).toEqual({
        type: 'local',
        path: '/local/path',
      });
    });

    it('should return ssh type for SSH URI', () => {
      process.argv = ['node', 'app', '--project=ssh://user@host.com/path'];

      const result = parseInitialConnection();

      expect(result).toEqual({
        type: 'ssh',
        uri: 'ssh://user@host.com/path',
      });
    });

    it('should return null when no argument', () => {
      process.argv = ['node', 'app'];

      const result = parseInitialConnection();

      expect(result).toBeNull();
    });
  });
});
