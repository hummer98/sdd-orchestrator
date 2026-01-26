/**
 * MobilePullToRefresh Tests
 *
 * Task 3.1: MobilePullToRefreshコンポーネントの作成
 * Task 9.2: MobilePullToRefreshのユニットテスト
 *
 * Requirements:
 * - 4.2: Mobile版でPull to Refresh時にAgent一覧再取得
 * - 5.4: Pull to Refresh中にリフレッシュインジケーター表示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobilePullToRefresh } from './MobilePullToRefresh';

// Mock useDeviceType to simulate mobile device
vi.mock('@shared/hooks/useDeviceType', () => ({
  useDeviceType: () => ({ isMobile: true, deviceType: 'smartphone' }),
}));

describe('MobilePullToRefresh', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    mockOnRefresh.mockReset();
    mockOnRefresh.mockResolvedValue(undefined);
  });

  it('should render children', () => {
    render(
      <MobilePullToRefresh onRefresh={mockOnRefresh} isRefreshing={false}>
        <div data-testid="child-content">Child Content</div>
      </MobilePullToRefresh>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should render with testId', () => {
    render(
      <MobilePullToRefresh
        onRefresh={mockOnRefresh}
        isRefreshing={false}
        testId="pull-to-refresh"
      >
        <div>Content</div>
      </MobilePullToRefresh>
    );

    expect(screen.getByTestId('pull-to-refresh')).toBeInTheDocument();
  });

  describe('Refresh Indicator', () => {
    it('should show refresh indicator when isRefreshing is true', () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={true}
          testId="pull-to-refresh"
        >
          <div>Content</div>
        </MobilePullToRefresh>
      );

      expect(screen.getByTestId('pull-to-refresh-indicator')).toBeInTheDocument();
    });

    it('should hide refresh indicator when isRefreshing is false', () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={false}
          testId="pull-to-refresh"
        >
          <div>Content</div>
        </MobilePullToRefresh>
      );

      expect(screen.queryByTestId('pull-to-refresh-indicator')).not.toBeInTheDocument();
    });

    it('should show spinner in indicator', () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={true}
          testId="pull-to-refresh"
        >
          <div>Content</div>
        </MobilePullToRefresh>
      );

      const indicator = screen.getByTestId('pull-to-refresh-indicator');
      expect(indicator.querySelector('[data-testid="spinner"]')).toBeInTheDocument();
    });
  });

  describe('Pull to Refresh Interaction', () => {
    it('should call onRefresh when pull gesture exceeds threshold', async () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={false}
          testId="pull-to-refresh"
        >
          <div data-testid="content">Content</div>
        </MobilePullToRefresh>
      );

      const container = screen.getByTestId('pull-to-refresh');

      // Simulate pull gesture with touch events
      // Need to pull more than PULL_THRESHOLD (60) * 2 (due to 0.5 resistance factor) = 120px
      fireEvent.touchStart(container, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(container, {
        touches: [{ clientY: 150 }], // Pull down 150px to exceed threshold after resistance
      });

      fireEvent.touchEnd(container);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should not trigger refresh if pull is too short', async () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={false}
          testId="pull-to-refresh"
        >
          <div>Content</div>
        </MobilePullToRefresh>
      );

      const container = screen.getByTestId('pull-to-refresh');

      // Simulate short pull - with 0.5 resistance, 20px pull = 10px effective distance
      fireEvent.touchStart(container, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(container, {
        touches: [{ clientY: 20 }], // Only 20px - well below threshold
      });

      fireEvent.touchEnd(container);

      // Should not call onRefresh for short pulls
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('should not trigger refresh when already refreshing', async () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={true}
          testId="pull-to-refresh"
        >
          <div>Content</div>
        </MobilePullToRefresh>
      );

      const container = screen.getByTestId('pull-to-refresh');

      // Simulate pull gesture
      fireEvent.touchStart(container, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(container, {
        touches: [{ clientY: 150 }],
      });

      fireEvent.touchEnd(container);

      // Should not call onRefresh when already refreshing
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(
        <MobilePullToRefresh
          onRefresh={mockOnRefresh}
          isRefreshing={false}
          testId="pull-to-refresh"
        >
          <div>Content</div>
        </MobilePullToRefresh>
      );

      const container = screen.getByTestId('pull-to-refresh');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });
  });
});
