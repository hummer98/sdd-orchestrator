/**
 * StatusLabelBadge Component Tests
 * github-issue-integration: Task 7.2
 * Requirements: 2.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusLabelBadge } from './StatusLabelBadge';

describe('StatusLabelBadge', () => {
  it('should render the status label text with status: prefix', () => {
    render(<StatusLabelBadge status="triage" />);
    expect(screen.getByText('status:triage')).toBeInTheDocument();
  });

  it('should render in-progress status', () => {
    render(<StatusLabelBadge status="in-progress" />);
    expect(screen.getByText('status:in-progress')).toBeInTheDocument();
  });

  it('should render in-review status', () => {
    render(<StatusLabelBadge status="in-review" />);
    expect(screen.getByText('status:in-review')).toBeInTheDocument();
  });

  it('should render changes-requested status', () => {
    render(<StatusLabelBadge status="changes-requested" />);
    expect(screen.getByText('status:changes-requested')).toBeInTheDocument();
  });

  it('should render done status', () => {
    render(<StatusLabelBadge status="done" />);
    expect(screen.getByText('status:done')).toBeInTheDocument();
  });

  it('should have appropriate data-testid', () => {
    render(<StatusLabelBadge status="triage" />);
    expect(screen.getByTestId('status-label-badge')).toBeInTheDocument();
  });
});
