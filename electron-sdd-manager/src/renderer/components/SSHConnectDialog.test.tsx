/**
 * SSH Connect Dialog Tests
 * Tests for SSH URI input dialog
 * Requirements: 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SSHConnectDialog } from './SSHConnectDialog';

describe('SSHConnectDialog', () => {
  const mockOnConnect = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/SSH Remote Project/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ssh:\/\/user@host/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <SSHConnectDialog
        isOpen={false}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText(/SSH Remote Project/i)).not.toBeInTheDocument();
  });

  it('should call onConnect with URI when form is submitted', async () => {
    const user = userEvent.setup();

    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText(/ssh:\/\/user@host/i);
    await user.type(input, 'ssh://testuser@testhost.com/path/to/project');

    const connectButton = screen.getByRole('button', { name: /connect/i });
    await user.click(connectButton);

    expect(mockOnConnect).toHaveBeenCalledWith('ssh://testuser@testhost.com/path/to/project');
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show validation error for invalid URI', async () => {
    const user = userEvent.setup();

    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText(/ssh:\/\/user@host/i);
    await user.type(input, 'invalid-uri');

    const connectButton = screen.getByRole('button', { name: /connect/i });
    await user.click(connectButton);

    expect(screen.getByText(/invalid ssh uri/i)).toBeInTheDocument();
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it('should show validation error when URI is missing user', async () => {
    const user = userEvent.setup();

    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText(/ssh:\/\/user@host/i);
    await user.type(input, 'ssh://host.com/path');

    const connectButton = screen.getByRole('button', { name: /connect/i });
    await user.click(connectButton);

    expect(screen.getByText(/user.*required/i)).toBeInTheDocument();
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it('should disable connect button when input is empty', () => {
    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const connectButton = screen.getByRole('button', { name: /connect/i });
    expect(connectButton).toBeDisabled();
  });

  it('should enable connect button when input has value', async () => {
    const user = userEvent.setup();

    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText(/ssh:\/\/user@host/i);
    await user.type(input, 'ssh://user@host.com/path');

    const connectButton = screen.getByRole('button', { name: /connect/i });
    expect(connectButton).not.toBeDisabled();
  });

  it('should clear error when input changes', async () => {
    const user = userEvent.setup();

    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByPlaceholderText(/ssh:\/\/user@host/i);
    await user.type(input, 'invalid');

    const connectButton = screen.getByRole('button', { name: /connect/i });
    await user.click(connectButton);

    expect(screen.getByText(/invalid ssh uri/i)).toBeInTheDocument();

    // Clear and type new value
    await user.clear(input);
    await user.type(input, 'ssh://user@host.com/path');

    expect(screen.queryByText(/invalid ssh uri/i)).not.toBeInTheDocument();
  });

  it('should show loading state when connecting', () => {
    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
        isConnecting={true}
      />
    );

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
  });

  it('should display initial URI if provided', () => {
    render(
      <SSHConnectDialog
        isOpen={true}
        onConnect={mockOnConnect}
        onCancel={mockOnCancel}
        initialUri="ssh://user@host.com/path"
      />
    );

    const input = screen.getByPlaceholderText(/ssh:\/\/user@host/i);
    expect(input).toHaveValue('ssh://user@host.com/path');
  });
});
