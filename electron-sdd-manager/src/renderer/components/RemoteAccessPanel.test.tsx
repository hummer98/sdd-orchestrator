/**
 * RemoteAccessPanel Component Tests
 * TDD: Testing remote access control panel
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 2.2, 8.5
 * Task 5.1: Remote Access Control Panel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemoteAccessPanel } from './RemoteAccessPanel';
import { useRemoteAccessStore } from '../stores/remoteAccessStore';

// Mock the remoteAccessStore
vi.mock('../stores/remoteAccessStore', () => ({
  useRemoteAccessStore: vi.fn(),
}));

describe('RemoteAccessPanel', () => {
  const mockStartServer = vi.fn();
  const mockStopServer = vi.fn();
  const mockClearError = vi.fn();

  const defaultStoreState = {
    isRunning: false,
    port: null,
    url: null,
    qrCodeDataUrl: null,
    clientCount: 0,
    error: null,
    localIp: null,
    isLoading: false,
    startServer: mockStartServer,
    stopServer: mockStopServer,
    clearError: mockClearError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultStoreState);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================
  // Task 5.1.1: Server enable/disable checkbox
  // Requirements: 1.1, 1.2
  // ============================================================
  describe('Task 5.1.1: Server enable/disable checkbox', () => {
    it('should render enable checkbox when server is stopped', () => {
      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /enable remote access/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should show checkbox as checked when server is running', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
      });

      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /enable remote access/i });
      expect(checkbox).toBeChecked();
    });

    it('should call startServer when checkbox is checked', async () => {
      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /enable remote access/i });
      fireEvent.click(checkbox);

      expect(mockStartServer).toHaveBeenCalledTimes(1);
    });

    it('should call stopServer when checkbox is unchecked', async () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
      });

      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /enable remote access/i });
      fireEvent.click(checkbox);

      expect(mockStopServer).toHaveBeenCalledTimes(1);
    });

    it('should disable checkbox while loading', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
      });

      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /enable remote access/i });
      expect(checkbox).toBeDisabled();
    });
  });

  // ============================================================
  // Task 5.1.2: Connection URL display
  // Requirements: 1.4
  // ============================================================
  describe('Task 5.1.2: Connection URL display', () => {
    it('should not show URL when server is stopped', () => {
      render(<RemoteAccessPanel />);

      expect(screen.queryByTestId('connection-url')).not.toBeInTheDocument();
    });

    it('should show URL when server is running', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
        localIp: '192.168.1.100',
      });

      render(<RemoteAccessPanel />);

      expect(screen.getByTestId('connection-url')).toBeInTheDocument();
      expect(screen.getByText('http://192.168.1.100:8765')).toBeInTheDocument();
    });

    it('should have copyable URL', () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
        localIp: '192.168.1.100',
      });

      render(<RemoteAccessPanel />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('http://192.168.1.100:8765');
    });
  });

  // ============================================================
  // Task 5.1.3: QR code display
  // Requirements: 1.5
  // ============================================================
  describe('Task 5.1.3: QR code display', () => {
    it('should not show QR code when server is stopped', () => {
      render(<RemoteAccessPanel />);

      expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
    });

    it('should show QR code when server is running', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      });

      render(<RemoteAccessPanel />);

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toBeInTheDocument();
      expect(qrCode.tagName).toBe('IMG');
      expect(qrCode).toHaveAttribute('src', expect.stringContaining('data:image/png;base64'));
    });
  });

  // ============================================================
  // Task 5.1.4: Connected client count display
  // Requirements: 8.5
  // ============================================================
  describe('Task 5.1.4: Connected client count display', () => {
    it('should show client count when server is running', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
        clientCount: 3,
      });

      render(<RemoteAccessPanel />);

      const clientCountEl = screen.getByTestId('client-count');
      expect(clientCountEl).toBeInTheDocument();
      expect(clientCountEl).toHaveTextContent('3');
    });

    it('should show 0 clients when none connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
        clientCount: 0,
      });

      render(<RemoteAccessPanel />);

      const clientCountEl = screen.getByTestId('client-count');
      expect(clientCountEl).toBeInTheDocument();
      expect(clientCountEl).toHaveTextContent('0');
    });

    it('should not show client count when server is stopped', () => {
      render(<RemoteAccessPanel />);

      expect(screen.queryByTestId('client-count')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.1.5: Server status indicator
  // Requirements: 1.6
  // ============================================================
  describe('Task 5.1.5: Server status indicator', () => {
    it('should show stopped status when server is not running', () => {
      render(<RemoteAccessPanel />);

      expect(screen.getByTestId('server-status')).toBeInTheDocument();
      expect(screen.getByText(/stopped|offline|disabled/i)).toBeInTheDocument();
    });

    it('should show running status when server is running', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isRunning: true,
        port: 8765,
        url: 'http://192.168.1.100:8765',
      });

      render(<RemoteAccessPanel />);

      const statusEl = screen.getByTestId('server-status');
      expect(statusEl).toBeInTheDocument();
      expect(statusEl).toHaveTextContent(/Running/);
    });

    it('should show loading status when starting/stopping', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
      });

      render(<RemoteAccessPanel />);

      expect(screen.getByTestId('server-status')).toBeInTheDocument();
      // Should show loading indicator
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.1.6: Error display
  // Requirements: 2.2 (port already in use scenario)
  // ============================================================
  describe('Task 5.1.6: Error display', () => {
    it('should show error message when error exists', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        error: 'No available port found. Tried ports: 8765, 8766, 8767',
      });

      render(<RemoteAccessPanel />);

      expect(screen.getByText(/no available port/i)).toBeInTheDocument();
    });

    it('should allow dismissing error', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        error: 'Network error: Connection refused',
      });

      render(<RemoteAccessPanel />);

      const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
      fireEvent.click(dismissButton);

      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('should not show error section when no error', () => {
      render(<RemoteAccessPanel />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.1.7: Panel header and accessibility
  // ============================================================
  describe('Task 5.1.7: Panel header and accessibility', () => {
    it('should have proper heading', () => {
      render(<RemoteAccessPanel />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/Remote Access/);
    });

    it('should have accessible labels for controls', () => {
      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /enable remote access/i });
      expect(checkbox).toHaveAccessibleName();
    });
  });

  // ============================================================
  // Task 9.1: "Cloudflareに公開" checkbox
  // Requirements: 1.1, 2.4, 4.1, 5.1, 5.2
  // ============================================================
  describe('Task 9.1: Cloudflare publish checkbox', () => {
    const mockSetPublishToCloudflare = vi.fn();

    const storeWithCloudflare = {
      ...defaultStoreState,
      publishToCloudflare: false,
      tunnelStatus: 'disconnected',
      hasTunnelToken: true,
      setPublishToCloudflare: mockSetPublishToCloudflare,
    };

    beforeEach(() => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithCloudflare);
    });

    it('should render Cloudflare publish checkbox', () => {
      render(<RemoteAccessPanel />);

      const cloudflareCheckbox = screen.getByRole('checkbox', { name: /cloudflare/i });
      expect(cloudflareCheckbox).toBeInTheDocument();
    });

    it('should toggle Cloudflare publish setting when clicked', () => {
      render(<RemoteAccessPanel />);

      const cloudflareCheckbox = screen.getByRole('checkbox', { name: /cloudflare/i });
      fireEvent.click(cloudflareCheckbox);

      expect(mockSetPublishToCloudflare).toHaveBeenCalledWith(true);
    });

    it('should be checked when publishToCloudflare is true', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithCloudflare,
        publishToCloudflare: true,
      });

      render(<RemoteAccessPanel />);

      const cloudflareCheckbox = screen.getByRole('checkbox', { name: /cloudflare/i });
      expect(cloudflareCheckbox).toBeChecked();
    });

    it('should be disabled when Tunnel Token is not set', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithCloudflare,
        hasTunnelToken: false,
      });

      render(<RemoteAccessPanel />);

      const cloudflareCheckbox = screen.getByRole('checkbox', { name: /cloudflare/i });
      expect(cloudflareCheckbox).toBeDisabled();
    });

    it('should show token not configured message when disabled', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithCloudflare,
        hasTunnelToken: false,
      });

      render(<RemoteAccessPanel />);

      expect(screen.getByText(/token.*設定|設定.*token/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 9.2: Tunnel URL display and copy
  // Requirements: 1.3, 6.1, 6.3
  // ============================================================
  describe('Task 9.2: Tunnel URL display and copy', () => {
    const storeWithTunnel = {
      ...defaultStoreState,
      isRunning: true,
      port: 8765,
      url: 'http://192.168.1.100:8765',
      publishToCloudflare: true,
      tunnelUrl: 'https://my-tunnel.trycloudflare.com',
      tunnelStatus: 'connected',
      hasTunnelToken: true,
      setPublishToCloudflare: vi.fn(),
    };

    it('should display Tunnel URL when connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithTunnel);

      render(<RemoteAccessPanel />);

      expect(screen.getByTestId('tunnel-url')).toBeInTheDocument();
      expect(screen.getByText(/my-tunnel.trycloudflare.com/)).toBeInTheDocument();
    });

    it('should not display Tunnel URL when not connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithTunnel,
        tunnelUrl: null,
        tunnelStatus: 'disconnected',
      });

      render(<RemoteAccessPanel />);

      expect(screen.queryByTestId('tunnel-url')).not.toBeInTheDocument();
    });

    it('should copy Tunnel URL when copy button clicked', () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithTunnel);

      render(<RemoteAccessPanel />);

      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      // Second copy button is for tunnel URL
      const tunnelCopyButton = copyButtons.find(btn =>
        btn.closest('[data-testid="tunnel-url"]') !== null
      );

      if (tunnelCopyButton) {
        fireEvent.click(tunnelCopyButton);
        expect(mockWriteText).toHaveBeenCalledWith('https://my-tunnel.trycloudflare.com');
      }
    });

    it('should show tunnel status indicator when connecting', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithTunnel,
        tunnelUrl: null,
        tunnelStatus: 'connecting',
      });

      render(<RemoteAccessPanel />);

      expect(screen.getByText(/connecting|接続中/i)).toBeInTheDocument();
    });

    it('should show tunnel error when connection failed', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithTunnel,
        tunnelUrl: null,
        tunnelStatus: 'error',
        tunnelError: 'Connection failed',
      });

      render(<RemoteAccessPanel />);

      expect(screen.getByText(/error|エラー/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 9.3: QR code with Tunnel URL + access token
  // Requirements: 6.2, 6.4, 6.5
  // ============================================================
  describe('Task 9.3: Tunnel QR code display', () => {
    const storeWithTunnelQR = {
      ...defaultStoreState,
      isRunning: true,
      port: 8765,
      url: 'http://192.168.1.100:8765',
      qrCodeDataUrl: 'data:image/png;base64,localQR',
      publishToCloudflare: true,
      tunnelUrl: 'https://my-tunnel.trycloudflare.com',
      tunnelQrCodeDataUrl: 'data:image/png;base64,tunnelQR',
      tunnelStatus: 'connected',
      accessToken: 'abc123',
      hasTunnelToken: true,
      setPublishToCloudflare: vi.fn(),
    };

    it('should display Tunnel QR code when tunnel is connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithTunnelQR);

      render(<RemoteAccessPanel />);

      const tunnelQrCode = screen.getByTestId('tunnel-qr-code');
      expect(tunnelQrCode).toBeInTheDocument();
      expect(tunnelQrCode).toHaveAttribute('src', 'data:image/png;base64,tunnelQR');
    });

    it('should not display Tunnel QR code when tunnel is not connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithTunnelQR,
        tunnelUrl: null,
        tunnelQrCodeDataUrl: null,
        tunnelStatus: 'disconnected',
      });

      render(<RemoteAccessPanel />);

      expect(screen.queryByTestId('tunnel-qr-code')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 9.4: Access token refresh functionality
  // Requirements: 3.3
  // ============================================================
  describe('Task 9.4: Access token refresh', () => {
    const mockRefreshAccessToken = vi.fn();

    const storeWithAccessToken = {
      ...defaultStoreState,
      isRunning: true,
      port: 8765,
      url: 'http://192.168.1.100:8765',
      publishToCloudflare: true,
      tunnelUrl: 'https://my-tunnel.trycloudflare.com',
      tunnelStatus: 'connected',
      accessToken: 'oldtoken',
      hasTunnelToken: true,
      setPublishToCloudflare: vi.fn(),
      refreshAccessToken: mockRefreshAccessToken,
    };

    it('should render refresh token button when tunnel is connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithAccessToken);

      render(<RemoteAccessPanel />);

      const refreshButton = screen.getByRole('button', { name: /refresh|リフレッシュ|更新/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call refreshAccessToken when refresh button clicked', async () => {
      mockRefreshAccessToken.mockResolvedValue('newtoken');
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(storeWithAccessToken);

      render(<RemoteAccessPanel />);

      const refreshButton = screen.getByRole('button', { name: /refresh|リフレッシュ|更新/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
      });
    });

    it('should not show refresh button when tunnel is not connected', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...storeWithAccessToken,
        tunnelUrl: null,
        tunnelStatus: 'disconnected',
      });

      render(<RemoteAccessPanel />);

      expect(screen.queryByRole('button', { name: /refresh|リフレッシュ|更新/i })).not.toBeInTheDocument();
    });
  });
});
