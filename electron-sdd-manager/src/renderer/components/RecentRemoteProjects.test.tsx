/**
 * Recent Remote Projects Tests
 * Tests for displaying recent SSH remote projects in sidebar
 * Requirements: 8.2, 8.3, 8.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentRemoteProjects } from './RecentRemoteProjects';
import { useConnectionStore } from '../stores/connectionStore';

// Mock the connection store
vi.mock('../stores/connectionStore', () => ({
  useConnectionStore: vi.fn(),
}));

describe('RecentRemoteProjects', () => {
  const mockConnectSSH = vi.fn();
  const mockLoadRecentRemoteProjects = vi.fn();
  const mockRemoveRecentRemoteProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no projects', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: [],
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    expect(screen.getByText(/no recent remote projects/i)).toBeInTheDocument();
  });

  it('should render list of recent projects', () => {
    const projects = [
      { uri: 'ssh://user@host1.com/path1', displayName: 'host1.com', lastConnectedAt: '2025-01-01T10:00:00Z', connectionSuccessful: true },
      { uri: 'ssh://user@host2.com/path2', displayName: 'host2.com', lastConnectedAt: '2025-01-02T10:00:00Z', connectionSuccessful: true },
    ];

    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: projects,
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    expect(screen.getByText('host1.com')).toBeInTheDocument();
    expect(screen.getByText('host2.com')).toBeInTheDocument();
  });

  it('should call connectSSH when project is clicked', async () => {
    const user = userEvent.setup();
    const projects = [
      { uri: 'ssh://user@host1.com/path1', displayName: 'host1.com', lastConnectedAt: '2025-01-01T10:00:00Z', connectionSuccessful: true },
    ];

    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: projects,
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    const projectButton = screen.getByText('host1.com');
    await user.click(projectButton);

    expect(mockConnectSSH).toHaveBeenCalledWith('ssh://user@host1.com/path1');
  });

  it('should show remove button on hover', async () => {
    const projects = [
      { uri: 'ssh://user@host1.com/path1', displayName: 'host1.com', lastConnectedAt: '2025-01-01T10:00:00Z', connectionSuccessful: true },
    ];

    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: projects,
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    // Remove button should be present (visible on hover)
    expect(screen.getByLabelText(/remove/i)).toBeInTheDocument();
  });

  it('should call removeRecentRemoteProject when remove button is clicked', async () => {
    const user = userEvent.setup();
    const projects = [
      { uri: 'ssh://user@host1.com/path1', displayName: 'host1.com', lastConnectedAt: '2025-01-01T10:00:00Z', connectionSuccessful: true },
    ];

    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: projects,
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    const removeButton = screen.getByLabelText(/remove/i);
    await user.click(removeButton);

    expect(mockRemoveRecentRemoteProject).toHaveBeenCalledWith('ssh://user@host1.com/path1');
    expect(mockConnectSSH).not.toHaveBeenCalled(); // Should not connect when removing
  });

  it('should show failed connection indicator', () => {
    const projects = [
      { uri: 'ssh://user@host1.com/path1', displayName: 'host1.com', lastConnectedAt: '2025-01-01T10:00:00Z', connectionSuccessful: false },
    ];

    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: projects,
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    // Should show some indicator for failed connection
    expect(screen.getByTestId('connection-failed-indicator')).toBeInTheDocument();
  });

  it('should call loadRecentRemoteProjects on mount', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: [],
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    expect(mockLoadRecentRemoteProjects).toHaveBeenCalled();
  });

  it('should display section header', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: [],
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: false,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    // Use getAllByText and check at least one exists
    const headers = screen.getAllByText(/remote projects/i);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    vi.mocked(useConnectionStore).mockImplementation((selector) => {
      const state = {
        recentRemoteProjects: [],
        loadRecentRemoteProjects: mockLoadRecentRemoteProjects,
        connectSSH: mockConnectSSH,
        removeRecentRemoteProject: mockRemoveRecentRemoteProject,
        isLoading: true,
      };
      return typeof selector === 'function' ? selector(state as any) : state;
    });

    render(<RecentRemoteProjects />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
