/**
 * Tests for CrashReporter service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';

// Must mock electron before importing the module under test
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/mock/logs'),
  },
  dialog: {
    showErrorBox: vi.fn(),
  },
}));

// Must mock fs to avoid actual file writes
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
});

describe('CrashReporter', () => {
  let originalShowErrorBox: typeof dialog.showErrorBox;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalShowErrorBox = dialog.showErrorBox;
    // Reset process.stderr.write mock
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    dialog.showErrorBox = originalShowErrorBox;
    vi.restoreAllMocks();
  });

  describe('initCrashReporter', () => {
    it('should create crash log directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const { initCrashReporter } = await import('./crashReporter');

      initCrashReporter(false);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should write initialization entry to crash log', async () => {
      const { initCrashReporter } = await import('./crashReporter');

      initCrashReporter(false);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('crash.log'),
        expect.stringContaining('CrashReporter initialized'),
        'utf-8'
      );
    });

    it('should set crash log path', async () => {
      const { initCrashReporter, getCrashLogPath } = await import('./crashReporter');

      initCrashReporter(false);

      expect(getCrashLogPath()).toContain('crash.log');
    });
  });

  describe('writeCrashLog', () => {
    it('should write formatted entry to crash log file', async () => {
      const { initCrashReporter, writeCrashLog } = await import('./crashReporter');
      initCrashReporter(false);
      vi.mocked(fs.appendFileSync).mockClear();

      writeCrashLog('Test Error', 'Something went wrong');

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('crash.log'),
        expect.stringContaining('Test Error'),
        'utf-8'
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Something went wrong'),
        'utf-8'
      );
    });

    it('should also write to stderr', async () => {
      const { initCrashReporter, writeCrashLog } = await import('./crashReporter');
      initCrashReporter(false);

      writeCrashLog('Test Error', 'Something went wrong');

      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('Test Error')
      );
    });
  });

  describe('dialog.showErrorBox interception', () => {
    it('should log to crash file when showErrorBox is called in interactive mode', async () => {
      const { initCrashReporter } = await import('./crashReporter');
      initCrashReporter(false); // interactive mode
      vi.mocked(fs.appendFileSync).mockClear();

      dialog.showErrorBox('Error Title', 'Error Content');

      // Should have logged to crash file
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('crash.log'),
        expect.stringContaining('Error Title'),
        'utf-8'
      );
    });

    it('should call original showErrorBox in interactive mode', async () => {
      const mockOriginal = vi.fn();
      dialog.showErrorBox = mockOriginal;

      const { initCrashReporter } = await import('./crashReporter');
      initCrashReporter(false); // interactive mode

      dialog.showErrorBox('Error Title', 'Error Content');

      expect(mockOriginal).toHaveBeenCalledWith('Error Title', 'Error Content');
    });

    it('should skip showErrorBox in non-interactive mode', async () => {
      const mockOriginal = vi.fn();
      dialog.showErrorBox = mockOriginal;

      const { initCrashReporter } = await import('./crashReporter');
      initCrashReporter(true); // non-interactive mode

      dialog.showErrorBox('Error Title', 'Error Content');

      // Original should NOT be called
      expect(mockOriginal).not.toHaveBeenCalled();

      // But crash log should still be written
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('crash.log'),
        expect.stringContaining('Error Title'),
        'utf-8'
      );
    });

    it('should write skip message to stderr in non-interactive mode', async () => {
      const { initCrashReporter } = await import('./crashReporter');
      initCrashReporter(true); // non-interactive mode

      dialog.showErrorBox('Error Title', 'Error Content');

      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('Skipped showErrorBox')
      );
    });
  });
});
