/**
 * SteeringSection Component Tests
 * TDD: Testing steering verification.md check and generation
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SteeringSection, type SteeringSectionProps } from './SteeringSection';

const defaultProps: SteeringSectionProps = {
  steeringCheck: null,
  steeringGenerateLoading: false,
  onGenerateVerificationMd: vi.fn(),
};

const renderComponent = (props: Partial<SteeringSectionProps> = {}) => {
  return render(<SteeringSection {...defaultProps} {...props} />);
};

describe('SteeringSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 4.1: SteeringSectionコンポーネント実装
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
  // ============================================================

  describe('display rules', () => {
    it('should not render when steeringCheck is null', () => {
      const { container } = renderComponent({ steeringCheck: null });

      expect(container.firstChild).toBeNull();
    });

    it('should not render when verification.md exists', () => {
      const { container } = renderComponent({
        steeringCheck: {
          verificationMdExists: true,
        },
      });

      expect(container.firstChild).toBeNull();
    });

    it('should render warning when verification.md is missing', () => {
      renderComponent({
        steeringCheck: {
          verificationMdExists: false,
        },
      });

      expect(screen.getByText(/Steering/i)).toBeInTheDocument();
      expect(screen.getByText(/verification\.md が不足しています/i)).toBeInTheDocument();
    });
  });

  describe('generate button', () => {
    it('should display generate button when verification.md is missing', () => {
      renderComponent({
        steeringCheck: {
          verificationMdExists: false,
        },
      });

      expect(screen.getByRole('button', { name: /生成/ })).toBeInTheDocument();
    });

    it('should call onGenerateVerificationMd when button is clicked', () => {
      const mockGenerate = vi.fn();
      renderComponent({
        steeringCheck: {
          verificationMdExists: false,
        },
        onGenerateVerificationMd: mockGenerate,
      });

      const button = screen.getByRole('button', { name: /生成/ });
      fireEvent.click(button);

      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('should disable button and show loading state when generating', () => {
      renderComponent({
        steeringCheck: {
          verificationMdExists: false,
        },
        steeringGenerateLoading: true,
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText(/生成中/i)).toBeInTheDocument();
    });
  });

  describe('other steering files check exclusion', () => {
    // Requirement 3.5: 他のsteeringファイル（product.md, tech.md, structure.md）はチェック対象外
    it('should only check verification.md, not other steering files', () => {
      // SteeringCheckResult only contains verificationMdExists
      // This test verifies the type structure
      renderComponent({
        steeringCheck: {
          verificationMdExists: false,
          // No productMdExists, techMdExists, structureMdExists
        },
      });

      // Should only mention verification.md (in the warning message)
      expect(screen.getByText(/verification\.md が不足しています/i)).toBeInTheDocument();
      // Should not mention other steering files
      expect(screen.queryByText(/product\.md/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/tech\.md/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/structure\.md/i)).not.toBeInTheDocument();
    });
  });

  describe('props-driven design for Remote UI compatibility', () => {
    // Requirement 3.6: Remote UI対応
    it('should accept all props as function arguments (store-independent)', () => {
      const mockCallback = vi.fn();
      renderComponent({
        steeringCheck: { verificationMdExists: false },
        steeringGenerateLoading: false,
        onGenerateVerificationMd: mockCallback,
      });

      // Component renders correctly with props
      expect(screen.getByText(/Steering/i)).toBeInTheDocument();

      // Callback works
      fireEvent.click(screen.getByRole('button'));
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
