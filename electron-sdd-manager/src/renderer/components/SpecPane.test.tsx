/**
 * SpecPane Component Tests
 * Bug fix: bugs-tab-agent-list-missing
 * git-diff-viewer Task 9.1: CenterPaneContainer integration tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecPane } from './SpecPane';
import { useSpecStore } from '../stores';

// Mock the stores
vi.mock('../stores');

// Mock child components
vi.mock('./ArtifactEditor', () => ({
  ArtifactEditor: () => <div data-testid="artifact-editor">ArtifactEditor</div>,
}));

vi.mock('./GitView', () => ({
  GitView: () => <div data-testid="git-view">GitView</div>,
}));

vi.mock('./AgentListPanel', () => ({
  AgentListPanel: () => <div data-testid="agent-list-panel">AgentListPanel</div>,
}));

// workflow-view-unification: Mock ElectronWorkflowView (used in SpecPane)
vi.mock('./ElectronWorkflowView', () => ({
  ElectronWorkflowView: () => <div data-testid="workflow-view">WorkflowView</div>,
}));

vi.mock('./ResizeHandle', () => ({
  ResizeHandle: ({ direction }: { direction: string }) => (
    <div data-testid={`resize-handle-${direction}`}>ResizeHandle</div>
  ),
}));

// Mock electronAPI for loadLayoutConfig/saveLayoutConfig
const mockElectronAPI = {
  loadLayoutConfig: vi.fn().mockResolvedValue(null),
  saveLayoutConfig: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
  },
  writable: true,
});

const mockUseSpecStore = useSpecStore as unknown as ReturnType<typeof vi.fn>;

describe('SpecPane', () => {
  const defaultProps = {
    rightPaneWidth: 300,
    agentListHeight: 200,
    onRightResize: vi.fn(),
    onAgentListResize: vi.fn(),
    onResizeEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('When no spec is selected', () => {
    beforeEach(() => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: null,
        specDetail: null,
      });
    });

    it('should show placeholder message', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByText('仕様を選択するか、新規作成してください')).toBeInTheDocument();
    });

    it('should NOT render ArtifactEditor', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.queryByTestId('artifact-editor')).not.toBeInTheDocument();
    });

    it('should NOT render AgentListPanel', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.queryByTestId('agent-list-panel')).not.toBeInTheDocument();
    });

    it('should NOT render WorkflowView', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.queryByTestId('workflow-view')).not.toBeInTheDocument();
    });
  });

  describe('When a spec is selected but detail is loading', () => {
    beforeEach(() => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-spec', path: '/path/to/spec', phase: 'requirements' },
        specDetail: null,
        isDetailLoading: true,
      });
    });

    it('should show loading message (Bug fix: spec-item-flash-wrong-content)', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByText('仕様を読み込み中...')).toBeInTheDocument();
    });

    it('should NOT render ArtifactEditor while loading', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.queryByTestId('artifact-editor')).not.toBeInTheDocument();
    });
  });

  describe('When a spec is selected and detail is loaded', () => {
    beforeEach(() => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-spec', path: '/path/to/spec', phase: 'requirements' },
        specDetail: {
          metadata: { name: 'test-spec', path: '/path/to/spec', phase: 'requirements' },
          specJson: { feature_name: 'test-spec', phase: 'requirements' },
          artifacts: {},
        },
        isDetailLoading: false,
      });
    });

    it('should render ArtifactEditor', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByTestId('artifact-editor')).toBeInTheDocument();
    });

    it('should render AgentListPanel', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByTestId('agent-list-panel')).toBeInTheDocument();
    });

    it('should render WorkflowView', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByTestId('workflow-view')).toBeInTheDocument();
    });

    it('should render horizontal resize handle', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByTestId('resize-handle-horizontal')).toBeInTheDocument();
    });

    it('should render vertical resize handle', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByTestId('resize-handle-vertical')).toBeInTheDocument();
    });

    it('should NOT show placeholder message', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.queryByText('仕様を選択するか、新規作成してください')).not.toBeInTheDocument();
    });
  });

  // git-diff-viewer Task 9.1: CenterPaneContainer integration tests
  describe('CenterPaneContainer integration', () => {
    beforeEach(() => {
      mockUseSpecStore.mockReturnValue({
        selectedSpec: { name: 'test-spec', path: '/path/to/spec', phase: 'requirements' },
        specDetail: {
          metadata: { name: 'test-spec', path: '/path/to/spec', phase: 'requirements' },
          specJson: { feature_name: 'test-spec', phase: 'requirements' },
          artifacts: {},
        },
        isDetailLoading: false,
      });
    });

    it('should render segmented control buttons for Artifacts and Git Diff', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByRole('button', { name: /artifacts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /git diff/i })).toBeInTheDocument();
    });

    it('should show ArtifactEditor by default (viewMode is artifacts)', () => {
      render(<SpecPane {...defaultProps} />);

      expect(screen.getByTestId('artifact-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('git-view')).not.toBeInTheDocument();
    });

    it('should switch to GitView when Git Diff button is clicked', () => {
      render(<SpecPane {...defaultProps} />);

      const gitDiffButton = screen.getByRole('button', { name: /git diff/i });
      fireEvent.click(gitDiffButton);

      expect(screen.getByTestId('git-view')).toBeInTheDocument();
      expect(screen.queryByTestId('artifact-editor')).not.toBeInTheDocument();
    });

    it('should switch back to ArtifactEditor when Artifacts button is clicked', () => {
      render(<SpecPane {...defaultProps} />);

      // First switch to git-diff
      const gitDiffButton = screen.getByRole('button', { name: /git diff/i });
      fireEvent.click(gitDiffButton);

      // Then switch back to artifacts
      const artifactsButton = screen.getByRole('button', { name: /artifacts/i });
      fireEvent.click(artifactsButton);

      expect(screen.getByTestId('artifact-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('git-view')).not.toBeInTheDocument();
    });

    it('should toggle viewMode when Ctrl+Shift+G is pressed', () => {
      render(<SpecPane {...defaultProps} />);

      // Start with artifacts
      expect(screen.getByTestId('artifact-editor')).toBeInTheDocument();

      // Press Ctrl+Shift+G
      fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

      expect(screen.getByTestId('git-view')).toBeInTheDocument();
      expect(screen.queryByTestId('artifact-editor')).not.toBeInTheDocument();

      // Press Ctrl+Shift+G again to toggle back
      fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

      expect(screen.getByTestId('artifact-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('git-view')).not.toBeInTheDocument();
    });

    it('should highlight active view mode button', () => {
      render(<SpecPane {...defaultProps} />);

      const artifactsButton = screen.getByRole('button', { name: /artifacts/i });
      const gitDiffButton = screen.getByRole('button', { name: /git diff/i });

      // Initially, artifacts should be active
      expect(artifactsButton).toHaveClass('bg-blue-500');
      expect(gitDiffButton).not.toHaveClass('bg-blue-500');

      // After clicking git-diff
      fireEvent.click(gitDiffButton);

      expect(gitDiffButton).toHaveClass('bg-blue-500');
      expect(artifactsButton).not.toHaveClass('bg-blue-500');
    });
  });
});
