/**
 * HostKeyManager Unit Tests
 * TDD: Testing host key verification and known_hosts management
 * Requirements: 9.1, 9.2, 9.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { HostKeyManager, type HostKeyVerificationResult } from './hostKeyManager';

// Mock modules
vi.mock('fs/promises');
vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

describe('HostKeyManager', () => {
  let manager: HostKeyManager;

  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
    manager = new HostKeyManager();
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFingerprint', () => {
    it('should calculate SHA256 fingerprint', () => {
      const key = Buffer.from('ssh-rsa AAAA... test-key');

      const fingerprint = manager.getFingerprint(key, 'sha256');

      expect(fingerprint).toMatch(/^SHA256:/);
      expect(fingerprint.length).toBeGreaterThan(10);
    });

    it('should calculate MD5 fingerprint', () => {
      const key = Buffer.from('ssh-rsa AAAA... test-key');

      const fingerprint = manager.getFingerprint(key, 'md5');

      expect(fingerprint).toMatch(/^MD5:/);
      // MD5 fingerprint is typically displayed as hex pairs separated by colons
      expect(fingerprint).toMatch(/^MD5:[0-9a-f:]+$/i);
    });

    it('should default to SHA256', () => {
      const key = Buffer.from('test-key');

      const fingerprint = manager.getFingerprint(key);

      expect(fingerprint).toMatch(/^SHA256:/);
    });

    it('should produce consistent fingerprints for same key', () => {
      const key = Buffer.from('consistent-test-key');

      const fp1 = manager.getFingerprint(key);
      const fp2 = manager.getFingerprint(key);

      expect(fp1).toBe(fp2);
    });
  });

  describe('verifyHostKey', () => {
    it('should return "known" for matching host key', async () => {
      const key = Buffer.from('ssh-rsa AAAA... known-key');
      const fingerprint = manager.getFingerprint(key);

      // Mock known_hosts file with this host
      const knownHostsContent = `example.com ssh-rsa AAAA... known-key
other.host ssh-ed25519 AAAB...`;

      vi.mocked(fs.readFile).mockResolvedValue(knownHostsContent);

      const result = await manager.verifyHostKey('example.com', 22, key);

      expect(result.status).toBe('known');
      expect(result.fingerprint).toBe(fingerprint);
    });

    it('should return "unknown" for new host', async () => {
      const key = Buffer.from('ssh-rsa AAAA... new-key');

      // Mock known_hosts without this host
      vi.mocked(fs.readFile).mockResolvedValue('other.host ssh-rsa AAAA...');

      const result = await manager.verifyHostKey('newhost.com', 22, key);

      expect(result.status).toBe('unknown');
      expect(result.fingerprint).toBeDefined();
    });

    it('should return "unknown" when known_hosts does not exist', async () => {
      const key = Buffer.from('ssh-rsa AAAA... key');

      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });

      const result = await manager.verifyHostKey('host.com', 22, key);

      expect(result.status).toBe('unknown');
    });

    it('should return "changed" when host key has changed', async () => {
      const oldKey = Buffer.from('ssh-rsa OLD-KEY');
      const newKey = Buffer.from('ssh-rsa NEW-KEY');
      const oldFingerprint = manager.getFingerprint(oldKey);
      const newFingerprint = manager.getFingerprint(newKey);

      // Mock known_hosts with old key
      vi.mocked(fs.readFile).mockResolvedValue('changedhost.com ssh-rsa OLD-KEY');

      const result = await manager.verifyHostKey('changedhost.com', 22, newKey);

      expect(result.status).toBe('changed');
      if (result.status === 'changed') {
        expect(result.oldFingerprint).toBe(oldFingerprint);
        expect(result.newFingerprint).toBe(newFingerprint);
      }
    });

    it('should handle non-standard port in known_hosts', async () => {
      const key = Buffer.from('ssh-rsa AAAA... port-key');

      // known_hosts format for non-standard port: [host]:port
      vi.mocked(fs.readFile).mockResolvedValue('[example.com]:2222 ssh-rsa AAAA... port-key');

      const result = await manager.verifyHostKey('example.com', 2222, key);

      expect(result.status).toBe('known');
    });

    it('should treat port 22 as standard (no bracket notation)', async () => {
      const key = Buffer.from('ssh-rsa AAAA... standard-key');

      vi.mocked(fs.readFile).mockResolvedValue('example.com ssh-rsa AAAA... standard-key');

      const result = await manager.verifyHostKey('example.com', 22, key);

      expect(result.status).toBe('known');
    });
  });

  describe('acceptHostKey', () => {
    it('should append new host to known_hosts', async () => {
      const key = Buffer.from('ssh-rsa AAAA... new-accepted-key');

      vi.mocked(fs.readFile).mockResolvedValue('existing.host ssh-rsa AAAA...\n');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.acceptHostKey('newhost.com', 22, key);

      expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[0]).toContain('known_hosts');
      expect(String(writeCall[1])).toContain('newhost.com');
    });

    it('should create known_hosts file if it does not exist', async () => {
      const key = Buffer.from('ssh-rsa AAAA... first-key');

      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.acceptHostKey('firsthost.com', 22, key);

      expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith(
        expect.stringContaining('.ssh'),
        expect.objectContaining({ recursive: true })
      );
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
    });

    it('should use bracket notation for non-standard ports', async () => {
      const key = Buffer.from('ssh-rsa AAAA... nonstandard-port-key');

      vi.mocked(fs.readFile).mockResolvedValue('');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.acceptHostKey('host.com', 2222, key);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(String(writeCall[1])).toContain('[host.com]:2222');
    });

    it('should update existing entry when key changes', async () => {
      const oldContent = 'example.com ssh-rsa OLD-KEY\nother.host ssh-ed25519 AAAA...';
      const newKey = Buffer.from('ssh-rsa NEW-KEY');

      vi.mocked(fs.readFile).mockResolvedValue(oldContent);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.acceptHostKey('example.com', 22, newKey);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = String(writeCall[1]);

      // Should contain new key
      expect(writtenContent).toContain('ssh-rsa NEW-KEY');
      // Should not contain old key
      expect(writtenContent).not.toContain('OLD-KEY');
      // Should preserve other hosts
      expect(writtenContent).toContain('other.host');
    });
  });

  describe('removeHostKey', () => {
    it('should remove host entry from known_hosts', async () => {
      const content = 'host1.com ssh-rsa KEY1\nhost2.com ssh-rsa KEY2\nhost3.com ssh-rsa KEY3';

      vi.mocked(fs.readFile).mockResolvedValue(content);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await manager.removeHostKey('host2.com', 22);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = String(writeCall[1]);

      expect(writtenContent).not.toContain('host2.com');
      expect(writtenContent).toContain('host1.com');
      expect(writtenContent).toContain('host3.com');
    });
  });
});
