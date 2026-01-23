/**
 * SpecPane Component Tests
 * Bug fix: bugs-tab-agent-list-missing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecPane } from './SpecPane';
import { useSpecStore } from '../stores';

// Mock the stores
vi.mock('../stores');

// Mock child components
vi.mock('./ArtifactEditor', () => ({
  ArtifactEditor: () => <div data-testid="artifact-editor">ArtifactEditor</div>,
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
});
