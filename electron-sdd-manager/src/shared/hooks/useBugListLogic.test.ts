/**
 * useBugListLogic Hook Tests
 *
 * bugs-view-unification Task 7.1: useBugListLogicのユニットテストを作成する
 *
 * Tests for:
 * - updatedAt降順ソート (Requirements: 2.1)
 * - Phase別フィルター (Requirements: 2.3, 2.4)
 * - テキスト検索フィルター (Requirements: 2.2)
 * - フィルター組み合わせ
 * - フィルター状態setter (Requirements: 2.5)
 * - filteredBugs返却 (Requirements: 2.6)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBugListLogic } from './useBugListLogic';
import type { BugMetadata } from '@shared/api/types';

// =============================================================================
// Test Data
// =============================================================================

function createMockBugs(): BugMetadata[] {
  return [
    {
      name: 'bug-alpha',
      phase: 'reported',
      updatedAt: '2026-01-22T10:00:00Z',
      reportedAt: '2026-01-22T10:00:00Z',
    },
    {
      name: 'bug-beta',
      phase: 'analyzed',
      updatedAt: '2026-01-23T10:00:00Z',
      reportedAt: '2026-01-22T10:00:00Z',
    },
    {
      name: 'bug-gamma',
      phase: 'fixed',
      updatedAt: '2026-01-21T10:00:00Z',
      reportedAt: '2026-01-21T10:00:00Z',
    },
    {
      name: 'bug-delta',
      phase: 'verified',
      updatedAt: '2026-01-24T10:00:00Z',
      reportedAt: '2026-01-20T10:00:00Z',
    },
    {
      name: 'bug-epsilon',
      phase: 'reported',
      updatedAt: '2026-01-20T10:00:00Z',
      reportedAt: '2026-01-20T10:00:00Z',
    },
  ];
}

// =============================================================================
// Tests - Sorting (Requirements: 2.1)
// =============================================================================

describe('useBugListLogic - Sorting', () => {
  it('should sort bugs by updatedAt descending by default', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    const names = result.current.filteredBugs.map((b) => b.name);
    // Expected order: delta (24th), beta (23rd), alpha (22nd), gamma (21st), epsilon (20th)
    expect(names).toEqual(['bug-delta', 'bug-beta', 'bug-alpha', 'bug-gamma', 'bug-epsilon']);
  });

  it('should maintain sort order when bugs array changes', () => {
    const bugs = createMockBugs();

    const { result, rerender } = renderHook(
      ({ bugs }) => useBugListLogic({ bugs }),
      { initialProps: { bugs } }
    );

    // Add a new bug with latest date
    const newBugs = [
      ...bugs,
      {
        name: 'bug-zeta',
        phase: 'reported' as const,
        updatedAt: '2026-01-25T10:00:00Z',
        reportedAt: '2026-01-25T10:00:00Z',
      },
    ];

    rerender({ bugs: newBugs });

    expect(result.current.filteredBugs[0].name).toBe('bug-zeta');
  });
});

// =============================================================================
// Tests - Phase Filter (Requirements: 2.3, 2.4)
// =============================================================================

describe('useBugListLogic - Phase Filter', () => {
  it('should return all bugs when phaseFilter is "all"', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, initialPhaseFilter: 'all' })
    );

    expect(result.current.filteredBugs).toHaveLength(5);
    expect(result.current.phaseFilter).toBe('all');
  });

  it('should filter bugs by "reported" phase', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    act(() => {
      result.current.setPhaseFilter('reported');
    });

    expect(result.current.filteredBugs).toHaveLength(2);
    expect(result.current.filteredBugs.every((b) => b.phase === 'reported')).toBe(true);
  });

  it('should filter bugs by "analyzed" phase', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    act(() => {
      result.current.setPhaseFilter('analyzed');
    });

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('bug-beta');
  });

  it('should filter bugs by "fixed" phase', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    act(() => {
      result.current.setPhaseFilter('fixed');
    });

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('bug-gamma');
  });

  it('should filter bugs by "verified" phase', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    act(() => {
      result.current.setPhaseFilter('verified');
    });

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('bug-delta');
  });

  it('should return empty array for phase with no matches', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    act(() => {
      result.current.setPhaseFilter('deployed');
    });

    expect(result.current.filteredBugs).toHaveLength(0);
  });
});

// =============================================================================
// Tests - Text Search (Requirements: 2.2)
// =============================================================================

describe('useBugListLogic - Text Search', () => {
  it('should not filter when enableTextSearch is false', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: false })
    );

    act(() => {
      result.current.setSearchQuery('alpha');
    });

    // Search query is ignored when enableTextSearch is false
    expect(result.current.filteredBugs).toHaveLength(5);
  });

  it('should filter bugs by name containing query', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setSearchQuery('alpha');
    });

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('bug-alpha');
  });

  it('should be case-insensitive', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setSearchQuery('BETA');
    });

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('bug-beta');
  });

  it('should return all bugs when searchQuery is empty', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setSearchQuery('');
    });

    expect(result.current.filteredBugs).toHaveLength(5);
  });

  it('should return all bugs when searchQuery is whitespace only', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setSearchQuery('   ');
    });

    expect(result.current.filteredBugs).toHaveLength(5);
  });

  it('should match partial names', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setSearchQuery('bug-');
    });

    expect(result.current.filteredBugs).toHaveLength(5);
  });
});

// =============================================================================
// Tests - Combined Filters
// =============================================================================

describe('useBugListLogic - Combined Filters', () => {
  it('should apply both phase filter and text search', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setPhaseFilter('reported');
      result.current.setSearchQuery('alpha');
    });

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('bug-alpha');
    expect(result.current.filteredBugs[0].phase).toBe('reported');
  });

  it('should return empty when filters exclude all bugs', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    act(() => {
      result.current.setPhaseFilter('analyzed');
      result.current.setSearchQuery('alpha'); // alpha is 'reported', not 'analyzed'
    });

    expect(result.current.filteredBugs).toHaveLength(0);
  });

  it('should sort filtered results by updatedAt descending', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    act(() => {
      result.current.setPhaseFilter('reported');
    });

    // alpha (22nd) and epsilon (20th) are 'reported'
    expect(result.current.filteredBugs).toHaveLength(2);
    expect(result.current.filteredBugs[0].name).toBe('bug-alpha'); // newer
    expect(result.current.filteredBugs[1].name).toBe('bug-epsilon'); // older
  });
});

// =============================================================================
// Tests - State Setters (Requirements: 2.5)
// =============================================================================

describe('useBugListLogic - State Setters', () => {
  it('should expose setPhaseFilter function', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    expect(typeof result.current.setPhaseFilter).toBe('function');

    act(() => {
      result.current.setPhaseFilter('fixed');
    });

    expect(result.current.phaseFilter).toBe('fixed');
  });

  it('should expose setSearchQuery function', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    expect(typeof result.current.setSearchQuery).toBe('function');

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.searchQuery).toBe('test');
  });

  it('should use initialPhaseFilter from options', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, initialPhaseFilter: 'analyzed' })
    );

    expect(result.current.phaseFilter).toBe('analyzed');
    expect(result.current.filteredBugs).toHaveLength(1);
  });
});

// =============================================================================
// Tests - Return Value (Requirements: 2.6)
// =============================================================================

describe('useBugListLogic - Return Value', () => {
  it('should return filteredBugs array', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    expect(Array.isArray(result.current.filteredBugs)).toBe(true);
    expect(result.current.filteredBugs).toHaveLength(5);
  });

  it('should return current phaseFilter', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    expect(result.current.phaseFilter).toBe('all');
  });

  it('should return current searchQuery', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs, enableTextSearch: true })
    );

    expect(result.current.searchQuery).toBe('');
  });

  it('should return all setter functions', () => {
    const bugs = createMockBugs();

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    expect(typeof result.current.setPhaseFilter).toBe('function');
    expect(typeof result.current.setSearchQuery).toBe('function');
  });
});

// =============================================================================
// Tests - Edge Cases
// =============================================================================

describe('useBugListLogic - Edge Cases', () => {
  it('should handle empty bugs array', () => {
    const { result } = renderHook(() =>
      useBugListLogic({ bugs: [] })
    );

    expect(result.current.filteredBugs).toHaveLength(0);
  });

  it('should handle single bug', () => {
    const bugs: BugMetadata[] = [
      {
        name: 'single-bug',
        phase: 'reported',
        updatedAt: '2026-01-22T10:00:00Z',
        reportedAt: '2026-01-22T10:00:00Z',
      },
    ];

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    expect(result.current.filteredBugs).toHaveLength(1);
    expect(result.current.filteredBugs[0].name).toBe('single-bug');
  });

  it('should handle bugs with same updatedAt', () => {
    const bugs: BugMetadata[] = [
      { name: 'bug-a', phase: 'reported', updatedAt: '2026-01-22T10:00:00Z', reportedAt: '2026-01-22T10:00:00Z' },
      { name: 'bug-b', phase: 'analyzed', updatedAt: '2026-01-22T10:00:00Z', reportedAt: '2026-01-22T10:00:00Z' },
    ];

    const { result } = renderHook(() =>
      useBugListLogic({ bugs })
    );

    // Should handle gracefully without errors
    expect(result.current.filteredBugs).toHaveLength(2);
  });
});
