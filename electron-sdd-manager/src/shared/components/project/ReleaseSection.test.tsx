/**
 * ReleaseSection Component Tests
 * TDD: Testing release.md check and generation
 * Requirements: 3.1, 3.3, 3.5 (steering-release-integration)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ReleaseSection, type ReleaseSectionProps } from './ReleaseSection';

const defaultProps: ReleaseSectionProps = {
  releaseCheck: null,
  releaseGenerateLoading: false,
  onGenerateReleaseMd: vi.fn(),
};

const renderComponent = (props: Partial<ReleaseSectionProps> = {}) => {
  return render(<ReleaseSection {...defaultProps} {...props} />);
};

describe('ReleaseSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 4.1: ReleaseSectionコンポーネント実装
  // Requirements: 3.1, 3.3, 3.5
  // ============================================================

  describe('display rules', () => {
    it('should not render when releaseCheck is null', () => {
      const { container } = renderComponent({ releaseCheck: null });

      expect(container.firstChild).toBeNull();
    });

    it('should not render when release.md exists', () => {
      const { container } = renderComponent({
        releaseCheck: {
          releaseMdExists: true,
        },
      });

      expect(container.firstChild).toBeNull();
    });

    it('should render warning when release.md is missing', () => {
      renderComponent({
        releaseCheck: {
          releaseMdExists: false,
        },
      });

      // Check for section header
      expect(screen.getByRole('heading', { name: /Release/i })).toBeInTheDocument();
      expect(screen.getByText(/release\.md が不足しています/i)).toBeInTheDocument();
    });
  });

  describe('generate button', () => {
    it('should display generate button when release.md is missing', () => {
      renderComponent({
        releaseCheck: {
          releaseMdExists: false,
        },
      });

      expect(screen.getByRole('button', { name: /生成/ })).toBeInTheDocument();
    });

    it('should call onGenerateReleaseMd when button is clicked', () => {
      const mockGenerate = vi.fn();
      renderComponent({
        releaseCheck: {
          releaseMdExists: false,
        },
        onGenerateReleaseMd: mockGenerate,
      });

      const button = screen.getByRole('button', { name: /生成/ });
      fireEvent.click(button);

      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('should disable button and show loading state when generating', () => {
      renderComponent({
        releaseCheck: {
          releaseMdExists: false,
        },
        releaseGenerateLoading: true,
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText(/生成中/i)).toBeInTheDocument();
    });
  });

  describe('props-driven design for Remote UI compatibility', () => {
    // Requirement 3.5: Remote UI対応
    it('should accept all props as function arguments (store-independent)', () => {
      const mockCallback = vi.fn();
      renderComponent({
        releaseCheck: { releaseMdExists: false },
        releaseGenerateLoading: false,
        onGenerateReleaseMd: mockCallback,
      });

      // Component renders correctly with props
      expect(screen.getByRole('heading', { name: /Release/i })).toBeInTheDocument();

      // Callback works
      fireEvent.click(screen.getByRole('button'));
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
