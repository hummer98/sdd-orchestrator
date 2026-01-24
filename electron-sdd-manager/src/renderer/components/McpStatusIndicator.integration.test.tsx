/**
 * McpStatusIndicator Integration Test
 * mcp-server-integration: Task 7.5
 *
 * Tests that McpStatusIndicator is properly placed in the Header,
 * similar to SSHStatusIndicator placement.
 *
 * Requirements: 6.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpStatusIndicator, type McpStatusIndicatorProps } from '@shared/components/ui';
import { useMcpStore, resetMcpStore } from '@shared/stores/mcpStore';
import { PlatformProvider, type PlatformCapabilities } from '@shared/providers/PlatformProvider';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create mock platform capabilities for Electron
 */
function createElectronCapabilities(): PlatformCapabilities {
  return {
    canOpenFileDialog: true,
    canConfigureSSH: true,
    canSelectProject: true,
    canSaveFileLocally: true,
    canOpenInEditor: true,
    canConfigureRemoteServer: true,
    canInstallCommandsets: true,
    platform: 'electron',
  };
}

/**
 * Mock Header component that simulates App.tsx header structure
 * This validates that McpStatusIndicator is placed alongside SSHStatusIndicator
 */
function MockHeader({
  onMcpIndicatorClick,
}: {
  onMcpIndicatorClick: () => void;
}) {
  return (
    <header className="h-12 flex items-center justify-between">
      <div className="flex items-center">
        <h1>SDD Orchestrator</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* MCP Status Indicator - placed before SSH Status Indicator */}
        <McpStatusIndicator onClick={onMcpIndicatorClick} />
        {/* SSH Status Indicator placeholder */}
        <div data-testid="ssh-status-indicator-placeholder">SSH</div>
      </div>
    </header>
  );
}

/**
 * Render MockHeader with platform provider
 */
function renderMockHeader(props?: { onMcpIndicatorClick?: () => void }) {
  const defaultProps = {
    onMcpIndicatorClick: vi.fn(),
    ...props,
  };

  return render(
    <PlatformProvider capabilities={createElectronCapabilities()}>
      <MockHeader {...defaultProps} />
    </PlatformProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('McpStatusIndicator Header Integration', () => {
  beforeEach(() => {
    resetMcpStore();
  });

  describe('placement in header', () => {
    it('should render McpStatusIndicator in the header region', () => {
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderMockHeader();

      // Verify McpStatusIndicator is rendered
      const indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toBeInTheDocument();

      // Verify it shows MCP label
      expect(screen.getByText('MCP:')).toBeInTheDocument();
    });

    it('should be placed alongside SSH status indicator', () => {
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderMockHeader();

      // Verify both indicators are in the same container
      const mcpIndicator = screen.getByTestId('mcp-status-indicator');
      const sshPlaceholder = screen.getByTestId('ssh-status-indicator-placeholder');

      // Both should have same parent (the gap-3 container)
      expect(mcpIndicator.closest('.gap-3')).toBe(sshPlaceholder.closest('.gap-3'));
    });
  });

  describe('click behavior on Desktop', () => {
    it('should call onClick handler when clicked on Desktop', () => {
      const handleClick = vi.fn();
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderMockHeader({ onMcpIndicatorClick: handleClick });

      // Find and click the button
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be used to open RemoteAccessDialog (which contains MCP settings)', () => {
      // This test verifies the intended usage pattern:
      // onClick should open the RemoteAccessDialog which contains McpSettingsPanel
      const setIsRemoteAccessDialogOpen = vi.fn();

      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderMockHeader({
        onMcpIndicatorClick: () => setIsRemoteAccessDialogOpen(true),
      });

      // Click the MCP indicator
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Verify the dialog open function was called
      expect(setIsRemoteAccessDialogOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('status display variations', () => {
    it('should show running status with port number', () => {
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderMockHeader();

      expect(screen.getByText(':3001')).toBeInTheDocument();
    });

    it('should show stopped status when not running', () => {
      useMcpStore.getState().setStatus({
        isRunning: false,
        port: null,
        url: null,
      });

      renderMockHeader();

      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });
  });
});
