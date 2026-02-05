/**
 * VcsSchemeSelector Component Tests
 * vcs-scheme-switching: Task 4.1 - VCS scheme selector UI tests
 * Requirements: 1.3, 1.4, 2.2, 2.3, 7.1, 7.2, 7.3, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VcsSchemeSelector } from './VcsSchemeSelector';
import type { VcsScheme } from '../../shared/types/worktree';

// Mock window.electronAPI
const mockCheckJjAvailability = vi.fn();
const mockSetVcsScheme = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (global.window as unknown as { electronAPI: unknown }).electronAPI = {
    checkJjAvailability: mockCheckJjAvailability,
    setVcsScheme: mockSetVcsScheme,
  };
});

describe('VcsSchemeSelector', () => {
  const defaultProps = {
    scheme: 'git' as VcsScheme,
    onChange: vi.fn(),
    projectPath: '/test/project',
  };

  describe('rendering', () => {
    it('should render dropdown with Git selected', () => {
      render(<VcsSchemeSelector {...defaultProps} />);

      expect(screen.getByTestId('vcs-scheme-selector')).toBeInTheDocument();
      expect(screen.getByText('Git')).toBeInTheDocument();
    });

    it('should render dropdown with Jujutsu (jj) selected', () => {
      render(<VcsSchemeSelector {...defaultProps} scheme="jj" />);

      expect(screen.getByText('Jujutsu (jj)')).toBeInTheDocument();
    });

    it('should show both options when clicked', () => {
      render(<VcsSchemeSelector {...defaultProps} />);

      fireEvent.click(screen.getByTestId('vcs-scheme-selector-button'));

      // Check dropdown is visible with both options
      expect(screen.getByTestId('vcs-scheme-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('vcs-scheme-option-git')).toBeInTheDocument();
      expect(screen.getByTestId('vcs-scheme-option-jj')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<VcsSchemeSelector {...defaultProps} disabled />);

      const button = screen.getByTestId('vcs-scheme-selector-button');
      expect(button).toBeDisabled();
    });

    it('should not render when isDesktop is false', () => {
      render(<VcsSchemeSelector {...defaultProps} isDesktop={false} />);

      expect(screen.queryByTestId('vcs-scheme-selector')).not.toBeInTheDocument();
    });
  });

  describe('git selection', () => {
    it('should call onChange with "git" when selecting Git', async () => {
      const onChange = vi.fn();
      mockSetVcsScheme.mockResolvedValue({ success: true });

      render(<VcsSchemeSelector {...defaultProps} scheme="jj" onChange={onChange} />);

      fireEvent.click(screen.getByTestId('vcs-scheme-selector-button'));
      fireEvent.click(screen.getByTestId('vcs-scheme-option-git'));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('git');
      });
    });
  });

  describe('jj selection with availability check', () => {
    it('should check jj availability when selecting jj', async () => {
      const onChange = vi.fn();
      mockCheckJjAvailability.mockResolvedValue({ available: true });
      mockSetVcsScheme.mockResolvedValue({ success: true });

      render(<VcsSchemeSelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('vcs-scheme-selector-button'));
      fireEvent.click(screen.getByTestId('vcs-scheme-option-jj'));

      await waitFor(() => {
        expect(mockCheckJjAvailability).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('jj');
      });
    });

    it('should show error when jj is not installed', async () => {
      const onChange = vi.fn();
      mockCheckJjAvailability.mockResolvedValue({ available: false });

      render(<VcsSchemeSelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('vcs-scheme-selector-button'));
      fireEvent.click(screen.getByTestId('vcs-scheme-option-jj'));

      await waitFor(() => {
        expect(screen.getByTestId('vcs-scheme-error')).toBeInTheDocument();
        expect(
          screen.getByText('jjがインストールされていません。インストール後に再度お試しください。')
        ).toBeInTheDocument();
      });

      // Should not call onChange
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show error when setVcsScheme fails', async () => {
      const onChange = vi.fn();
      mockCheckJjAvailability.mockResolvedValue({ available: true });
      mockSetVcsScheme.mockResolvedValue({
        success: false,
        error: 'jjがインストールされていません。インストール後に再度お試しください。',
      });

      render(<VcsSchemeSelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('vcs-scheme-selector-button'));
      fireEvent.click(screen.getByTestId('vcs-scheme-option-jj'));

      await waitFor(() => {
        expect(screen.getByTestId('vcs-scheme-error')).toBeInTheDocument();
      });

      // Should not call onChange
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should close dropdown when pressing Escape', () => {
      render(<VcsSchemeSelector {...defaultProps} />);

      fireEvent.click(screen.getByTestId('vcs-scheme-selector-button'));
      expect(screen.getByTestId('vcs-scheme-dropdown')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('vcs-scheme-dropdown')).not.toBeInTheDocument();
    });
  });
});
