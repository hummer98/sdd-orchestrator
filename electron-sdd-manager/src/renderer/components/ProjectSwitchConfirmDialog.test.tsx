/**
 * Project Switch Confirm Dialog Tests
 * Tests for confirmation dialog when switching projects with running agents
 * Requirements: 5.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSwitchConfirmDialog } from './ProjectSwitchConfirmDialog';

describe('ProjectSwitchConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open with running agents', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={3}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Check for the agents count in the warning text
    expect(screen.getByText((content, element) =>
      content.includes('3 running agents') &&
      element?.tagName !== 'SCRIPT'
    )).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={false}
        runningAgentsCount={3}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText(/running agents/i)).not.toBeInTheDocument();
  });

  it('should call onConfirm when continue button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={2}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /stop.*continue|continue/i });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={2}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show warning message about stopping agents', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={1}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Use getAllByText for multiple matches
    const matches = screen.getAllByText(/will be stopped/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should display target project path for local project', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={1}
        targetProject={{ type: 'local', path: '/path/to/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/\/path\/to\/new\/project/)).toBeInTheDocument();
  });

  it('should display SSH info for remote project', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={1}
        targetProject={{ type: 'ssh', uri: 'ssh://user@host.com/path', displayName: 'host.com' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/host.com/)).toBeInTheDocument();
  });

  it('should show singular form for 1 agent', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={1}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Look for text content matching the pattern
    expect(screen.getByText((content, element) =>
      content.includes('1 running agent') &&
      element?.tagName !== 'SCRIPT'
    )).toBeInTheDocument();
  });

  it('should show plural form for multiple agents', () => {
    render(
      <ProjectSwitchConfirmDialog
        isOpen={true}
        runningAgentsCount={5}
        targetProject={{ type: 'local', path: '/new/project' }}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText((content, element) =>
      content.includes('5 running agents') &&
      element?.tagName !== 'SCRIPT'
    )).toBeInTheDocument();
  });
});
