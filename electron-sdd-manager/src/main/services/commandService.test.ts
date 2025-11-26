/**
 * CommandService Unit Tests
 * TDD: Testing command allowlist and platform detection
 * Requirements: 12.4, 13.4, 13.5
 */

import { describe, it, expect } from 'vitest';
import { isCommandAllowed, getShellCommand, ALLOWED_COMMANDS } from './commandService';

describe('Command Allowlist', () => {
  describe('isCommandAllowed', () => {
    it('should allow /kiro:spec-requirements command', () => {
      expect(isCommandAllowed('/kiro:spec-requirements feature-name')).toBe(true);
    });

    it('should allow /kiro:spec-design command', () => {
      expect(isCommandAllowed('/kiro:spec-design feature-name')).toBe(true);
      expect(isCommandAllowed('/kiro:spec-design feature-name -y')).toBe(true);
    });

    it('should allow /kiro:spec-tasks command', () => {
      expect(isCommandAllowed('/kiro:spec-tasks feature-name')).toBe(true);
    });

    it('should allow /kiro:spec-impl command', () => {
      expect(isCommandAllowed('/kiro:spec-impl feature-name')).toBe(true);
      expect(isCommandAllowed('/kiro:spec-impl feature-name 1.1')).toBe(true);
    });

    it('should allow /kiro:spec-status command', () => {
      expect(isCommandAllowed('/kiro:spec-status feature-name')).toBe(true);
    });

    it('should allow /kiro:spec-init command', () => {
      expect(isCommandAllowed('/kiro:spec-init "description"')).toBe(true);
    });

    it('should reject arbitrary shell commands', () => {
      expect(isCommandAllowed('rm -rf /')).toBe(false);
      expect(isCommandAllowed('cat /etc/passwd')).toBe(false);
      expect(isCommandAllowed('ls -la')).toBe(false);
    });

    it('should reject commands with shell injection attempts', () => {
      expect(isCommandAllowed('/kiro:spec-requirements; rm -rf /')).toBe(false);
      expect(isCommandAllowed('/kiro:spec-requirements && cat /etc/passwd')).toBe(false);
      expect(isCommandAllowed('/kiro:spec-requirements | grep secret')).toBe(false);
      expect(isCommandAllowed('/kiro:spec-requirements `whoami`')).toBe(false);
      expect(isCommandAllowed('/kiro:spec-requirements $(id)')).toBe(false);
    });

    it('should reject empty commands', () => {
      expect(isCommandAllowed('')).toBe(false);
      expect(isCommandAllowed('   ')).toBe(false);
    });
  });
});

describe('Platform Shell Selection', () => {
  describe('getShellCommand', () => {
    it('should return cmd for win32 platform', () => {
      const result = getShellCommand('win32');
      expect(result.shell).toBe('cmd');
      expect(result.shellArgs).toContain('/c');
    });

    it('should return sh for darwin platform', () => {
      const result = getShellCommand('darwin');
      expect(result.shell).toBe('/bin/sh');
      expect(result.shellArgs).toContain('-c');
    });

    it('should return sh for linux platform', () => {
      const result = getShellCommand('linux');
      expect(result.shell).toBe('/bin/sh');
      expect(result.shellArgs).toContain('-c');
    });
  });
});

describe('Allowed Commands List', () => {
  it('should include all required kiro commands', () => {
    expect(ALLOWED_COMMANDS).toContain('/kiro:spec-requirements');
    expect(ALLOWED_COMMANDS).toContain('/kiro:spec-design');
    expect(ALLOWED_COMMANDS).toContain('/kiro:spec-tasks');
    expect(ALLOWED_COMMANDS).toContain('/kiro:spec-impl');
    expect(ALLOWED_COMMANDS).toContain('/kiro:spec-status');
    expect(ALLOWED_COMMANDS).toContain('/kiro:spec-init');
  });
});
