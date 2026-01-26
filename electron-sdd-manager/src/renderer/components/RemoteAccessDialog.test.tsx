/**
 * RemoteAccessDialog Component Tests
 * TDD: Testing remote access dialog with Cloudflare integration
 * Requirements: 1.4, 1.5, 2.2
 * Task 15.1.1: CloudflareSettingsPanel integration
 * Task 15.1.2: InstallCloudflaredDialog integration
 * Task 7.4: McpSettingsPanel integration (mcp-server-integration)
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

  // ============================================================
  // Task 7.4: McpSettingsPanel integration (mcp-server-integration)
  // Updated for tab UI: MCP content is now in MCP tab
  // Requirements: 6.2
  // ============================================================
  describe('Task 7.4: McpSettingsPanel integration', () => {
    it('should render McpSettingsPanel in the dialog when MCP tab is selected', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Click MCP tab to see MCP content
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // McpSettingsPanel has heading "MCP Server 設定"
      expect(screen.getByRole('heading', { name: /MCP Server 設定/i })).toBeInTheDocument();
    });

    it('should render MCP Server enable/disable checkbox when MCP tab is selected', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Click MCP tab to see MCP content
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // McpSettingsPanel has a checkbox labeled "MCP Server を有効化"
      expect(screen.getByRole('checkbox', { name: /MCP Server を有効化/i })).toBeInTheDocument();
    });

    it('should render MCP port input field when MCP tab is selected', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Click MCP tab to see MCP content
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // McpSettingsPanel has an input for port number
      expect(screen.getByLabelText(/ポート番号/i)).toBeInTheDocument();
    });

    it('should render Claude CLI registration command section when MCP tab is selected', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Click MCP tab to see MCP content
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // McpSettingsPanel has a label for Claude CLI command
      expect(screen.getByText(/Claude CLI 登録コマンド/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.1: Tab display unit tests
  // Requirements: 1.1, 4.1
  // ============================================================
  describe('Task 5.1: Tab display', () => {
    it('should render two tabs (Webサーバー and MCP)', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Should have a tablist
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      // Should have two tabs
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);

      // Check tab labels
      expect(screen.getByRole('tab', { name: /Webサーバー/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /MCP/i })).toBeInTheDocument();
    });

    it('should have Webサーバー tab selected by default', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      expect(webServerTab).toHaveAttribute('aria-selected', 'true');
      expect(mcpTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  // ============================================================
  // Task 5.2: Tab switching unit tests
  // Requirements: 1.4, 2.1, 2.2, 3.1
  // ============================================================
  describe('Task 5.2: Tab switching', () => {
    it('should switch content when MCP tab is clicked', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Initially, Webサーバー content should be visible
      expect(screen.getByRole('heading', { name: /Remote Access/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Cloudflare Tunnel 設定/i })).toBeInTheDocument();

      // Click MCP tab
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // MCP content should be visible
      expect(screen.getByRole('heading', { name: /MCP Server 設定/i })).toBeInTheDocument();

      // Webサーバー content should not be visible
      expect(screen.queryByRole('heading', { name: /Remote Access/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Cloudflare Tunnel 設定/i })).not.toBeInTheDocument();
    });

    it('should switch content back when Webサーバー tab is clicked', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Click MCP tab first
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // Then click Webサーバー tab
      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      fireEvent.click(webServerTab);

      // Webサーバー content should be visible again
      expect(screen.getByRole('heading', { name: /Remote Access/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Cloudflare Tunnel 設定/i })).toBeInTheDocument();

      // MCP content should not be visible
      expect(screen.queryByRole('heading', { name: /MCP Server 設定/i })).not.toBeInTheDocument();
    });

    it('should update aria-selected when tab is switched', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      // Click MCP tab
      fireEvent.click(mcpTab);

      expect(webServerTab).toHaveAttribute('aria-selected', 'false');
      expect(mcpTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show RemoteAccessPanel and CloudflareSettingsPanel in Webサーバー tab', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Webサーバー tab should contain both panels
      expect(screen.getByRole('heading', { name: /Remote Access/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Cloudflare Tunnel 設定/i })).toBeInTheDocument();
    });

    it('should show McpSettingsPanel in MCP tab', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Click MCP tab
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });
      fireEvent.click(mcpTab);

      // MCP tab should contain McpSettingsPanel
      expect(screen.getByRole('heading', { name: /MCP Server 設定/i })).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.3: Accessibility unit tests
  // Requirements: 5.1, 5.2, 5.3
  // ============================================================
  describe('Task 5.3: Accessibility', () => {
    it('should have proper ARIA attributes on tablist', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });

    it('should have proper ARIA attributes on tabs', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      // Check aria-controls
      expect(webServerTab).toHaveAttribute('aria-controls', 'tabpanel-web-server');
      expect(mcpTab).toHaveAttribute('aria-controls', 'tabpanel-mcp');
    });

    it('should have proper ARIA attributes on tabpanels', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      // Webサーバー tabpanel should be visible
      const webServerPanel = screen.getByRole('tabpanel');
      expect(webServerPanel).toHaveAttribute('id', 'tabpanel-web-server');
    });

    it('should navigate tabs with ArrowRight key', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      // Focus on webServerTab and press ArrowRight
      webServerTab.focus();
      fireEvent.keyDown(webServerTab, { key: 'ArrowRight' });

      // MCP tab should now be selected
      expect(mcpTab).toHaveAttribute('aria-selected', 'true');
      expect(webServerTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should navigate tabs with ArrowLeft key', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      // First switch to MCP tab
      fireEvent.click(mcpTab);

      // Focus on mcpTab and press ArrowLeft
      mcpTab.focus();
      fireEvent.keyDown(mcpTab, { key: 'ArrowLeft' });

      // Webサーバー tab should now be selected
      expect(webServerTab).toHaveAttribute('aria-selected', 'true');
      expect(mcpTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should wrap around when pressing ArrowRight on last tab', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      // Switch to MCP tab
      fireEvent.click(mcpTab);

      // Press ArrowRight on MCP tab (last tab)
      mcpTab.focus();
      fireEvent.keyDown(mcpTab, { key: 'ArrowRight' });

      // Should wrap around to Webサーバー tab
      expect(webServerTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should wrap around when pressing ArrowLeft on first tab', () => {
      render(<RemoteAccessDialog isOpen={true} onClose={vi.fn()} />);

      const webServerTab = screen.getByRole('tab', { name: /Webサーバー/i });
      const mcpTab = screen.getByRole('tab', { name: /MCP/i });

      // Press ArrowLeft on Webサーバー tab (first tab)
      webServerTab.focus();
      fireEvent.keyDown(webServerTab, { key: 'ArrowLeft' });

      // Should wrap around to MCP tab
      expect(mcpTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
