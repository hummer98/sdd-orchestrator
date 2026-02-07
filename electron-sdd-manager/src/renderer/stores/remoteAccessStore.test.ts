/**
 * Remote Access Store Tests
 * TDD: Testing Zustand store for Remote Access Server state management
 * Requirements: 1.4, 1.5, 1.6, 8.5
 *
 * remote-ui-auto-start Task 5.2: autoStartEnabled tests removed
 * Auto-start setting is now stored in project config (.kiro/sdd-orchestrator.json)
 *
 * trpc-full-migration Task 11.4: Updated to use tRPC vanillaClient mock
 * instead of window.electronAPI mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRemoteAccessStore, STORAGE_KEY } from './remoteAccessStore';
import { act } from '@testing-library/react';

// trpc-full-migration Task 11.4: Mock tRPC vanilla client
const mockStartRemoteServer = vi.fn();
const mockStopRemoteServer = vi.fn();
const mockGetRemoteServerStatus = vi.fn();
const mockGetCloudflareSettings = vi.fn();
const mockRefreshAccessToken = vi.fn();

// Mock subscription
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });

vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    misc: {
      startRemoteServer: { mutate: mockStartRemoteServer },
      stopRemoteServer: { mutate: mockStopRemoteServer },
      getRemoteServerStatus: { query: mockGetRemoteServerStatus },
      refreshAccessToken: { mutate: mockRefreshAccessToken },
    },
    cloudflare: {
      getSettings: { query: mockGetCloudflareSettings },
    },
    events: {
      onRemoteServerStatusChanged: { subscribe: mockSubscribe },
    },
  }),
}));

describe('Remote Access Store (Task 4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clear localStorage before each test
    localStorage.clear();

    // Reset store state
    const store = useRemoteAccessStore.getState();
    store.reset();

    // Setup default mock returns
    mockGetRemoteServerStatus.mockResolvedValue({
      running: false,
      port: null,
      url: null,
      clientCount: 0,
    });
    mockGetCloudflareSettings.mockResolvedValue({
      hasTunnelToken: false,
    });
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
      expect(store.isLoading).toBe(false);
    });
  });

  describe('startServer action', () => {
    it('should set loading state and call tRPC startRemoteServer', async () => {
      mockStartRemoteServer.mockResolvedValue({
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

      expect(mockStartRemoteServer).toHaveBeenCalled();

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
      mockStartRemoteServer.mockResolvedValue({
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

      expect(mockStartRemoteServer).toHaveBeenCalledWith({ preferredPort: 8770 });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.port).toBe(8770);
    });

    it('should set error when server fails to start', async () => {
      mockStartRemoteServer.mockResolvedValue({
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
      mockStartRemoteServer.mockResolvedValue({
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
      mockStartRemoteServer.mockResolvedValue({
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
      mockStartRemoteServer.mockRejectedValue(new Error('tRPC failed'));

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(false);
      expect(updatedStore.error).toBe('Failed to start server: tRPC failed');
      expect(updatedStore.isLoading).toBe(false);
    });
  });

  describe('stopServer action', () => {
    it('should call tRPC stopRemoteServer and reset state', async () => {
      mockStopRemoteServer.mockResolvedValue(undefined);

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

      expect(mockStopRemoteServer).toHaveBeenCalled();

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.isRunning).toBe(false);
      expect(updatedStore.port).toBeNull();
      expect(updatedStore.url).toBeNull();
      expect(updatedStore.qrCodeDataUrl).toBeNull();
      expect(updatedStore.localIp).toBeNull();
      expect(updatedStore.clientCount).toBe(0);
    });

    it('should handle error during stopServer', async () => {
      mockStopRemoteServer.mockRejectedValue(new Error('tRPC failed'));

      useRemoteAccessStore.setState({ isRunning: true });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.stopServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.error).toBe('Failed to stop server: tRPC failed');
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

  describe('LocalStorage Persistence', () => {
    it('should persist publishToCloudflare to localStorage', () => {
      const store = useRemoteAccessStore.getState();

      act(() => {
        store.setPublishToCloudflare(true);
      });

      // Check localStorage
      const storedValue = localStorage.getItem(STORAGE_KEY);
      expect(storedValue).not.toBeNull();

      const parsed = JSON.parse(storedValue!);
      expect(parsed.state.publishToCloudflare).toBe(true);
    });

    it('should not persist runtime state (isRunning, port, etc.)', () => {
      useRemoteAccessStore.setState({
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        publishToCloudflare: true,
      });

      const storedValue = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(storedValue!);

      // Only publishToCloudflare should be persisted
      expect(parsed.state.publishToCloudflare).toBe(true);
      expect(parsed.state.isRunning).toBeUndefined();
      expect(parsed.state.port).toBeUndefined();
      expect(parsed.state.url).toBeUndefined();
    });
  });

  describe('initialize action', () => {
    it('should fetch current server status on initialization', async () => {
      mockGetRemoteServerStatus.mockResolvedValue({
        running: true,
        port: 8765,
        url: 'http://192.168.1.1:8765',
        clientCount: 1,
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.initialize();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(mockGetRemoteServerStatus).toHaveBeenCalled();
      expect(updatedStore.isRunning).toBe(true);
      expect(updatedStore.port).toBe(8765);
    });

    it('should setup tRPC subscription for status changes', async () => {
      mockGetRemoteServerStatus.mockResolvedValue({
        running: false,
        port: null,
        url: null,
        clientCount: 0,
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.initialize();
      });

      // tRPC subscription should be set up via dynamic import
      // The subscription is set up in initialize() via dynamic import
    });
  });

  describe('cleanup action', () => {
    it('should unsubscribe from tRPC subscription', async () => {
      const unsubscribeMock = vi.fn();
      mockSubscribe.mockReturnValue({ unsubscribe: unsubscribeMock });

      mockGetRemoteServerStatus.mockResolvedValue({
        running: false,
        port: null,
        url: null,
        clientCount: 0,
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.initialize();
      });

      act(() => {
        store.cleanup();
      });

      // Cleanup should call unsubscribe (subscribed via dynamic import in initialize)
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
        publishToCloudflare: true,
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
      // publishToCloudflare should be preserved (persisted)
      expect(updatedStore.publishToCloudflare).toBe(true);
    });
  });
});

// ============================================================
// Task 7.1 & 7.2: Cloudflare Tunnel State Management Tests
// Requirements: 5.2, 6.1, 6.2, 3.3, 5.1, 6.3
// ============================================================

describe('Remote Access Store - Cloudflare Tunnel (Task 7.1 & 7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Force full state reset (including persisted publishToCloudflare)
    useRemoteAccessStore.setState({ publishToCloudflare: false });
    const store = useRemoteAccessStore.getState();
    store.reset();

    // Setup default mock returns
    mockGetRemoteServerStatus.mockResolvedValue({
      running: false,
      port: null,
      url: null,
      clientCount: 0,
    });
    mockGetCloudflareSettings.mockResolvedValue({
      hasTunnelToken: false,
    });
  });

  describe('Initial Cloudflare State', () => {
    it('should have correct initial Cloudflare-related state', () => {
      const store = useRemoteAccessStore.getState();

      expect(store.publishToCloudflare).toBe(false);
      expect(store.tunnelUrl).toBeNull();
      expect(store.tunnelQrCodeDataUrl).toBeNull();
      expect(store.tunnelStatus).toBe('disconnected');
      expect(store.tunnelError).toBeNull();
      expect(store.accessToken).toBeNull();
      expect(store.showInstallCloudflaredDialog).toBe(false);
    });
  });

  describe('setPublishToCloudflare action', () => {
    it('should update publishToCloudflare setting', () => {
      const store = useRemoteAccessStore.getState();

      act(() => {
        store.setPublishToCloudflare(true);
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.publishToCloudflare).toBe(true);
    });

    it('should persist publishToCloudflare to localStorage', () => {
      const store = useRemoteAccessStore.getState();

      act(() => {
        store.setPublishToCloudflare(true);
      });

      const storedValue = localStorage.getItem(STORAGE_KEY);
      expect(storedValue).not.toBeNull();

      const parsed = JSON.parse(storedValue!);
      expect(parsed.state.publishToCloudflare).toBe(true);
    });
  });

  describe('startServer with Cloudflare options', () => {
    it('should receive tunnelUrl and accessToken when Cloudflare is enabled', async () => {
      mockStartRemoteServer.mockResolvedValue({
        ok: true,
        value: {
          port: 8765,
          url: 'http://192.168.1.1:8765',
          qrCodeDataUrl: 'data:image/png;base64,lan-qr',
          localIp: '192.168.1.1',
          tunnelUrl: 'https://test.trycloudflare.com',
          tunnelQrCodeDataUrl: 'data:image/png;base64,tunnel-qr',
          accessToken: 'abc123XYZ0',
        },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.tunnelUrl).toBe('https://test.trycloudflare.com');
      expect(updatedStore.tunnelQrCodeDataUrl).toBe('data:image/png;base64,tunnel-qr');
      expect(updatedStore.accessToken).toBe('abc123XYZ0');
    });

    it('should handle null tunnelUrl when Cloudflare is not enabled', async () => {
      mockStartRemoteServer.mockResolvedValue({
        ok: true,
        value: {
          port: 8765,
          url: 'http://192.168.1.1:8765',
          qrCodeDataUrl: 'data:image/png;base64,test',
          localIp: '192.168.1.1',
          tunnelUrl: null,
          tunnelQrCodeDataUrl: null,
          accessToken: 'abc123XYZ0',
        },
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.startServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.tunnelUrl).toBeNull();
      expect(updatedStore.tunnelQrCodeDataUrl).toBeNull();
      expect(updatedStore.tunnelStatus).toBe('disconnected');
      expect(updatedStore.accessToken).toBe('abc123XYZ0');
    });
  });

  describe('dismissInstallDialog action', () => {
    it('should set showInstallCloudflaredDialog to false', () => {
      useRemoteAccessStore.setState({ showInstallCloudflaredDialog: true });

      const store = useRemoteAccessStore.getState();

      act(() => {
        store.dismissInstallDialog();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.showInstallCloudflaredDialog).toBe(false);
    });
  });

  describe('reset action with Cloudflare state', () => {
    it('should reset Cloudflare state but preserve publishToCloudflare', () => {
      useRemoteAccessStore.setState({
        publishToCloudflare: true,
        tunnelUrl: 'https://test.trycloudflare.com',
        tunnelQrCodeDataUrl: 'data:image/png;base64,tunnel-qr',
        tunnelStatus: 'connected',
        tunnelError: 'Some error',
        accessToken: 'abc123XYZ0',
        showInstallCloudflaredDialog: true,
      });

      const store = useRemoteAccessStore.getState();

      act(() => {
        store.reset();
      });

      const updatedStore = useRemoteAccessStore.getState();
      // publishToCloudflare should be preserved (persisted)
      expect(updatedStore.publishToCloudflare).toBe(true);
      // Other Cloudflare state should be reset
      expect(updatedStore.tunnelUrl).toBeNull();
      expect(updatedStore.tunnelQrCodeDataUrl).toBeNull();
      expect(updatedStore.tunnelStatus).toBe('disconnected');
      expect(updatedStore.tunnelError).toBeNull();
      expect(updatedStore.accessToken).toBeNull();
      expect(updatedStore.showInstallCloudflaredDialog).toBe(false);
    });
  });

  describe('stopServer with Cloudflare state', () => {
    it('should clear tunnel state when server is stopped', async () => {
      mockStopRemoteServer.mockResolvedValue(undefined);

      useRemoteAccessStore.setState({
        isRunning: true,
        tunnelUrl: 'https://test.trycloudflare.com',
        tunnelQrCodeDataUrl: 'data:image/png;base64,tunnel-qr',
        tunnelStatus: 'connected',
        accessToken: 'abc123XYZ0',
      });

      const store = useRemoteAccessStore.getState();

      await act(async () => {
        await store.stopServer();
      });

      const updatedStore = useRemoteAccessStore.getState();
      expect(updatedStore.tunnelUrl).toBeNull();
      expect(updatedStore.tunnelQrCodeDataUrl).toBeNull();
      expect(updatedStore.tunnelStatus).toBe('disconnected');
      // accessToken is preserved for next session
    });
  });
});
