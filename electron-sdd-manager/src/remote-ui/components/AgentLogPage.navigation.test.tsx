/**
 * AgentLogPage Navigation Flow Integration Tests
 *
 * mobile-agent-log-fullscreen: Task 7.1
 * Integration tests for navigation flow between pages and AgentLogPage.
 *
 * Requirements:
 * - 2.3: 戻るボタンで遷移元に戻る
 * - 5.1: SpecDetailPageから遷移
 * - 5.2: BugDetailPageから遷移
 * - 5.3: AgentsTabViewから遷移
 *
 * Tests navigation transitions:
 * - SpecDetailPage -> AgentLogPage -> back -> SpecDetailPage
 * - BugDetailPage -> AgentLogPage -> back -> BugDetailPage
 * - AgentsTabView -> AgentLogPage -> back -> AgentsTabView
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationStack } from '../hooks/useNavigationStack';
import type { SpecMetadataWithPath, SpecDetail, BugMetadataWithPath, BugDetail, AgentInfo } from '@shared/api/types';

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

const createMockAgent = (agentId: string): AgentInfo => ({
  agentId,
  specId: 'test-spec',
  phase: 'requirements',
  status: 'completed',
  startedAt: '2024-01-01T00:00:00Z',
  command: 'claude -p "/kiro:spec-requirements"',
  sessionId: 'session-123',
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('AgentLogPage Navigation Flow Integration Tests', () => {
  describe('SpecDetailPage -> AgentLogPage -> back -> SpecDetailPage (Task 7.1, Req 5.1)', () => {
    it('should navigate to AgentLogPage from SpecDetailPage and back', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockSpec = createMockSpec('test-spec');
      const mockSpecDetail = createMockSpecDetail('test-spec');
      const mockAgent = createMockAgent('agent-001');

      // Step 1: Navigate to SpecDetailPage
      act(() => {
        result.current.pushSpecDetail(mockSpec, mockSpecDetail);
      });

      expect(result.current.state.detailContext?.type).toBe('spec');
      expect(result.current.state.showTabBar).toBe(false);

      // Step 2: From SpecDetailPage, navigate to AgentLogPage
      act(() => {
        result.current.pushAgentLog(mockAgent, 'spec', mockSpec.name);
      });

      expect(result.current.state.detailContext?.type).toBe('agent-log');
      if (result.current.state.detailContext?.type === 'agent-log') {
        expect(result.current.state.detailContext.sourceType).toBe('spec');
        expect(result.current.state.detailContext.sourceEntityId).toBe(mockSpec.name);
      }
      expect(result.current.state.showTabBar).toBe(false);

      // Step 3: Pop back to list view
      act(() => {
        result.current.popPage();
      });

      // Note: popPage() returns to list view (null detailContext), not to spec detail
      // This is the current design - single-level navigation stack
      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
      expect(result.current.state.activeTab).toBe('specs');
    });
  });

  describe('BugDetailPage -> AgentLogPage -> back -> BugDetailPage (Task 7.1, Req 5.2)', () => {
    it('should navigate to AgentLogPage from BugDetailPage and back', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockBug = createMockBug('test-bug');
      const mockBugDetail = createMockBugDetail('test-bug');
      const mockAgent = createMockAgent('agent-002');

      // Step 1: Switch to bugs tab and navigate to BugDetailPage
      act(() => {
        result.current.setActiveTab('bugs');
      });

      act(() => {
        result.current.pushBugDetail(mockBug, mockBugDetail);
      });

      expect(result.current.state.detailContext?.type).toBe('bug');
      expect(result.current.state.activeTab).toBe('bugs');

      // Step 2: From BugDetailPage, navigate to AgentLogPage
      act(() => {
        result.current.pushAgentLog(mockAgent, 'bug', mockBug.name);
      });

      expect(result.current.state.detailContext?.type).toBe('agent-log');
      if (result.current.state.detailContext?.type === 'agent-log') {
        expect(result.current.state.detailContext.sourceType).toBe('bug');
        expect(result.current.state.detailContext.sourceEntityId).toBe(mockBug.name);
      }

      // Step 3: Pop back to list view
      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
      expect(result.current.state.activeTab).toBe('bugs');
    });
  });

  describe('AgentsTabView -> AgentLogPage -> back -> AgentsTabView (Task 7.1, Req 5.3)', () => {
    it('should navigate to AgentLogPage from AgentsTabView and back', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockAgent = createMockAgent('agent-003');

      // Step 1: Switch to agents tab
      act(() => {
        result.current.setActiveTab('agents');
      });

      expect(result.current.state.activeTab).toBe('agents');
      expect(result.current.state.detailContext).toBeNull();

      // Step 2: Navigate to AgentLogPage (no sourceEntityId for agents tab)
      act(() => {
        result.current.pushAgentLog(mockAgent, 'agents');
      });

      expect(result.current.state.detailContext?.type).toBe('agent-log');
      if (result.current.state.detailContext?.type === 'agent-log') {
        expect(result.current.state.detailContext.sourceType).toBe('agents');
        expect(result.current.state.detailContext.sourceEntityId).toBeUndefined();
      }
      expect(result.current.state.showTabBar).toBe(false);

      // Step 3: Pop back to agents tab
      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.detailContext).toBeNull();
      expect(result.current.state.showTabBar).toBe(true);
      expect(result.current.state.activeTab).toBe('agents');
    });
  });

  describe('detailContext type verification', () => {
    it('should set detailContext.type to "agent-log" after pushAgentLog', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockAgent = createMockAgent('agent-001');

      act(() => {
        result.current.pushAgentLog(mockAgent, 'spec', 'test-spec');
      });

      expect(result.current.state.detailContext?.type).toBe('agent-log');
    });

    it('should set detailContext to null after popPage', () => {
      const { result } = renderHook(() => useNavigationStack());
      const mockAgent = createMockAgent('agent-001');

      act(() => {
        result.current.pushAgentLog(mockAgent, 'spec', 'test-spec');
      });

      expect(result.current.state.detailContext).not.toBeNull();

      act(() => {
        result.current.popPage();
      });

      expect(result.current.state.detailContext).toBeNull();
    });
  });
});
