/**
 * SpecManagerService Category Integration Tests
 * Tests for Tasks 7.1 and 7.2: Integration of category-aware methods
 *
 * Requirements:
 * - Task 7.1: SpecManagerService uses writeRecordWithCategory instead of old writeRecord
 * - Task 7.2: SpecManagerService uses appendLogWithCategory instead of old appendLog
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock Electron app module before importing
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => os.tmpdir()),
  },
}));

import { SpecManagerService } from './specManagerService';
import { determineCategory, getEntityIdFromSpecId } from './agentCategory';

describe('SpecManagerService - Category Integration', () => {
  let testDir: string;
  let runtimeAgentsDir: string;
  let service: SpecManagerService;

  beforeEach(async () => {
    // Create temporary directories for testing
    testDir = path.join(os.tmpdir(), `spec-manager-category-test-${Date.now()}`);
    runtimeAgentsDir = path.join(testDir, '.kiro', 'runtime', 'agents');
    await fs.mkdir(runtimeAgentsDir, { recursive: true });
    service = new SpecManagerService(testDir);
  });

  afterEach(async () => {
    // Stop all agents
    try {
      await service.stopAllAgents();
    } catch (error) {
      // Ignore errors during cleanup
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Task 7.1: writeRecordWithCategory integration', () => {
    it('should write agent records to category-based paths for specs', async () => {
      const specId = 'my-feature';
      const category = determineCategory(specId);
      const entityId = getEntityIdFromSpecId(specId);

      const result = await service.startAgent({
        specId,
        phase: 'requirements',
        command: 'sleep',
        args: ['5'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Verify file exists at category-based path
      const expectedPath = path.join(runtimeAgentsDir, category, entityId, `${agentId}.json`);
      const stat = await fs.stat(expectedPath);
      expect(stat.isFile()).toBe(true);

      // Verify content
      const content = await fs.readFile(expectedPath, 'utf-8');
      const record = JSON.parse(content);
      expect(record.agentId).toBe(agentId);
      expect(record.specId).toBe(specId);
    });

    it('should write agent records to category-based paths for bugs', async () => {
      const specId = 'bug:fix-memory-leak';
      const category = determineCategory(specId);
      const entityId = getEntityIdFromSpecId(specId);

      const result = await service.startAgent({
        specId,
        phase: 'fix',
        command: 'sleep',
        args: ['5'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Verify file exists at category-based path (bugs/fix-memory-leak/)
      const expectedPath = path.join(runtimeAgentsDir, category, entityId, `${agentId}.json`);
      const stat = await fs.stat(expectedPath);
      expect(stat.isFile()).toBe(true);

      // Verify content
      const content = await fs.readFile(expectedPath, 'utf-8');
      const record = JSON.parse(content);
      expect(record.agentId).toBe(agentId);
      expect(record.specId).toBe(specId);
    });

    it('should write agent records to category-based paths for project agents', async () => {
      const specId = '';
      const category = determineCategory(specId);
      const entityId = getEntityIdFromSpecId(specId);

      const result = await service.startAgent({
        specId,
        phase: 'project',
        command: 'sleep',
        args: ['5'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Verify file exists at category-based path (project/)
      const expectedPath = path.join(runtimeAgentsDir, category, `${agentId}.json`);
      const stat = await fs.stat(expectedPath);
      expect(stat.isFile()).toBe(true);

      // Verify content
      const content = await fs.readFile(expectedPath, 'utf-8');
      const record = JSON.parse(content);
      expect(record.agentId).toBe(agentId);
      expect(record.specId).toBe(specId);
    });
  });

  describe('Task 7.2: appendLogWithCategory integration', () => {
    it('should write logs to category-based paths for specs', async () => {
      const specId = 'my-feature';
      const category = determineCategory(specId);
      const entityId = getEntityIdFromSpecId(specId);

      const result = await service.startAgent({
        specId,
        phase: 'requirements',
        command: 'echo',
        args: ['test output'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Wait for agent to complete and output to be logged
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify log file exists at category-based path
      const expectedLogPath = path.join(runtimeAgentsDir, category, entityId, 'logs', `${agentId}.log`);
      const stat = await fs.stat(expectedLogPath);
      expect(stat.isFile()).toBe(true);

      // Verify log content
      const logContent = await fs.readFile(expectedLogPath, 'utf-8');
      expect(logContent).toContain('test output');
    });

    it('should write logs to category-based paths for bugs', async () => {
      const specId = 'bug:fix-memory-leak';
      const category = determineCategory(specId);
      const entityId = getEntityIdFromSpecId(specId);

      const result = await service.startAgent({
        specId,
        phase: 'fix',
        command: 'echo',
        args: ['bug fix output'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Wait for agent to complete and output to be logged
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify log file exists at category-based path (bugs/fix-memory-leak/logs/)
      const expectedLogPath = path.join(runtimeAgentsDir, category, entityId, 'logs', `${agentId}.log`);
      const stat = await fs.stat(expectedLogPath);
      expect(stat.isFile()).toBe(true);

      // Verify log content
      const logContent = await fs.readFile(expectedLogPath, 'utf-8');
      expect(logContent).toContain('bug fix output');
    });

    it('should write logs to category-based paths for project agents', async () => {
      const specId = '';
      const category = determineCategory(specId);

      const result = await service.startAgent({
        specId,
        phase: 'project',
        command: 'echo',
        args: ['project output'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Wait for agent to complete and output to be logged
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify log file exists at category-based path (project/logs/)
      const expectedLogPath = path.join(runtimeAgentsDir, category, 'logs', `${agentId}.log`);
      const stat = await fs.stat(expectedLogPath);
      expect(stat.isFile()).toBe(true);

      // Verify log content
      const logContent = await fs.readFile(expectedLogPath, 'utf-8');
      expect(logContent).toContain('project output');
    });
  });

  describe('Combined: Agent with multiple log entries', () => {
    it('should use category-aware methods for both record and log writes', async () => {
      const specId = 'test-spec';
      const category = determineCategory(specId);
      const entityId = getEntityIdFromSpecId(specId);

      // Start agent
      const result = await service.startAgent({
        specId,
        phase: 'implementation',
        command: 'bash',
        args: ['-c', 'echo "line 1" && sleep 0.1 && echo "line 2"'],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const agentId = result.value.agentId;

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify record
      const recordPath = path.join(runtimeAgentsDir, category, entityId, `${agentId}.json`);
      const recordStat = await fs.stat(recordPath);
      expect(recordStat.isFile()).toBe(true);

      // Verify log
      const logPath = path.join(runtimeAgentsDir, category, entityId, 'logs', `${agentId}.log`);
      const logStat = await fs.stat(logPath);
      expect(logStat.isFile()).toBe(true);

      const logContent = await fs.readFile(logPath, 'utf-8');
      expect(logContent).toContain('line 1');
      expect(logContent).toContain('line 2');
    });
  });
});
