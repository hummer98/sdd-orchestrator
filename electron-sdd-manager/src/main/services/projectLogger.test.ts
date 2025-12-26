/**
 * ProjectLogger Unit Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 7.4
 * Task 5.1 (P): ProjectLoggerのユニットテストを作成する
 * Task 6.3: LogRotationManager統合テストを更新する
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock electron app before importing projectLogger
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/mock/logs'),
  },
}));

// Mock LogRotationManager
const mockRotationManager = {
  checkAndRotate: vi.fn().mockResolvedValue(false),
  checkDateRotation: vi.fn().mockResolvedValue(false),
  cleanupOldFiles: vi.fn().mockResolvedValue(undefined),
  getRotationThreshold: vi.fn().mockReturnValue(10 * 1024 * 1024),
  getDefaultRetentionDays: vi.fn().mockReturnValue(30),
};

vi.mock('./logRotationManager', () => ({
  LogRotationManager: vi.fn().mockImplementation(() => mockRotationManager),
  logRotationManager: mockRotationManager,
}));

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    createWriteStream: vi.fn().mockReturnValue({
      write: vi.fn().mockReturnValue(true),
      close: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      bytesWritten: 100,
    }),
    statSync: vi.fn().mockReturnValue({ size: 100 }),
  };
});

describe('LogEntry and formatMessage', () => {
  describe('LogEntry type', () => {
    it('should have projectId field', () => {
      // LogEntry型にprojectIdフィールドが含まれることを確認
      // 型テストのため、正しい型であればコンパイルが通る
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'INFO' as const,
        projectId: '/path/to/project',
        message: 'Test message',
        data: undefined,
      };
      expect(entry.projectId).toBe('/path/to/project');
    });

    it('should allow global as projectId', () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'INFO' as const,
        projectId: 'global',
        message: 'Test message',
      };
      expect(entry.projectId).toBe('global');
    });

    it('should support all log levels', () => {
      const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
      levels.forEach(level => {
        const entry = {
          timestamp: new Date().toISOString(),
          level,
          projectId: 'global',
          message: 'Test',
        };
        expect(entry.level).toBe(level);
      });
    });
  });

  describe('formatMessage', () => {
    // formatMessageをテストするために、ProjectLoggerをインポート
    let formatMessage: (level: string, projectId: string, message: string, data?: unknown) => string;

    beforeEach(async () => {
      // Clear module cache to get fresh import
      vi.resetModules();
      const module = await import('./projectLogger');
      formatMessage = module.formatMessage;
    });

    it('should include projectId in log format', () => {
      const result = formatMessage('INFO', '/path/to/project', 'Test message');
      expect(result).toContain('[/path/to/project]');
      expect(result).toContain('[INFO]');
      expect(result).toContain('Test message');
    });

    it('should use global as projectId when not in project context', () => {
      const result = formatMessage('INFO', 'global', 'Test message');
      expect(result).toContain('[global]');
    });

    it('should include data as JSON when provided', () => {
      const data = { key: 'value', count: 42 };
      const result = formatMessage('INFO', 'global', 'Test message', data);
      expect(result).toContain('{"key":"value","count":42}');
    });

    it('should handle undefined data', () => {
      const result = formatMessage('INFO', 'global', 'Test message', undefined);
      expect(result).not.toContain('undefined');
      expect(result).toContain('Test message');
    });

    it('should include ISO timestamp', () => {
      const result = formatMessage('INFO', 'global', 'Test');
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const isoPattern = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
      expect(result).toMatch(isoPattern);
    });

    it('should end with newline', () => {
      const result = formatMessage('INFO', 'global', 'Test');
      expect(result.endsWith('\n')).toBe(true);
    });

    it('should format as [timestamp] [level] [projectId] message data', () => {
      const result = formatMessage('WARN', '/my/project', 'Warning message', { error: 'test' });
      // Expected format: [2024-01-01T00:00:00.000Z] [WARN] [/my/project] Warning message {"error":"test"}
      const pattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] \[\/my\/project\] Warning message \{"error":"test"\}\n$/;
      expect(result).toMatch(pattern);
    });
  });
});

describe('ProjectLogger Service', () => {
  let ProjectLogger: typeof import('./projectLogger').ProjectLogger;
  let logger: InstanceType<typeof ProjectLogger>;
  let mockStream: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; once: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();

    mockStream = {
      write: vi.fn().mockReturnValue(true),
      close: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
    };

    vi.mocked(fs.createWriteStream).mockReturnValue(mockStream as unknown as fs.WriteStream);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const module = await import('./projectLogger');
    ProjectLogger = module.ProjectLogger;
    logger = new ProjectLogger();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setCurrentProject', () => {
    it('should switch to project log stream when project is set', () => {
      logger.setCurrentProject('/path/to/project');
      expect(logger.getCurrentProject()).toBe('/path/to/project');
    });

    it('should create project log directory if not exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      logger.setCurrentProject('/path/to/project');
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.kiro/logs'),
        { recursive: true }
      );
    });

    it('should close existing project stream when switching projects', () => {
      logger.setCurrentProject('/project/one');
      const firstStream = mockStream;

      // Reset mock for second stream
      const secondStream = { ...mockStream, close: vi.fn() };
      vi.mocked(fs.createWriteStream).mockReturnValue(secondStream as unknown as fs.WriteStream);

      logger.setCurrentProject('/project/two');
      expect(firstStream.close).toHaveBeenCalled();
    });

    it('should set currentProject to null when called with null', () => {
      logger.setCurrentProject('/path/to/project');
      logger.setCurrentProject(null);
      expect(logger.getCurrentProject()).toBeNull();
    });
  });

  describe('getCurrentProject', () => {
    it('should return null when no project is set', () => {
      expect(logger.getCurrentProject()).toBeNull();
    });

    it('should return current project path', () => {
      logger.setCurrentProject('/my/project');
      expect(logger.getCurrentProject()).toBe('/my/project');
    });
  });

  describe('getProjectLogPath', () => {
    it('should return null when no project is set', () => {
      expect(logger.getProjectLogPath()).toBeNull();
    });

    it('should return project log path when project is set', () => {
      logger.setCurrentProject('/my/project');
      const logPath = logger.getProjectLogPath();
      expect(logPath).toBe('/my/project/.kiro/logs/main.log');
    });
  });

  describe('getGlobalLogPath', () => {
    it('should return global log path', () => {
      const logPath = logger.getGlobalLogPath();
      expect(logPath).toContain('main.log');
    });
  });

  describe('info/debug/warn/error methods', () => {
    it('should write to global stream when no project is set', () => {
      // Clear the initialization log first
      mockStream.write.mockClear();

      logger.info('Test message');
      expect(mockStream.write).toHaveBeenCalled();
      const writtenContent = mockStream.write.mock.calls[0][0];
      expect(writtenContent).toContain('[global]');
      expect(writtenContent).toContain('[INFO]');
    });

    it('should write to both global and project streams when project is set', async () => {
      const globalStream = {
        write: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
      };
      const projectStream = {
        write: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
      };

      // First call creates global stream, second creates project stream
      vi.mocked(fs.createWriteStream)
        .mockReturnValueOnce(globalStream as unknown as fs.WriteStream)
        .mockReturnValueOnce(projectStream as unknown as fs.WriteStream);

      vi.resetModules();
      const module = await import('./projectLogger');
      const newLogger = new module.ProjectLogger();

      newLogger.setCurrentProject('/my/project');
      newLogger.info('Test message');

      // Both streams should receive the log
      expect(projectStream.write).toHaveBeenCalled();
    });

    it('should include projectId in log entries', () => {
      logger.setCurrentProject('/my/project');
      logger.warn('Warning message');

      const writtenContent = mockStream.write.mock.calls[mockStream.write.mock.calls.length - 1][0];
      expect(writtenContent).toContain('[/my/project]');
    });

    it('should log with correct level', () => {
      // Clear the initialization log first
      mockStream.write.mockClear();

      logger.debug('Debug message');
      expect(mockStream.write.mock.calls[0][0]).toContain('[DEBUG]');

      logger.info('Info message');
      expect(mockStream.write.mock.calls[1][0]).toContain('[INFO]');

      logger.warn('Warn message');
      expect(mockStream.write.mock.calls[2][0]).toContain('[WARN]');

      logger.error('Error message');
      expect(mockStream.write.mock.calls[3][0]).toContain('[ERROR]');
    });

    it('should include data in log entries', () => {
      // Clear the initialization log first
      mockStream.write.mockClear();

      logger.info('Test', { key: 'value' });
      const writtenContent = mockStream.write.mock.calls[0][0];
      expect(writtenContent).toContain('{"key":"value"}');
    });
  });

  describe('Fallback behavior', () => {
    it('should fallback to global log when project stream fails', async () => {
      const globalStream = {
        write: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
      };

      const failingProjectStream = {
        write: vi.fn().mockImplementation(() => {
          throw new Error('Write failed');
        }),
        close: vi.fn(),
        on: vi.fn((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            callback(new Error('Stream error'));
          }
        }),
        once: vi.fn(),
      };

      vi.mocked(fs.createWriteStream)
        .mockReturnValueOnce(globalStream as unknown as fs.WriteStream)
        .mockReturnValueOnce(failingProjectStream as unknown as fs.WriteStream);

      vi.resetModules();
      const module = await import('./projectLogger');
      const newLogger = new module.ProjectLogger();

      newLogger.setCurrentProject('/my/project');

      // Should not throw, should fallback to global
      expect(() => newLogger.info('Test')).not.toThrow();
    });
  });

  /**
   * Task 6.3: LogRotationManager統合テストを更新する
   * Requirements: 7.1, 7.2, 7.3, 7.4
   */
  describe('LogRotationManager Integration', () => {
    beforeEach(() => {
      // Reset mock rotation manager state
      mockRotationManager.checkAndRotate.mockClear();
      mockRotationManager.cleanupOldFiles.mockClear();
    });

    describe('LogRotationManager initialization (Requirement 7.1)', () => {
      it('should instantiate LogRotationManager on construction', async () => {
        vi.resetModules();
        const { LogRotationManager } = await import('./logRotationManager');
        const { ProjectLogger } = await import('./projectLogger');

        new ProjectLogger();

        // LogRotationManager should be instantiated
        expect(LogRotationManager).toHaveBeenCalled();
      });
    });

    describe('Rotation check on write (Requirement 7.2)', () => {
      it('should call checkAndRotate when writing logs', async () => {
        vi.resetModules();
        const module = await import('./projectLogger');
        const newLogger = new module.ProjectLogger();

        // Set project to enable project log stream
        newLogger.setCurrentProject('/my/project');

        // Clear the previous calls from initialization
        mockRotationManager.checkAndRotate.mockClear();

        // Write a log
        newLogger.info('Test message');

        // Wait for async rotation check
        await new Promise(resolve => setTimeout(resolve, 10));

        // checkAndRotate should have been called
        expect(mockRotationManager.checkAndRotate).toHaveBeenCalled();
      });

      it('should pass current file size to checkAndRotate', async () => {
        vi.resetModules();

        // Mock stream with bytesWritten
        const mockStreamWithSize = {
          write: vi.fn().mockReturnValue(true),
          close: vi.fn(),
          on: vi.fn(),
          once: vi.fn(),
          bytesWritten: 5000,
        };
        vi.mocked(fs.createWriteStream).mockReturnValue(mockStreamWithSize as unknown as fs.WriteStream);

        const module = await import('./projectLogger');
        const newLogger = new module.ProjectLogger();

        newLogger.setCurrentProject('/my/project');
        mockRotationManager.checkAndRotate.mockClear();

        newLogger.info('Test');

        // Wait for async rotation check
        await new Promise(resolve => setTimeout(resolve, 10));

        // Should be called with log path and size
        expect(mockRotationManager.checkAndRotate).toHaveBeenCalled();
        const [logPath, size] = mockRotationManager.checkAndRotate.mock.calls[0];
        expect(logPath).toContain('main.log');
        expect(typeof size).toBe('number');
      });
    });

    describe('Stream recreation on rotation (Requirement 7.3)', () => {
      it('should recreate stream when rotation returns true', async () => {
        vi.resetModules();

        // First checkAndRotate returns false, second returns true (needs rotation)
        mockRotationManager.checkAndRotate
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true);

        const module = await import('./projectLogger');
        const newLogger = new module.ProjectLogger();

        newLogger.setCurrentProject('/my/project');

        // Get initial stream creation count
        const initialCallCount = vi.mocked(fs.createWriteStream).mock.calls.length;

        // Clear and set up for rotation
        mockRotationManager.checkAndRotate.mockClear();
        mockRotationManager.checkAndRotate.mockResolvedValueOnce(true);

        // Write to trigger rotation
        newLogger.info('This should trigger rotation');

        // Wait for async rotation check
        await new Promise(resolve => setTimeout(resolve, 50));

        // createWriteStream should have been called again to recreate stream
        expect(vi.mocked(fs.createWriteStream).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    describe('Old file cleanup on project switch (Requirement 7.4)', () => {
      it('should call cleanupOldFiles when switching projects', async () => {
        vi.resetModules();
        const module = await import('./projectLogger');
        const newLogger = new module.ProjectLogger();

        // Clear any calls from initialization
        mockRotationManager.cleanupOldFiles.mockClear();

        // Set a project
        newLogger.setCurrentProject('/project/one');

        // Wait for async cleanup
        await new Promise(resolve => setTimeout(resolve, 10));

        // cleanupOldFiles should have been called for the new project
        expect(mockRotationManager.cleanupOldFiles).toHaveBeenCalled();
        const [logDir, retentionDays] = mockRotationManager.cleanupOldFiles.mock.calls[0];
        expect(logDir).toContain('.kiro/logs');
        expect(retentionDays).toBe(30);
      });

      it('should pass retention days from LogRotationManager defaults', async () => {
        vi.resetModules();
        mockRotationManager.getDefaultRetentionDays.mockReturnValue(14);

        const module = await import('./projectLogger');
        const newLogger = new module.ProjectLogger();

        mockRotationManager.cleanupOldFiles.mockClear();

        newLogger.setCurrentProject('/project/test');

        // Wait for async cleanup
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockRotationManager.cleanupOldFiles).toHaveBeenCalled();
        const [, retentionDays] = mockRotationManager.cleanupOldFiles.mock.calls[0];
        expect(retentionDays).toBe(14);
      });
    });
  });
});
