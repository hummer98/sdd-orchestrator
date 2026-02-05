/**
 * Initial Select Result Cache Tests
 * TDD: Testing initialSelectResult cache management for startup-project-selection-fix feature
 * Requirements: 1.1 - selectProject result caching for startup broadcast
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SelectProjectResult } from '../../renderer/types';

// Unmock handlers module to test the actual implementation
vi.unmock('./handlers');

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeListener: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    getVersion: vi.fn().mockReturnValue('0.1.0'),
    getPath: vi.fn().mockReturnValue('/tmp'),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

// Mock services to avoid side effects
vi.mock('../services/configStore', () => ({
  getConfigStore: vi.fn(() => ({
    getRecentProjects: vi.fn().mockReturnValue([]),
    addRecentProject: vi.fn(),
    getHangThreshold: vi.fn().mockReturnValue(300000),
    setHangThreshold: vi.fn(),
  })),
}));

vi.mock('../menu', () => ({
  updateMenu: vi.fn(),
  setMenuProjectPath: vi.fn(),
  updateWindowTitle: vi.fn(),
}));

vi.mock('../services/mcp/mcpServerService', () => ({
  McpServerService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    getStatus: vi.fn(),
    onStatusChange: vi.fn(),
  })),
}));

vi.mock('./mcpHandlers', () => ({
  registerMcpHandlers: vi.fn(),
}));

// Import the functions to test after setting up mocks
import {
  setInitialSelectResult,
  getInitialSelectResult,
  clearInitialSelectResult,
} from './handlers';

describe('initialSelectResult Cache Management', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearInitialSelectResult();
  });

  describe('setInitialSelectResult', () => {
    it('should cache the SelectProjectResult', () => {
      const mockResult: SelectProjectResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      setInitialSelectResult(mockResult);

      const cached = getInitialSelectResult();
      expect(cached).toEqual(mockResult);
    });

    it('should overwrite previous cached result', () => {
      const firstResult: SelectProjectResult = {
        success: true,
        projectPath: '/first/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      const secondResult: SelectProjectResult = {
        success: true,
        projectPath: '/second/project',
        kiroValidation: { exists: true, hasSpecs: false, hasSteering: true },
        specs: [{ name: 'test-spec', path: '/test/spec' }],
        bugs: [],
        specJsonMap: {},
      };

      setInitialSelectResult(firstResult);
      setInitialSelectResult(secondResult);

      const cached = getInitialSelectResult();
      expect(cached).toEqual(secondResult);
      expect(cached?.projectPath).toBe('/second/project');
    });
  });

  describe('getInitialSelectResult', () => {
    it('should return null when no result is cached', () => {
      const cached = getInitialSelectResult();
      expect(cached).toBeNull();
    });

    it('should return the cached result', () => {
      const mockResult: SelectProjectResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      setInitialSelectResult(mockResult);

      const cached = getInitialSelectResult();
      expect(cached).not.toBeNull();
      expect(cached?.projectPath).toBe('/test/project');
    });
  });

  describe('clearInitialSelectResult', () => {
    it('should clear the cached result', () => {
      const mockResult: SelectProjectResult = {
        success: true,
        projectPath: '/test/project',
        kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
        specs: [],
        bugs: [],
        specJsonMap: {},
      };

      setInitialSelectResult(mockResult);
      expect(getInitialSelectResult()).not.toBeNull();

      clearInitialSelectResult();
      expect(getInitialSelectResult()).toBeNull();
    });

    it('should be safe to call when no result is cached', () => {
      // Should not throw
      expect(() => clearInitialSelectResult()).not.toThrow();
      expect(getInitialSelectResult()).toBeNull();
    });
  });
});
