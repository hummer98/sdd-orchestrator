/**
 * PRListView Component Tests
 * github-issue-integration: Task 8.1
 * Requirements: 8.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRListView } from './PRListView';
import type { GitHubPullRequest } from '@shared/types/github';

const createMockPR = (overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest => ({
  number: 10,
  title: 'Test PR',
  body: 'PR body',
  state: 'open',
  head: { ref: 'feature-branch', sha: 'abc123' },
  base: { ref: 'main' },
  mergeable: true,
  merged: false,
  labels: [],
  user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  diff_url: 'https://github.com/owner/repo/pull/10.diff',
  ...overrides,
});

describe('PRListView', () => {
  const defaultProps = {
    pullRequests: [
      createMockPR({ number: 10, title: 'First PR' }),
      createMockPR({ number: 11, title: 'Second PR', state: 'closed' as const, head: { ref: 'fix-branch', sha: 'def456' } }),
    ],
    selectedPRNumber: null as number | null,
    isLoading: false,
    error: null as string | null,
    onSelectPR: vi.fn(),
    onFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render PR list items', () => {
    render(<PRListView {...defaultProps} />);

    expect(screen.getByText('First PR')).toBeInTheDocument();
    expect(screen.getByText('Second PR')).toBeInTheDocument();
  });

  it('should render PR number with # prefix', () => {
    render(<PRListView {...defaultProps} />);

    expect(screen.getByText('#10')).toBeInTheDocument();
    expect(screen.getByText('#11')).toBeInTheDocument();
  });

  it('should show PR state badges', () => {
    render(<PRListView {...defaultProps} />);

    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('closed')).toBeInTheDocument();
  });

  it('should display head and base branch info', () => {
    render(<PRListView {...defaultProps} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('should call onSelectPR when a PR is clicked', () => {
    render(<PRListView {...defaultProps} />);

    fireEvent.click(screen.getByText('First PR'));
    expect(defaultProps.onSelectPR).toHaveBeenCalledWith(10);
  });

  it('should highlight the selected PR', () => {
    render(<PRListView {...defaultProps} selectedPRNumber={10} />);

    const firstPR = screen.getByTestId('pr-item-10');
    expect(firstPR.className).toContain('bg-blue-100');
  });

  it('should show loading state', () => {
    render(<PRListView {...defaultProps} isLoading={true} pullRequests={[]} />);

    expect(screen.getByTestId('pr-list-loading')).toBeInTheDocument();
  });

  it('should show empty state when no PRs', () => {
    render(<PRListView {...defaultProps} pullRequests={[]} />);

    expect(screen.getByTestId('pr-list-empty')).toBeInTheDocument();
  });

  it('should render state filter', () => {
    render(<PRListView {...defaultProps} />);

    expect(screen.getByTestId('pr-state-filter')).toBeInTheDocument();
  });

  it('should call onFilterChange when state filter changes', () => {
    render(<PRListView {...defaultProps} />);

    const stateFilter = screen.getByTestId('pr-state-filter');
    fireEvent.change(stateFilter, { target: { value: 'closed' } });

    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ state: 'closed' });
  });

  it('should show merged state for merged PRs', () => {
    const mergedPRs = [
      createMockPR({ number: 12, title: 'Merged PR', state: 'closed', merged: true }),
    ];

    render(<PRListView {...defaultProps} pullRequests={mergedPRs} />);

    expect(screen.getByText('merged')).toBeInTheDocument();
  });
});
