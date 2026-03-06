/**
 * CreateIssueDialog Component Tests
 * github-issue-integration: Task 7.4
 * Requirements: 3.1, 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateIssueDialog } from './CreateIssueDialog';

describe('CreateIssueDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<CreateIssueDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('新規Issue作成')).not.toBeInTheDocument();
  });

  it('should render dialog when isOpen is true', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    expect(screen.getByText('新規Issue作成')).toBeInTheDocument();
  });

  it('should render title input field', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
  });

  it('should render body textarea', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    expect(screen.getByLabelText('本文')).toBeInTheDocument();
  });

  it('should render labels input field', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    expect(screen.getByLabelText('Labels')).toBeInTheDocument();
  });

  it('should render assignees input field', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    expect(screen.getByLabelText('Assignees')).toBeInTheDocument();
  });

  it('should call onSubmit with form data when submitted', async () => {
    render(<CreateIssueDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'New Bug Report' },
    });
    fireEvent.change(screen.getByLabelText('本文'), {
      target: { value: 'Bug description here' },
    });

    const submitButton = screen.getByTestId('create-issue-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        title: 'New Bug Report',
        body: 'Bug description here',
        labels: [],
        assignees: [],
      });
    });
  });

  it('should disable submit button when title is empty', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    const submitButton = screen.getByTestId('create-issue-submit');
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when title is filled', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'Some title' },
    });

    const submitButton = screen.getByTestId('create-issue-submit');
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('キャンセル'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should display status:triage auto-label note', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    expect(screen.getByText(/status:triage/)).toBeInTheDocument();
  });

  it('should show loading state during submission', async () => {
    const slowSubmit = vi.fn(() => new Promise(() => {})); // Never resolves
    render(<CreateIssueDialog {...defaultProps} onSubmit={slowSubmit} />);

    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'Test' },
    });

    fireEvent.click(screen.getByTestId('create-issue-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('create-issue-submit')).toBeDisabled();
    });
  });

  it('should call onClose when backdrop is clicked', () => {
    render(<CreateIssueDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
