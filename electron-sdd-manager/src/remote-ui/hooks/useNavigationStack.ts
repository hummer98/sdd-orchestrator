/**
 * useNavigationStack Hook
 *
 * Mobile navigation state management hook for Remote UI.
 * Manages list/detail page transitions and bottom tab bar visibility.
 *
 * mobile-layout-refine: Task 2.1
 *
 * Requirements:
 * - 2.1: Spec tap pushes SpecDetailPage
 * - 2.2: Bug tap pushes BugDetailPage
 * - 2.3: DetailPage shows back button (handled by consuming component)
 * - 2.4: Back button pops page
 * - 2.5: DetailPage hides bottom tab bar
 * - 2.6: Navigation state via React state (not URL routing)
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  SpecMetadataWithPath,
  SpecDetail,
  BugMetadataWithPath,
  BugDetail,
} from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Mobile tab identifiers
 * specs/bugs/agents are the main tabs
 */
export type MobileTab = 'specs' | 'bugs' | 'agents';

/**
 * Detail context for Spec detail page
 */
export interface SpecDetailContext {
  type: 'spec';
  spec: SpecMetadataWithPath;
  specDetail: SpecDetail;
}

/**
 * Detail context for Bug detail page
 */
export interface BugDetailContext {
  type: 'bug';
  bug: BugMetadataWithPath;
  bugDetail: BugDetail;
}

/**
 * Union type for detail context
 */
export type DetailContext = SpecDetailContext | BugDetailContext;

/**
 * Navigation state interface
 * Matches design.md NavigationState specification
 */
export interface NavigationState {
  /** Current active tab (specs/bugs/agents) */
  activeTab: MobileTab;
  /** DetailPage context (null = list view) */
  detailContext: DetailContext | null;
  /** Bottom tab bar visibility flag */
  showTabBar: boolean;
}

/**
 * Hook options
 */
export interface UseNavigationStackOptions {
  /** Initial tab to display */
  initialTab?: MobileTab;
}

/**
 * Hook return type
 * Matches design.md UseNavigationStackReturn specification
 */
export interface UseNavigationStackReturn {
  /** Current navigation state */
  state: NavigationState;
  /** Set active tab */
  setActiveTab: (tab: MobileTab) => void;
  /** Push spec detail page onto stack */
  pushSpecDetail: (spec: SpecMetadataWithPath, detail: SpecDetail) => void;
  /** Push bug detail page onto stack */
  pushBugDetail: (bug: BugMetadataWithPath, detail: BugDetail) => void;
  /** Pop current page from stack */
  popPage: () => void;
  /** Derived: is currently showing a detail page */
  isDetailPage: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useNavigationStack - Mobile navigation state management
 *
 * Implements state-based navigation (not URL routing) per DD-001 design decision.
 * Automatically controls showTabBar flag based on detail page visibility.
 *
 * @param options - Hook options
 * @returns Navigation state and handlers
 */
export function useNavigationStack(
  options: UseNavigationStackOptions = {}
): UseNavigationStackReturn {
  const { initialTab = 'specs' } = options;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTabState] = useState<MobileTab>(initialTab);
  const [detailContext, setDetailContext] = useState<DetailContext | null>(null);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  // showTabBar is derived from detailContext (Req 2.5)
  const showTabBar = detailContext === null;
  const isDetailPage = detailContext !== null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Set active tab
   * Clears detailContext when switching tabs (Req 2.6 - state consistency)
   */
  const setActiveTab = useCallback((tab: MobileTab) => {
    setActiveTabState(tab);
    // Clear detail context when switching tabs to maintain consistency
    setDetailContext(null);
  }, []);

  /**
   * Push spec detail page onto navigation stack (Req 2.1)
   * Automatically hides tab bar (Req 2.5)
   */
  const pushSpecDetail = useCallback((spec: SpecMetadataWithPath, specDetail: SpecDetail) => {
    setDetailContext({
      type: 'spec',
      spec,
      specDetail,
    });
  }, []);

  /**
   * Push bug detail page onto navigation stack (Req 2.2)
   * Automatically hides tab bar (Req 2.5)
   */
  const pushBugDetail = useCallback((bug: BugMetadataWithPath, bugDetail: BugDetail) => {
    setDetailContext({
      type: 'bug',
      bug,
      bugDetail,
    });
  }, []);

  /**
   * Pop current page from navigation stack (Req 2.4)
   * Automatically shows tab bar (Req 2.5)
   * Preserves active tab
   */
  const popPage = useCallback(() => {
    // Only pop if there's something to pop (validation per design.md)
    setDetailContext(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Build State Object
  // ---------------------------------------------------------------------------

  const state: NavigationState = useMemo(() => ({
    activeTab,
    detailContext,
    showTabBar,
  }), [activeTab, detailContext, showTabBar]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    state,
    setActiveTab,
    pushSpecDetail,
    pushBugDetail,
    popPage,
    isDetailPage,
  };
}
