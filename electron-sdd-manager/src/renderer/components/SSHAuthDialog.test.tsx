/**
 * SSH Auth Dialog Tests
 * Tests for SSH authentication progress and password/passphrase dialogs
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SSHAuthDialog } from './SSHAuthDialog';

describe('SSHAuthDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password mode', () => {
    it('should render password input when type is password', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="password"
          host="test.com"
          user="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/SSH Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    });

    it('should show user and host info', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="password"
          host="test.com"
          user="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/testuser@test.com/)).toBeInTheDocument();
    });

    it('should call onSubmit with password when form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <SSHAuthDialog
          isOpen={true}
          type="password"
          host="test.com"
          user="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText(/enter password/i);
      await user.type(input, 'mypassword');

      const submitButton = screen.getByRole('button', { name: /submit|ok/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('mypassword');
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SSHAuthDialog
          isOpen={true}
          type="password"
          host="test.com"
          user="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable submit button when input is empty', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="password"
          host="test.com"
          user="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /submit|ok/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Passphrase mode', () => {
    it('should render passphrase input when type is passphrase', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="passphrase"
          host="test.com"
          user="testuser"
          keyPath="/home/user/.ssh/id_rsa"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/SSH Passphrase/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
    });

    it('should show key path when provided', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="passphrase"
          host="test.com"
          user="testuser"
          keyPath="/home/user/.ssh/id_rsa"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/id_rsa/)).toBeInTheDocument();
    });

    it('should call onSubmit with passphrase', async () => {
      const user = userEvent.setup();

      render(
        <SSHAuthDialog
          isOpen={true}
          type="passphrase"
          host="test.com"
          user="testuser"
          keyPath="/home/user/.ssh/id_rsa"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText(/enter passphrase/i);
      await user.type(input, 'mypassphrase');

      const submitButton = screen.getByRole('button', { name: /submit|ok/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('mypassphrase');
    });
  });

  describe('Host key verification mode', () => {
    it('should render fingerprint when type is host-key', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="host-key"
          host="test.com"
          user="testuser"
          fingerprint="SHA256:abc123xyz..."
          isNewHost={true}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/SHA256:abc123xyz/)).toBeInTheDocument();
    });

    it('should show warning for new host', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="host-key"
          host="test.com"
          user="testuser"
          fingerprint="SHA256:abc123xyz..."
          isNewHost={true}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Use heading to be more specific
      expect(screen.getByText(/New Host/)).toBeInTheDocument();
    });

    it('should show strong warning for changed host key', () => {
      render(
        <SSHAuthDialog
          isOpen={true}
          type="host-key"
          host="test.com"
          user="testuser"
          fingerprint="SHA256:abc123xyz..."
          isNewHost={false}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Use heading to be more specific
      expect(screen.getByText(/Host Key Changed/i)).toBeInTheDocument();
    });

    it('should call onSubmit with true when accepted', async () => {
      const user = userEvent.setup();

      render(
        <SSHAuthDialog
          isOpen={true}
          type="host-key"
          host="test.com"
          user="testuser"
          fingerprint="SHA256:abc123xyz..."
          isNewHost={true}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept|trust/i });
      await user.click(acceptButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('accept');
    });
  });

  describe('Dialog visibility', () => {
    it('should not render when closed', () => {
      render(
        <SSHAuthDialog
          isOpen={false}
          type="password"
          host="test.com"
          user="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText(/SSH Password/i)).not.toBeInTheDocument();
    });
  });
});
