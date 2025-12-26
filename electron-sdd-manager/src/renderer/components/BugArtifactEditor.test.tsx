/**
 * BugArtifactEditor Component Tests
 * Task 4: bugs-pane-integration - BugArtifactEditorコンポーネント
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugArtifactEditor } from './BugArtifactEditor';
import { useBugStore } from '../stores/bugStore';
import type { BugDetail, BugMetadata } from '../types/bug';

// Mock stores
vi.mock('../stores/bugStore', () => ({
  useBugStore: vi.fn(),
}));

const mockBugMetadata: BugMetadata = {
  name: 'test-bug',
  path: '/project/.kiro/bugs/test-bug',
  phase: 'analyzed',
  updatedAt: '2024-01-01T00:00:00Z',
  reportedAt: '2024-01-01T00:00:00Z',
};

const mockBugDetail: BugDetail = {
  metadata: mockBugMetadata,
  artifacts: {
    report: {
      exists: true,
      path: '/project/.kiro/bugs/test-bug/report.md',
      updatedAt: '2024-01-01T00:00:00Z',
      content: '# Bug Report\n\nThis is a test bug report.',
    },
    analysis: {
      exists: true,
      path: '/project/.kiro/bugs/test-bug/analysis.md',
      updatedAt: '2024-01-02T00:00:00Z',
      content: '# Analysis\n\nRoot cause analysis.',
    },
    fix: null,
    verification: null,
  },
};

// Mock with all artifacts existing
const mockBugDetailAllArtifacts: BugDetail = {
  metadata: mockBugMetadata,
  artifacts: {
    report: {
      exists: true,
      path: '/project/.kiro/bugs/test-bug/report.md',
      updatedAt: '2024-01-01T00:00:00Z',
      content: '# Bug Report\n\nThis is a test bug report.',
    },
    analysis: {
      exists: true,
      path: '/project/.kiro/bugs/test-bug/analysis.md',
      updatedAt: '2024-01-02T00:00:00Z',
      content: '# Analysis\n\nRoot cause analysis.',
    },
    fix: {
      exists: true,
      path: '/project/.kiro/bugs/test-bug/fix.md',
      updatedAt: '2024-01-03T00:00:00Z',
      content: '# Fix\n\nFix implementation.',
    },
    verification: {
      exists: true,
      path: '/project/.kiro/bugs/test-bug/verification.md',
      updatedAt: '2024-01-04T00:00:00Z',
      content: '# Verification\n\nVerification results.',
    },
  },
};

describe('BugArtifactEditor', () => {
  const mockUseBugStore = useBugStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBugStore.mockReturnValue({
      selectedBug: mockBugMetadata,
      bugDetail: mockBugDetail,
    });
  });

  describe('rendering', () => {
    it('should render editor container', () => {
      render(<BugArtifactEditor />);
      expect(screen.getByTestId('bug-artifact-editor')).toBeInTheDocument();
    });

    it('should render only existing document tabs', () => {
      render(<BugArtifactEditor />);

      // Only report and analysis exist in mockBugDetail
      expect(screen.getByTestId('bug-tab-report')).toBeInTheDocument();
      expect(screen.getByTestId('bug-tab-analysis')).toBeInTheDocument();
      // fix and verification don't exist, so tabs should not be rendered
      expect(screen.queryByTestId('bug-tab-fix')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bug-tab-verification')).not.toBeInTheDocument();
    });

    it('should render all 4 tabs when all artifacts exist', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetailAllArtifacts,
      });

      render(<BugArtifactEditor />);

      expect(screen.getByTestId('bug-tab-report')).toBeInTheDocument();
      expect(screen.getByTestId('bug-tab-analysis')).toBeInTheDocument();
      expect(screen.getByTestId('bug-tab-fix')).toBeInTheDocument();
      expect(screen.getByTestId('bug-tab-verification')).toBeInTheDocument();
    });

    it('should show report tab as active by default', () => {
      render(<BugArtifactEditor />);
      const reportTab = screen.getByTestId('bug-tab-report');
      expect(reportTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('tab switching', () => {
    it('should switch to analysis tab when clicked', () => {
      render(<BugArtifactEditor />);

      const analysisTab = screen.getByTestId('bug-tab-analysis');
      fireEvent.click(analysisTab);

      expect(analysisTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('bug-tab-report')).toHaveAttribute('aria-selected', 'false');
    });

    it('should display content of selected tab', () => {
      render(<BugArtifactEditor />);

      // Default is report tab - verify placeholder is not shown
      expect(screen.queryByText('ドキュメント未生成')).not.toBeInTheDocument();

      // Switch to analysis tab
      fireEvent.click(screen.getByTestId('bug-tab-analysis'));
      // Placeholder should still not be shown since analysis exists
      expect(screen.queryByText('ドキュメント未生成')).not.toBeInTheDocument();
    });
  });

  describe('placeholder for missing documents', () => {
    it('should show placeholder when no artifacts exist', () => {
      // Mock with no existing artifacts
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: {
          metadata: mockBugMetadata,
          artifacts: {
            report: null,
            analysis: null,
            fix: null,
            verification: null,
          },
        },
      });

      render(<BugArtifactEditor />);

      expect(screen.getByText('表示可能なドキュメントがありません')).toBeInTheDocument();
    });

    it('should not render tabs for null artifacts', () => {
      render(<BugArtifactEditor />);

      // fix and verification are null in mockBugDetail, so they shouldn't be rendered
      expect(screen.queryByTestId('bug-tab-fix')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bug-tab-verification')).not.toBeInTheDocument();
    });
  });

  describe('when no bug is selected', () => {
    it('should show placeholder message', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: null,
        bugDetail: null,
      });

      render(<BugArtifactEditor />);
      expect(screen.getByText('バグを選択してエディターを開始')).toBeInTheDocument();
    });
  });

  describe('tab labels', () => {
    it('should display correct labels for existing tabs', () => {
      render(<BugArtifactEditor />);

      // Only existing artifacts should have tabs
      expect(screen.getByText('report.md')).toBeInTheDocument();
      expect(screen.getByText('analysis.md')).toBeInTheDocument();
      // Non-existing artifacts should not have tabs
      expect(screen.queryByText('fix.md')).not.toBeInTheDocument();
      expect(screen.queryByText('verification.md')).not.toBeInTheDocument();
    });

    it('should display all labels when all artifacts exist', () => {
      mockUseBugStore.mockReturnValue({
        selectedBug: mockBugMetadata,
        bugDetail: mockBugDetailAllArtifacts,
      });

      render(<BugArtifactEditor />);

      expect(screen.getByText('report.md')).toBeInTheDocument();
      expect(screen.getByText('analysis.md')).toBeInTheDocument();
      expect(screen.getByText('fix.md')).toBeInTheDocument();
      expect(screen.getByText('verification.md')).toBeInTheDocument();
    });
  });
});
