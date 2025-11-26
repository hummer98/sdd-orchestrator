/**
 * PIDFileService Tests
 * Requirements: 5.5, 5.6, 5.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  PidFileService,
  AgentPidFile,
  writePidFile,
  readPidFile,
  readAllPidFiles,
  updatePidFile,
  checkProcessAlive,
} from './pidFileService';

describe('PIDFileService', () => {
  let testDir: string;
  let service: PidFileService;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join(os.tmpdir(), `pid-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new PidFileService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Task 22.1: PIDファイル書き込み
  describe('writePidFile', () => {
    it('should write PID file to correct location', async () => {
      const pidFile: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile);

      // Verify file was created
      const filePath = path.join(testDir, 'spec-a', 'agent-001.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.agentId).toBe('agent-001');
      expect(parsed.specId).toBe('spec-a');
      expect(parsed.pid).toBe(12345);
    });

    it('should create directory structure if not exists', async () => {
      const pidFile: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'new-spec',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile);

      // Verify directory was created
      const dirPath = path.join(testDir, 'new-spec');
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  // Task 22.2: PIDファイル読み込み
  describe('readPidFile', () => {
    it('should read PID file', async () => {
      const pidFile: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile);

      const result = await service.readPidFile('spec-a', 'agent-001');

      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('agent-001');
      expect(result?.pid).toBe(12345);
    });

    it('should return null for non-existent file', async () => {
      const result = await service.readPidFile('non-existent-spec', 'non-existent-agent');
      expect(result).toBeNull();
    });
  });

  describe('readAllPidFiles', () => {
    it('should read all PID files', async () => {
      const pidFile1: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      const pidFile2: AgentPidFile = {
        agentId: 'agent-002',
        specId: 'spec-a',
        phase: 'design',
        pid: 12346,
        sessionId: 'session-uuid-002',
        status: 'completed',
        startedAt: '2025-11-26T10:01:00Z',
        lastActivityAt: '2025-11-26T10:05:00Z',
        command: 'claude -p "/kiro:spec-design"',
      };

      const pidFile3: AgentPidFile = {
        agentId: 'agent-003',
        specId: 'spec-b',
        phase: 'requirements',
        pid: 12347,
        sessionId: 'session-uuid-003',
        status: 'running',
        startedAt: '2025-11-26T10:02:00Z',
        lastActivityAt: '2025-11-26T10:02:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile1);
      await service.writePidFile(pidFile2);
      await service.writePidFile(pidFile3);

      const allFiles = await service.readAllPidFiles();

      expect(allFiles).toHaveLength(3);
      expect(allFiles.map((f) => f.agentId)).toContain('agent-001');
      expect(allFiles.map((f) => f.agentId)).toContain('agent-002');
      expect(allFiles.map((f) => f.agentId)).toContain('agent-003');
    });

    it('should return empty array when no files exist', async () => {
      const allFiles = await service.readAllPidFiles();
      expect(allFiles).toHaveLength(0);
    });
  });

  // Task 22.3: PIDファイル更新
  describe('updatePidFile', () => {
    it('should update status in PID file', async () => {
      const pidFile: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile);
      await service.updatePidFile('spec-a', 'agent-001', { status: 'completed' });

      const result = await service.readPidFile('spec-a', 'agent-001');
      expect(result?.status).toBe('completed');
    });

    it('should update lastActivityAt in PID file', async () => {
      const pidFile: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile);
      const newTime = '2025-11-26T10:05:00Z';
      await service.updatePidFile('spec-a', 'agent-001', { lastActivityAt: newTime });

      const result = await service.readPidFile('spec-a', 'agent-001');
      expect(result?.lastActivityAt).toBe(newTime);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        service.updatePidFile('non-existent', 'non-existent', { status: 'completed' })
      ).rejects.toThrow();
    });
  });

  // Task 22.4: プロセス生存確認
  describe('checkProcessAlive', () => {
    it('should return true for current process', () => {
      // Use current process PID which should be alive
      const result = service.checkProcessAlive(process.pid);
      expect(result).toBe(true);
    });

    it('should return false for non-existent PID', () => {
      // Use a very high PID that's unlikely to exist
      const result = service.checkProcessAlive(999999999);
      expect(result).toBe(false);
    });

    it('should return false for PID 0', () => {
      const result = service.checkProcessAlive(0);
      expect(result).toBe(false);
    });
  });

  describe('deletePidFile', () => {
    it('should delete PID file', async () => {
      const pidFile: AgentPidFile = {
        agentId: 'agent-001',
        specId: 'spec-a',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-uuid-001',
        status: 'running',
        startedAt: '2025-11-26T10:00:00Z',
        lastActivityAt: '2025-11-26T10:00:00Z',
        command: 'claude -p "/kiro:spec-requirements"',
      };

      await service.writePidFile(pidFile);
      await service.deletePidFile('spec-a', 'agent-001');

      const result = await service.readPidFile('spec-a', 'agent-001');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(
        service.deletePidFile('non-existent', 'non-existent')
      ).resolves.not.toThrow();
    });
  });
});
