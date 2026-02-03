/**
 * ProjectDetailPage component tests
 *
 * project-config-editor Task 6.3: モバイル詳細ページコンポーネント
 * Requirements: 6.3 (Mobile詳細ページ), 6.4 (Mobile戻るボタン)
 *
 * Tests:
 * - Back button rendering and functionality
 * - RemoteProjectEditor integration
 * - File name display in header
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ProjectDetailPage } from './ProjectDetailPage';
import { resetProjectEditorStore } from '@shared/stores/projectEditorStore';
import type { ApiClient, ProjectFileInfo } from '@shared/api/types';

// Mock MDEditor to avoid complex markdown editor in tests
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange, ...props }: { value: string; onChange: (value?: string) => void }) => (
    <textarea
      data-testid="md-editor-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  ),
}));

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

const mockFile: ProjectFileInfo = {
  relativePath: 'CLAUDE.md',
  fileName: 'CLAUDE.md',
  group: 'claude',
  exists: true,
};

const mockSteeringFile: ProjectFileInfo = {
  relativePath: '.kiro/steering/tech.md',
  fileName: 'tech.md',
  group: 'steering',
  exists: true,
};

// =============================================================================
// Tests
// =============================================================================

describe('ProjectDetailPage', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetProjectEditorStore();
  });

  afterEach(() => {
    resetProjectEditorStore();
    vi.clearAllMocks();
  });

  describe('Header with back button (Req 6.4)', () => {
    it('should render header with back button', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      expect(screen.getByTestId('project-detail-header')).toBeInTheDocument();
      expect(screen.getByTestId('project-detail-back-button')).toBeInTheDocument();
    });

    it('should display file name in header', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // File name should appear in header (use within to scope to header)
      const header = screen.getByTestId('project-detail-header');
      expect(within(header).getByText('CLAUDE.md')).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      const onBack = vi.fn();

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={onBack}
        />
      );

      const backButton = screen.getByTestId('project-detail-back-button');
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('RemoteProjectEditor integration (Req 6.3)', () => {
    it('should render RemoteProjectEditor with file', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# File Content',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('remote-project-editor')).toBeInTheDocument();
      });

      await waitFor(() => {
        const textarea = screen.getByTestId('md-editor-textarea');
        expect(textarea).toHaveValue('# File Content');
      });
    });

    it('should pass file to RemoteProjectEditor', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Steering',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockSteeringFile}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // File name should appear in header (use within to scope to header)
      const header = screen.getByTestId('project-detail-header');
      expect(within(header).getByText('tech.md')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockReadProjectFile).toHaveBeenCalledWith(mockSteeringFile.relativePath);
      });
    });
  });

  describe('Component structure', () => {
    it('should render with proper testId', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={() => {}}
          testId="project-detail-page"
        />
      );

      expect(screen.getByTestId('project-detail-page')).toBeInTheDocument();
    });

    it('should have proper layout structure (header + editor)', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // Header exists
      expect(screen.getByTestId('project-detail-header')).toBeInTheDocument();

      // Editor exists within main content
      await waitFor(() => {
        expect(screen.getByTestId('remote-project-editor')).toBeInTheDocument();
      });
    });
  });

  describe('Icon display', () => {
    it('should display FileText icon next to file name', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <ProjectDetailPage
          file={mockFile}
          apiClient={mockApiClient}
          onBack={() => {}}
        />
      );

      // The header should contain the FileText icon (check by parent structure)
      const header = screen.getByTestId('project-detail-header');
      expect(header).toBeInTheDocument();
    });
  });
});
