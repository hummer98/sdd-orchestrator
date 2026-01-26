/**
 * MobilePullToRefresh Component
 *
 * Task 3.1: MobilePullToRefreshコンポーネントの作成
 *
 * Requirements:
 * - 4.2: Mobile版でPull to Refresh時にAgent一覧再取得
 * - 5.4: Pull to Refresh中にリフレッシュインジケーター表示
 *
 * Design:
 * - Design.md DD-004: Pull to Refresh実装方式
 * - CSSとtouch eventによるカスタム実装（外部ライブラリ依存なし）
 */

import React, { useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '@shared/components/ui';

// =============================================================================
// Constants
// =============================================================================

/** Pull threshold in pixels to trigger refresh */
const PULL_THRESHOLD = 60;

/** Maximum pull distance in pixels */
const MAX_PULL_DISTANCE = 120;

// =============================================================================
// Types
// =============================================================================

export interface MobilePullToRefreshProps {
  /** Refresh callback - called when pull gesture is detected */
  onRefresh: () => Promise<void>;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * MobilePullToRefresh - Pull to Refresh wrapper component
 *
 * Provides native-like pull-to-refresh functionality for mobile devices.
 * Wraps children and detects pull gesture via touch events.
 *
 * Features:
 * - Touch-based pull detection
 * - Visual pull indicator with spring effect
 * - Refresh indicator during loading
 * - Configurable pull threshold
 */
export function MobilePullToRefresh({
  onRefresh,
  isRefreshing,
  children,
  testId = 'pull-to-refresh',
}: MobilePullToRefreshProps): React.ReactElement {
  // State
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Refs
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Touch Handlers
  // ---------------------------------------------------------------------------

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;

    // Only start tracking if at top of scroll
    const container = containerRef.current;
    if (container && container.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply resistance for natural feel (diminishing returns)
      const distance = Math.min(diff * 0.5, MAX_PULL_DISTANCE);
      setPullDistance(distance);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD) {
      // Trigger refresh
      try {
        await onRefresh();
      } finally {
        setPullDistance(0);
      }
    } else {
      // Reset without refresh
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, pullDistance, onRefresh]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      role="region"
      aria-live="polite"
      className="relative h-full overflow-y-auto"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator - shown when refreshing (Req 5.4) */}
      {isRefreshing && (
        <div
          data-testid={`${testId}-indicator`}
          className={clsx(
            'absolute top-0 left-0 right-0 z-10',
            'flex items-center justify-center',
            'h-12 bg-gray-50 dark:bg-gray-800',
            'border-b border-gray-200 dark:border-gray-700'
          )}
        >
          <Spinner size="sm" aria-label="Refreshing" />
        </div>
      )}

      {/* Pull indicator - shown during pull gesture */}
      {isPulling && pullDistance > 0 && !isRefreshing && (
        <div
          className={clsx(
            'absolute top-0 left-0 right-0 z-10',
            'flex items-center justify-center',
            'bg-gray-50 dark:bg-gray-800',
            'transition-height duration-100'
          )}
          style={{ height: `${pullDistance}px` }}
        >
          {pullDistance >= PULL_THRESHOLD ? (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Release to refresh
            </span>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Pull to refresh
            </span>
          )}
        </div>
      )}

      {/* Content - offset when pulling */}
      <div
        className="relative"
        style={{
          transform: isPulling && !isRefreshing
            ? `translateY(${pullDistance}px)`
            : isRefreshing
              ? 'translateY(48px)'
              : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default MobilePullToRefresh;
