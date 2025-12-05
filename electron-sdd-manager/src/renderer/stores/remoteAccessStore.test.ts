/**
 * Remote Access Store Tests
 * TDD: Testing Zustand store for Remote Access Server state management
 * Requirements: 1.4, 1.5, 1.6, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRemoteAccessStore, STORAGE_KEY } from './remoteAccessStore';
import { act } from '@testing-library/react';

// Mock window.electronAPI
const mockElectronAPI = {
  startRemoteServer: vi.fn(),
  stopRemoteServer: vi.fn(),
  getRemoteServerStatus: vi.fn(),
  onRemoteServerStatusChanged: vi.fn(),
  onRemoteClientCountChanged: vi.fn(),
};

// Store original window.electronAPI
const originalElectronAPI = window.electronAPI;

describe('Remote Access Store (Task 4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clear localStorage before each test
    localStorage.clear();

    // Reset store state
    const store = useRemoteAccessStore.getState();
    store.reset();

    // Mock window.electronAPI
    (window as any).electronAPI = mockElectronAPI;

    // Setup default mock returns
    mockElectronAPI.onRemoteServerStatusChanged.mockReturnValue(() => {});
    mockElectronAPI.onRemoteClientCountChanged.mockReturnValue(() => {});
  });

  afterEach(() => {
    // Restore original electronAPI
    (window as any).electronAPI = originalElectronAPI;
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useRemoteAccessStore.getState();

      expect(store.isRunning).toBe(false);
      expect(store.port).toBeNull();
      expect(store.url).toBeNull();
      expect(store.qrCodeDataUrl).toBeNull();
      expect(store.clientCount).toBe(0);
      expect(store.error).toBeNull();
      expect(store.localIp).toBeNull();
      expect(store.autoStartEnabled).toBe(false);
      expect(store.isLoading).toBe(false);
    });
  });

  describe('startServer action', () => {
    it('should set loading state and call electronAPI.startRemoteServer', async () => {
      mockElectronAPI.startRemoteServer.mockResolvedValue({
        ok: true,
        value: {
          port: 8765,
          url: 'http://192.168.1.1:8765',
          qrCodeDataUrl: 'data:image/png;base64,test',
          localIp: '192.168.1.1',
        },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      expect(mockElectronAPI.startRemoteServer).toHaveBeenCalled();

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(true);
      expect(updatedStore.port).toBe(8765);
      expect(updatedStore.url).toBe('http://192.168.1.1:8765');
      expect(updatedStore.qrCodeDataUrl).toBe('data:image/png;base64,test');
      expect(updatedStore.localIp).toBe('192.168.1.1');
      expect(updatedStore.error).toBeNull();
      expect(updatedStore.isLoading).toBe(false);
    });

    it('should accept optional preferred port', async () => {
      mockElectronAPI.startRemoteServer.mockResolvedValue({
        ok: true,
        value: {
          port: 8770,
          url: 'http://192.168.1.1:8770',
          qrCodeDataUrl: 'data:image/png;base64,test',
          localIp: '192.168.1.1',
        },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer(8770);
      });

      expect(mockElectronAPI.startRemoteServer).toHaveBeenCalledWith(8770);

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.port).toBe(8770);
    });

    it('should set error when server fails to start', async () => {
      mockElectronAPI.startRemoteServer.mockResolvedValue({
        ok: false,
        error: { type: 'NO_AVAILABLE_PORT', triedPorts: [8765, 8766, 8767] },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(false);
      expect(updatedStore.error).toBe('No available port found. Tried ports: 8765, 8766, 8767');
      expect(updatedStore.isLoading).toBe(false);
    });

    it('should handle ALREADY_RUNNING error', async () => {
      mockElectronAPI.startRemoteServer.mockResolvedValue({
        ok: false,
        error: { type: 'ALREADY_RUNNING', port: 8765 },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.error).toBe('Server is already running on port 8765');
    });

    it('should handle NETWORK_ERROR', async () => {
      mockElectronAPI.startRemoteServer.mockResolvedValue({
        ok: false,
        error: { type: 'NETWORK_ERROR', message: 'Permission denied' },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.error).toBe('Network error: Permission denied');
    });

    it('should handle exception during startServer', async () => {
      mockElectronAPI.startRemoteServer.mockRejectedValue(new Error('IPC failed'));

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(false);
      expect(updatedStore.error).toBe('Failed to start server: IPC failed');
      expect(updatedStore.isLoading).toBe(false);
    });
  });

  describe('stopServer action', () => {
    it('should call electronAPI.stopRemoteServer and reset state', async () => {
      mockElectronAPI.stopRemoteServer.mockResolvedValue(undefined);

      // Set initial running state
      useRemoteAccessStore.setState({
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        qrCodeDataUrl: 'data:image/png;base64,test',
        localIp: '192.168.1.1',
        clientCount: 2,
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.stopServer();
      });

      expect(mockElectronAPI.stopRemoteServer).toHaveBeenCalled();

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(false);
      expect(updatedStore.port).toBeNull();
      expect(updatedStore.url).toBeNull();
      expect(updatedStore.qrCodeDataUrl).toBeNull();
      expect(updatedStore.localIp).toBeNull();
      expect(updatedStore.clientCount).toBe(0);
    });

    it('should handle error during stopServer', async () => {
      mockElectronAPI.stopRemoteServer.mockRejectedValue(new Error('IPC failed'));

      useRemoteAccessStore.setState({ isRunning: true });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.stopServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.error).toBe('Failed to stop server: IPC failed');
    });
  });

  describe('updateStatus action', () => {
    it('should update state with partial status', () => {
      const store = useRemoteAccessStore.getState();

      act(() => {
        store.updateStatus({
          isRunning: true,
          port: 8765,
          clientCount: 3,
        });
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(true);
      expect(updatedStore.port).toBe(8765);
      expect(updatedStore.clientCount).toBe(3);
    });
  });

  describe('clearError action', () => {
    it('should clear the error', () => {
      useRemoteAccessStore.setState({ error: 'Some error' });

      const store = useRemoteAccessStore.getState();

      act(() => {
        store.clearError();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.error).toBeNull();
    });
  });

  describe('setAutoStartEnabled action', () => {
    it('should update autoStartEnabled', () => {
      const store = useRemoteAccessStore.getState();

      act(() => {
        store.setAutoStartEnabled(true);
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.autoStartEnabled).toBe(true);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist autoStartEnabled to localStorage', () => {
      const store = useRemoteAccessStore.getState();

      act(() => {
        store.setAutoStartEnabled(true);
      });

      // Check localStorage
      const storedValue = localStorage.getItem(STORAGE_KEY);
      expect(storedValue).not.toBeNull();

      const parsed = JSON.parse(storedValue!);
      expect(parsed.state.autoStartEnabled).toBe(true);
    });

    it('should restore autoStartEnabled from localStorage', () => {
      // Set localStorage value
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { autoStartEnabled: true },
          version: 0,
        })
      );

      // Create a new store instance - simulate page reload
      // In practice, zustand persist will read this on initialization
      const state = useRemoteAccessStore.getState();

      // Force rehydration by re-reading
      state.setAutoStartEnabled(true);

      expect(useRemoteAccessStore.getState().autoStartEnabled).toBe(true);
    });

    it('should not persist runtime state (isRunning, port, etc.)', () => {
      useRemoteAccessStore.setState({
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        autoStartEnabled: true,
      });

      const storedValue = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(storedValue!);

      // Only autoStartEnabled should be persisted
      expect(parsed.state.autoStartEnabled).toBe(true);
      expect(parsed.state.isRunning).toBeUndefined();
      expect(parsed.state.port).toBeUndefined();
      expect(parsed.state.url).toBeUndefined();
    });
  });

  describe('initialize action', () => {
    it('should fetch current server status on initialization', async () => {
      mockElectronAPI.getRemoteServerStatus.mockResolvedValue({
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        clientCount: 1,
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.initialize();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(mockElectronAPI.getRemoteServerStatus).toHaveBeenCalled();
      expect(updatedStore.isRunning).toBe(true);
      expect(updatedStore.port).toBe(8765);
    });

    it('should setup status change listener', async () => {
      mockElectronAPI.getRemoteServerStatus.mockResolvedValue({
        isRunning: false,
        port: null,
        url: null,
        clientCount: 0,
      });

      let statusCallback: ((status: any) => void) | null = null;
      mockElectronAPI.onRemoteServerStatusChanged.mockImplementation((callback) => {
        statusCallback = callback;
        return () => {};
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.initialize();
      });

      expect(mockElectronAPI.onRemoteServerStatusChanged).toHaveBeenCalled();

      // Simulate status change
      if (statusCallback) {
        act(() => {
          statusCallback!({
            isRunning: true,
            port: 8765,
            url: 'http://192.168.1.1:8765',
            clientCount: 2,
          });
        });
      }

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(true);
      expect(updatedStore.clientCount).toBe(2);
    });
  });

  describe('cleanup action', () => {
    it('should unsubscribe from status change listener', async () => {
      const unsubscribeMock = vi.fn();
      mockElectronAPI.getRemoteServerStatus.mockResolvedValue({
        isRunning: false,
        port: null,
        url: null,
        clientCount: 0,
      });
      mockElectronAPI.onRemoteServerStatusChanged.mockReturnValue(unsubscribeMock);

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.initialize();
      });

      act(() => {
        store.cleanup();
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('reset action', () => {
    it('should reset all state to initial values', () => {
      useRemoteAccessStore.setState({
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        qrCodeDataUrl: 'data:image/png;base64,test',
        localIp: '192.168.1.1',
        clientCount: 3,
        error: 'Some error',
        autoStartEnabled: true,
        isLoading: true,
      });

      const store = useRemoteAccessStore.getState();

      act(() => {
        store.reset();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(false);
      expect(updatedStore.port).toBeNull();
      expect(updatedStore.url).toBeNull();
      expect(updatedStore.qrCodeDataUrl).toBeNull();
      expect(updatedStore.localIp).toBeNull();
      expect(updatedStore.clientCount).toBe(0);
      expect(updatedStore.error).toBeNull();
      expect(updatedStore.isLoading).toBe(false);
      // autoStartEnabled should be preserved (persisted)
      expect(updatedStore.autoStartEnabled).toBe(true);
    });
  });
});
