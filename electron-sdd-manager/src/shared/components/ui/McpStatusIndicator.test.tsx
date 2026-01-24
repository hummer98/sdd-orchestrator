/**
 * McpStatusIndicator Tests
 * mcp-server-integration: Task 7.3
 *
 * Tests for MCP server status indicator component.
 * Requirements: 6.9, 6.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { McpStatusIndicator } from './McpStatusIndicator';
import { PlatformProvider, type PlatformCapabilities } from '../../providers/PlatformProvider';
import { useMcpStore, resetMcpStore } from '../../stores/mcpStore';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create mock platform capabilities
 */
function createMockCapabilities(
  overrides?: Partial<PlatformCapabilities>
): PlatformCapabilities {
  return {
    canOpenFileDialog: true,
    canConfigureSSH: true,
    canSelectProject: true,
    canSaveFileLocally: true,
    canOpenInEditor: true,
    canConfigureRemoteServer: true,
    canInstallCommandsets: true,
    platform: 'electron',
    ...overrides,
  };
}

/**
 * Render McpStatusIndicator with platform provider
 */
function renderWithProvider(
  capabilities: PlatformCapabilities,
  props?: { onClick?: () => void }
) {
  return render(
    <PlatformProvider capabilities={capabilities}>
      <McpStatusIndicator {...props} />
    </PlatformProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('McpStatusIndicator', () => {
  beforeEach(() => {
    resetMcpStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('status display', () => {
    it('should display running status when MCP server is running', () => {
      // Setup: Set MCP server to running state
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderWithProvider(createMockCapabilities());

      // Verify: Running indicator should be visible
      const indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('bg-green-500');
    });

    it('should display stopped status when MCP server is not running', () => {
      // Setup: Set MCP server to stopped state
      useMcpStore.getState().setStatus({
        isRunning: false,
        port: null,
        url: null,
      });

      renderWithProvider(createMockCapabilities());

      // Verify: Stopped indicator should be visible
      const indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('bg-gray-500');
    });

    it('should display MCP label and port when running', () => {
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderWithProvider(createMockCapabilities());

      expect(screen.getByText('MCP:')).toBeInTheDocument();
      expect(screen.getByText(':3001')).toBeInTheDocument();
    });

    it('should display MCP label and "Stopped" when not running', () => {
      useMcpStore.getState().setStatus({
        isRunning: false,
        port: null,
        url: null,
      });

      renderWithProvider(createMockCapabilities());

      expect(screen.getByText('MCP:')).toBeInTheDocument();
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });
  });

  describe('platform-specific behavior', () => {
    describe('Desktop (Electron)', () => {
      it('should be clickable on Desktop platform', () => {
        const handleClick = vi.fn();
        useMcpStore.getState().setStatus({
          isRunning: true,
          port: 3001,
          url: 'http://localhost:3001',
        });

        const capabilities = createMockCapabilities({ platform: 'electron' });
        renderWithProvider(capabilities, { onClick: handleClick });

        const container = screen.getByRole('button');
        fireEvent.click(container);

        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('should have cursor-pointer style on Desktop platform', () => {
        const capabilities = createMockCapabilities({ platform: 'electron' });
        renderWithProvider(capabilities, { onClick: vi.fn() });

        const container = screen.getByRole('button');
        expect(container).toHaveClass('cursor-pointer');
      });

      it('should have hover effect on Desktop platform', () => {
        const capabilities = createMockCapabilities({ platform: 'electron' });
        renderWithProvider(capabilities, { onClick: vi.fn() });

        const container = screen.getByRole('button');
        expect(container).toHaveClass('hover:bg-gray-100');
      });
    });

    describe('Remote UI (Web)', () => {
      it('should not be clickable on Web platform', () => {
        const handleClick = vi.fn();
        useMcpStore.getState().setStatus({
          isRunning: true,
          port: 3001,
          url: 'http://localhost:3001',
        });

        const capabilities = createMockCapabilities({ platform: 'web' });
        renderWithProvider(capabilities, { onClick: handleClick });

        // Should not have button role
        const container = screen.queryByRole('button');
        expect(container).not.toBeInTheDocument();
      });

      it('should not call onClick on Web platform', () => {
        const handleClick = vi.fn();
        useMcpStore.getState().setStatus({
          isRunning: true,
          port: 3001,
          url: 'http://localhost:3001',
        });

        const capabilities = createMockCapabilities({ platform: 'web' });
        renderWithProvider(capabilities, { onClick: handleClick });

        // Find the indicator container (not a button)
        const indicator = screen.getByTestId('mcp-status-indicator');
        const container = indicator.parentElement;
        if (container) {
          fireEvent.click(container);
        }

        expect(handleClick).not.toHaveBeenCalled();
      });

      it('should not have cursor-pointer style on Web platform', () => {
        const capabilities = createMockCapabilities({ platform: 'web' });
        renderWithProvider(capabilities, { onClick: vi.fn() });

        const indicator = screen.getByTestId('mcp-status-indicator');
        const container = indicator.parentElement;
        expect(container).not.toHaveClass('cursor-pointer');
      });
    });
  });

  describe('accessibility', () => {
    it('should have aria-label describing MCP status', () => {
      useMcpStore.getState().setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      renderWithProvider(createMockCapabilities());

      const indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'MCP status: Running');
    });

    it('should have aria-label for stopped status', () => {
      useMcpStore.getState().setStatus({
        isRunning: false,
        port: null,
        url: null,
      });

      renderWithProvider(createMockCapabilities());

      const indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'MCP status: Stopped');
    });
  });

  describe('store reactivity', () => {
    it('should update when MCP store status changes', () => {
      // Initial state: stopped
      useMcpStore.getState().setStatus({
        isRunning: false,
        port: null,
        url: null,
      });

      renderWithProvider(createMockCapabilities());

      // Verify initial state
      let indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toHaveClass('bg-gray-500');

      // Update store to running (wrapped in act for React state updates)
      act(() => {
        useMcpStore.getState().setStatus({
          isRunning: true,
          port: 3001,
          url: 'http://localhost:3001',
        });
      });

      // Verify updated state
      indicator = screen.getByTestId('mcp-status-indicator');
      expect(indicator).toHaveClass('bg-green-500');
    });
  });
});
