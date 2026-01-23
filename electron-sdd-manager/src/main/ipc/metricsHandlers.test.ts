/**
 * Metrics IPC Handlers Tests
 * TDD tests for Task 3.2, 6.2: IPC handlers for metrics
 * Requirements: 2.12, 5.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn((name: string) => {
      if (name === 'logs') return '/tmp/test-logs';
      if (name === 'userData') return '/tmp/test-user-data';
      return '/tmp/test';
    }),
  },
}));

import { ipcMain, BrowserWindow } from 'electron';
import { registerMetricsHandlers, notifyMetricsUpdated } from './metricsHandlers';
import { getDefaultMetricsService } from '../services/metricsService';
import type { HumanSessionData } from '../types/metrics';

describe('metricsHandlers', () => {
  let tempDir: string;
  const mockHandlers: Map<string, Function> = new Map();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'metrics-handlers-test-'));
    mockHandlers.clear();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
      return undefined;
    });

    // Register handlers with getter
    registerMetricsHandlers(() => tempDir);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Handler Registration
  // ==========================================================================
  describe('handler registration', () => {
    it('should register RECORD_HUMAN_SESSION handler', () => {
      expect(mockHandlers.has('metrics:record-human-session')).toBe(true);
    });

    it('should register GET_SPEC_METRICS handler', () => {
      expect(mockHandlers.has('metrics:get-spec-metrics')).toBe(true);
    });

    it('should register GET_PROJECT_METRICS handler', () => {
      expect(mockHandlers.has('metrics:get-project-metrics')).toBe(true);
    });
  });

  // ==========================================================================
  // RECORD_HUMAN_SESSION (Requirement 2.12)
  // ==========================================================================
  describe('RECORD_HUMAN_SESSION', () => {
    it('should record human session and return ok', async () => {
      const handler = mockHandlers.get('metrics:record-human-session');
      expect(handler).toBeDefined();

      const session: HumanSessionData = {
        specId: 'test-spec',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:00.000Z',
        ms: 300000,
      };

      const result = await handler!({} as any, session);

      expect(result).toEqual({ ok: true });

      // Verify file was written
      const content = await readFile(join(tempDir, '.kiro', 'metrics.jsonl'), 'utf-8');
      const record = JSON.parse(content.trim());
      expect(record.type).toBe('human');
      expect(record.spec).toBe('test-spec');
    });

    it('should return error when no project path', async () => {
      // Re-register with null project path
      registerMetricsHandlers(() => null);
      const handler = mockHandlers.get('metrics:record-human-session');

      const session: HumanSessionData = {
        specId: 'test-spec',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T10:05:00.000Z',
        ms: 300000,
      };

      const result = await handler!({} as any, session);

      expect(result).toEqual({ ok: false, error: 'No project path set' });
    });
  });

  // ==========================================================================
  // GET_SPEC_METRICS (Requirement 5.1)
  // ==========================================================================
  describe('GET_SPEC_METRICS', () => {
    it('should return metrics for a spec', async () => {
      // Create test data
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'ai',
          spec: 'test-spec',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:00.000Z',
          ms: 300000,
        }),
        JSON.stringify({
          type: 'human',
          spec: 'test-spec',
          start: '2025-01-15T10:05:00.000Z',
          end: '2025-01-15T10:08:00.000Z',
          ms: 180000,
        }),
      ].join('\n') + '\n';
      await writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records);

      const handler = mockHandlers.get('metrics:get-spec-metrics');
      expect(handler).toBeDefined();

      const result = await handler!({} as any, 'test-spec');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.specId).toBe('test-spec');
        expect(result.value.totalAiTimeMs).toBe(300000);
        expect(result.value.totalHumanTimeMs).toBe(180000);
      }
    });

    it('should return empty metrics for unknown spec', async () => {
      const handler = mockHandlers.get('metrics:get-spec-metrics');

      const result = await handler!({} as any, 'unknown-spec');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalAiTimeMs).toBe(0);
        expect(result.value.totalHumanTimeMs).toBe(0);
      }
    });

    it('should return error when no project path', async () => {
      registerMetricsHandlers(() => null);
      const handler = mockHandlers.get('metrics:get-spec-metrics');

      const result = await handler!({} as any, 'test-spec');

      expect(result).toEqual({ ok: false, error: 'No project path set' });
    });
  });

  // ==========================================================================
  // GET_PROJECT_METRICS
  // ==========================================================================
  describe('GET_PROJECT_METRICS', () => {
    it('should return project-wide metrics', async () => {
      // Create test data
      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      const records = [
        JSON.stringify({
          type: 'ai',
          spec: 'spec-1',
          phase: 'requirements',
          start: '2025-01-15T10:00:00.000Z',
          end: '2025-01-15T10:05:00.000Z',
          ms: 300000,
        }),
        JSON.stringify({
          type: 'ai',
          spec: 'spec-2',
          phase: 'design',
          start: '2025-01-15T11:00:00.000Z',
          end: '2025-01-15T11:10:00.000Z',
          ms: 600000,
        }),
        JSON.stringify({
          type: 'lifecycle',
          spec: 'spec-1',
          event: 'complete',
          timestamp: '2025-01-15T12:00:00.000Z',
          totalMs: 3600000,
        }),
      ].join('\n') + '\n';
      await writeFile(join(tempDir, '.kiro', 'metrics.jsonl'), records);

      const handler = mockHandlers.get('metrics:get-project-metrics');
      expect(handler).toBeDefined();

      const result = await handler!({} as any);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalAiTimeMs).toBe(900000);
        expect(result.value.completedSpecCount).toBe(1);
        expect(result.value.inProgressSpecCount).toBe(1); // spec-2
      }
    });
  });

  // ==========================================================================
  // notifyMetricsUpdated
  // ==========================================================================
  describe('notifyMetricsUpdated', () => {
    it('should send notification to all windows', () => {
      const mockWindow = {
        isDestroyed: vi.fn(() => false),
        webContents: {
          send: vi.fn(),
        },
      };

      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as any]);

      notifyMetricsUpdated('test-spec');

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'metrics:updated',
        { specId: 'test-spec' }
      );
    });

    it('should skip destroyed windows', () => {
      const mockWindow = {
        isDestroyed: vi.fn(() => true),
        webContents: {
          send: vi.fn(),
        },
      };

      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as any]);

      notifyMetricsUpdated('test-spec');

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
