/**
 * RecentRemoteProjects Unit Tests
 * TDD: Testing recent remote project storage and retrieval
 * Requirements: 8.1, 8.4, 8.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RecentRemoteProjectsService,
  type RecentRemoteProject,
} from './recentRemoteProjects';

describe('RecentRemoteProjectsService', () => {
  let service: RecentRemoteProjectsService;
  let mockStore: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      get: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    };
    // Pass mock store directly to constructor
    service = new RecentRemoteProjectsService(mockStore as unknown as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRecentRemoteProjects', () => {
    it('should return empty array when no projects stored', () => {
      mockStore.get.mockReturnValue([]);

      const projects = service.getRecentRemoteProjects();

      expect(projects).toEqual([]);
    });

    it('should return stored remote projects', () => {
      const storedProjects: RecentRemoteProject[] = [
        {
          uri: 'ssh://user@host/path',
          displayName: 'host',
          lastConnectedAt: '2025-01-01T00:00:00.000Z',
          connectionSuccessful: true,
        },
      ];
      mockStore.get.mockReturnValue(storedProjects);

      const projects = service.getRecentRemoteProjects();

      expect(projects).toEqual(storedProjects);
    });
  });

  describe('addRecentRemoteProject', () => {
    it('should add new remote project', () => {
      service.addRecentRemoteProject('ssh://user@host/path', 'host');

      expect(mockStore.set).toHaveBeenCalled();
      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects).toHaveLength(1);
      expect(savedProjects[0].uri).toBe('ssh://user@host/path');
      expect(savedProjects[0].displayName).toBe('host');
    });

    it('should move existing project to top when re-added', () => {
      const existingProjects: RecentRemoteProject[] = [
        {
          uri: 'ssh://user@host1/path',
          displayName: 'host1',
          lastConnectedAt: '2025-01-01T00:00:00.000Z',
          connectionSuccessful: true,
        },
        {
          uri: 'ssh://user@host2/path',
          displayName: 'host2',
          lastConnectedAt: '2025-01-01T00:00:00.000Z',
          connectionSuccessful: true,
        },
      ];
      mockStore.get.mockReturnValue(existingProjects);

      service.addRecentRemoteProject('ssh://user@host2/path', 'host2');

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects[0].uri).toBe('ssh://user@host2/path');
      expect(savedProjects).toHaveLength(2);
    });

    it('should limit to maximum 10 projects', () => {
      const existingProjects: RecentRemoteProject[] = Array.from({ length: 10 }, (_, i) => ({
        uri: `ssh://user@host${i}/path`,
        displayName: `host${i}`,
        lastConnectedAt: '2025-01-01T00:00:00.000Z',
        connectionSuccessful: true,
      }));
      mockStore.get.mockReturnValue(existingProjects);

      service.addRecentRemoteProject('ssh://user@newhost/path', 'newhost');

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects).toHaveLength(10);
      expect(savedProjects[0].uri).toBe('ssh://user@newhost/path');
      expect(savedProjects[9].uri).toBe('ssh://user@host8/path');
    });

    it('should set connectionSuccessful flag', () => {
      service.addRecentRemoteProject('ssh://user@host/path', 'host', true);

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects[0].connectionSuccessful).toBe(true);
    });

    it('should update lastConnectedAt timestamp', () => {
      const before = Date.now();
      service.addRecentRemoteProject('ssh://user@host/path', 'host');
      const after = Date.now();

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      const timestamp = new Date(savedProjects[0].lastConnectedAt).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('removeRecentRemoteProject', () => {
    it('should remove specified project', () => {
      const existingProjects: RecentRemoteProject[] = [
        {
          uri: 'ssh://user@host1/path',
          displayName: 'host1',
          lastConnectedAt: '2025-01-01T00:00:00.000Z',
          connectionSuccessful: true,
        },
        {
          uri: 'ssh://user@host2/path',
          displayName: 'host2',
          lastConnectedAt: '2025-01-01T00:00:00.000Z',
          connectionSuccessful: true,
        },
      ];
      mockStore.get.mockReturnValue(existingProjects);

      service.removeRecentRemoteProject('ssh://user@host1/path');

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects).toHaveLength(1);
      expect(savedProjects[0].uri).toBe('ssh://user@host2/path');
    });

    it('should do nothing when project not found', () => {
      mockStore.get.mockReturnValue([]);

      service.removeRecentRemoteProject('ssh://nonexistent@host/path');

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects).toEqual([]);
    });
  });

  describe('updateConnectionStatus', () => {
    it('should update connection status for existing project', () => {
      const existingProjects: RecentRemoteProject[] = [
        {
          uri: 'ssh://user@host/path',
          displayName: 'host',
          lastConnectedAt: '2025-01-01T00:00:00.000Z',
          connectionSuccessful: false,
        },
      ];
      mockStore.get.mockReturnValue(existingProjects);

      service.updateConnectionStatus('ssh://user@host/path', true);

      const setCall = mockStore.set.mock.calls[0];
      const savedProjects = setCall[1];
      expect(savedProjects[0].connectionSuccessful).toBe(true);
    });
  });

  describe('clearAllRemoteProjects', () => {
    it('should clear all remote projects', () => {
      service.clearAllRemoteProjects();

      expect(mockStore.set).toHaveBeenCalledWith('recentRemoteProjects', []);
    });
  });
});

describe('RecentRemoteProject type', () => {
  it('should have required properties', () => {
    const project: RecentRemoteProject = {
      uri: 'ssh://user@host:22/path',
      displayName: 'My Server',
      lastConnectedAt: '2025-01-01T12:00:00.000Z',
      connectionSuccessful: true,
    };

    expect(project.uri).toBeDefined();
    expect(project.displayName).toBeDefined();
    expect(project.lastConnectedAt).toBeDefined();
    expect(project.connectionSuccessful).toBeDefined();
  });
});
