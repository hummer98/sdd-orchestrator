/**
 * SessionRecoveryService Tests
 * TDD tests for Task 5.1, 5.2: Session recovery service
 * Requirements: 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SessionRecoveryService } from './sessionRecoveryService';
import type { SessionTempData } from '../types/metrics';

describe('SessionRecoveryService', () => {
  let tempDir: string;
  let service: SessionRecoveryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'session-recovery-test-'));
    service = new SessionRecoveryService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T14:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Task 5.1: Session temp file management
  // ==========================================================================
  describe('session temp file management (Task 5.1)', () => {
    it('should save active sessions to temp file', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [
          {
            specId: 'spec-1',
            phase: 'requirements',
            start: '2025-01-15T10:00:00.000Z',
          },
        ],
        activeHumanSession: {
          specId: 'spec-1',
          start: '2025-01-15T10:30:00.000Z',
          lastActivity: '2025-01-15T10:35:00.000Z',
        },
      };

      await service.saveActiveSessionState(tempDir, sessionData);

      const tempFilePath = join(tempDir, '.kiro', '.metrics-session.tmp');
      const content = await readFile(tempFilePath, 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.activeAiSessions).toHaveLength(1);
      expect(saved.activeAiSessions[0].specId).toBe('spec-1');
      expect(saved.activeHumanSession?.specId).toBe('spec-1');
    });

    it('should create .kiro directory if not exists', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [],
      };

      await service.saveActiveSessionState(tempDir, sessionData);

      const kiroPath = join(tempDir, '.kiro');
      await expect(access(kiroPath)).resolves.toBeUndefined();
    });

    it('should load saved session state', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [
          {
            specId: 'spec-1',
            phase: 'design',
            start: '2025-01-15T11:00:00.000Z',
          },
        ],
      };

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        JSON.stringify(sessionData),
        'utf-8'
      );

      const loaded = await service.loadActiveSessionState(tempDir);

      expect(loaded).toBeDefined();
      expect(loaded?.activeAiSessions).toHaveLength(1);
      expect(loaded?.activeAiSessions[0].phase).toBe('design');
    });

    it('should return null when temp file does not exist', async () => {
      const loaded = await service.loadActiveSessionState(tempDir);
      expect(loaded).toBeNull();
    });

    it('should delete temp file', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        JSON.stringify({ activeAiSessions: [] }),
        'utf-8'
      );

      await service.deleteTempFile(tempDir);

      await expect(access(join(tempDir, '.kiro', '.metrics-session.tmp'))).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Task 5.2 / Requirement 7.1: Detect incomplete sessions on app startup
  // ==========================================================================
  describe('recoverIncompleteSessions (Requirement 7.1)', () => {
    it('should return zero recovery when no temp file exists', async () => {
      const result = await service.recoverIncompleteSessions(tempDir);

      expect(result.aiSessionsRecovered).toBe(0);
      expect(result.humanSessionsRecovered).toBe(0);
    });

    it('should detect and recover incomplete sessions', async () => {
      // Create temp file with incomplete sessions
      const sessionData: SessionTempData = {
        activeAiSessions: [
          {
            specId: 'spec-1',
            phase: 'requirements',
            start: '2025-01-15T10:00:00.000Z',
          },
        ],
        activeHumanSession: {
          specId: 'spec-1',
          start: '2025-01-15T10:30:00.000Z',
          lastActivity: '2025-01-15T10:35:00.000Z',
        },
      };

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        JSON.stringify(sessionData),
        'utf-8'
      );

      const result = await service.recoverIncompleteSessions(tempDir);

      expect(result.aiSessionsRecovered).toBe(1);
      expect(result.humanSessionsRecovered).toBe(1);
    });
  });

  // ==========================================================================
  // Requirement 7.2: AI session recovery with app termination time
  // ==========================================================================
  describe('AI session recovery (Requirement 7.2)', () => {
    it('should use recovery time as end timestamp for AI sessions', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [
          {
            specId: 'spec-1',
            phase: 'design',
            start: '2025-01-15T10:00:00.000Z',
          },
        ],
      };

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        JSON.stringify(sessionData),
        'utf-8'
      );

      await service.recoverIncompleteSessions(tempDir);

      // Check that recovery record was written
      const metricsContent = await readFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        'utf-8'
      );
      const record = JSON.parse(metricsContent.trim());

      expect(record.type).toBe('ai');
      expect(record.spec).toBe('spec-1');
      expect(record.phase).toBe('design');
      expect(record.start).toBe('2025-01-15T10:00:00.000Z');
      expect(record.end).toBe('2025-01-15T14:00:00.000Z'); // Recovery time
      expect(record.ms).toBe(14400000); // 4 hours
    });

    it('should recover multiple AI sessions', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [
          {
            specId: 'spec-1',
            phase: 'requirements',
            start: '2025-01-15T09:00:00.000Z',
          },
          {
            specId: 'spec-2',
            phase: 'design',
            start: '2025-01-15T10:00:00.000Z',
          },
        ],
      };

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        JSON.stringify(sessionData),
        'utf-8'
      );

      const result = await service.recoverIncompleteSessions(tempDir);

      expect(result.aiSessionsRecovered).toBe(2);

      const metricsContent = await readFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        'utf-8'
      );
      const lines = metricsContent.split('\n').filter((l) => l.trim());
      expect(lines).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Requirement 7.3: Human session recovery with 45s offset
  // ==========================================================================
  describe('Human session recovery (Requirement 7.3)', () => {
    it('should use lastActivity + 45s as end timestamp', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [],
        activeHumanSession: {
          specId: 'spec-1',
          start: '2025-01-15T10:00:00.000Z',
          lastActivity: '2025-01-15T10:30:00.000Z',
        },
      };

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        JSON.stringify(sessionData),
        'utf-8'
      );

      await service.recoverIncompleteSessions(tempDir);

      const metricsContent = await readFile(
        join(tempDir, '.kiro', 'metrics.jsonl'),
        'utf-8'
      );
      const record = JSON.parse(metricsContent.trim());

      expect(record.type).toBe('human');
      expect(record.spec).toBe('spec-1');
      expect(record.start).toBe('2025-01-15T10:00:00.000Z');
      // lastActivity + 45 seconds
      expect(record.end).toBe('2025-01-15T10:30:45.000Z');
      // 30 minutes + 45 seconds in ms
      expect(record.ms).toBe(1845000);
    });
  });

  // ==========================================================================
  // Temp file cleanup after recovery
  // ==========================================================================
  describe('temp file cleanup', () => {
    it('should delete temp file after successful recovery', async () => {
      const sessionData: SessionTempData = {
        activeAiSessions: [
          {
            specId: 'spec-1',
            phase: 'impl',
            start: '2025-01-15T10:00:00.000Z',
          },
        ],
      };

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const tempFilePath = join(tempDir, '.kiro', '.metrics-session.tmp');
      await writeFile(tempFilePath, JSON.stringify(sessionData), 'utf-8');

      await service.recoverIncompleteSessions(tempDir);

      // Temp file should be deleted
      await expect(access(tempFilePath)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================
  describe('error handling', () => {
    it('should handle corrupted temp file gracefully', async () => {
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(
        join(tempDir, '.kiro', '.metrics-session.tmp'),
        'not valid json {{{',
        'utf-8'
      );

      // Should not throw
      const result = await service.recoverIncompleteSessions(tempDir);

      expect(result.aiSessionsRecovered).toBe(0);
      expect(result.humanSessionsRecovered).toBe(0);
    });
  });
});
