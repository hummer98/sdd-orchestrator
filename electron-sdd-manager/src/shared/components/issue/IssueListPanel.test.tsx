/**
 * IssueListPanel and IssueListItem Component Tests
 * github-issue-integration: Task 7.2
 * Requirements: 2.2, 2.3, 2.5, 2.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueListPanel } from './IssueListPanel';
import type { GitHubIssue, IssueFilters } from '@shared/types/github';

const createMockIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  number: 1,
  title: 'Test Issue',
  body: 'Test body',
  state: 'open',
  labels: [],
  assignees: [],
  milestone: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  comments: 0,
  user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
  ...overrides,
});

describe('IssueListPanel', () => {
  const defaultProps = {
    issues: [
      createMockIssue({ number: 1, title: 'First Issue' }),
      createMockIssue({ number: 2, title: 'Second Issue' }),
    ],
    selectedIssueNumber: null as number | null,
    isLoading: false,
    hasMore: false,
    filters: {} as IssueFilters,
    error: null as string | null,
    onSelectIssue: vi.fn(),
    onRefresh: vi.fn(),
    onLoadMore: vi.fn(),
    onFilterChange: vi.fn(),
    onCreateIssue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render issue list items', () => {
    render(<IssueListPanel {...defaultProps} />);

    expect(screen.getByText('First Issue')).toBeInTheDocument();
    expect(screen.getByText('Second Issue')).toBeInTheDocument();
  });

  it('should render issue number with # prefix', () => {
    render(<IssueListPanel {...defaultProps} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('should show loading spinner when isLoading is true', () => {
    render(<IssueListPanel {...defaultProps} isLoading={true} issues={[]} />);

    expect(screen.getByTestId('issue-list-loading')).toBeInTheDocument();
  });

  it('should show error message when error is set', () => {
    render(<IssueListPanel {...defaultProps} error="Failed to load" />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should show empty state when no issues', () => {
    render(<IssueListPanel {...defaultProps} issues={[]} />);

    expect(screen.getByTestId('issue-list-empty')).toBeInTheDocument();
  });

  it('should call onSelectIssue when an issue is clicked', () => {
    render(<IssueListPanel {...defaultProps} />);

    fireEvent.click(screen.getByText('First Issue'));
    expect(defaultProps.onSelectIssue).toHaveBeenCalledWith(1);
  });

  it('should highlight the selected issue', () => {
    render(<IssueListPanel {...defaultProps} selectedIssueNumber={1} />);

    const firstIssue = screen.getByTestId('issue-item-1');
    expect(firstIssue.className).toContain('bg-blue-100');
  });

  it('should render refresh button', () => {
    render(<IssueListPanel {...defaultProps} />);

    const refreshButton = screen.getByTestId('refresh-button');
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('should render "load more" button when hasMore is true', () => {
    render(<IssueListPanel {...defaultProps} hasMore={true} />);

    const loadMoreButton = screen.getByTestId('load-more-button');
    expect(loadMoreButton).toBeInTheDocument();

    fireEvent.click(loadMoreButton);
    expect(defaultProps.onLoadMore).toHaveBeenCalled();
  });

  it('should NOT render "load more" button when hasMore is false', () => {
    render(<IssueListPanel {...defaultProps} hasMore={false} />);

    expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument();
  });

  it('should display status: label badges on issues', () => {
    const issuesWithLabels = [
      createMockIssue({
        number: 1,
        title: 'Issue with status',
        labels: [{ name: 'status:triage', color: 'e4e669', description: null }],
      }),
    ];

    render(<IssueListPanel {...defaultProps} issues={issuesWithLabels} />);

    expect(screen.getByTestId('status-label-badge')).toBeInTheDocument();
    expect(screen.getByText('status:triage')).toBeInTheDocument();
  });

  it('should render create issue button', () => {
    render(<IssueListPanel {...defaultProps} />);

    const createButton = screen.getByTestId('create-issue-button');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(defaultProps.onCreateIssue).toHaveBeenCalled();
  });

  it('should render state filter', () => {
    render(<IssueListPanel {...defaultProps} />);

    expect(screen.getByTestId('state-filter')).toBeInTheDocument();
  });

  it('should call onFilterChange when state filter changes', () => {
    render(<IssueListPanel {...defaultProps} />);

    const stateFilter = screen.getByTestId('state-filter');
    fireEvent.change(stateFilter, { target: { value: 'closed' } });

    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ state: 'closed' });
  });
});
