/**
 * CenterPaneContainer Tests
 * Tests for exclusive switching between ArtifactEditor and GitView
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CenterPaneContainer } from './CenterPaneContainer';
import type { TabInfo } from './ArtifactEditor';

// Mock child components
vi.mock('./ArtifactEditor', () => ({
  ArtifactEditor: () => <div data-testid="artifact-editor">Artifact Editor</div>,
}));

vi.mock('./GitView', () => ({
  GitView: () => <div data-testid="git-view">Git View</div>,
}));

describe('CenterPaneContainer', () => {
  const mockDynamicTabs: TabInfo[] = [
    { key: 'document-review-1', label: 'Review-1' },
  ];
  const mockOnViewModeChange = vi.fn();

  it('should render segmented control with Artifacts and Git Diff options', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="artifacts"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByRole('button', { name: /artifacts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /git diff/i })).toBeInTheDocument();
  });

  it('should show ArtifactEditor when viewMode is "artifacts"', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="artifacts"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByTestId('artifact-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('git-view')).not.toBeInTheDocument();
  });

  it('should show GitView when viewMode is "git-diff"', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="git-diff"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByTestId('git-view')).toBeInTheDocument();
    expect(screen.queryByTestId('artifact-editor')).not.toBeInTheDocument();
  });

  it('should call onViewModeChange when switching to Git Diff', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="artifacts"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const gitDiffButton = screen.getByRole('button', { name: /git diff/i });
    fireEvent.click(gitDiffButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('git-diff');
  });

  it('should call onViewModeChange when switching to Artifacts', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="git-diff"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const artifactsButton = screen.getByRole('button', { name: /artifacts/i });
    fireEvent.click(artifactsButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('artifacts');
  });

  it('should highlight active button based on viewMode', () => {
    const { rerender } = render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="artifacts"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const artifactsButton = screen.getByRole('button', { name: /artifacts/i });
    const gitDiffButton = screen.getByRole('button', { name: /git diff/i });

    // artifacts should be active
    expect(artifactsButton).toHaveClass('bg-blue-500');
    expect(gitDiffButton).not.toHaveClass('bg-blue-500');

    // Switch to git-diff
    rerender(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="git-diff"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    // git-diff should be active
    expect(gitDiffButton).toHaveClass('bg-blue-500');
    expect(artifactsButton).not.toHaveClass('bg-blue-500');
  });

  it('should toggle viewMode when Ctrl+Shift+G is pressed', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="artifacts"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    // Press Ctrl+Shift+G
    fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

    expect(mockOnViewModeChange).toHaveBeenCalledWith('git-diff');
  });

  it('should toggle viewMode when Cmd+Shift+G is pressed (Mac)', () => {
    render(
      <CenterPaneContainer
        dynamicTabs={mockDynamicTabs}
        viewMode="git-diff"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    // Press Cmd+Shift+G (Mac)
    fireEvent.keyDown(document, { key: 'G', metaKey: true, shiftKey: true });

    expect(mockOnViewModeChange).toHaveBeenCalledWith('artifacts');
  });
});
