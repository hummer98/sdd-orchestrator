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
  AgentInfo,
  ProjectFileInfo,
} from '@shared/api/types';

// Bug types removed from shared API (github-issue-integration)
interface BugMetadataWithPath { name: string; path: string; [key: string]: unknown; }
interface BugDetail { name: string; [key: string]: unknown; }

// =============================================================================
// Types
// =============================================================================

/**
 * Mobile tab identifiers
 * specs/bugs/agents/project are the main tabs
 * project-config-editor Task 7.2: Added 'project' tab
 */
export type MobileTab = 'specs' | 'issues' | 'bugs' | 'agents' | 'project';

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
 * Detail context for Agent log page
 * mobile-agent-log-fullscreen: Task 1.1
 * Requirements: 5.4 - useNavigationStack拡張
 */
export interface AgentLogContext {
  type: 'agent-log';
  /** Agent to display logs for */
  agent: AgentInfo;
  /** Source type indicating where navigation originated from */
  sourceType: 'spec' | 'bug' | 'agents';
  /** Source entity ID (spec name or bug name, undefined for agents tab) */
  sourceEntityId?: string;
}

/**
 * Detail context for Project file detail page
 * project-config-editor Task 7.2: Added for project file editing
 * Requirements: 6.3 - Mobile詳細ページ
 */
export interface ProjectDetailContext {
  type: 'project';
  /** Project file to edit */
  file: ProjectFileInfo;
}

/**
 * Union type for detail context
 * mobile-agent-log-fullscreen: Extended to include AgentLogContext
 * project-config-editor: Extended to include ProjectDetailContext
 */
export type DetailContext = SpecDetailContext | BugDetailContext | AgentLogContext | ProjectDetailContext;

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
 * mobile-agent-log-fullscreen: Extended with pushAgentLog
 * project-config-editor: Extended with pushProjectDetail
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
  /**
   * Push agent log page onto stack
   * mobile-agent-log-fullscreen: Task 1.1
   * Requirements: 5.4
   */
  pushAgentLog: (agent: AgentInfo, sourceType: 'spec' | 'bug' | 'agents', sourceEntityId?: string) => void;
  /**
   * Push project file detail page onto stack
   * project-config-editor: Task 7.2
   * Requirements: 6.3
   */
  pushProjectDetail: (file: ProjectFileInfo) => void;
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
   * Push agent log page onto navigation stack
   * mobile-agent-log-fullscreen: Task 1.1
   * Requirements: 5.4
   * Automatically hides tab bar (follows existing pattern)
   */
  const pushAgentLog = useCallback((
    agent: AgentInfo,
    sourceType: 'spec' | 'bug' | 'agents',
    sourceEntityId?: string
  ) => {
    setDetailContext({
      type: 'agent-log',
      agent,
      sourceType,
      sourceEntityId,
    });
  }, []);

  /**
   * Push project file detail page onto navigation stack
   * project-config-editor: Task 7.2
   * Requirements: 6.3
   * Automatically hides tab bar (follows existing pattern)
   */
  const pushProjectDetail = useCallback((file: ProjectFileInfo) => {
    setDetailContext({
      type: 'project',
      file,
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
    pushAgentLog,
    pushProjectDetail,
    popPage,
    isDetailPage,
  };
}
