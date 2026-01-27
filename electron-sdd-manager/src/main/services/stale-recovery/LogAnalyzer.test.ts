/**
 * LogAnalyzer Tests
 * agent-stale-recovery: Task 8.3 - LogAnalyzer unit tests
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LogAnalyzer, RecoveryAction } from './LogAnalyzer';

describe('LogAnalyzer', () => {
  let tempDir: string;
  let analyzer: LogAnalyzer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-analyzer-test-'));
    analyzer = new LogAnalyzer(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('analyzeLog', () => {
    it('should return "complete" when completion pattern detected', async () => {
      // Requirements: 3.2
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting agent...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Processing...' },
        { timestamp: '2026-01-28T00:02:00Z', stream: 'stdout', data: 'Task completed successfully' },
        { timestamp: '2026-01-28T00:02:01Z', stream: 'stdout', data: '--- Task Execution Summary ---' },
      ];

      // Write test log file
      const logDir = path.join(tempDir, '.kiro', 'runtime', 'agents', 'test-spec', 'logs');
      await fs.mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, 'agent-001.log');
      await fs.writeFile(logPath, logEntries.map((e) => JSON.stringify(e)).join('\n'), 'utf-8');

      const action = await analyzer.analyzeLog('test-spec', 'agent-001');
      expect(action).toBe('complete');
    });

    it('should return "fail" when error pattern detected', async () => {
      // Requirements: 3.3
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting agent...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Processing...' },
        { timestamp: '2026-01-28T00:02:00Z', stream: 'stderr', data: 'Error: Failed to execute command' },
      ];

      const logDir = path.join(tempDir, '.kiro', 'runtime', 'agents', 'test-spec', 'logs');
      await fs.mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, 'agent-001.log');
      await fs.writeFile(logPath, logEntries.map((e) => JSON.stringify(e)).join('\n'), 'utf-8');

      const action = await analyzer.analyzeLog('test-spec', 'agent-001');
      expect(action).toBe('fail');
    });

    it('should return "resume" when log is interrupted (default)', async () => {
      // Requirements: 3.4
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting agent...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Processing...' },
        // Log stops here without completion or error
      ];

      const logDir = path.join(tempDir, '.kiro', 'runtime', 'agents', 'test-spec', 'logs');
      await fs.mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, 'agent-001.log');
      await fs.writeFile(logPath, logEntries.map((e) => JSON.stringify(e)).join('\n'), 'utf-8');

      const action = await analyzer.analyzeLog('test-spec', 'agent-001');
      expect(action).toBe('resume');
    });

    it('should return "resume" when log file does not exist', async () => {
      // Requirements: 3.1
      const action = await analyzer.analyzeLog('non-existent-spec', 'non-existent-agent');
      expect(action).toBe('resume');
    });
  });

  describe('detectCompletion', () => {
    it('should detect "Task Execution Summary" pattern', async () => {
      // Requirements: 3.2
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: '--- Task Execution Summary ---' },
      ];

      const result = analyzer.detectCompletion(logEntries);
      expect(result).toBe(true);
    });

    it('should detect "Tasks Executed" pattern', async () => {
      // Requirements: 3.2
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Tasks Executed: 1.1, 1.2' },
      ];

      const result = analyzer.detectCompletion(logEntries);
      expect(result).toBe(true);
    });

    it('should return false when no completion pattern found', async () => {
      // Requirements: 3.2
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Processing...' },
      ];

      const result = analyzer.detectCompletion(logEntries);
      expect(result).toBe(false);
    });
  });

  describe('detectError', () => {
    it('should detect "error" keyword in last line', async () => {
      // Requirements: 3.3
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stderr', data: 'Error: Something went wrong' },
      ];

      const result = analyzer.detectError(logEntries);
      expect(result).toBe(true);
    });

    it('should detect "failed" keyword in last line', async () => {
      // Requirements: 3.3
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stdout', data: 'Starting...' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Task failed to complete' },
      ];

      const result = analyzer.detectError(logEntries);
      expect(result).toBe(true);
    });

    it('should return false when no error pattern in last line', async () => {
      // Requirements: 3.3
      const logEntries = [
        { timestamp: '2026-01-28T00:00:00Z', stream: 'stderr', data: 'Error: Something went wrong' },
        { timestamp: '2026-01-28T00:01:00Z', stream: 'stdout', data: 'Recovered successfully' },
      ];

      const result = analyzer.detectError(logEntries);
      expect(result).toBe(false);
    });

    it('should return false for empty log', async () => {
      // Requirements: 3.3
      const logEntries: Array<{ timestamp: string; stream: string; data: string }> = [];

      const result = analyzer.detectError(logEntries);
      expect(result).toBe(false);
    });
  });
});
