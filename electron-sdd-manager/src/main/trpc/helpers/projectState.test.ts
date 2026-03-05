/**
 * projectState.ts Compatibility Layer Tests
 * multi-window-integration Task 3.2
 *
 * Tests that global getter/setter functions delegate to WindowManager's
 * focused window state for multi-window compatibility.
 *
 * Requirements: 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the windowManager module before importing projectState
// We mock getWindowManager to return a controllable mock instance
const mockWindowManager = {
  getFocusedWindowId: vi.fn() as ReturnType<typeof vi.fn>,
  getWindowProject: vi.fn() as ReturnType<typeof vi.fn>,
  getWindowServices: vi.fn() as ReturnType<typeof vi.fn>,
  getWindowContext: vi.fn() as ReturnType<typeof vi.fn>,
};

vi.mock('../../services/windowManager', () => ({
  getWindowManager: vi.fn(() => mockWindowManager),
}));

// Mock logger to suppress output
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  getCurrentProjectPath,
  getSpecManagerService,
  getAutoExecutionCoordinator,
  getMetricsService,
  setCurrentProjectPath,
  setSpecManagerService,
  setAutoExecutionCoordinator,
  setMetricsService,
} from './projectState';

describe('projectState compatibility layer (Task 3.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // getCurrentProjectPath delegation
  // ============================================================
  describe('getCurrentProjectPath', () => {
    it('should return focused window projectPath when WindowManager has a focused window', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowProject.mockReturnValue('/path/to/project-a');

      const result = getCurrentProjectPath();

      expect(result).toBe('/path/to/project-a');
      expect(mockWindowManager.getFocusedWindowId).toHaveBeenCalled();
      expect(mockWindowManager.getWindowProject).toHaveBeenCalledWith(1);
    });

    it('should return null when no focused window exists', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(null);

      const result = getCurrentProjectPath();

      expect(result).toBeNull();
    });

    it('should return null when focused window has no project', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowProject.mockReturnValue(null);

      const result = getCurrentProjectPath();

      expect(result).toBeNull();
    });

    it('should follow focus changes across multiple windows', () => {
      // Window 1 is focused with project A
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowProject.mockImplementation((id: number) => {
        if (id === 1) return '/path/to/project-a';
        if (id === 2) return '/path/to/project-b';
        return null;
      });

      expect(getCurrentProjectPath()).toBe('/path/to/project-a');

      // Switch focus to window 2
      mockWindowManager.getFocusedWindowId.mockReturnValue(2);

      expect(getCurrentProjectPath()).toBe('/path/to/project-b');
    });
  });

  // ============================================================
  // getSpecManagerService delegation
  // ============================================================
  describe('getSpecManagerService', () => {
    it('should return focused window specManagerService when available', () => {
      const mockSpecManager = { loadSpecs: vi.fn() };
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowServices.mockReturnValue({
        specManagerService: mockSpecManager,
      });

      const result = getSpecManagerService();

      expect(result).toBe(mockSpecManager);
      expect(mockWindowManager.getWindowServices).toHaveBeenCalledWith(1);
    });

    it('should throw when no focused window exists', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(null);

      expect(() => getSpecManagerService()).toThrow();
    });

    it('should throw when focused window has no services', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowServices.mockReturnValue(null);

      expect(() => getSpecManagerService()).toThrow();
    });
  });

  // ============================================================
  // getAutoExecutionCoordinator delegation
  // ============================================================
  describe('getAutoExecutionCoordinator', () => {
    it('should return focused window autoExecutionCoordinator when available', () => {
      const mockCoordinator = { resetAll: vi.fn() };
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowServices.mockReturnValue({
        autoExecutionCoordinator: mockCoordinator,
      });

      const result = getAutoExecutionCoordinator();

      expect(result).toBe(mockCoordinator);
      expect(mockWindowManager.getWindowServices).toHaveBeenCalledWith(1);
    });

    it('should throw when no focused window exists', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(null);

      expect(() => getAutoExecutionCoordinator()).toThrow();
    });

    it('should throw when focused window has no services', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowServices.mockReturnValue(null);

      expect(() => getAutoExecutionCoordinator()).toThrow();
    });
  });

  // ============================================================
  // getMetricsService delegation
  // ============================================================
  describe('getMetricsService', () => {
    it('should return focused window metricsService when available', () => {
      const mockMetrics = { setProjectPath: vi.fn() };
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowServices.mockReturnValue({
        metricsService: mockMetrics,
      });

      const result = getMetricsService();

      expect(result).toBe(mockMetrics);
      expect(mockWindowManager.getWindowServices).toHaveBeenCalledWith(1);
    });

    it('should throw when no focused window exists', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(null);

      expect(() => getMetricsService()).toThrow();
    });

    it('should throw when focused window has no services', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);
      mockWindowManager.getWindowServices.mockReturnValue(null);

      expect(() => getMetricsService()).toThrow();
    });
  });

  // ============================================================
  // Setter functions (deprecated but still functional during migration)
  // ============================================================
  describe('setter functions (migration-period compatibility)', () => {
    it('setCurrentProjectPath should not throw', () => {
      mockWindowManager.getFocusedWindowId.mockReturnValue(1);

      // Setter should be a no-op or delegate, but not throw
      expect(() => setCurrentProjectPath('/new/path')).not.toThrow();
    });

    it('setSpecManagerService should not throw', () => {
      expect(() => setSpecManagerService(null)).not.toThrow();
    });

    it('setAutoExecutionCoordinator should not throw', () => {
      expect(() => setAutoExecutionCoordinator(null)).not.toThrow();
    });

    it('setMetricsService should not throw', () => {
      expect(() => setMetricsService(null)).not.toThrow();
    });
  });

  // ============================================================
  // WindowManager uninitialized (test environment fallback)
  // ============================================================
  describe('WindowManager uninitialized fallback', () => {
    it('getCurrentProjectPath should return null when getWindowManager throws', async () => {
      // Dynamically override the mock to simulate uninitialized WindowManager
      const { getWindowManager } = await import('../../services/windowManager');
      vi.mocked(getWindowManager).mockImplementation(() => {
        throw new Error('WindowManager not initialized');
      });

      const result = getCurrentProjectPath();
      expect(result).toBeNull();

      // Restore mock
      vi.mocked(getWindowManager).mockImplementation(() => mockWindowManager as any);
    });

    it('getSpecManagerService should throw when getWindowManager throws', async () => {
      const { getWindowManager } = await import('../../services/windowManager');
      vi.mocked(getWindowManager).mockImplementation(() => {
        throw new Error('WindowManager not initialized');
      });

      expect(() => getSpecManagerService()).toThrow();

      // Restore mock
      vi.mocked(getWindowManager).mockImplementation(() => mockWindowManager as any);
    });
  });
});
