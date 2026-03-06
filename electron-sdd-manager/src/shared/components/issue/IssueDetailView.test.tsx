/**
 * IssueDetailView Component Tests
 * github-issue-integration: Task 7.3
 * Requirements: 2.4, 2.5, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueDetailView } from './IssueDetailView';
import type { GitHubIssue, GitHubComment } from '@shared/types/github';

const createMockIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  number: 42,
  title: 'Test Issue Title',
  body: 'This is the issue body text.',
  state: 'open',
  labels: [
    { name: 'status:triage', color: 'e4e669', description: null },
    { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
  ],
  assignees: [{ login: 'testuser', avatar_url: 'https://example.com/avatar.png' }],
  milestone: { title: 'v1.0', number: 1 },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  comments: 2,
  user: { login: 'author', avatar_url: 'https://example.com/author.png' },
  ...overrides,
});

const createMockComment = (overrides: Partial<GitHubComment> = {}): GitHubComment => ({
  id: 1,
  body: 'This is a comment.',
  user: { login: 'commenter', avatar_url: 'https://example.com/commenter.png' },
  created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-01-01T12:00:00Z',
  ...overrides,
});

describe('IssueDetailView', () => {
  const defaultProps = {
    issue: createMockIssue(),
    comments: [
      createMockComment({ id: 1, body: 'First comment' }),
      createMockComment({ id: 2, body: 'Second comment' }),
    ],
    projectPath: '/test/project',
    onStartImplementation: vi.fn(),
    onCreatePR: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render issue title with number', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Test Issue Title')).toBeInTheDocument();
  });

  it('should render issue body', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('This is the issue body text.')).toBeInTheDocument();
  });

  it('should render labels', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('status:triage')).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
  });

  it('should render assignees', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should render milestone', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('should render comments', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('should render implementation mode selection', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByTestId('implementation-mode')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Worktree/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Direct/i })).toBeInTheDocument();
  });

  it('should call onStartImplementation with selected mode', () => {
    render(<IssueDetailView {...defaultProps} />);

    const startButton = screen.getByTestId('start-implementation-button');
    fireEvent.click(startButton);

    expect(defaultProps.onStartImplementation).toHaveBeenCalledWith(42, 'worktree');
  });

  it('should call onStartImplementation with direct mode when selected', () => {
    render(<IssueDetailView {...defaultProps} />);

    const directRadio = screen.getByRole('radio', { name: /Direct/i });
    fireEvent.click(directRadio);

    const startButton = screen.getByTestId('start-implementation-button');
    fireEvent.click(startButton);

    expect(defaultProps.onStartImplementation).toHaveBeenCalledWith(42, 'direct');
  });

  it('should render create PR button', () => {
    render(<IssueDetailView {...defaultProps} />);

    const createPRButton = screen.getByTestId('create-pr-button');
    expect(createPRButton).toBeInTheDocument();
  });

  it('should show placeholder when no issue is selected', () => {
    render(<IssueDetailView {...defaultProps} issue={null} comments={[]} />);

    expect(screen.getByText(/Issueを選択/)).toBeInTheDocument();
  });

  it('should display issue state', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('should display author', () => {
    render(<IssueDetailView {...defaultProps} />);

    expect(screen.getByText('author')).toBeInTheDocument();
  });
});
