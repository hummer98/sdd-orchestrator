/**
 * ConfigStore Unit Tests
 * TDD: Testing config persistence
 * Requirements: 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-store for testing
const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('electron-store', () => {
  return {
    default: vi.fn(() => mockStore),
  };
});

describe('ConfigStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockReset();
    mockStore.set.mockReset();
  });

  describe('getRecentProjects', () => {
    it('should return empty array when no projects stored', async () => {
      mockStore.get.mockReturnValue([]);

      // Import after mock setup
      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const projects = store.getRecentProjects();
      expect(projects).toEqual([]);
    });

    it('should return stored projects', async () => {
      const storedProjects = ['/path/to/project1', '/path/to/project2'];
      mockStore.get.mockReturnValue(storedProjects);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const projects = store.getRecentProjects();
      expect(projects).toEqual(storedProjects);
    });
  });

  describe('addRecentProject', () => {
    it('should add new project to beginning of list', async () => {
      const existingProjects = ['/path/to/project1'];
      mockStore.get.mockReturnValue(existingProjects);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.addRecentProject('/path/to/project2');

      expect(mockStore.set).toHaveBeenCalledWith(
        'recentProjects',
        expect.arrayContaining(['/path/to/project2'])
      );
    });

    it('should not duplicate existing projects', async () => {
      const existingProjects = ['/path/to/project1', '/path/to/project2'];
      mockStore.get.mockReturnValue(existingProjects);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.addRecentProject('/path/to/project1');

      // Should move project1 to front, not duplicate
      const setCalls = mockStore.set.mock.calls;
      expect(setCalls[0][1]).toHaveLength(2);
    });

    it('should limit to 10 recent projects', async () => {
      const existingProjects = Array.from({ length: 10 }, (_, i) => `/path/to/project${i}`);
      mockStore.get.mockReturnValue(existingProjects);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.addRecentProject('/path/to/newproject');

      const setCalls = mockStore.set.mock.calls;
      expect(setCalls[0][1]).toHaveLength(10);
    });
  });

  describe('removeRecentProject', () => {
    it('should remove specified project', async () => {
      const existingProjects = ['/path/to/project1', '/path/to/project2'];
      mockStore.get.mockReturnValue(existingProjects);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.removeRecentProject('/path/to/project1');

      expect(mockStore.set).toHaveBeenCalledWith(
        'recentProjects',
        ['/path/to/project2']
      );
    });
  });

  describe('windowBounds', () => {
    it('should get stored window bounds', async () => {
      const bounds = { x: 100, y: 100, width: 1200, height: 800 };
      mockStore.get.mockReturnValue(bounds);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const result = store.getWindowBounds();
      expect(result).toEqual(bounds);
    });

    it('should return null when no bounds stored', async () => {
      mockStore.get.mockReturnValue(undefined);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const result = store.getWindowBounds();
      expect(result).toBeNull();
    });

    it('should set window bounds', async () => {
      const bounds = { x: 100, y: 100, width: 1200, height: 800 };

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.setWindowBounds(bounds);

      expect(mockStore.set).toHaveBeenCalledWith('windowBounds', bounds);
    });
  });

  // Task 26.1: hangThreshold設定
  describe('hangThreshold', () => {
    it('should get default hangThreshold', async () => {
      // Default is 5 minutes (300000 ms)
      mockStore.get.mockReturnValue(undefined);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const result = store.getHangThreshold();
      expect(result).toBe(300000); // 5 minutes default
    });

    it('should get stored hangThreshold', async () => {
      mockStore.get.mockReturnValue(600000); // 10 minutes

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const result = store.getHangThreshold();
      expect(result).toBe(600000);
    });

    it('should set hangThreshold', async () => {
      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.setHangThreshold(600000); // 10 minutes

      expect(mockStore.set).toHaveBeenCalledWith('hangThreshold', 600000);
    });
  });

  // Task 4.1, 4.2: Multi-window state persistence
  // Requirements: 4.1-4.6
  describe('multiWindowStates', () => {
    it('should return empty array when no states stored', async () => {
      mockStore.get.mockReturnValue(undefined);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const states = store.getMultiWindowStates();
      expect(states).toEqual([]);
    });

    it('should return stored multi-window states', async () => {
      const storedStates = [
        { projectPath: '/project1', bounds: { x: 0, y: 0, width: 1200, height: 800 }, isMaximized: false, isMinimized: false },
        { projectPath: '/project2', bounds: { x: 100, y: 100, width: 1200, height: 800 }, isMaximized: true, isMinimized: false },
      ];
      mockStore.get.mockReturnValue(storedStates);

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const states = store.getMultiWindowStates();
      expect(states).toEqual(storedStates);
    });

    it('should set multi-window states', async () => {
      const states = [
        { projectPath: '/project1', bounds: { x: 0, y: 0, width: 1200, height: 800 }, isMaximized: false, isMinimized: false },
      ];

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      store.setMultiWindowStates(states);

      expect(mockStore.set).toHaveBeenCalledWith('multiWindowStates', states);
    });

    it('should migrate from legacy windowBounds when no multiWindowStates exist', async () => {
      // First call for multiWindowStates returns undefined
      // Second call for windowBounds returns legacy bounds
      mockStore.get
        .mockReturnValueOnce(undefined) // multiWindowStates
        .mockReturnValueOnce({ x: 100, y: 100, width: 1200, height: 800 }); // windowBounds

      const { ConfigStore } = await import('./configStore');
      const store = new ConfigStore(mockStore as any);

      const states = store.getMultiWindowStates();

      // Should return one state with empty projectPath (for project selection screen)
      expect(states).toHaveLength(1);
      expect(states[0].projectPath).toBe('');
      expect(states[0].bounds.width).toBe(1200);
    });
  });
});
