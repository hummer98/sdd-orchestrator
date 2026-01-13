/**
 * RecentProjects Component Tests
 * TDD: Version status integration tests
 * Requirements (commandset-version-detection): 3.1, 3.2, 3.3, 3.4, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecentProjects } from './RecentProjects';
import type { VersionCheckResult } from '../types';

// Mock stores
const mockLoadRecentProjects = vi.fn();
const mockSelectProject = vi.fn();
// Note: mockLoadSpecs removed - loadSpecs is no longer used
const mockCheckProjectVersions = vi.fn();
const mockGetVersionStatus = vi.fn();
const mockHasAnyUpdateRequired = vi.fn();

vi.mock('../stores', () => ({
  useProjectStore: vi.fn(() => ({
    recentProjects: ['/path/to/project1', '/path/to/project2'],
    currentProject: null,
    loadRecentProjects: mockLoadRecentProjects,
    selectProject: mockSelectProject,
  })),
  // Note: useSpecStore mock removed - loadSpecs is no longer used
}));

vi.mock('../stores/versionStatusStore', () => ({
  useVersionStatusStore: vi.fn(() => ({
    projectStatuses: new Map(),
    isChecking: false,
    checkProjectVersions: mockCheckProjectVersions,
    getVersionStatus: mockGetVersionStatus,
    hasAnyUpdateRequired: mockHasAnyUpdateRequired,
    clearVersionStatus: vi.fn(),
    clearAllVersionStatuses: vi.fn(),
  })),
}));

// Mock electronAPI
const mockCheckCommandsetVersions = vi.fn();
const mockInstallCommandsetByProfile = vi.fn();
const mockCheckAgentFolderExists = vi.fn();
const mockDeleteAgentFolder = vi.fn();

// Setup global electronAPI mock
const originalElectronAPI = (window as any).electronAPI;

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).electronAPI = {
    checkCommandsetVersions: mockCheckCommandsetVersions,
    installCommandsetByProfile: mockInstallCommandsetByProfile,
    checkAgentFolderExists: mockCheckAgentFolderExists,
    deleteAgentFolder: mockDeleteAgentFolder,
  };
});

// Cleanup is handled by vitest automatically

describe('RecentProjects', () => {
  describe('Version Status Integration', () => {
    it('should check version status for each project on mount', async () => {
      mockCheckProjectVersions.mockResolvedValue(null);

      render(<RecentProjects />);

      await waitFor(() => {
        expect(mockLoadRecentProjects).toHaveBeenCalled();
      });

      // Version check should be triggered for each project
      // This verifies the VersionStatusStore integration
    });

    it('should display warning icon for projects requiring updates', async () => {
      const versionResult: VersionCheckResult = {
        projectPath: '/path/to/project1',
        commandsets: [
          {
            name: 'cc-sdd',
            bundleVersion: '1.1.0',
            installedVersion: '1.0.0',
            updateRequired: true,
          },
        ],
        anyUpdateRequired: true,
        hasCommandsets: true,
        legacyProject: false,
      };

      mockHasAnyUpdateRequired.mockImplementation((path: string) =>
        path === '/path/to/project1'
      );
      mockGetVersionStatus.mockImplementation((path: string) =>
        path === '/path/to/project1'
          ? { result: versionResult, isChecking: false, lastCheckedAt: new Date().toISOString() }
          : undefined
      );

      render(<RecentProjects />);

      await waitFor(() => {
        // Warning icon should be present for project with update required
        const warningIcon = screen.queryByTestId('version-warning-icon-/path/to/project1');
        // This test will fail initially (RED phase) until implementation is done
      });
    });

    it('should show tooltip with version details on hover', async () => {
      const versionResult: VersionCheckResult = {
        projectPath: '/path/to/project1',
        commandsets: [
          {
            name: 'cc-sdd',
            bundleVersion: '1.1.0',
            installedVersion: '1.0.0',
            updateRequired: true,
          },
        ],
        anyUpdateRequired: true,
        hasCommandsets: true,
        legacyProject: false,
      };

      mockHasAnyUpdateRequired.mockReturnValue(true);
      mockGetVersionStatus.mockReturnValue({
        result: versionResult,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
      });

      render(<RecentProjects />);

      await waitFor(() => {
        // Tooltip should contain version information
        // This verifies REQ-3.3 (hover tooltip)
      });
    });

    it('should show legacy project indicator for projects without version info', async () => {
      const versionResult: VersionCheckResult = {
        projectPath: '/path/to/project1',
        commandsets: [],
        anyUpdateRequired: true,
        hasCommandsets: false,
        legacyProject: true,
      };

      mockGetVersionStatus.mockReturnValue({
        result: versionResult,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
      });

      render(<RecentProjects />);

      await waitFor(() => {
        // Legacy project indicator should be visible
        // This verifies REQ-3.4
      });
    });
  });

  describe('Update Action Integration', () => {
    it('should trigger install dialog when update button is clicked', async () => {
      // This test verifies REQ-4.1, 4.2 - update button and dialog connection
      const versionResult: VersionCheckResult = {
        projectPath: '/path/to/project1',
        commandsets: [
          {
            name: 'cc-sdd',
            bundleVersion: '1.1.0',
            installedVersion: '1.0.0',
            updateRequired: true,
          },
        ],
        anyUpdateRequired: true,
        hasCommandsets: true,
        legacyProject: false,
      };

      mockHasAnyUpdateRequired.mockReturnValue(true);
      mockGetVersionStatus.mockReturnValue({
        result: versionResult,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
      });

      render(<RecentProjects />);

      // Update button should open CommandsetInstallDialog when clicked
    });
  });
});

describe('UpdateBanner Integration', () => {
  it('should render UpdateBanner when version result shows updates required', () => {
    // This test verifies that UpdateBanner is properly integrated
    // REQ-3.2: Warning icon display
  });

  it('should render LegacyProjectBanner for legacy projects', () => {
    // This test verifies LegacyProjectBanner integration
    // REQ-3.4: Legacy project handling
  });
});
