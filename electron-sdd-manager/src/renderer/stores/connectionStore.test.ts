/**
 * Connection Store Tests
 * Tests for SSH connection state management via Zustand
 * Requirements: 6.1, 7.1, 7.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock electronAPI
const mockElectronAPI = {
  sshConnect: vi.fn(),
  sshDisconnect: vi.fn(),
  getSSHStatus: vi.fn(),
  getSSHConnectionInfo: vi.fn(),
  getRecentRemoteProjects: vi.fn(),
  removeRecentRemoteProject: vi.fn(),
  onSSHStatusChanged: vi.fn(),
};

// Install mock before tests
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Import after mock is set up
import { useConnectionStore, type ConnectionState } from './connectionStore';

describe('Connection Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useConnectionStore.setState({
      status: 'disconnected',
      connectionInfo: null,
      projectUri: null,
      projectType: 'local',
      recentRemoteProjects: [],
      error: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useConnectionStore.getState();

      expect(state.status).toBe('disconnected');
      expect(state.connectionInfo).toBeNull();
      expect(state.projectUri).toBeNull();
      expect(state.projectType).toBe('local');
      expect(state.recentRemoteProjects).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('connectSSH', () => {
    it('should set loading state when connecting', async () => {
      mockElectronAPI.sshConnect.mockResolvedValue({ ok: true, value: undefined });
      mockElectronAPI.getSSHStatus.mockResolvedValue('connected');
      mockElectronAPI.getSSHConnectionInfo.mockResolvedValue({
        host: 'test.com',
        port: 22,
        user: 'testuser',
        connectedAt: new Date(),
        bytesTransferred: 0,
      });

      const promise = useConnectionStore.getState().connectSSH('ssh://testuser@test.com/path');

      expect(useConnectionStore.getState().isLoading).toBe(true);

      await promise;

      expect(useConnectionStore.getState().isLoading).toBe(false);
    });

    it('should update state on successful connection', async () => {
      const connectionInfo = {
        host: 'test.com',
        port: 22,
        user: 'testuser',
        connectedAt: new Date(),
        bytesTransferred: 0,
      };

      mockElectronAPI.sshConnect.mockResolvedValue({ ok: true, value: undefined });
      mockElectronAPI.getSSHStatus.mockResolvedValue('connected');
      mockElectronAPI.getSSHConnectionInfo.mockResolvedValue(connectionInfo);

      await useConnectionStore.getState().connectSSH('ssh://testuser@test.com/path');

      const state = useConnectionStore.getState();
      expect(state.status).toBe('connected');
      expect(state.projectUri).toBe('ssh://testuser@test.com/path');
      expect(state.projectType).toBe('ssh');
      expect(state.connectionInfo).toEqual(connectionInfo);
      expect(state.error).toBeNull();
    });

    it('should update state on connection failure', async () => {
      mockElectronAPI.sshConnect.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Authentication failed' },
      });

      await useConnectionStore.getState().connectSSH('ssh://testuser@test.com/path');

      const state = useConnectionStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Authentication failed');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('disconnectSSH', () => {
    it('should reset connection state on disconnect', async () => {
      // Set up connected state first
      useConnectionStore.setState({
        status: 'connected',
        projectUri: 'ssh://testuser@test.com/path',
        projectType: 'ssh',
        connectionInfo: {
          host: 'test.com',
          port: 22,
          user: 'testuser',
          connectedAt: new Date(),
          bytesTransferred: 1024,
        },
      });

      mockElectronAPI.sshDisconnect.mockResolvedValue(undefined);

      await useConnectionStore.getState().disconnectSSH();

      const state = useConnectionStore.getState();
      expect(state.status).toBe('disconnected');
      expect(state.connectionInfo).toBeNull();
      expect(state.projectType).toBe('local');
    });
  });

  describe('setLocalProject', () => {
    it('should switch to local project type', () => {
      // Set up SSH state first
      useConnectionStore.setState({
        status: 'connected',
        projectUri: 'ssh://testuser@test.com/path',
        projectType: 'ssh',
      });

      useConnectionStore.getState().setLocalProject('/local/path');

      const state = useConnectionStore.getState();
      expect(state.projectType).toBe('local');
      expect(state.projectUri).toBe('/local/path');
      expect(state.status).toBe('disconnected');
    });
  });

  describe('loadRecentRemoteProjects', () => {
    it('should load recent remote projects from API', async () => {
      const projects = [
        { uri: 'ssh://user@host1.com/path1', displayName: 'host1', lastConnectedAt: '2025-01-01', connectionSuccessful: true },
        { uri: 'ssh://user@host2.com/path2', displayName: 'host2', lastConnectedAt: '2025-01-02', connectionSuccessful: false },
      ];

      mockElectronAPI.getRecentRemoteProjects.mockResolvedValue(projects);

      await useConnectionStore.getState().loadRecentRemoteProjects();

      expect(useConnectionStore.getState().recentRemoteProjects).toEqual(projects);
    });
  });

  describe('removeRecentRemoteProject', () => {
    it('should remove project from recent list', async () => {
      const projects = [
        { uri: 'ssh://user@host1.com/path1', displayName: 'host1', lastConnectedAt: '2025-01-01', connectionSuccessful: true },
        { uri: 'ssh://user@host2.com/path2', displayName: 'host2', lastConnectedAt: '2025-01-02', connectionSuccessful: true },
      ];

      useConnectionStore.setState({ recentRemoteProjects: projects });
      mockElectronAPI.removeRecentRemoteProject.mockResolvedValue(undefined);

      await useConnectionStore.getState().removeRecentRemoteProject('ssh://user@host1.com/path1');

      expect(mockElectronAPI.removeRecentRemoteProject).toHaveBeenCalledWith('ssh://user@host1.com/path1');
      expect(useConnectionStore.getState().recentRemoteProjects).toEqual([
        { uri: 'ssh://user@host2.com/path2', displayName: 'host2', lastConnectedAt: '2025-01-02', connectionSuccessful: true },
      ]);
    });
  });

  describe('setStatus', () => {
    it('should update connection status', () => {
      useConnectionStore.getState().setStatus('connecting');
      expect(useConnectionStore.getState().status).toBe('connecting');

      useConnectionStore.getState().setStatus('connected');
      expect(useConnectionStore.getState().status).toBe('connected');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useConnectionStore.setState({ error: 'Some error' });

      useConnectionStore.getState().clearError();

      expect(useConnectionStore.getState().error).toBeNull();
    });
  });

  describe('isRemoteProject', () => {
    it('should return true for SSH projects', () => {
      useConnectionStore.setState({ projectType: 'ssh' });
      expect(useConnectionStore.getState().isRemoteProject()).toBe(true);
    });

    it('should return false for local projects', () => {
      useConnectionStore.setState({ projectType: 'local' });
      expect(useConnectionStore.getState().isRemoteProject()).toBe(false);
    });
  });
});
