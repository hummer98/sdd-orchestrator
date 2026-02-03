/**
 * RemoteProjectEditor component tests
 *
 * project-config-editor Task 6.2: Remote UIエディタコンポーネント
 * Requirements: 6.3 (Mobile詳細ページ)
 *
 * Tests:
 * - File content loading via WebSocketApiClient
 * - Markdown editing functionality
 * - Save shortcut and notification
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RemoteProjectEditor } from './RemoteProjectEditor';
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

describe('RemoteProjectEditor', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetProjectEditorStore();
  });

  afterEach(() => {
    resetProjectEditorStore();
    vi.clearAllMocks();
  });

  describe('File content loading', () => {
    it('should load file content on mount', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test Content',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(mockReadProjectFile).toHaveBeenCalledWith(mockFile.relativePath);
      });

      await waitFor(() => {
        const textarea = screen.getByTestId('md-editor-textarea');
        expect(textarea).toHaveValue('# Test Content');
      });
    });

    it('should display file name in header', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Test',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
      });
    });

    it('should show error state on load failure', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'READ_ERROR', message: 'File not found' },
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-editor-error')).toBeInTheDocument();
        expect(screen.getByText('File not found')).toBeInTheDocument();
      });
    });
  });

  describe('Editing functionality', () => {
    it('should update content when user types', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toHaveValue('# Original');
      });

      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      expect(textarea).toHaveValue('# Modified');
    });

    it('should show dirty indicator when content is modified', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      // Initially no dirty indicator
      expect(screen.queryByTestId('dirty-indicator')).not.toBeInTheDocument();

      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      await waitFor(() => {
        expect(screen.getByTestId('dirty-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Save functionality', () => {
    it('should save content when save button is clicked', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      const mockWriteProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });
      mockApiClient.readProjectFile = mockReadProjectFile;
      mockApiClient.writeProjectFile = mockWriteProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      // Modify content
      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      // Click save button
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockWriteProjectFile).toHaveBeenCalledWith(
          mockFile.relativePath,
          '# Modified'
        );
      });
    });

    it('should call onSaveSuccess callback after successful save', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      const mockWriteProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });
      mockApiClient.readProjectFile = mockReadProjectFile;
      mockApiClient.writeProjectFile = mockWriteProjectFile;

      const onSaveSuccess = vi.fn();

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
          onSaveSuccess={onSaveSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      // Modify and save
      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalled();
      });
    });

    it('should disable save button when not dirty', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when dirty', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      mockApiClient.readProjectFile = mockReadProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-button');
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Keyboard shortcuts', () => {
    it('should save on Cmd+S (Mac)', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      const mockWriteProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });
      mockApiClient.readProjectFile = mockReadProjectFile;
      mockApiClient.writeProjectFile = mockWriteProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      // Modify content first
      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      // Press Cmd+S
      fireEvent.keyDown(document, { key: 's', metaKey: true });

      await waitFor(() => {
        expect(mockWriteProjectFile).toHaveBeenCalled();
      });
    });

    it('should save on Ctrl+S (Windows/Linux)', async () => {
      const mockReadProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: '# Original',
      });
      const mockWriteProjectFile = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });
      mockApiClient.readProjectFile = mockReadProjectFile;
      mockApiClient.writeProjectFile = mockWriteProjectFile;

      render(
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
      });

      // Modify content first
      const textarea = screen.getByTestId('md-editor-textarea');
      fireEvent.change(textarea, { target: { value: '# Modified' } });

      // Press Ctrl+S
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockWriteProjectFile).toHaveBeenCalled();
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
        <RemoteProjectEditor
          file={mockFile}
          apiClient={mockApiClient}
          testId="remote-project-editor"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('remote-project-editor')).toBeInTheDocument();
      });
    });
  });
});
