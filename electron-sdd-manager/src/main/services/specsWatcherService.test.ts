import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpecsWatcherService } from './specsWatcherService';

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SpecsWatcherService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('debounce behavior', () => {
    it('should notify events for different files independently', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      // Access private method via type assertion for testing
      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate two different files changing within debounce window
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      handleEvent('add', '/project/.kiro/specs/feature/inspection-1.md');

      // Advance timers past debounce period (300ms)
      vi.advanceTimersByTime(350);

      // Both events should be notified
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/project/.kiro/specs/feature/tasks.md' })
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/project/.kiro/specs/feature/inspection-1.md' })
      );
    });

    it('should debounce rapid changes to the same file', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate rapid changes to the same file
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      vi.advanceTimersByTime(100);
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      vi.advanceTimersByTime(100);
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');

      // Advance timers past debounce period
      vi.advanceTimersByTime(350);

      // Only one event should be notified (the last one)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear all timers on stop', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      // Simulate file changes
      handleEvent('change', '/project/.kiro/specs/feature/tasks.md');
      handleEvent('add', '/project/.kiro/specs/feature/design.md');

      // Stop before debounce completes
      await service.stop();

      // Advance timers
      vi.advanceTimersByTime(350);

      // No events should be notified because timers were cleared
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should extract correct specId from file path', async () => {
      const service = new SpecsWatcherService('/project');
      const callback = vi.fn();
      service.onChange(callback);

      const handleEvent = (service as unknown as { handleEvent: (type: string, path: string) => void }).handleEvent.bind(service);

      handleEvent('change', '/project/.kiro/specs/my-feature/tasks.md');

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'my-feature',
          path: '/project/.kiro/specs/my-feature/tasks.md',
        })
      );
    });
  });
});
