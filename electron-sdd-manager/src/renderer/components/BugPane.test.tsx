/**
 * BugPane Component Tests
 * Bug fix: bugs-tab-agent-list-missing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BugPane } from './BugPane';
import { useBugStore } from '../stores';

// Mock the stores
vi.mock('../stores');

// Mock child components - BugPane now uses shared ArtifactEditor with testId="bug-artifact-editor"
vi.mock('./ArtifactEditor', () => ({
  ArtifactEditor: ({ testId }: { testId?: string }) => (
    <div data-testid={testId || 'artifact-editor'}>ArtifactEditor</div>
  ),
}));

vi.mock('./BugAgentListPanel', () => ({
  BugAgentListPanel: () => <div data-testid="bug-agent-list-panel">BugAgentListPanel</div>,
}));

vi.mock('./BugWorkflowView', () => ({
  BugWorkflowView: () => <div data-testid="bug-workflow-view">BugWorkflowView</div>,
}));

vi.mock('./ResizeHandle', () => ({
  ResizeHandle: ({ direction }: { direction: string }) => (
    <div data-testid={`resize-handle-${direction}`}>ResizeHandle</div>
  ),
}));

const mockUseBugStore = useBugStore as unknown as ReturnType<typeof vi.fn>;

describe('BugPane', () => {
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

  describe('When no bug is selected', () => {
    beforeEach(() => {
      mockUseBugStore.mockReturnValue({
        selectedBug: null,
        bugDetail: null,
      });
    });

    it('should show placeholder message', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.getByText('バグを選択するか、新規作成してください')).toBeInTheDocument();
    });

    it('should NOT render BugArtifactEditor', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.queryByTestId('bug-artifact-editor')).not.toBeInTheDocument();
    });

    it('should NOT render BugAgentListPanel', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.queryByTestId('bug-agent-list-panel')).not.toBeInTheDocument();
    });

    it('should NOT render BugWorkflowView', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.queryByTestId('bug-workflow-view')).not.toBeInTheDocument();
    });
  });

  describe('When a bug is selected', () => {
    beforeEach(() => {
      mockUseBugStore.mockReturnValue({
        selectedBug: { name: 'test-bug', path: '/path/to/bug', phase: 'reported' },
        bugDetail: null,
      });
    });

    it('should render BugArtifactEditor', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.getByTestId('bug-artifact-editor')).toBeInTheDocument();
    });

    it('should render BugAgentListPanel', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.getByTestId('bug-agent-list-panel')).toBeInTheDocument();
    });

    it('should render BugWorkflowView', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.getByTestId('bug-workflow-view')).toBeInTheDocument();
    });

    it('should render horizontal resize handle', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.getByTestId('resize-handle-horizontal')).toBeInTheDocument();
    });

    it('should render vertical resize handle', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.getByTestId('resize-handle-vertical')).toBeInTheDocument();
    });

    it('should NOT show placeholder message', () => {
      render(<BugPane {...defaultProps} />);

      expect(screen.queryByText('バグを選択するか、新規作成してください')).not.toBeInTheDocument();
    });
  });
});
