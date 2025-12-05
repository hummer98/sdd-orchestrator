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

      const checkbox = screen.getByRole('checkbox');
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

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should call startServer when checkbox is checked', async () => {
      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox');
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

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockStopServer).toHaveBeenCalledTimes(1);
    });

    it('should disable checkbox while loading', () => {
      (useRemoteAccessStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
      });

      render(<RemoteAccessPanel />);

      const checkbox = screen.getByRole('checkbox');
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

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAccessibleName();
    });
  });
});
