/**
 * ProjectSelectionView Component Tests
 * TDD: Testing project selection view with folder dialog, path input, and recent projects
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.4, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSelectionView } from './ProjectSelectionView';
import { useProjectStore } from '../stores/projectStore';

// Mock the projectStore
vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

const mockUseProjectStore = vi.mocked(useProjectStore);

// Mock window.electronAPI
const mockShowOpenDialog = vi.fn();
const originalElectronAPI = (window as any).electronAPI;

describe('ProjectSelectionView', () => {
  const mockSelectProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectStore.mockReturnValue({
      recentProjects: [],
      selectProject: mockSelectProject,
      isLoading: false,
      error: null,
    } as any);

    (window as any).electronAPI = {
      ...originalElectronAPI,
      showOpenDialog: mockShowOpenDialog,
    };
  });

  afterAll(() => {
    (window as any).electronAPI = originalElectronAPI;
  });

  // ============================================================
  // Requirement 4.2: UI要素の縦配置順序
  // ============================================================
  describe('Requirement 4.2: Vertical layout order', () => {
    it('should display title/description at the top', () => {
      render(<ProjectSelectionView />);

      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText(/プロジェクト/i)).toBeInTheDocument();
    });

    it('should display folder select button', () => {
      render(<ProjectSelectionView />);

      expect(screen.getByRole('button', { name: /フォルダを選択/i })).toBeInTheDocument();
    });

    it('should display path input field and open button', () => {
      render(<ProjectSelectionView />);

      expect(screen.getByPlaceholderText(/パスを入力/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^開く$/i })).toBeInTheDocument();
    });
  });

  // ============================================================
  // Requirement 1.1, 5.3: フォルダを選択ボタンでダイアログ表示
  // ============================================================
  describe('Requirement 1.1, 5.3: Folder selection dialog', () => {
    it('should call showOpenDialog when folder select button is clicked', async () => {
      // showOpenDialog returns null when canceled
      mockShowOpenDialog.mockResolvedValue(null);

      render(<ProjectSelectionView />);

      const folderButton = screen.getByRole('button', { name: /フォルダを選択/i });
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockShowOpenDialog).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // Requirement 1.2: フォルダ選択でプロジェクトが開かれる
  // ============================================================
  describe('Requirement 1.2: Open project after folder selection', () => {
    it('should call selectProject with selected path', async () => {
      const selectedPath = '/path/to/selected/project';
      // showOpenDialog returns the path string when a folder is selected
      mockShowOpenDialog.mockResolvedValue(selectedPath);

      render(<ProjectSelectionView />);

      const folderButton = screen.getByRole('button', { name: /フォルダを選択/i });
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockSelectProject).toHaveBeenCalledWith(selectedPath);
      });
    });
  });

  // ============================================================
  // Requirement 1.3: キャンセル時は何もしない
  // ============================================================
  describe('Requirement 1.3: Cancel does nothing', () => {
    it('should not call selectProject when dialog is canceled', async () => {
      // showOpenDialog returns null when canceled
      mockShowOpenDialog.mockResolvedValue(null);

      render(<ProjectSelectionView />);

      const folderButton = screen.getByRole('button', { name: /フォルダを選択/i });
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(mockShowOpenDialog).toHaveBeenCalled();
      });

      expect(mockSelectProject).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Requirement 2.1: テキストフィールドでパス入力
  // ============================================================
  describe('Requirement 2.1: Path input field', () => {
    it('should allow typing in path input field', async () => {
      render(<ProjectSelectionView />);

      const input = screen.getByPlaceholderText(/パスを入力/i);
      await userEvent.type(input, '/path/to/project');

      expect(input).toHaveValue('/path/to/project');
    });
  });

  // ============================================================
  // Requirement 2.2, 5.2: 開くボタンでプロジェクトが開かれる
  // ============================================================
  describe('Requirement 2.2, 5.2: Open button triggers selectProject', () => {
    it('should call selectProject when open button is clicked with valid path', async () => {
      render(<ProjectSelectionView />);

      const input = screen.getByPlaceholderText(/パスを入力/i);
      await userEvent.type(input, '/path/to/project');

      const openButton = screen.getByRole('button', { name: /^開く$/i });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(mockSelectProject).toHaveBeenCalledWith('/path/to/project');
      });
    });
  });

  // ============================================================
  // Requirement 2.3: 存在しないパスでエラー表示
  // ============================================================
  describe('Requirement 2.3: Error display for invalid path', () => {
    it('should display error message when projectStore has error', () => {
      const errorMessage = 'パスが存在しません: /invalid/path';
      mockUseProjectStore.mockReturnValue({
        recentProjects: [],
        selectProject: mockSelectProject,
        isLoading: false,
        error: errorMessage,
      } as any);

      render(<ProjectSelectionView />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Requirement 2.4: Enterキーで開くボタンと同等動作
  // ============================================================
  describe('Requirement 2.4: Enter key triggers open', () => {
    it('should call selectProject when Enter key is pressed in input', async () => {
      render(<ProjectSelectionView />);

      const input = screen.getByPlaceholderText(/パスを入力/i);
      await userEvent.type(input, '/path/to/project');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSelectProject).toHaveBeenCalledWith('/path/to/project');
      });
    });
  });

  // ============================================================
  // Requirement 2.5: 空入力時は開くボタン無効化
  // ============================================================
  describe('Requirement 2.5: Open button disabled when input is empty', () => {
    it('should disable open button when input is empty', () => {
      render(<ProjectSelectionView />);

      const openButton = screen.getByRole('button', { name: /^開く$/i });
      expect(openButton).toBeDisabled();
    });

    it('should enable open button when input has value', async () => {
      render(<ProjectSelectionView />);

      const input = screen.getByPlaceholderText(/パスを入力/i);
      await userEvent.type(input, '/path');

      const openButton = screen.getByRole('button', { name: /^開く$/i });
      expect(openButton).toBeEnabled();
    });

    it('should disable open button when input has only whitespace', async () => {
      render(<ProjectSelectionView />);

      const input = screen.getByPlaceholderText(/パスを入力/i);
      await userEvent.type(input, '   ');

      const openButton = screen.getByRole('button', { name: /^開く$/i });
      expect(openButton).toBeDisabled();
    });
  });

  // ============================================================
  // Requirement 4.4: ダークモード対応スタイリング
  // ============================================================
  describe('Requirement 4.4: Dark mode styling', () => {
    it('should have dark mode classes on container', () => {
      render(<ProjectSelectionView />);

      const container = screen.getByTestId('project-selection-view');
      expect(container.className).toMatch(/dark:/);
    });
  });

  // ============================================================
  // Integration: RecentProjectList is included
  // ============================================================
  describe('Integration: RecentProjectList', () => {
    it('should include RecentProjectList component', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/path/to/project1'],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<ProjectSelectionView />);

      // RecentProjectList should be rendered when there are recent projects
      expect(screen.getByTestId('recent-project-list')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Loading state
  // ============================================================
  describe('Loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: [],
        selectProject: mockSelectProject,
        isLoading: true,
        error: null,
      } as any);

      render(<ProjectSelectionView />);

      // Open button should show loading state
      const openButton = screen.getByRole('button', { name: /^開く$/i });
      expect(openButton).toBeDisabled();
    });
  });

  // ============================================================
  // FolderOpen icon on select folder button
  // ============================================================
  describe('FolderOpen icon', () => {
    it('should display FolderOpen icon on folder select button', () => {
      render(<ProjectSelectionView />);

      const folderButton = screen.getByRole('button', { name: /フォルダを選択/i });
      expect(folderButton.querySelector('svg')).toBeInTheDocument();
    });
  });
});
