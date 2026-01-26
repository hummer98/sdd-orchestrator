/**
 * MobileLayout Tests
 *
 * Tests for MobileLayout component, specifically focusing on:
 * - showTabBar prop control (Task 2.3)
 * - Tab bar visibility transitions
 *
 * mobile-layout-refine: Task 2.3
 * Requirements: 1.4, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileLayout } from './MobileLayout';
import { ApiClientProvider } from '../../shared/api/ApiClientProvider';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Mock API client for testing
 */
const createMockApiClient = () => ({
  getProfile: vi.fn().mockReturnValue(Promise.resolve({ ok: true, value: { name: 'cc-sdd' } })),
  isConnected: vi.fn().mockReturnValue(true),
  getProjectPath: vi.fn().mockReturnValue('/test/project'),
});

let mockApiClient: ReturnType<typeof createMockApiClient>;

/**
 * Test wrapper with API context
 */
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiClientProvider client={mockApiClient as any}>
    {children}
  </ApiClientProvider>
);

/**
 * Helper to render MobileLayout with test wrapper
 */
const renderMobileLayout = (props: Parameters<typeof MobileLayout>[0] = {}) => {
  return render(
    <TestWrapper>
      <MobileLayout {...props}>
        <div data-testid="test-content">Test Content</div>
      </MobileLayout>
    </TestWrapper>
  );
};

// =============================================================================
// Tests for showTabBar prop (Task 2.3)
// =============================================================================

describe('MobileLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = createMockApiClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('showTabBar prop control (Task 2.3, Req 1.4, 2.5)', () => {
    it('should show tab bar by default (showTabBar=true)', () => {
      renderMobileLayout({ showTabBar: true });

      const tabBar = screen.getByTestId('mobile-bottom-tabs');
      expect(tabBar).toBeInTheDocument();
      // Tab bar should be visible (not translated out of view)
      expect(tabBar).toHaveClass('translate-y-0');
    });

    it('should show tab bar when showTabBar is undefined (default behavior)', () => {
      renderMobileLayout({});

      const tabBar = screen.getByTestId('mobile-bottom-tabs');
      expect(tabBar).toBeInTheDocument();
      expect(tabBar).toHaveClass('translate-y-0');
    });

    it('should hide tab bar when showTabBar=false (Req 1.4, 2.5)', () => {
      renderMobileLayout({ showTabBar: false });

      const tabBar = screen.getByTestId('mobile-bottom-tabs');
      expect(tabBar).toBeInTheDocument();
      // Tab bar should be translated out of view
      expect(tabBar).toHaveClass('translate-y-full');
    });

    it('should have transition classes for animation (200-300ms, ease-in-out)', () => {
      renderMobileLayout({ showTabBar: true });

      const tabBar = screen.getByTestId('mobile-bottom-tabs');
      // Check for transition classes
      expect(tabBar).toHaveClass('transition-transform');
      expect(tabBar).toHaveClass('duration-200');
      expect(tabBar).toHaveClass('ease-in-out');
    });

    it('should toggle tab bar visibility when showTabBar changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <MobileLayout showTabBar={true}>
            <div>Content</div>
          </MobileLayout>
        </TestWrapper>
      );

      const tabBar = screen.getByTestId('mobile-bottom-tabs');
      expect(tabBar).toHaveClass('translate-y-0');

      // Change to hidden
      rerender(
        <TestWrapper>
          <MobileLayout showTabBar={false}>
            <div>Content</div>
          </MobileLayout>
        </TestWrapper>
      );

      expect(tabBar).toHaveClass('translate-y-full');

      // Change back to visible
      rerender(
        <TestWrapper>
          <MobileLayout showTabBar={true}>
            <div>Content</div>
          </MobileLayout>
        </TestWrapper>
      );

      expect(tabBar).toHaveClass('translate-y-0');
    });
  });

  describe('content area padding adjustment', () => {
    it('should have bottom padding for tab bar when showTabBar=true', () => {
      renderMobileLayout({ showTabBar: true });

      const mainContent = screen.getByRole('main');
      // safe-area-inset対応: pb-[calc(4rem+env(safe-area-inset-bottom))]
      expect(mainContent).toHaveClass('pb-[calc(4rem+env(safe-area-inset-bottom))]');
    });

    it('should remove bottom padding when showTabBar=false', () => {
      renderMobileLayout({ showTabBar: false });

      const mainContent = screen.getByRole('main');
      // safe-area-inset対応: pb-[env(safe-area-inset-bottom)]
      expect(mainContent).toHaveClass('pb-[env(safe-area-inset-bottom)]');
    });
  });

  describe('tab bar basic functionality', () => {
    it('should render three tabs (Specs, Bugs, Agents)', () => {
      renderMobileLayout({});

      expect(screen.getByTestId('remote-tab-specs')).toBeInTheDocument();
      expect(screen.getByTestId('remote-tab-bugs')).toBeInTheDocument();
      expect(screen.getByTestId('remote-tab-agents')).toBeInTheDocument();
    });

    it('should call onTabChange when tab is clicked', async () => {
      const onTabChange = vi.fn();
      const user = userEvent.setup();
      renderMobileLayout({ onTabChange });

      await user.click(screen.getByTestId('remote-tab-bugs'));
      expect(onTabChange).toHaveBeenCalledWith('bugs');
    });

    it('should highlight active tab', () => {
      renderMobileLayout({ activeTab: 'bugs' });

      const bugsTab = screen.getByTestId('remote-tab-bugs');
      expect(bugsTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
