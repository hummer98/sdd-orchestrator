/**
 * EventLogService Test
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.4
 *
 * TDD: Tests for EventLogService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventLogService } from './eventLogService';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { EventLogInput, EventLogEntry } from '../../shared/types';

// Mock fs/promises
vi.mock('fs/promises');

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EventLogService', () => {
  let service: EventLogService;
  const mockProjectPath = '/path/to/project';
  const mockSpecId = 'test-spec';
  const expectedEventsPath = path.join(mockProjectPath, '.kiro', 'specs', mockSpecId, 'events.jsonl');

  beforeEach(() => {
    service = new EventLogService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('logEvent', () => {
    it('should append event to JSON Lines file (Requirement 2.1, 2.2)', async () => {
      const mockAppendFile = vi.mocked(fs.appendFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const event: EventLogInput = {
        type: 'agent:start',
        message: 'Agent started',
        agentId: 'agent-123',
        phase: 'requirements',
      };

      await service.logEvent(mockProjectPath, mockSpecId, event);

      expect(mockAppendFile).toHaveBeenCalledOnce();
      const [filePath, content] = mockAppendFile.mock.calls[0];
      expect(filePath).toBe(expectedEventsPath);

      // Verify JSON Lines format (single line JSON + newline)
      const lines = (content as string).split('\n').filter(Boolean);
      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(lines[0]) as EventLogEntry;
      expect(parsed.type).toBe('agent:start');
      expect(parsed.message).toBe('Agent started');
      expect(parsed.agentId).toBe('agent-123');
    });

    it('should auto-generate UTC timestamp (Requirement 2.3)', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const event: EventLogInput = {
        type: 'agent:start',
        message: 'Agent started',
        agentId: 'agent-123',
        phase: 'requirements',
      };

      const beforeTime = new Date().toISOString();
      await service.logEvent(mockProjectPath, mockSpecId, event);
      const afterTime = new Date().toISOString();

      const content = vi.mocked(fs.appendFile).mock.calls[0][1] as string;
      const parsed = JSON.parse(content.trim()) as EventLogEntry;

      // Verify timestamp is ISO 8601 format
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Verify timestamp is within test execution window
      expect(parsed.timestamp >= beforeTime).toBe(true);
      expect(parsed.timestamp <= afterTime).toBe(true);
    });

    it('should include event type (Requirement 2.4)', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const event: EventLogInput = {
        type: 'auto-execution:start',
        message: 'Auto execution started',
        status: 'started',
        startPhase: 'requirements',
      };

      await service.logEvent(mockProjectPath, mockSpecId, event);

      const content = vi.mocked(fs.appendFile).mock.calls[0][1] as string;
      const parsed = JSON.parse(content.trim());
      expect(parsed.type).toBe('auto-execution:start');
    });

    it('should include detail information (Requirement 2.5)', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const event: EventLogInput = {
        type: 'agent:fail',
        message: 'Agent failed',
        agentId: 'agent-456',
        phase: 'design',
        exitCode: 1,
        errorMessage: 'Process crashed',
      };

      await service.logEvent(mockProjectPath, mockSpecId, event);

      const content = vi.mocked(fs.appendFile).mock.calls[0][1] as string;
      const parsed = JSON.parse(content.trim());
      expect(parsed.agentId).toBe('agent-456');
      expect(parsed.phase).toBe('design');
      expect(parsed.exitCode).toBe(1);
      expect(parsed.errorMessage).toBe('Process crashed');
    });

    it('should auto-create directory if not exists (Requirement 2.6)', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.appendFile).mockResolvedValue();

      const event: EventLogInput = {
        type: 'worktree:create',
        message: 'Worktree created',
        worktreePath: '.kiro/worktrees/specs/test-spec',
        branch: 'feature/test-spec',
      };

      await service.logEvent(mockProjectPath, mockSpecId, event);

      expect(mockMkdir).toHaveBeenCalledWith(
        path.dirname(expectedEventsPath),
        { recursive: true }
      );
    });

    it('should not throw on file write error (Requirement 6.4)', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.appendFile).mockRejectedValue(new Error('Write failed'));

      const event: EventLogInput = {
        type: 'approval:update',
        message: 'Approval updated',
        phase: 'requirements',
        approved: true,
      };

      // Should not throw
      await expect(service.logEvent(mockProjectPath, mockSpecId, event)).resolves.not.toThrow();
    });
  });

  describe('readEvents', () => {
    it('should read and parse JSON Lines file', async () => {
      const mockEvents = [
        { timestamp: '2026-01-21T10:00:00Z', type: 'agent:start', message: 'Started', agentId: 'a1', phase: 'req' },
        { timestamp: '2026-01-21T10:05:00Z', type: 'agent:complete', message: 'Done', agentId: 'a1', phase: 'req', exitCode: 0 },
      ];
      const mockContent = mockEvents.map(e => JSON.stringify(e)).join('\n') + '\n';

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await service.readEvents(mockProjectPath, mockSpecId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should return events in reverse chronological order (newest first)', async () => {
      const mockEvents = [
        { timestamp: '2026-01-21T10:00:00Z', type: 'agent:start', message: '1st', agentId: 'a1', phase: 'req' },
        { timestamp: '2026-01-21T10:05:00Z', type: 'agent:complete', message: '2nd', agentId: 'a1', phase: 'req', exitCode: 0 },
        { timestamp: '2026-01-21T10:10:00Z', type: 'agent:start', message: '3rd', agentId: 'a2', phase: 'design' },
      ];
      const mockContent = mockEvents.map(e => JSON.stringify(e)).join('\n') + '\n';

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await service.readEvents(mockProjectPath, mockSpecId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].message).toBe('3rd');
        expect(result.value[1].message).toBe('2nd');
        expect(result.value[2].message).toBe('1st');
      }
    });

    it('should return empty array when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await service.readEvents(mockProjectPath, mockSpecId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should skip invalid JSON lines and continue parsing', async () => {
      const mockContent = [
        '{"timestamp":"2026-01-21T10:00:00Z","type":"agent:start","message":"Valid","agentId":"a1","phase":"req"}',
        'invalid json line',
        '{"timestamp":"2026-01-21T10:05:00Z","type":"agent:complete","message":"Also valid","agentId":"a1","phase":"req","exitCode":0}',
      ].join('\n') + '\n';

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await service.readEvents(mockProjectPath, mockSpecId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should handle empty file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');

      const result = await service.readEvents(mockProjectPath, mockSpecId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return IO_ERROR for non-ENOENT read errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

      const result = await service.readEvents(mockProjectPath, mockSpecId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('IO_ERROR');
      }
    });
  });

  describe('getEventsFilePath', () => {
    it('should return correct path for spec events', () => {
      const eventsPath = service.getEventsFilePath(mockProjectPath, mockSpecId);
      expect(eventsPath).toBe(expectedEventsPath);
    });
  });
});
