/**
 * IssuePane Component Tests
 * github-issue-integration: Task 7.1
 * Requirements: 2.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Use vi.hoisted to create the mock store before vi.mock hoisting
const { mockStore } = vi.hoisted(() => {
  const { createStore } = require('zustand/vanilla');
  const store = createStore(() => ({
    issues: [],
    pullRequests: [],
    selectedIssueNumber: null,
    selectedPRNumber: null,
    issueDetail: null,
    issueComments: [],
    prDetail: null,
    isLoading: false,
    hasMore: false,
    filters: {},
    error: null,
    connectionStatus: { configured: false, connected: false, user: null, repoInfo: null, error: null },
    currentPage: 1,
    loadIssues: vi.fn(),
    loadMoreIssues: vi.fn(),
    loadPullRequests: vi.fn(),
    selectIssue: vi.fn(),
    selectPR: vi.fn(),
    setFilters: vi.fn(),
    refresh: vi.fn(),
    checkConnection: vi.fn(),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    reset: vi.fn(),
  }));
  return { mockStore: store };
});

vi.mock('@shared/stores/issueStore', () => ({
  issueStore: mockStore,
}));

// Mock child components
vi.mock('./IssueListPanel', () => ({
  IssueListPanel: () => (
    <div data-testid="issue-list-panel">IssueListPanel</div>
  ),
}));

vi.mock('./IssueDetailView', () => ({
  IssueDetailView: () => (
    <div data-testid="issue-detail-view">IssueDetailView</div>
  ),
}));

vi.mock('./PRListView', () => ({
  PRListView: () => (
    <div data-testid="pr-list-view">PRListView</div>
  ),
}));

vi.mock('./PRDetailView', () => ({
  PRDetailView: () => (
    <div data-testid="pr-detail-view">PRDetailView</div>
  ),
}));

import { IssuePane } from './IssuePane';

describe('IssuePane', () => {
  const defaultProps = {
    projectPath: '/test/project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Issues and PRs sub-tabs', () => {
    render(<IssuePane {...defaultProps} />);

    expect(screen.getByRole('tab', { name: 'Issues' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pull Requests' })).toBeInTheDocument();
  });

  it('should show Issues tab as active by default', () => {
    render(<IssuePane {...defaultProps} />);

    const issuesTab = screen.getByRole('tab', { name: 'Issues' });
    expect(issuesTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should render IssueListPanel and IssueDetailView when Issues tab is active', () => {
    render(<IssuePane {...defaultProps} />);

    expect(screen.getByTestId('issue-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('issue-detail-view')).toBeInTheDocument();
  });

  it('should NOT render PRListView and PRDetailView when Issues tab is active', () => {
    render(<IssuePane {...defaultProps} />);

    expect(screen.queryByTestId('pr-list-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pr-detail-view')).not.toBeInTheDocument();
  });

  it('should switch to PRs tab when clicked', () => {
    render(<IssuePane {...defaultProps} />);

    const prTab = screen.getByRole('tab', { name: 'Pull Requests' });
    fireEvent.click(prTab);

    expect(prTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('pr-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('pr-detail-view')).toBeInTheDocument();
  });

  it('should NOT render IssueListPanel when PRs tab is active', () => {
    render(<IssuePane {...defaultProps} />);

    const prTab = screen.getByRole('tab', { name: 'Pull Requests' });
    fireEvent.click(prTab);

    expect(screen.queryByTestId('issue-list-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('issue-detail-view')).not.toBeInTheDocument();
  });

  it('should render child components', () => {
    render(<IssuePane {...defaultProps} />);

    expect(screen.getByTestId('issue-list-panel')).toBeInTheDocument();
  });
});
