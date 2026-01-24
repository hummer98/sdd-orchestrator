/**
 * RecentProjectList Component Tests
 * TDD: Testing recent projects list for project selection view
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentProjectList } from './RecentProjectList';
import { useProjectStore } from '../stores/projectStore';

// Mock the projectStore
vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

const mockUseProjectStore = vi.mocked(useProjectStore);

describe('RecentProjectList', () => {
  const mockSelectProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectStore.mockReturnValue({
      recentProjects: [],
      selectProject: mockSelectProject,
      isLoading: false,
      error: null,
    } as any);
  });

  // ============================================================
  // Requirement 3.1: 最大6件の最近開いたプロジェクトを縦並びリストで表示
  // ============================================================
  describe('Requirement 3.1: Display max 6 recent projects in vertical list', () => {
    it('should display all recent projects when there are 6 or fewer', () => {
      const projects = [
        '/path/to/project1',
        '/path/to/project2',
        '/path/to/project3',
      ];
      mockUseProjectStore.mockReturnValue({
        recentProjects: projects,
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      expect(screen.getByText('project1')).toBeInTheDocument();
      expect(screen.getByText('project2')).toBeInTheDocument();
      expect(screen.getByText('project3')).toBeInTheDocument();
    });

    it('should display only first 6 projects when there are more than 6', () => {
      const projects = [
        '/path/to/project1',
        '/path/to/project2',
        '/path/to/project3',
        '/path/to/project4',
        '/path/to/project5',
        '/path/to/project6',
        '/path/to/project7',
        '/path/to/project8',
      ];
      mockUseProjectStore.mockReturnValue({
        recentProjects: projects,
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      // Should show first 6
      expect(screen.getByText('project1')).toBeInTheDocument();
      expect(screen.getByText('project6')).toBeInTheDocument();
      // Should not show 7th and 8th
      expect(screen.queryByText('project7')).not.toBeInTheDocument();
      expect(screen.queryByText('project8')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Requirement 3.2: フォルダ名（最後のパスセグメント）とフルパス表示
  // ============================================================
  describe('Requirement 3.2: Display folder name and full path', () => {
    it('should display folder name (last path segment)', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/Users/test/projects/my-app'],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      expect(screen.getByText('my-app')).toBeInTheDocument();
    });

    it('should display full path as title/tooltip', () => {
      const fullPath = '/Users/test/projects/my-app';
      mockUseProjectStore.mockReturnValue({
        recentProjects: [fullPath],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      // Full path should be shown as secondary text
      expect(screen.getByText(fullPath)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Requirement 3.3: クリックでプロジェクトが開かれる
  // ============================================================
  describe('Requirement 3.3: Click to open project', () => {
    it('should call selectProject when item is clicked', async () => {
      const projectPath = '/path/to/project1';
      mockUseProjectStore.mockReturnValue({
        recentProjects: [projectPath],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      const projectItem = screen.getByText('project1').closest('button');
      expect(projectItem).not.toBeNull();
      fireEvent.click(projectItem!);

      expect(mockSelectProject).toHaveBeenCalledWith(projectPath);
    });
  });

  // ============================================================
  // Requirement 3.4: 最近開いたプロジェクトが存在しない場合は非表示
  // ============================================================
  describe('Requirement 3.4: Hide when no recent projects', () => {
    it('should not render when recentProjects is empty', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: [],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<RecentProjectList />);

      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================
  // Requirement 3.5: 表示順は最近開いた順（新しい順）
  // ============================================================
  describe('Requirement 3.5: Display in recent order', () => {
    it('should display projects in the order provided (most recent first)', () => {
      const projects = [
        '/path/to/most-recent',
        '/path/to/second',
        '/path/to/oldest',
      ];
      mockUseProjectStore.mockReturnValue({
        recentProjects: projects,
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      const items = screen.getAllByRole('button');
      expect(items[0]).toHaveTextContent('most-recent');
      expect(items[1]).toHaveTextContent('second');
      expect(items[2]).toHaveTextContent('oldest');
    });
  });

  // ============================================================
  // Requirement 4.4: ダークモード対応スタイリング
  // ============================================================
  describe('Requirement 4.4: Dark mode styling', () => {
    it('should have dark mode classes', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/path/to/project'],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      const container = screen.getByTestId('recent-project-list');
      // Check for dark mode classes (dark: prefix)
      expect(container.className).toMatch(/dark:/);
    });
  });

  // ============================================================
  // Loading state: Disable buttons during loading
  // ============================================================
  describe('Loading state', () => {
    it('should disable all project buttons when isLoading is true', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/path/to/project1', '/path/to/project2'],
        selectProject: mockSelectProject,
        isLoading: true,
        error: null,
      } as any);

      render(<RecentProjectList />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call selectProject when button is clicked during loading', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/path/to/project1'],
        selectProject: mockSelectProject,
        isLoading: true,
        error: null,
      } as any);

      render(<RecentProjectList />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSelectProject).not.toHaveBeenCalled();
    });

    it('should enable buttons when isLoading is false', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/path/to/project1'],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  // ============================================================
  // UI: Folder icon display
  // ============================================================
  describe('Folder icon', () => {
    it('should display folder icon for each project', () => {
      mockUseProjectStore.mockReturnValue({
        recentProjects: ['/path/to/project1', '/path/to/project2'],
        selectProject: mockSelectProject,
        isLoading: false,
        error: null,
      } as any);

      render(<RecentProjectList />);

      // Check for folder icons
      const folderIcons = screen.getAllByTestId('folder-icon');
      expect(folderIcons).toHaveLength(2);
    });
  });
});
