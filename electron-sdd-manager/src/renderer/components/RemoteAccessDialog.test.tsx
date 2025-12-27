/**
 * RemoteAccessDialog Component Tests
 * TDD: Testing remote access dialog with Cloudflare integration
 * Requirements: 1.4, 1.5, 2.2
 * Task 15.1.1: CloudflareSettingsPanel integration
 * Task 15.1.2: InstallCloudflaredDialog integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemoteAccessDialog } from './RemoteAccessDialog';
import { useRemoteAccessStore } from '../stores/remoteAccessStore';

// Mock the remoteAccessStore
vi.mock('../stores/remoteAccessStore', () => ({
  useRemoteAccessStore: vi.fn(),
}));

describe('RemoteAccessDialog', () => {
  const mockStoreState = {
    isRunning: false,
    port: null,
    url: null,
    qrCodeDataUrl: null,
    clientCount: 0,
    error: null,
    localIp: null,
    isLoading: false,
    autoStartEnabled: false,
    publishToCloudflare: false,
    tunnelUrl: null,
    tunnelQrCodeDataUrl: null,
    tunnelStatus: 'disconnected' as const,
    tunnelError: null,
    accessToken: null,
    showInstallCloudflaredDialog: false,
    hasTunnelToken: true,
    startServer: vi.fn(),
    stopServer: vi.fn(),
    clearError: vi.fn(),
    setAutoStartEnabled: vi.fn(),
    initialize: vi.fn(),
    cleanup: vi.fn(),
    reset: vi.fn(),
    setPublishToCloudflare: vi.fn(),
    dismissInstallDialog: vi.fn(),
    refreshAccessToken: vi.fn(),
    loadCloudflareSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<RemoteAccessDialog isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render RemoteAccessPanel inside dialog', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // RemoteAccessPanel has a heading "Remote Access"
      expect(screen.getByRole('heading', { name: /Remote Access/i })).toBeInTheDocument();
    });
  });

  describe('Backdrop interaction', () => {
    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<RemoteAccessDialog isOpen={true} onClose={onClose} />);

      // Find backdrop and click it
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Task 15.1.1: CloudflareSettingsPanel integration
  // Requirements: 2.1, 2.4
  // ============================================================
  describe('Task 15.1.1: CloudflareSettingsPanel integration', () => {
    it('should render CloudflareSettingsPanel in the dialog', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // CloudflareSettingsPanel has heading "Cloudflare Tunnel 設定"
      expect(screen.getByRole('heading', { name: /Cloudflare Tunnel 設定/i })).toBeInTheDocument();
    });

    it('should render Tunnel Token input field', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // CloudflareSettingsPanel has an input labeled "Tunnel Token"
      expect(screen.getByLabelText(/Tunnel Token/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 15.1.2: InstallCloudflaredDialog integration
  // Requirements: 4.2, 4.3
  // ============================================================
  describe('Task 15.1.2: InstallCloudflaredDialog integration', () => {
    it('should render InstallCloudflaredDialog when showInstallCloudflaredDialog is true', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockStoreState,
        showInstallCloudflaredDialog: true,
      });

      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // InstallCloudflaredDialog has heading "cloudflared のインストール"
      expect(screen.getByRole('heading', { name: /cloudflared のインストール/i })).toBeInTheDocument();
    });

    it('should not render InstallCloudflaredDialog when showInstallCloudflaredDialog is false', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockStoreState,
        showInstallCloudflaredDialog: false,
      });

      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      expect(screen.queryByRole('heading', { name: /cloudflared のインストール/i })).not.toBeInTheDocument();
    });

    it('should call dismissInstallDialog when InstallCloudflaredDialog is closed', async () => {
      const mockDismissInstallDialog = vi.fn();
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockStoreState,
        showInstallCloudflaredDialog: true,
        dismissInstallDialog: mockDismissInstallDialog,
      });

      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Find the close button in InstallCloudflaredDialog (there may be multiple buttons)
      // The InstallCloudflaredDialog footer has a button with text "閉じる"
      const closeButtons = screen.getAllByRole('button', { name: /閉じる/i });
      // The last one should be the footer button
      const closeButton = closeButtons[closeButtons.length - 1];
      fireEvent.click(closeButton);

      expect(mockDismissInstallDialog).toHaveBeenCalledTimes(1);
    });
  });
});
