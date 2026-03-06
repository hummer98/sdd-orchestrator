/**
 * PRDetailView Component Tests
 * github-issue-integration: Task 8.2
 * Requirements: 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRDetailView } from './PRDetailView';
import type { GitHubPullRequest, PRFile, CIStatus } from '@shared/types/github';

const createMockPR = (overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest => ({
  number: 10,
  title: 'Test PR',
  body: 'PR description body',
  state: 'open',
  head: { ref: 'feature-branch', sha: 'abc123def456' },
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

const createMockPRFile = (overrides: Partial<PRFile> = {}): PRFile => ({
  sha: 'abc123',
  filename: 'src/index.ts',
  status: 'modified',
  additions: 10,
  deletions: 5,
  changes: 15,
  patch: '@@ -1,5 +1,10 @@\n+added line\n-removed line',
  ...overrides,
});

const createMockCIStatus = (overrides: Partial<CIStatus> = {}): CIStatus => ({
  state: 'success',
  statuses: [
    { context: 'CI / build', state: 'success', description: 'Build passed', target_url: '' },
  ],
  ...overrides,
});

describe('PRDetailView', () => {
  const defaultProps = {
    pr: createMockPR(),
    files: [
      createMockPRFile({ filename: 'src/index.ts' }),
      createMockPRFile({ filename: 'src/utils.ts', status: 'added' as const, additions: 20, deletions: 0, changes: 20, patch: '@@ -0,0 +1,20 @@\n+new utility function' }),
    ],
    ciStatus: createMockCIStatus(),
    isLoadingFiles: false,
    isLoadingCI: false,
    isMerging: false,
    onMerge: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render PR title with number', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('#10')).toBeInTheDocument();
    expect(screen.getByText('Test PR')).toBeInTheDocument();
  });

  it('should render PR description', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('PR description body')).toBeInTheDocument();
  });

  it('should render branch info', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should render file change list', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
  });

  it('should show file status badges', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('modified')).toBeInTheDocument();
    expect(screen.getByText('added')).toBeInTheDocument();
  });

  it('should show additions and deletions counts', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('should render patch diff content', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText(/added line/)).toBeInTheDocument();
  });

  it('should render CI status', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText('CI / build')).toBeInTheDocument();
    expect(screen.getByTestId('ci-status-indicator')).toBeInTheDocument();
  });

  it('should render CI status as pending', () => {
    const pendingCI = createMockCIStatus({
      state: 'pending',
      statuses: [{ context: 'CI', state: 'pending', description: 'Running', target_url: '' }],
    });

    render(<PRDetailView {...defaultProps} ciStatus={pendingCI} />);

    expect(screen.getByTestId('ci-status-indicator')).toBeInTheDocument();
  });

  it('should render merge button with method selection', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByTestId('merge-method-select')).toBeInTheDocument();
    expect(screen.getByTestId('merge-button')).toBeInTheDocument();
  });

  it('should call onMerge with selected merge method', () => {
    render(<PRDetailView {...defaultProps} />);

    const mergeSelect = screen.getByTestId('merge-method-select');
    fireEvent.change(mergeSelect, { target: { value: 'squash' } });

    const mergeButton = screen.getByTestId('merge-button');
    fireEvent.click(mergeButton);

    expect(defaultProps.onMerge).toHaveBeenCalledWith(10, 'squash');
  });

  it('should default merge method to merge', () => {
    render(<PRDetailView {...defaultProps} />);

    const mergeButton = screen.getByTestId('merge-button');
    fireEvent.click(mergeButton);

    expect(defaultProps.onMerge).toHaveBeenCalledWith(10, 'merge');
  });

  it('should disable merge button when PR is not mergeable', () => {
    const notMergeablePR = createMockPR({ mergeable: false });

    render(<PRDetailView {...defaultProps} pr={notMergeablePR} />);

    expect(screen.getByTestId('merge-button')).toBeDisabled();
  });

  it('should disable merge button when merging is in progress', () => {
    render(<PRDetailView {...defaultProps} isMerging={true} />);

    expect(screen.getByTestId('merge-button')).toBeDisabled();
  });

  it('should show placeholder when no PR is selected', () => {
    render(<PRDetailView {...defaultProps} pr={null} files={[]} ciStatus={null} />);

    expect(screen.getByText(/PRを選択/)).toBeInTheDocument();
  });

  it('should show merged PR cannot be merged again', () => {
    const mergedPR = createMockPR({ merged: true, state: 'closed' });

    render(<PRDetailView {...defaultProps} pr={mergedPR} />);

    expect(screen.getByTestId('merge-button')).toBeDisabled();
  });

  it('should indicate that merging updates issue label to status:done', () => {
    render(<PRDetailView {...defaultProps} />);

    expect(screen.getByText(/status:done/)).toBeInTheDocument();
  });
});
