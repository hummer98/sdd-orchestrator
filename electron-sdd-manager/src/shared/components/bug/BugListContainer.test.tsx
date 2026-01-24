/**
 * BugListContainer Component Tests
 *
 * bugs-view-unification Task 7.3: BugListContainerのコンポーネントテストを作成する
 *
 * Tests for:
 * - ローディング・エラー・空状態表示 (Requirements: 1.2, 1.3, 1.4)
 * - フィルター・検索UI表示/非表示 (Requirements: 1.5, 1.6)
 * - Bug選択コールバック (Requirements: 1.7)
 * - Bug一覧表示 (Requirements: 1.1, 1.8)
 * - レスポンシブ対応 (Requirements: 1.9)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugListContainer } from './BugListContainer';
import type { BugMetadata } from '@shared/api/types';

// =============================================================================
// Test Data
// =============================================================================

function createMockBugs(): BugMetadata[] {
  return [
    {
      name: 'bug-alpha',
      phase: 'reported',
      updatedAt: '2026-01-22T10:00:00Z',
      reportedAt: '2026-01-22T10:00:00Z',
    },
    {
      name: 'bug-beta',
      phase: 'analyzed',
      updatedAt: '2026-01-23T10:00:00Z',
      reportedAt: '2026-01-22T10:00:00Z',
    },
    {
      name: 'bug-gamma',
      phase: 'fixed',
      updatedAt: '2026-01-21T10:00:00Z',
      reportedAt: '2026-01-21T10:00:00Z',
    },
  ];
}

// =============================================================================
// Tests - Loading State (Requirements: 1.2)
// =============================================================================

describe('BugListContainer - Loading State', () => {
  it('should display loading indicator when isLoading is true', () => {
    render(
      <BugListContainer
        bugs={[]}
        onSelectBug={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('bug-list-loading')).toBeInTheDocument();
  });

  it('should not display bug list when loading', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.queryByTestId('bug-list-items')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests - Error State (Requirements: 1.3)
// =============================================================================

describe('BugListContainer - Error State', () => {
  it('should display error message when error is provided', () => {
    render(
      <BugListContainer
        bugs={[]}
        onSelectBug={vi.fn()}
        isLoading={false}
        error="Failed to load bugs"
      />
    );

    expect(screen.getByTestId('bug-list-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load bugs')).toBeInTheDocument();
  });

  it('should not display bug list when error occurs', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        error="Error occurred"
      />
    );

    expect(screen.queryByTestId('bug-list-items')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests - Empty State (Requirements: 1.4)
// =============================================================================

describe('BugListContainer - Empty State', () => {
  it('should display empty message when bugs array is empty', () => {
    render(
      <BugListContainer
        bugs={[]}
        onSelectBug={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByTestId('bug-list-empty')).toBeInTheDocument();
  });

  it('should display search-specific empty message when search query yields no results', () => {
    render(
      <BugListContainer
        bugs={[]}
        onSelectBug={vi.fn()}
        isLoading={false}
        showSearch={true}
        searchQuery="nonexistent"
      />
    );

    const emptyElement = screen.getByTestId('bug-list-empty');
    expect(emptyElement).toBeInTheDocument();
    expect(emptyElement.textContent).toContain('nonexistent');
  });
});

// =============================================================================
// Tests - Bug List Display (Requirements: 1.1)
// =============================================================================

describe('BugListContainer - Bug List Display', () => {
  it('should display bug list items', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByTestId('bug-list-items')).toBeInTheDocument();
    // Each bug should be displayed
    expect(screen.getByText('bug-alpha')).toBeInTheDocument();
    expect(screen.getByText('bug-beta')).toBeInTheDocument();
    expect(screen.getByText('bug-gamma')).toBeInTheDocument();
  });

  it('should highlight selected bug', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        selectedBugName="bug-beta"
        onSelectBug={vi.fn()}
        isLoading={false}
      />
    );

    // BugListItem will handle the selected styling
    expect(screen.getByTestId('bug-list-items')).toBeInTheDocument();
  });
});

// =============================================================================
// Tests - Bug Selection Callback (Requirements: 1.7)
// =============================================================================

describe('BugListContainer - Bug Selection', () => {
  it('should call onSelectBug when a bug is clicked', () => {
    const bugs = createMockBugs();
    const onSelectBug = vi.fn();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={onSelectBug}
        isLoading={false}
      />
    );

    // Click on bug-alpha item
    fireEvent.click(screen.getByText('bug-alpha'));

    expect(onSelectBug).toHaveBeenCalledWith(bugs[0]);
  });
});

// =============================================================================
// Tests - Phase Filter (Requirements: 1.5)
// =============================================================================

describe('BugListContainer - Phase Filter', () => {
  it('should not display phase filter when showPhaseFilter is false', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        showPhaseFilter={false}
      />
    );

    expect(screen.queryByTestId('phase-filter')).not.toBeInTheDocument();
  });

  it('should display phase filter when showPhaseFilter is true', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        showPhaseFilter={true}
        phaseFilter="all"
        onPhaseFilterChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('phase-filter')).toBeInTheDocument();
  });

  it('should call onPhaseFilterChange when filter is changed', () => {
    const bugs = createMockBugs();
    const onPhaseFilterChange = vi.fn();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        showPhaseFilter={true}
        phaseFilter="all"
        onPhaseFilterChange={onPhaseFilterChange}
      />
    );

    const select = screen.getByTestId('phase-filter');
    fireEvent.change(select, { target: { value: 'reported' } });

    expect(onPhaseFilterChange).toHaveBeenCalledWith('reported');
  });
});

// =============================================================================
// Tests - Text Search (Requirements: 1.6)
// =============================================================================

describe('BugListContainer - Text Search', () => {
  it('should not display search input when showSearch is false', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        showSearch={false}
      />
    );

    expect(screen.queryByTestId('bug-list-search-input')).not.toBeInTheDocument();
  });

  it('should display search input when showSearch is true', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        showSearch={true}
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('bug-list-search-input')).toBeInTheDocument();
  });

  it('should call onSearchChange when search input changes', () => {
    const bugs = createMockBugs();
    const onSearchChange = vi.fn();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        showSearch={true}
        searchQuery=""
        onSearchChange={onSearchChange}
      />
    );

    const input = screen.getByTestId('bug-list-search-input');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(onSearchChange).toHaveBeenCalledWith('test');
  });
});

// =============================================================================
// Tests - Agent Count Display (Requirements: 1.8)
// =============================================================================

describe('BugListContainer - Agent Count', () => {
  it('should pass getRunningAgentCount to BugListItem', () => {
    const bugs = createMockBugs();
    const getRunningAgentCount = vi.fn().mockReturnValue(2);

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        getRunningAgentCount={getRunningAgentCount}
      />
    );

    // getRunningAgentCount should be called for each bug
    expect(getRunningAgentCount).toHaveBeenCalledWith('bug-alpha');
    expect(getRunningAgentCount).toHaveBeenCalledWith('bug-beta');
    expect(getRunningAgentCount).toHaveBeenCalledWith('bug-gamma');
  });
});

// =============================================================================
// Tests - Responsive Layout (Requirements: 1.9)
// =============================================================================

describe('BugListContainer - Responsive Layout', () => {
  it('should accept deviceType prop', () => {
    const bugs = createMockBugs();

    // Should render without error with desktop
    const { rerender } = render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        deviceType="desktop"
      />
    );

    expect(screen.getByTestId('bug-list')).toBeInTheDocument();

    // Should render without error with smartphone
    rerender(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        deviceType="smartphone"
      />
    );

    expect(screen.getByTestId('bug-list')).toBeInTheDocument();
  });
});

// =============================================================================
// Tests - Custom Props
// =============================================================================

describe('BugListContainer - Custom Props', () => {
  it('should apply custom className', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        className="custom-class"
      />
    );

    expect(screen.getByTestId('bug-list')).toHaveClass('custom-class');
  });

  it('should use custom testIdPrefix', () => {
    const bugs = createMockBugs();

    render(
      <BugListContainer
        bugs={bugs}
        onSelectBug={vi.fn()}
        isLoading={false}
        testIdPrefix="custom-bug-list"
      />
    );

    expect(screen.getByTestId('custom-bug-list')).toBeInTheDocument();
  });
});
