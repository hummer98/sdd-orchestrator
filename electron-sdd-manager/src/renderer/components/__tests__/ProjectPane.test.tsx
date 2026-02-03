/**
 * ProjectPane Component Tests
 *
 * project-config-editor Task 3.4: Project view container
 * Requirements: 3.1, 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectPane } from '../ProjectPane';
import { useProjectEditorStore } from '@shared/stores/projectEditorStore';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectFilesState } from '@shared/api/types';

// Mock stores
vi.mock('@shared/stores/projectEditorStore');
vi.mock('../../stores/projectStore');

// Mock window.electronAPI
const mockElectronAPI = {
  readProjectFile: vi.fn(),
  writeProjectFile: vi.fn(),
  onProjectFileChanged: vi.fn(() => vi.fn()),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('ProjectPane', () => {
  const mockFiles: ProjectFilesState = {
    claudeMd: {
      relativePath: 'CLAUDE.md',
      fileName: 'CLAUDE.md',
      group: 'claude',
      exists: true,
    },
    steeringFiles: [
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

  const mockStoreState = {
    currentFilePath: null,
    currentFileName: null,
    content: '',
    originalContent: '',
    isDirty: false,
    isSaving: false,
    error: null,
    mode: 'edit' as const,
    externalChangeDetected: false,
    loadFile: vi.fn(),
    save: vi.fn(),
    setContent: vi.fn(),
    setMode: vi.fn(),
    handleExternalChange: vi.fn(),
    setExternalChangeDetected: vi.fn(),
    clearEditor: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjectEditorStore).mockReturnValue(mockStoreState);
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: '/test/project',
    } as ReturnType<typeof useProjectStore>);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders project pane container', () => {
    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    expect(screen.getByTestId('project-pane')).toBeInTheDocument();
  });

  it('renders ProjectFileList with files', () => {
    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    // Check file list content - use getAllByText since CLAUDE.md appears multiple times
    const claudeElements = screen.getAllByText('CLAUDE.md');
    expect(claudeElements.length).toBeGreaterThan(0);
  });

  it('renders placeholder when no project is selected', () => {
    vi.mocked(useProjectStore).mockReturnValue({
      currentProject: null,
    } as ReturnType<typeof useProjectStore>);

    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    expect(screen.getByText('プロジェクトを選択してください')).toBeInTheDocument();
  });

  it('calls loadFile when file is selected', async () => {
    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    // Find the CLAUDE.md button in the file list
    const fileButtons = screen.getAllByText('CLAUDE.md');
    const fileButton = fileButtons.find(
      (el) => el.tagName === 'BUTTON' || el.closest('button')
    );

    if (fileButton) {
      const button = fileButton.closest('button') || fileButton;
      fireEvent.click(button);
    }

    await waitFor(() => {
      expect(mockStoreState.loadFile).toHaveBeenCalled();
    });
  });

  it('shows ExternalChangeDialog when externalChangeDetected is true', () => {
    vi.mocked(useProjectEditorStore).mockReturnValue({
      ...mockStoreState,
      currentFileName: 'test.md',
      externalChangeDetected: true,
    });

    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    expect(screen.getByTestId('external-change-dialog')).toBeInTheDocument();
  });

  it('does not show ExternalChangeDialog when externalChangeDetected is false', () => {
    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    expect(screen.queryByTestId('external-change-dialog')).not.toBeInTheDocument();
  });

  it('subscribes to file change events when file is loaded', () => {
    vi.mocked(useProjectEditorStore).mockReturnValue({
      ...mockStoreState,
      currentFilePath: '/test/project/CLAUDE.md',
    });

    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    expect(mockElectronAPI.onProjectFileChanged).toHaveBeenCalled();
  });

  it('calls handleExternalChange with reload=true when reload button clicked', async () => {
    vi.mocked(useProjectEditorStore).mockReturnValue({
      ...mockStoreState,
      currentFileName: 'test.md',
      externalChangeDetected: true,
    });

    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    const reloadButton = screen.getByRole('button', { name: 'リロード' });
    fireEvent.click(reloadButton);

    await waitFor(() => {
      expect(mockStoreState.handleExternalChange).toHaveBeenCalledWith(
        expect.anything(),
        true
      );
    });
  });

  it('calls handleExternalChange with reload=false when ignore button clicked', async () => {
    vi.mocked(useProjectEditorStore).mockReturnValue({
      ...mockStoreState,
      currentFileName: 'test.md',
      externalChangeDetected: true,
    });

    render(<ProjectPane files={mockFiles} onRefreshFiles={vi.fn()} />);

    const ignoreButton = screen.getByRole('button', { name: '無視' });
    fireEvent.click(ignoreButton);

    await waitFor(() => {
      expect(mockStoreState.handleExternalChange).toHaveBeenCalledWith(
        expect.anything(),
        false
      );
    });
  });
});
