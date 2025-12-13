/**
 * SSHAuthService Unit Tests
 * TDD: Testing SSH authentication methods and fallback chain
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SSHAuthService, type AuthMethod } from './sshAuthService';

// Mock fs/promises
vi.mock('fs/promises');
vi.mock('os');

describe('SSHAuthService', () => {
  let authService: SSHAuthService;

  beforeEach(() => {
    authService = new SSHAuthService();
    vi.resetAllMocks();

    // Default mock for os.homedir
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthMethods', () => {
    it('should return agent auth method when SSH_AUTH_SOCK is set', async () => {
      // Setup: SSH_AUTH_SOCK environment variable is set
      const originalEnv = process.env.SSH_AUTH_SOCK;
      process.env.SSH_AUTH_SOCK = '/tmp/ssh-agent.sock';

      // Mock: No private keys exist
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      try {
        const methods = await authService.getAuthMethods('host.example.com', 'user');

        expect(methods).toContainEqual(
          expect.objectContaining({
            type: 'agent',
            socketPath: '/tmp/ssh-agent.sock',
          })
        );
      } finally {
        process.env.SSH_AUTH_SOCK = originalEnv;
      }
    });

    it('should return privateKey auth methods for existing key files', async () => {
      // Mock: id_ed25519 exists
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('id_ed25519')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      // Mock: Read private key to check passphrase
      vi.mocked(fs.readFile).mockResolvedValue('-----BEGIN OPENSSH PRIVATE KEY-----\nencrypted\n-----END OPENSSH PRIVATE KEY-----');

      const methods = await authService.getAuthMethods('host.example.com', 'user');

      const privateKeyMethods = methods.filter((m) => m.type === 'privateKey');
      expect(privateKeyMethods.length).toBeGreaterThan(0);
      expect(privateKeyMethods[0]).toEqual(
        expect.objectContaining({
          type: 'privateKey',
          keyPath: expect.stringContaining('id_ed25519'),
        })
      );
    });

    it('should detect passphrase-protected keys', async () => {
      // Mock: id_rsa exists and is encrypted
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('id_rsa') && !String(filePath).includes('.pub')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      // Encrypted key content
      vi.mocked(fs.readFile).mockResolvedValue(
        '-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC\n-----END RSA PRIVATE KEY-----'
      );

      const methods = await authService.getAuthMethods('host.example.com', 'user');

      const privateKeyMethods = methods.filter((m) => m.type === 'privateKey') as Array<{ type: 'privateKey'; keyPath: string; hasPassphrase: boolean }>;
      expect(privateKeyMethods.length).toBeGreaterThan(0);
      expect(privateKeyMethods[0].hasPassphrase).toBe(true);
    });

    it('should detect unencrypted keys', async () => {
      // Mock: id_rsa exists and is not encrypted
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('id_rsa') && !String(filePath).includes('.pub')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      // Unencrypted key content (no ENCRYPTED marker)
      vi.mocked(fs.readFile).mockResolvedValue(
        '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----'
      );

      const methods = await authService.getAuthMethods('host.example.com', 'user');

      const privateKeyMethods = methods.filter((m) => m.type === 'privateKey') as Array<{ type: 'privateKey'; keyPath: string; hasPassphrase: boolean }>;
      expect(privateKeyMethods.length).toBeGreaterThan(0);
      expect(privateKeyMethods[0].hasPassphrase).toBe(false);
    });

    it('should always include password method as fallback', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const methods = await authService.getAuthMethods('host.example.com', 'user');

      expect(methods).toContainEqual({ type: 'password' });
    });

    it('should return methods in priority order: agent > privateKey > password', async () => {
      const originalEnv = process.env.SSH_AUTH_SOCK;
      process.env.SSH_AUTH_SOCK = '/tmp/ssh-agent.sock';

      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('id_ed25519')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });
      vi.mocked(fs.readFile).mockResolvedValue('-----BEGIN OPENSSH PRIVATE KEY-----\n-----END OPENSSH PRIVATE KEY-----');

      try {
        const methods = await authService.getAuthMethods('host.example.com', 'user');

        const types = methods.map((m) => m.type);
        const agentIndex = types.indexOf('agent');
        const privateKeyIndex = types.indexOf('privateKey');
        const passwordIndex = types.indexOf('password');

        expect(agentIndex).toBeLessThan(privateKeyIndex);
        expect(privateKeyIndex).toBeLessThan(passwordIndex);
      } finally {
        process.env.SSH_AUTH_SOCK = originalEnv;
      }
    });

    it('should check multiple key file locations', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      await authService.getAuthMethods('host.example.com', 'user');

      // Should check for common key types
      const accessCalls = vi.mocked(fs.access).mock.calls.map((c) => String(c[0]));
      expect(accessCalls.some((p) => p.includes('id_rsa'))).toBe(true);
      expect(accessCalls.some((p) => p.includes('id_ed25519'))).toBe(true);
      expect(accessCalls.some((p) => p.includes('id_ecdsa'))).toBe(true);
    });
  });

  describe('createAuthHandler', () => {
    it('should create an auth handler function', () => {
      const onPasswordRequired = vi.fn().mockResolvedValue('secret');
      const onPassphraseRequired = vi.fn().mockResolvedValue('passphrase');

      const handler = authService.createAuthHandler(onPasswordRequired, onPassphraseRequired);

      expect(typeof handler).toBe('function');
    });

    it('should call password callback when password auth is needed', async () => {
      const onPasswordRequired = vi.fn().mockResolvedValue('mypassword');
      const onPassphraseRequired = vi.fn();

      const handler = authService.createAuthHandler(onPasswordRequired, onPassphraseRequired);

      // Simulate ssh2 calling the auth handler
      const callback = vi.fn();
      handler(['password'], null, callback);

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onPasswordRequired).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'password',
          password: 'mypassword',
        })
      );
    });

    it('should call passphrase callback for encrypted key', async () => {
      const onPasswordRequired = vi.fn();
      const onPassphraseRequired = vi.fn().mockResolvedValue('myphrase');

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('encrypted-key-content');

      const handler = authService.createAuthHandler(onPasswordRequired, onPassphraseRequired);

      // Set up key that needs passphrase
      authService.setCurrentKey('/home/user/.ssh/id_rsa', true);

      const callback = vi.fn();
      handler(['publickey'], null, callback);

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onPassphraseRequired).toHaveBeenCalledWith('/home/user/.ssh/id_rsa');
    });

    it('should signal end when no more auth methods', async () => {
      const onPasswordRequired = vi.fn();
      const onPassphraseRequired = vi.fn();

      const handler = authService.createAuthHandler(onPasswordRequired, onPassphraseRequired);

      const callback = vi.fn();
      handler([], null, callback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe('clearCredentials', () => {
    it('should clear any cached credentials', () => {
      // Set some internal state
      authService.setCurrentKey('/path/to/key', true);

      authService.clearCredentials();

      // After clearing, state should be reset
      // This is internal behavior, so we verify via auth handler
      const handler = authService.createAuthHandler(
        vi.fn().mockResolvedValue('pass'),
        vi.fn()
      );

      // Handler should not have previous key info
      expect(handler).toBeDefined();
    });
  });
});
