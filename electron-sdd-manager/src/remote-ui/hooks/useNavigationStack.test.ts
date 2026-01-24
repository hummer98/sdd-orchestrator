/**
 * useNavigationStack Tests
 *
 * Tests for mobile navigation state management hook.
 * Implements Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * mobile-layout-refine: Task 2.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationStack } from './useNavigationStack';
import type { SpecMetadataWithPath, SpecDetail, BugMetadataWithPath, BugDetail } from '@shared/api/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockSpec = (name: string): SpecMetadataWithPath => ({
  name,
  path: `/path/to/specs/${name}`,
  description: 'Test spec',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  phase: 'requirements',
  updatedAt: '2024-01-01T00:00:00Z',
});

const createMockSpecDetail = (name: string): SpecDetail => ({
  metadata: {
    name,
    path: `/path/to/specs/${name}`,
    description: 'Test spec',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  specJson: {
    name,
    description: 'Test spec',
    phase: 'requirements',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    approvals: {},
  },
});

const createMockBug = (name: string): BugMetadataWithPath => ({
  name,
  path: `/path/to/bugs/${name}`,
  description: 'Test bug',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  status: 'open',
  phase: 'created',
});

const createMockBugDetail = (name: string): BugDetail => ({
  metadata: {
    name,
    path: `/path/to/bugs/${name}`,
    description: 'Test bug',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    status: 'open',
    phase: 'created',
  },
  bugJson: {
    name,
    description: 'Test bug',
    phase: 'created',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    status: 'open',
  },
});

// =============================================================================
// Tests
// =============================================================================

describe('useNavigationStack', () => {
  describe('initial state', () => {
    it('should initialize with specs tab as default', () => {
      const { result } = renderHook(() => useNavigationStack());

      expect(result.current.state.activeTab).toBe('specs');
      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
      expect(result.current.isDetailPage).toBe(false);
    });

    it('should accept initial tab from options', () => {
      const { result } = renderHook(() => useNavigationStack({ initialTab: 'bugs' }));

      expect(result.current.state.activeTab).toBe('bugs');
    });

    it('should accept agents as initial tab', () => {
      const { result } = renderHook(() => useNavigationStack({ initialTab: 'agents' }));

      expect(result.current.state.activeTab).toBe('agents');
    });
  });

  describe('setActiveTab', () => {
    it('should change active tab to bugs', () => {
      const { result } = renderHook(() => useNavigationStack());

      act(() => {
        result.current.setActiveTab('bugs');
      });

      expect(result.current.state.activeTab).toBe('bugs');
    });

    it('should change active tab to agents', () => {
      const { result } = renderHook(() => useNavigationStack());

      act(() => {
        result.current.setActiveTab('agents');
      });

      expect(result.current.state.activeTab).toBe('agents');
    });

    it('should clear detailContext when switching tabs (Req 2.6)', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      // First, push a spec detail
      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.detailContext).not.toBeNull();

      // Then switch tabs
      act(() => {
        result.current.setActiveTab('bugs');
      });

      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
      expect(result.current.isDetailPage).toBe(false);
    });
  });

  describe('pushSpecDetail (Req 2.1)', () => {
    it('should push spec detail page onto navigation stack', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.detailContext).not.toBeNull();
      expect(result.current.state.detailContext?.type).toBe('spec');
      expect(result.current.state.detailContext?.spec).toBe(mockSpec);
      expect(result.current.state.detailContext?.specDetail).toBe(mockSpecDetail);
      expect(result.current.isDetailPage).toBe(true);
    });

    it('should hide tab bar when showing spec detail (Req 2.5)', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.showTabBar).toBe(false);
    });
  });

  describe('pushBugDetail (Req 2.2)', () => {
    it('should push bug detail page onto navigation stack', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');

      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });

      expect(result.current.state.detailContext).not.toBeNull();
      expect(result.current.state.detailContext?.type).toBe('bug');
      expect(result.current.state.detailContext?.bug).toBe(mockBug);
      expect(result.current.state.detailContext?.bugDetail).toBe(mockBugDetail);
      expect(result.current.isDetailPage).toBe(true);
    });

    it('should hide tab bar when showing bug detail (Req 2.5)', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');

      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });

      expect(result.current.state.showTabBar).toBe(false);
    });
  });

  describe('popPage (Req 2.4)', () => {
    it('should pop spec detail page and return to list view', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.isDetailPage).toBe(true);

      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.isDetailPage).toBe(false);
    });

    it('should pop bug detail page and return to list view', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');

      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });

      expect(result.current.isDetailPage).toBe(true);

      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.isDetailPage).toBe(false);
    });

    it('should show tab bar after pop (Req 2.5)', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.showTabBar).toBe(false);

      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.showTabBar).toBe(true);
    });

    it('should preserve active tab after pop', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');

      // Switch to bugs tab first
      act(() => {
        result.current.setActiveTab('bugs');
      });

      // Push bug detail
      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });

      // Pop page
      act(() => {
        result.current.popPage();
      });

      // Should still be on bugs tab
      expect(result.current.state.activeTab).toBe('bugs');
    });

    it('should be no-op when detailContext is null', () => {
      const { result } = renderHook(() => useNavigationStack());

      // Should not throw when popping without a detail page
      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
    });
  });

  describe('isDetailPage derived state', () => {
    it('should be false when detailContext is null', () => {
      const { result } = renderHook(() => useNavigationStack());

      expect(result.current.isDetailPage).toBe(false);
    });

    it('should be true when spec detail is shown', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.isDetailPage).toBe(true);
    });

    it('should be true when bug detail is shown', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');

      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });

      expect(result.current.isDetailPage).toBe(true);
    });
  });

  describe('showTabBar auto-control (Req 2.5)', () => {
    it('should automatically hide tab bar when pushing detail', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      expect(result.current.state.showTabBar).toBe(true);

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.showTabBar).toBe(false);
    });

    it('should automatically show tab bar when popping detail', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');

      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.showTabBar).toBe(false);

      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.showTabBar).toBe(true);
    });
  });

  describe('state management via React state (Req 2.6)', () => {
    it('should use React state not URL routing', () => {
      const { result } = renderHook(() => useNavigationStack());

      // Verify the hook returns state-based navigation
      // (not using window.location or history API)
      expect(typeof result.current.state).toBe('object');
      expect(typeof result.current.setActiveTab).toBe('function');
      expect(typeof result.current.pushSpecDetail).toBe('function');
      expect(typeof result.current.pushBugDetail).toBe('function');
      expect(typeof result.current.popPage).toBe('function');
    });

    it('should maintain state consistency across operations', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-feature');
      const mockSpecDetail = createMockSpecDetail('test-feature');
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');

      // Start at specs
      expect(result.current.state.activeTab).toBe('specs');

      // Push spec detail
      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });
      expect(result.current.state.activeTab).toBe('specs');
      expect(result.current.state.detailContext?.type).toBe('spec');

      // Pop and switch to bugs
      act(() => {
        result.current.popPage();
        result.current.setActiveTab('bugs');
      });
      expect(result.current.state.activeTab).toBe('bugs');
      expect(result.current.state.detailContext).toBeNull();

      // Push bug detail
      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });
      expect(result.current.state.activeTab).toBe('bugs');
      expect(result.current.state.detailContext?.type).toBe('bug');

      // Switch to agents (should clear detail context)
      act(() => {
        result.current.setActiveTab('agents');
      });
      expect(result.current.state.activeTab).toBe('agents');
      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
    });
  });
});
