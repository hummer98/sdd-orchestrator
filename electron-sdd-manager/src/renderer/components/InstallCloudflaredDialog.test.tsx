/**
 * InstallCloudflaredDialog Component Tests
 * TDD: Testing cloudflared installation guide dialog
 * Requirements: 4.2, 4.3
 * Task 10.1: InstallCloudflaredDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallCloudflaredDialog } from './InstallCloudflaredDialog';

// Mock shell.openExternal
const mockOpenExternal = vi.fn();
vi.mock('electron', () => ({
  shell: {
    openExternal: mockOpenExternal,
  },
}));

describe('InstallCloudflaredDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 10.1.1: Modal dialog implementation
  // Requirements: 4.2
  // ============================================================
  describe('Task 10.1.1: Modal dialog implementation', () => {
    it('should render when isOpen is true', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<InstallCloudflaredDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have proper dialog title', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/cloudflared/i);
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<InstallCloudflaredDialog {...defaultProps} onClose={onClose} />);

      // Get all close buttons and click the first one (header X button)
      const closeButtons = screen.getAllByRole('button', { name: /close|閉じる/i });
      fireEvent.click(closeButtons[0]);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<InstallCloudflaredDialog {...defaultProps} onClose={onClose} />);

      // Click on backdrop
      const backdrop = screen.getByTestId('dialog-backdrop');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should be accessible with modal attributes', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  // ============================================================
  // Task 10.1.2: Platform-specific install instructions
  // Requirements: 4.2, 4.3
  // ============================================================
  describe('Task 10.1.2: Platform-specific install instructions', () => {
    it('should display Homebrew installation command', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      expect(screen.getByText(/brew install cloudflared/)).toBeInTheDocument();
    });

    it('should display MacPorts installation info', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      // MacPorts installation command - may have multiple matches
      const macportsElements = screen.getAllByText(/MacPorts/i);
      expect(macportsElements.length).toBeGreaterThan(0);
    });

    it('should display official download link', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      // Official Cloudflare downloads page link
      expect(screen.getByRole('link', { name: /download|ダウンロード/i })).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 10.1.3: Installation method links
  // Requirements: 4.3
  // ============================================================
  describe('Task 10.1.3: Installation method links', () => {
    it('should display Homebrew section', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      // Look for Homebrew in heading (more specific)
      const homebrewSections = screen.getAllByText(/Homebrew/);
      expect(homebrewSections.length).toBeGreaterThan(0);
    });

    it('should have a download URL that points to Cloudflare downloads', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      const downloadLink = screen.getByRole('link', { name: /download|ダウンロード/i });
      expect(downloadLink).toHaveAttribute('href', expect.stringContaining('cloudflare'));
    });

    it('should open download link in external browser', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      const downloadLink = screen.getByRole('link', { name: /download|ダウンロード/i });
      expect(downloadLink).toHaveAttribute('target', '_blank');
      expect(downloadLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
  });

  // ============================================================
  // Task 10.1.4: Custom install instructions prop
  // ============================================================
  describe('Task 10.1.4: Custom install instructions prop', () => {
    it('should use provided install instructions when given', () => {
      const customInstructions = {
        homebrew: 'brew install my-cloudflared',
        macports: 'port install my-cloudflared',
        downloadUrl: 'https://custom.example.com/download',
      };

      render(
        <InstallCloudflaredDialog
          {...defaultProps}
          installInstructions={customInstructions}
        />
      );

      expect(screen.getByText(/brew install my-cloudflared/)).toBeInTheDocument();
    });

    it('should use default instructions when not provided', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      // Default Homebrew command
      expect(screen.getByText(/brew install cloudflared/)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 10.1.5: Copy command functionality
  // ============================================================
  describe('Task 10.1.5: Copy command functionality', () => {
    it('should have copy button for Homebrew command', () => {
      render(<InstallCloudflaredDialog {...defaultProps} />);

      const copyButtons = screen.getAllByRole('button', { name: /copy|コピー/i });
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should copy Homebrew command to clipboard when copy button clicked', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<InstallCloudflaredDialog {...defaultProps} />);

      const copyButtons = screen.getAllByRole('button', { name: /copy|コピー/i });
      fireEvent.click(copyButtons[0]);

      expect(mockWriteText).toHaveBeenCalledWith('brew install cloudflared');
    });
  });
});
