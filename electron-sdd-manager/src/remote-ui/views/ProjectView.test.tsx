/**
 * ProjectView component tests
 *
 * project-config-editor Task 6.1: Remote UIファイル一覧コンポーネント
 * Requirements: 6.2 (Mobileファイル一覧)
 *
 * Tests:
 * - File list display with CLAUDE.md and Steering Files groups
 * - Navigation to ProjectDetailPage on file selection
 * - Loading and error states
 * - Empty state handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectView } from './ProjectView';
import type { ApiClient, ProjectFilesState } from '@shared/api/types';

// =============================================================================
// Mock API Client
// =============================================================================

const createMockApiClient = (): ApiClient => ({
  getSpecs: vi.fn(),
  getBugs: vi.fn(),
  getSpecDetail: vi.fn(),
  getBugDetail: vi.fn(),
  executePhase: vi.fn(),
  updateApproval: vi.fn(),
  executeBugPhase: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  getArtifactContent: vi.fn(),
  saveFile: vi.fn(),
  getAgentLogs: vi.fn(),
  getProjectAgents: vi.fn(),
  sendAgentInstruction: vi.fn(),
  continueAgent: vi.fn(),
  stopAgent: vi.fn(),
  listProjectFiles: vi.fn(),
  readProjectFile: vi.fn(),
  writeProjectFile: vi.fn(),
  onProjectFileChanged: vi.fn().mockReturnValue(() => {}),
});

// =============================================================================
// Mock Data
// =============================================================================

const mockProjectFilesWithAll: ProjectFilesState = {
  claudeMd: {
    relativePath: 'CLAUDE.md',
    fileName: 'CLAUDE.md',
    group: 'claude',
    exists: true,
  },
  steeringFiles: [
    {
      relativePath: '.kiro/steering/tech.md',
      fileName: 'tech.md',
      group: 'steering',
      exists: true,
    },
    {
      relativePath: '.kiro/steering/product.md',
      fileName: 'product.md',
      group: 'steering',
      exists: true,
    },
  ],
  isLoading: false,
  error: null,
};

const mockProjectFilesWithoutClaude: ProjectFilesState = {
  claudeMd: null,
  steeringFiles: [
    {
      relativePath: '.kiro/steering/tech.md',
      fileName: 'tech.md',
      group: 'steering',
      exists: true,
    },
  ],
  isLoading: false,
  error: null,
};

const mockProjectFilesEmpty: ProjectFilesState = {
  claudeMd: null,
  steeringFiles: [],
  isLoading: false,
  error: null,
};

// =============================================================================
// Tests
// =============================================================================

describe('ProjectView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('File list display (Req 6.2)', () => {
    it('should call listProjectFiles on mount', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        expect(mockListProjectFiles).toHaveBeenCalled();
      });
    });

    it('should display CLAUDE.md in CLAUDE.md section when exists', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        // There are two CLAUDE.md texts: section header and file item
        const claudeTexts = screen.getAllByText('CLAUDE.md');
        expect(claudeTexts.length).toBe(2); // Header + file item
      });

      // Should have a section header
      expect(screen.getByTestId('project-files-claude-section')).toBeInTheDocument();
    });

    it('should display Steering Files section with files', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-files-steering-section')).toBeInTheDocument();
        expect(screen.getByText('tech.md')).toBeInTheDocument();
        expect(screen.getByText('product.md')).toBeInTheDocument();
      });
    });

    it('should not display CLAUDE.md section when file does not exist', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithoutClaude,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        // Steering section should exist
        expect(screen.getByTestId('project-files-steering-section')).toBeInTheDocument();
      });

      // Claude section should not exist
      expect(screen.queryByTestId('project-files-claude-section')).not.toBeInTheDocument();
    });
  });

  describe('File selection and navigation', () => {
    it('should call onSelectFile when a file is clicked', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      const onSelectFile = vi.fn();

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={onSelectFile}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-file-CLAUDE.md')).toBeInTheDocument();
      });

      const claudeFile = screen.getByTestId('project-file-CLAUDE.md');
      fireEvent.click(claudeFile);

      expect(onSelectFile).toHaveBeenCalledWith(mockProjectFilesWithAll.claudeMd);
    });

    it('should call onSelectFile with steering file info', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      const onSelectFile = vi.fn();

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={onSelectFile}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('tech.md')).toBeInTheDocument();
      });

      const techFile = screen.getByTestId('project-file-tech.md');
      fireEvent.click(techFile);

      expect(onSelectFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'tech.md',
          group: 'steering',
        })
      );
    });

    it('should highlight selected file', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
          selectedFilePath="CLAUDE.md"
        />
      );

      await waitFor(() => {
        const claudeFile = screen.getByTestId('project-file-CLAUDE.md');
        expect(claudeFile).toHaveAttribute('data-selected', 'true');
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while loading', async () => {
      // Never resolve to keep loading state
      const mockListProjectFiles = vi.fn().mockReturnValue(new Promise(() => {}));
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      expect(screen.getByTestId('project-view-loading')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message on API error', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'API_ERROR', message: 'Failed to load files' },
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-view-error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load files')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state (Req 2.4, 2.5)', () => {
    it('should display empty state when no files exist', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesEmpty,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-view-empty')).toBeInTheDocument();
      });
    });

    it('should display "No steering files" when steering section is empty', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          claudeMd: mockProjectFilesWithAll.claudeMd,
          steeringFiles: [],
          isLoading: false,
          error: null,
        },
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('ファイルなし')).toBeInTheDocument();
      });
    });
  });

  describe('Component structure', () => {
    it('should render with proper testId', async () => {
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProjectFilesWithAll,
      });
      mockApiClient.listProjectFiles = mockListProjectFiles;

      render(
        <ProjectView
          apiClient={mockApiClient}
          onSelectFile={() => {}}
          testId="project-view"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-view')).toBeInTheDocument();
      });
    });
  });
});
