/**
 * SpecListHeader Component Tests
 * TDD: Testing spec list header with count and create button
 * Task 3.1, 3.2 (sidebar-refactor)
 * Requirements: 2.1, 2.2, 2.3, 2.4, 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecListHeader } from './SpecListHeader';

describe('SpecListHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 3.1: ヘッダー部分の基本構造
  // Requirements: 6.5
  // ============================================================
  describe('Task 3.1: Basic header structure', () => {
    it('should render header with "Specs" title', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} />);
      expect(screen.getByText('仕様一覧')).toBeInTheDocument();
    });

    it('should display spec count', () => {
      render(<SpecListHeader specCount={5} onCreateClick={() => {}} />);
      expect(screen.getByText('5 件')).toBeInTheDocument();
    });

    it('should display zero count', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} />);
      expect(screen.getByText('0 件')).toBeInTheDocument();
    });

    it('should display large count', () => {
      render(<SpecListHeader specCount={100} onCreateClick={() => {}} />);
      expect(screen.getByText('100 件')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 3.2: 新規仕様作成ボタンのアイコン化
  // Requirements: 2.1, 2.2, 2.3, 2.4
  // ============================================================
  describe('Task 3.2: Create button icon', () => {
    it('should render + icon button', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} />);
      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onCreateClick when button is clicked', () => {
      const onCreateClick = vi.fn();
      render(<SpecListHeader specCount={0} onCreateClick={onCreateClick} />);

      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      fireEvent.click(button);

      expect(onCreateClick).toHaveBeenCalledTimes(1);
    });

    it('should show tooltip on hover', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} />);
      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      expect(button).toHaveAttribute('title', '新規仕様を作成');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} disabled={true} />);
      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      expect(button).toBeDisabled();
    });

    it('should not call onCreateClick when disabled', () => {
      const onCreateClick = vi.fn();
      render(<SpecListHeader specCount={0} onCreateClick={onCreateClick} disabled={true} />);

      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      fireEvent.click(button);

      expect(onCreateClick).not.toHaveBeenCalled();
    });

    it('should be enabled by default', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} />);
      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      expect(button).not.toBeDisabled();
    });
  });

  // ============================================================
  // Visual styling
  // ============================================================
  describe('Visual styling', () => {
    it('should have proper styling for header', () => {
      render(<SpecListHeader specCount={5} onCreateClick={() => {}} />);
      const header = screen.getByTestId('spec-list-header');
      expect(header).toHaveClass('flex', 'items-center');
    });

    it('should show disabled button with reduced opacity', () => {
      render(<SpecListHeader specCount={0} onCreateClick={() => {}} disabled={true} />);
      const button = screen.getByRole('button', { name: /新規仕様を作成/i });
      expect(button).toHaveClass('disabled:opacity-50');
    });
  });
});
