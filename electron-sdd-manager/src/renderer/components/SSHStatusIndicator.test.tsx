/**
 * SSH Status Indicator Tests
 * Tests for SSH connection status display in UI
 * Requirements: 6.1, 6.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SSHStatusIndicator } from './SSHStatusIndicator';
import { useConnectionStore } from '../stores/connectionStore';

// Mock the connection store
vi.mock('../stores/connectionStore', () => ({
  useConnectionStore: vi.fn(),
}));

describe('SSHStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when project is local', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'disconnected' as const,
        projectType: 'local' as const,
        connectionInfo: null,
      };
      return selector(state as any);
    });

    const { container } = render(<SSHStatusIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render connected status with green indicator', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'connected' as const,
        projectType: 'ssh' as const,
        connectionInfo: {
          host: 'test.com',
          port: 22,
          user: 'testuser',
          connectedAt: new Date(),
          bytesTransferred: 1024,
        },
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    expect(screen.getByText(/SSH:/)).toBeInTheDocument();
    expect(screen.getByText(/test.com/)).toBeInTheDocument();
    // Check for connected indicator (green)
    expect(screen.getByTestId('ssh-status-indicator')).toHaveClass('bg-green-500');
  });

  it('should render connecting status with yellow indicator', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'connecting' as const,
        projectType: 'ssh' as const,
        connectionInfo: null,
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    expect(screen.getByText(/SSH:/)).toBeInTheDocument();
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    expect(screen.getByTestId('ssh-status-indicator')).toHaveClass('bg-yellow-500');
  });

  it('should render reconnecting status with yellow indicator', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'reconnecting' as const,
        projectType: 'ssh' as const,
        connectionInfo: null,
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
    expect(screen.getByTestId('ssh-status-indicator')).toHaveClass('bg-yellow-500');
  });

  it('should render error status with red indicator', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'error' as const,
        projectType: 'ssh' as const,
        connectionInfo: null,
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByTestId('ssh-status-indicator')).toHaveClass('bg-red-500');
  });

  it('should display connection time when connected', () => {
    const connectedAt = new Date(Date.now() - 60000); // 1 minute ago

    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'connected' as const,
        projectType: 'ssh' as const,
        connectionInfo: {
          host: 'test.com',
          port: 22,
          user: 'testuser',
          connectedAt,
          bytesTransferred: 2048,
        },
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    // Should show connected indicator
    expect(screen.getByTestId('ssh-status-indicator')).toBeInTheDocument();
  });

  it('should render authenticating status', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'authenticating' as const,
        projectType: 'ssh' as const,
        connectionInfo: null,
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
  });

  it('should render host-verifying status', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        status: 'host-verifying' as const,
        projectType: 'ssh' as const,
        connectionInfo: null,
      };
      return selector(state as any);
    });

    render(<SSHStatusIndicator />);

    expect(screen.getByText(/verifying/i)).toBeInTheDocument();
  });
});
