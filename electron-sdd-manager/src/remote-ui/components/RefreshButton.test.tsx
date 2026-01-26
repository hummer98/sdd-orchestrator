/**
 * RefreshButton Tests
 *
 * Task 4.1: RefreshButtonコンポーネントの作成
 * Task 9.3: RefreshButtonのユニットテスト
 *
 * Requirements:
 * - 4.3: Desktop版でリフレッシュボタンクリック時に再取得
 * - 6.5: リフレッシュ中にボタンをローディング状態表示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefreshButton } from './RefreshButton';

describe('RefreshButton', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    mockOnRefresh.mockReset();
    mockOnRefresh.mockResolvedValue(undefined);
  });

  it('should render refresh button', () => {
    render(
      <RefreshButton
        onRefresh={mockOnRefresh}
        isLoading={false}
        testId="refresh-button"
      />
    );

    expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
  });

  it('should call onRefresh when clicked', async () => {
    render(
      <RefreshButton
        onRefresh={mockOnRefresh}
        isLoading={false}
        testId="refresh-button"
      />
    );

    const button = screen.getByTestId('refresh-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should show spinner when isLoading is true', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={true}
          testId="refresh-button"
        />
      );

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should disable button when isLoading is true', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={true}
          testId="refresh-button"
        />
      );

      const button = screen.getByTestId('refresh-button');
      expect(button).toBeDisabled();
    });

    it('should not call onRefresh when clicked while loading', async () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={true}
          testId="refresh-button"
        />
      );

      const button = screen.getByTestId('refresh-button');
      fireEvent.click(button);

      // Wait a bit to ensure no async call happens
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('should show refresh icon when not loading', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={false}
          testId="refresh-button"
        />
      );

      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      // The RefreshCw icon should be present
      const button = screen.getByTestId('refresh-button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Label', () => {
    it('should render without label by default', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={false}
          testId="refresh-button"
        />
      );

      const button = screen.getByTestId('refresh-button');
      // Button should only contain the icon, no text content
      expect(button.textContent).toBe('');
    });

    it('should render with label when provided', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={false}
          label="Refresh"
          testId="refresh-button"
        />
      );

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={false}
          testId="refresh-button"
        />
      );

      const button = screen.getByTestId('refresh-button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should have title attribute', () => {
      render(
        <RefreshButton
          onRefresh={mockOnRefresh}
          isLoading={false}
          testId="refresh-button"
        />
      );

      const button = screen.getByTestId('refresh-button');
      expect(button).toHaveAttribute('title');
    });
  });
});
