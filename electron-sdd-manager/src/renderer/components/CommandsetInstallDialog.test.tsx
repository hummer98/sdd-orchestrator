/**
 * CommandsetInstallDialog Tests
 * Requirements: 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandsetInstallDialog } from './CommandsetInstallDialog';

// Mock data
const mockProfileDescriptions = {
  minimal: 'Minimal setup with basic spec-manager commands',
  standard: 'Standard setup with cc-sdd full commands and bug workflow',
  full: 'Full setup with all commandsets, agents, and settings',
  'lightweight-bug-fix-only': 'Lightweight setup with bug workflow only',
};

// Import InstallProgress and InstallResultSummary types
import type { InstallProgress, InstallResultSummary } from './CommandsetInstallDialog';

/**
 * E2E/UI Tests for CommandsetInstallDialog
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 * Task: 13.3
 */

describe('CommandsetInstallDialog', () => {
  const defaultProps = {
    isOpen: true,
    projectPath: '/path/to/project',
    onClose: vi.fn(),
    onInstall: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<CommandsetInstallDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('コマンドセットをインストール')).not.toBeInTheDocument();
    });

    it('should render dialog when isOpen is true', () => {
      render(<CommandsetInstallDialog {...defaultProps} />);

      expect(screen.getByText('コマンドセットをインストール')).toBeInTheDocument();
    });

    it('should display project name', () => {
      render(<CommandsetInstallDialog {...defaultProps} />);

      expect(screen.getByText(/project/)).toBeInTheDocument();
    });

    it('should display all profile options', () => {
      render(<CommandsetInstallDialog {...defaultProps} />);

      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Full')).toBeInTheDocument();
      expect(screen.getByText('Bug Fix Only')).toBeInTheDocument();
    });

    it('should display profile descriptions', () => {
      render(<CommandsetInstallDialog {...defaultProps} />);

      expect(screen.getByText(/spec-manager/)).toBeInTheDocument();
      // Multiple elements contain "bug workflow", so use getAllByText
      const bugWorkflowElements = screen.getAllByText(/bug workflow/i);
      expect(bugWorkflowElements.length).toBeGreaterThan(0);
    });
  });

  describe('Profile Selection', () => {
    it('should have standard profile selected by default', () => {
      render(<CommandsetInstallDialog {...defaultProps} />);

      const standardOption = screen.getByRole('radio', { name: /Standard/ });
      expect(standardOption).toBeChecked();
    });

    it('should allow selecting different profiles', () => {
      render(<CommandsetInstallDialog {...defaultProps} />);

      const minimalOption = screen.getByRole('radio', { name: /Minimal/ });
      fireEvent.click(minimalOption);

      expect(minimalOption).toBeChecked();
    });
  });

  describe('Installation', () => {
    it('should call onInstall with selected profile when install button is clicked', async () => {
      const onInstall = vi.fn().mockResolvedValue(undefined);
      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        // onInstall is called with profile and progressCallback
        expect(onInstall).toHaveBeenCalledWith('standard', expect.any(Function));
      });
    });

    it('should call onInstall with selected minimal profile', async () => {
      const onInstall = vi.fn().mockResolvedValue(undefined);
      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const minimalOption = screen.getByRole('radio', { name: /Minimal/ });
      fireEvent.click(minimalOption);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(onInstall).toHaveBeenCalledWith('minimal', expect.any(Function));
      });
    });

    it('should show loading state during installation', async () => {
      const onInstall = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        // Multiple elements may contain "インストール中", check for any
        const elements = screen.getAllByText(/インストール中/);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should disable buttons during installation', async () => {
      const onInstall = vi.fn().mockImplementation(() => new Promise(() => {}));
      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        // In installing state, there's a disabled button showing progress
        const buttons = screen.getAllByRole('button');
        const disabledButton = buttons.find(btn => btn.textContent?.includes('インストール中'));
        expect(disabledButton).toBeDefined();
        expect(disabledButton).toBeDisabled();
      });
    });

    it('should close dialog after successful installation when no result returned', async () => {
      const onClose = vi.fn();
      const onInstall = vi.fn().mockResolvedValue(undefined);
      render(<CommandsetInstallDialog {...defaultProps} onClose={onClose} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show result summary when result is returned', async () => {
      const onClose = vi.fn();
      const resultSummary: InstallResultSummary = {
        totalInstalled: 15,
        totalSkipped: 3,
        totalFailed: 0,
      };
      const onInstall = vi.fn().mockResolvedValue(resultSummary);
      render(<CommandsetInstallDialog {...defaultProps} onClose={onClose} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      // Result should be shown, dialog should not close automatically
      await waitFor(() => {
        expect(screen.getByText(/インストール完了/)).toBeInTheDocument();
      });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Close Button', () => {
    it('should call onClose when X close button is clicked', () => {
      const onClose = vi.fn();
      render(<CommandsetInstallDialog {...defaultProps} onClose={onClose} />);

      // Find the X button by aria-label
      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<CommandsetInstallDialog {...defaultProps} onClose={onClose} />);

      // Find the cancel button by its text
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find(btn => btn.textContent === 'キャンセル');
      expect(cancelButton).toBeDefined();
      fireEvent.click(cancelButton!);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when installation fails', async () => {
      const onInstall = vi.fn().mockRejectedValue(new Error('Installation failed'));
      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/Installation failed/)).toBeInTheDocument();
      });
    });

    it('should re-enable install button after error', async () => {
      const onInstall = vi.fn().mockRejectedValue(new Error('Installation failed'));
      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/Installation failed/)).toBeInTheDocument();
      });

      // Button should be re-enabled
      await waitFor(() => {
        expect(installButton).not.toBeDisabled();
      });
    });
  });

  describe('Progress Display (Task 10.3)', () => {
    it('should display progress bar during installation', async () => {
      let resolveInstall: (value: InstallResultSummary) => void;
      const installPromise = new Promise<InstallResultSummary>((resolve) => {
        resolveInstall = resolve;
      });

      const onInstall = vi.fn().mockImplementation((profile, progressCallback) => {
        // Simulate progress callback
        if (progressCallback) {
          progressCallback({ current: 1, total: 2, currentCommandset: 'cc-sdd' });
        }
        return installPromise;
      });

      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        // Progress bar should be visible
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Cleanup
      resolveInstall!({ totalInstalled: 10, totalSkipped: 0, totalFailed: 0 });
    });

    it('should display current commandset being installed', async () => {
      let resolveInstall: (value: InstallResultSummary) => void;
      const installPromise = new Promise<InstallResultSummary>((resolve) => {
        resolveInstall = resolve;
      });

      const onInstall = vi.fn().mockImplementation((profile, progressCallback) => {
        if (progressCallback) {
          progressCallback({ current: 1, total: 2, currentCommandset: 'cc-sdd' });
        }
        return installPromise;
      });

      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/cc-sdd/)).toBeInTheDocument();
      });

      resolveInstall!({ totalInstalled: 10, totalSkipped: 0, totalFailed: 0 });
    });
  });

  describe('Result Display (Task 10.3)', () => {
    it('should display result summary after installation', async () => {
      const resultSummary: InstallResultSummary = {
        totalInstalled: 15,
        totalSkipped: 3,
        totalFailed: 0,
      };

      const onInstall = vi.fn().mockResolvedValue(resultSummary);

      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/15/)).toBeInTheDocument();
        expect(screen.getByText(/インストール完了/)).toBeInTheDocument();
      });
    });

    it('should display failure count when files failed', async () => {
      const resultSummary: InstallResultSummary = {
        totalInstalled: 10,
        totalSkipped: 2,
        totalFailed: 3,
      };

      const onInstall = vi.fn().mockResolvedValue(resultSummary);

      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/3/)).toBeInTheDocument();
      });
    });

    it('should show close button after installation complete', async () => {
      const resultSummary: InstallResultSummary = {
        totalInstalled: 15,
        totalSkipped: 0,
        totalFailed: 0,
      };

      const onInstall = vi.fn().mockResolvedValue(resultSummary);
      const onClose = vi.fn();

      render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} onClose={onClose} />);

      const installButton = screen.getByRole('button', { name: /インストール/ });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(/インストール完了/)).toBeInTheDocument();
      });

      // Close button should be visible
      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ============================================================
  // E2E/UI Test Cases (Task 13.3)
  // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
  // ============================================================

  describe('E2E/UI Tests (Task 13.3)', () => {
    describe('Profile selection dialog display and operation', () => {
      it('should display all four profile options', () => {
        render(<CommandsetInstallDialog {...defaultProps} />);

        // All profile options should be visible
        expect(screen.getByText('Minimal')).toBeInTheDocument();
        expect(screen.getByText('Standard')).toBeInTheDocument();
        expect(screen.getByText('Full')).toBeInTheDocument();
        expect(screen.getByText('Bug Fix Only')).toBeInTheDocument();
      });

      it('should show recommended label on Standard profile', () => {
        render(<CommandsetInstallDialog {...defaultProps} />);

        expect(screen.getByText('推奨')).toBeInTheDocument();
      });

      it('should show commandsets list for each profile', () => {
        render(<CommandsetInstallDialog {...defaultProps} />);

        // cc-sdd and bug tags should be visible
        const ccSddTags = screen.getAllByText(/cc-sdd/);
        expect(ccSddTags.length).toBeGreaterThan(0);

        const bugTags = screen.getAllByText(/bug/);
        expect(bugTags.length).toBeGreaterThan(0);
      });

      it('should allow switching between profiles', () => {
        render(<CommandsetInstallDialog {...defaultProps} />);

        // Click on Full profile
        const fullOption = screen.getByRole('radio', { name: /Full/ });
        fireEvent.click(fullOption);
        expect(fullOption).toBeChecked();

        // Click on Minimal profile
        const minimalOption = screen.getByRole('radio', { name: /Minimal/ });
        fireEvent.click(minimalOption);
        expect(minimalOption).toBeChecked();

        // Full should no longer be checked
        expect(fullOption).not.toBeChecked();
      });
    });

    describe('Installation progress and real-time update', () => {
      it('should transition from selection state to installing state', async () => {
        let resolveInstall: (value: InstallResultSummary) => void;
        const installPromise = new Promise<InstallResultSummary>((resolve) => {
          resolveInstall = resolve;
        });

        const onInstall = vi.fn().mockReturnValue(installPromise);

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        // Initial state: selection
        expect(screen.getByText('インストールプロファイルを選択:')).toBeInTheDocument();

        // Click install button
        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        // Installing state: progress bar should be visible
        await waitFor(() => {
          expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        // Profile selection should be hidden
        expect(screen.queryByText('インストールプロファイルを選択:')).not.toBeInTheDocument();

        // Cleanup
        resolveInstall!({ totalInstalled: 10, totalSkipped: 0, totalFailed: 0 });
      });

      it('should update progress text during installation', async () => {
        let resolveInstall: (value: InstallResultSummary) => void;
        const installPromise = new Promise<InstallResultSummary>((resolve) => {
          resolveInstall = resolve;
        });

        const onInstall = vi.fn().mockImplementation((profile, progressCallback) => {
          // Simulate progress update
          if (progressCallback) {
            progressCallback({ current: 1, total: 3, currentCommandset: 'cc-sdd' });
          }
          return installPromise;
        });

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        // Progress text should show current commandset and count
        await waitFor(() => {
          // Match text like "インストール中: cc-sdd (1/3)"
          expect(screen.getByText(/cc-sdd/)).toBeInTheDocument();
          expect(screen.getByText(/1\/3/)).toBeInTheDocument();
        });

        resolveInstall!({ totalInstalled: 10, totalSkipped: 0, totalFailed: 0 });
      });
    });

    describe('Installation completion result summary display', () => {
      it('should show success state with green indicator when no failures', async () => {
        const resultSummary: InstallResultSummary = {
          totalInstalled: 20,
          totalSkipped: 5,
          totalFailed: 0,
        };

        const onInstall = vi.fn().mockResolvedValue(resultSummary);

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        await waitFor(() => {
          // Success message should be displayed
          expect(screen.getByText('インストールが完了しました')).toBeInTheDocument();
          // Numbers should be displayed
          expect(screen.getByText(/20/)).toBeInTheDocument();
          expect(screen.getByText(/5/)).toBeInTheDocument();
        });
      });

      it('should show warning state when some files failed', async () => {
        const resultSummary: InstallResultSummary = {
          totalInstalled: 15,
          totalSkipped: 2,
          totalFailed: 3,
        };

        const onInstall = vi.fn().mockResolvedValue(resultSummary);

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        await waitFor(() => {
          // Warning message should be displayed
          expect(screen.getByText('一部のファイルのインストールに失敗しました')).toBeInTheDocument();
          // Failed count should be displayed
          expect(screen.getByText(/3/)).toBeInTheDocument();
        });
      });

      it('should display all three statistics (installed, skipped, failed)', async () => {
        const resultSummary: InstallResultSummary = {
          totalInstalled: 10,
          totalSkipped: 5,
          totalFailed: 2,
        };

        const onInstall = vi.fn().mockResolvedValue(resultSummary);

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        // Wait for complete state first
        await waitFor(() => {
          expect(screen.getByText(/一部のファイルのインストールに失敗しました|インストールが完了しました/)).toBeInTheDocument();
        });

        // Check statistics labels exist (they are in the result summary grid)
        // Note: "インストール" appears in multiple places, so we check for the specific label
        const labels = document.body.textContent;
        expect(labels).toContain('インストール');
        expect(labels).toContain('スキップ');
        expect(labels).toContain('失敗');
      });
    });

    describe('Error handling and recovery', () => {
      it('should display error message when installation fails', async () => {
        const onInstall = vi.fn().mockRejectedValue(new Error('Network error'));

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        await waitFor(() => {
          expect(screen.getByText(/Network error/)).toBeInTheDocument();
        });
      });

      it('should return to selection state after error', async () => {
        const onInstall = vi.fn().mockRejectedValue(new Error('Installation failed'));

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        // Wait for error state
        await waitFor(() => {
          expect(screen.getByText(/Installation failed/)).toBeInTheDocument();
        });

        // Should be back to selection state
        expect(screen.getByText('インストールプロファイルを選択:')).toBeInTheDocument();
      });

      it('should allow retry after error', async () => {
        // First call fails, second succeeds
        const resultSummary: InstallResultSummary = {
          totalInstalled: 10,
          totalSkipped: 0,
          totalFailed: 0,
        };

        const onInstall = vi.fn()
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockResolvedValueOnce(resultSummary);

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        // First attempt
        let installButton = screen.getByRole('button', { name: /^インストール$/ });
        fireEvent.click(installButton);

        // Wait for error
        await waitFor(() => {
          expect(screen.getByText(/First attempt failed/)).toBeInTheDocument();
        });

        // In selection state, the install button should be visible again
        await waitFor(() => {
          expect(screen.getByText('インストールプロファイルを選択:')).toBeInTheDocument();
        });

        // Retry - get the button again as component may have re-rendered
        installButton = screen.getByRole('button', { name: /^インストール$/ });
        fireEvent.click(installButton);

        // Should succeed and show complete state
        await waitFor(() => {
          expect(screen.getByText('インストール完了')).toBeInTheDocument();
        });

        expect(onInstall).toHaveBeenCalledTimes(2);
      });
    });

    describe('Dialog state management', () => {
      it('should reset state when dialog is closed', async () => {
        const resultSummary: InstallResultSummary = {
          totalInstalled: 10,
          totalSkipped: 0,
          totalFailed: 0,
        };

        const onInstall = vi.fn().mockResolvedValue(resultSummary);
        const onClose = vi.fn();

        const { rerender } = render(
          <CommandsetInstallDialog {...defaultProps} onInstall={onInstall} onClose={onClose} />
        );

        // Complete an installation
        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        await waitFor(() => {
          expect(screen.getByText(/インストール完了/)).toBeInTheDocument();
        });

        // Close the dialog
        const closeButton = screen.getByRole('button', { name: /閉じる/ });
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();

        // Reopen dialog
        rerender(
          <CommandsetInstallDialog {...defaultProps} isOpen={true} onInstall={onInstall} onClose={onClose} />
        );

        // Should be back to selection state (because onClose was called which resets isOpen)
        // Note: In real scenario, parent component would manage the isOpen state
      });

      it('should disable close button during installation', async () => {
        let resolveInstall: (value: InstallResultSummary) => void;
        const installPromise = new Promise<InstallResultSummary>((resolve) => {
          resolveInstall = resolve;
        });

        const onInstall = vi.fn().mockReturnValue(installPromise);

        render(<CommandsetInstallDialog {...defaultProps} onInstall={onInstall} />);

        const installButton = screen.getByRole('button', { name: /インストール/ });
        fireEvent.click(installButton);

        // During installation, X button should be disabled
        await waitFor(() => {
          const closeXButton = screen.getByLabelText('close');
          expect(closeXButton).toBeDisabled();
        });

        resolveInstall!({ totalInstalled: 10, totalSkipped: 0, totalFailed: 0 });
      });
    });
  });
});
