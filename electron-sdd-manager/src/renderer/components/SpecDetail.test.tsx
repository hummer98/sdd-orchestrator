/**
 * SpecDetail Component Tests
 * TDD: Test-first implementation for SpecDetail component
 * git-worktree-support: Task 12.1, 12.2 - worktree information display
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecDetail } from './SpecDetail';
import * as specStoreModule from '../stores';
import type { SpecJson, SpecDetail as SpecDetailType } from '../types';
import type { WorktreeConfig } from '../types/worktree';

// Mock the store
vi.mock('../stores', () => ({
  useSpecStore: vi.fn(),
}));

const createMockSpecJson = (overrides: Partial<SpecJson> = {}): SpecJson => ({
  feature_name: 'test-feature',
  created_at: '2026-01-12T10:00:00+09:00',
  updated_at: '2026-01-12T12:00:00+09:00',
  language: 'ja',
  phase: 'tasks-generated',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: true, approved: false },
  },
  ...overrides,
});

const createMockWorktree = (overrides: Partial<WorktreeConfig> = {}): WorktreeConfig => ({
  path: '../my-project-worktrees/test-feature',
  branch: 'feature/test-feature',
  created_at: '2026-01-12T12:00:00+09:00',
  ...overrides,
});

const createMockSpecDetail = (
  specJsonOverrides: Partial<SpecJson> = {},
  worktree?: WorktreeConfig
): SpecDetailType => ({
  metadata: {
    name: 'test-feature',
    path: '/project/.kiro/specs/test-feature',
  },
  specJson: {
    ...createMockSpecJson(specJsonOverrides),
    worktree,
  },
  artifacts: {
    requirements: { exists: true, updatedAt: '2026-01-12T10:00:00+09:00' },
    design: { exists: true, updatedAt: '2026-01-12T11:00:00+09:00' },
    tasks: { exists: true, updatedAt: '2026-01-12T12:00:00+09:00' },
    research: null,
    inspection: null,
  },
  taskProgress: { total: 10, completed: 5, percentage: 50 },
});

describe('SpecDetail', () => {
  const mockUseSpecStore = specStoreModule.useSpecStore as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should show placeholder when no spec is selected', () => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: null,
        specDetail: null,
        isLoading: false,
      });

      render(<SpecDetail />);
      expect(screen.getByText('仕様を選択してください')).toBeInTheDocument();
    });

    it('should show loading state when loading', () => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test', path: '/test' },
        specDetail: null,
        isLoading: true,
      });

      render(<SpecDetail />);
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });
  });

  /**
   * git-worktree-support: Task 12.1, 12.2
   * Worktree information section tests
   * Requirements: 4.1, 4.2
   */
  describe('Worktree information section', () => {
    it('should show worktree section when worktree field exists', () => {
      const worktree = createMockWorktree();
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-feature', path: '/project/.kiro/specs/test-feature' },
        specDetail: createMockSpecDetail({}, worktree),
        isLoading: false,
      });

      render(<SpecDetail />);
      expect(screen.getByTestId('worktree-section')).toBeInTheDocument();
    });

    it('should not show worktree section when worktree field does not exist', () => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-feature', path: '/project/.kiro/specs/test-feature' },
        specDetail: createMockSpecDetail({}, undefined),
        isLoading: false,
      });

      render(<SpecDetail />);
      expect(screen.queryByTestId('worktree-section')).not.toBeInTheDocument();
    });

    it('should display worktree path', () => {
      const worktree = createMockWorktree({
        path: '../my-project-worktrees/feature-x',
      });
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-feature', path: '/project/.kiro/specs/test-feature' },
        specDetail: createMockSpecDetail({}, worktree),
        isLoading: false,
      });

      render(<SpecDetail />);
      expect(screen.getByText('../my-project-worktrees/feature-x')).toBeInTheDocument();
    });

    it('should display branch name', () => {
      const worktree = createMockWorktree({
        branch: 'feature/awesome-feature',
      });
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-feature', path: '/project/.kiro/specs/test-feature' },
        specDetail: createMockSpecDetail({}, worktree),
        isLoading: false,
      });

      render(<SpecDetail />);
      expect(screen.getByText('feature/awesome-feature')).toBeInTheDocument();
    });

    it('should display created_at in human-readable format', () => {
      const worktree = createMockWorktree({
        created_at: '2026-01-12T12:30:00+09:00',
      });
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-feature', path: '/project/.kiro/specs/test-feature' },
        specDetail: createMockSpecDetail({}, worktree),
        isLoading: false,
      });

      render(<SpecDetail />);
      // Should have a formatted date somewhere (e.g., "2026/01/12 12:30" or similar)
      const worktreeSection = screen.getByTestId('worktree-section');
      expect(worktreeSection.textContent).toContain('2026');
    });

    it('should show GitBranch icon in worktree section', () => {
      const worktree = createMockWorktree();
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-feature', path: '/project/.kiro/specs/test-feature' },
        specDetail: createMockSpecDetail({}, worktree),
        isLoading: false,
      });

      render(<SpecDetail />);
      const worktreeSection = screen.getByTestId('worktree-section');
      // Check that the section contains an SVG (GitBranch icon)
      expect(worktreeSection.querySelector('svg')).toBeInTheDocument();
    });
  });
});
