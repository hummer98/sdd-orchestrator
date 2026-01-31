/**
 * AgentLogPage Tests
 *
 * mobile-agent-log-fullscreen: Task 3.1
 * Tests for the fullscreen agent log page component.
 *
 * Requirements:
 * - 1.1: Agentタップで全画面遷移
 * - 1.3: AgentLogPage配置
 * - 2.1: ナビバー表示
 * - 2.2: 戻るボタン表示
 * - 2.3: 戻るボタンで遷移元に戻る
 * - 2.4: 2段構成ヘッダー
 * - 3.1: ログエリアのみスクロール
 * - 3.2: ナビバー・アクション固定
 * - 3.3: AgentLogPanel再利用
 *
 * agent-log-store-unification: Task 6.1
 * Integration tests for log loading:
 * - ensureLogsLoaded called on mount
 * - Real-time logs reflected in display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentLogPage } from './AgentLogPage';
import type { AgentInfo, ApiClient } from '@shared/api/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockAgent = (overrides: Partial<AgentInfo> = {}): AgentInfo => ({
  agentId: 'agent-001',
  specId: 'test-spec',
  phase: 'requirements',
  status: 'completed',
  startedAt: '2024-01-01T00:00:00Z',
  command: 'claude -p "/kiro:spec-requirements"',
  sessionId: 'session-123',
  ...overrides,
});

const createMockApiClient = (): ApiClient => ({
  getSpecs: vi.fn(),
  getSpecDetail: vi.fn(),
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
  getAgents: vi.fn(),
  getAgentLogs: vi.fn(),
  stopAgent: vi.fn(),
  sendAgentInput: vi.fn().mockResolvedValue({ ok: true }),
  resumeAgent: vi.fn().mockResolvedValue({ ok: true }),
  onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
  onAgentLog: vi.fn().mockReturnValue(() => {}),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  onAutoExecutionUpdate: vi.fn().mockReturnValue(() => {}),
  executePhase: vi.fn(),
  approvePhase: vi.fn(),
  saveArtifact: vi.fn(),
  loadArtifact: vi.fn(),
  executeBugPhase: vi.fn(),
  approveBugPhase: vi.fn(),
  saveBugArtifact: vi.fn(),
  loadBugArtifact: vi.fn(),
  startBugAutoExecution: vi.fn(),
  stopBugAutoExecution: vi.fn(),
  onBugAutoExecutionUpdate: vi.fn().mockReturnValue(() => {}),
});

// =============================================================================
// Mocks
// =============================================================================

// Mock the shared agent store
// agent-log-store-unification: Include ensureLogsLoaded in mock
const mockEnsureLogsLoaded = vi.fn().mockResolvedValue(undefined);

vi.mock('@shared/stores/agentStore', () => ({
  useSharedAgentStore: vi.fn((selector) => {
    const state = {
      agents: new Map(),
      logs: new Map([['agent-001', []]]),
      selectedAgentId: null,
      selectAgent: vi.fn(),
      getAgentById: vi.fn(),
      ensureLogsLoaded: mockEnsureLogsLoaded,
    };
    return selector(state);
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('AgentLogPage', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    mockOnBack = vi.fn();
  });

  describe('rendering', () => {
    it('should render the page with navigation bar (Req 2.1)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          sourceEntityId="test-spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      expect(screen.getByTestId('agent-log-page')).toBeInTheDocument();
      expect(screen.getByTestId('agent-log-page-nav-bar')).toBeInTheDocument();
    });

    it('should render back button with ArrowLeft icon (Req 2.2)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      expect(screen.getByTestId('agent-log-page-back-button')).toBeInTheDocument();
    });

    it('should render AgentLogPanel for log display (Req 3.3)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      expect(screen.getByTestId('agent-log-page-log-panel')).toBeInTheDocument();
    });

    it('should render AgentLogActionArea at bottom (Req 3.2)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      expect(screen.getByTestId('agent-log-page-action-area')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should call onBack when back button is clicked (Req 2.3)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      fireEvent.click(screen.getByTestId('agent-log-page-back-button'));

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('layout structure (Req 2.4, 3.1, 3.2)', () => {
    it('should have fixed navigation bar at top', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      const navBar = screen.getByTestId('agent-log-page-nav-bar');
      expect(navBar).toHaveClass('shrink-0');
    });

    it('should have scrollable log area', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      const logArea = screen.getByTestId('agent-log-page-log-container');
      expect(logArea).toHaveClass('flex-1');
      expect(logArea).toHaveClass('overflow-hidden');
    });

    it('should have fixed action area at bottom', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      const actionArea = screen.getByTestId('agent-log-page-action-area');
      expect(actionArea).toBeInTheDocument();
    });
  });

  describe('props handling', () => {
    it('should pass agent to AgentLogPanel', () => {
      const agent = createMockAgent({ phase: 'design' });
      render(
        <AgentLogPage
          agent={agent}
          sourceType="bug"
          sourceEntityId="test-bug"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      // The phase should be visible in the log panel header
      expect(screen.getByTestId('agent-log-page-log-panel')).toBeInTheDocument();
    });

    it('should support spec source type', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          sourceEntityId="my-spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('agent-log-page-back-button')).toBeInTheDocument();
    });

    it('should support bug source type', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="bug"
          sourceEntityId="my-bug"
          apiClient={mockApiClient}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('agent-log-page-back-button')).toBeInTheDocument();
    });

    it('should support agents source type (no entityId)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogPage
          agent={agent}
          sourceType="agents"
          apiClient={mockApiClient}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('agent-log-page-back-button')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // agent-log-store-unification Task 6.1: Log Loading Integration Tests
  // Requirements: 4.3 - Agent選択時にensureLogsLoadedが呼び出されることを検証
  // =============================================================================

  describe('log loading integration (agent-log-store-unification Task 6.1)', () => {
    it('should call ensureLogsLoaded when component mounts', () => {
      // Arrange: Reset the mock to track calls
      mockEnsureLogsLoaded.mockClear();

      const agent = createMockAgent({ agentId: 'agent-001' });

      // Act: Render the component
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          sourceEntityId="test-spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      // Assert: ensureLogsLoaded should be called with apiClient and agentId
      expect(mockEnsureLogsLoaded).toHaveBeenCalledWith(mockApiClient, 'agent-001');
    });

    it('should display logs from shared store via AgentLogPanel', () => {
      // Arrange
      const agent = createMockAgent({ agentId: 'agent-001' });

      // Act: Render the component
      render(
        <AgentLogPage
          agent={agent}
          sourceType="spec"
          apiClient={mockApiClient}
          onBack={mockOnBack}
          testId="agent-log-page"
        />
      );

      // Assert: Component should render AgentLogPanel which displays logs from store
      expect(screen.getByTestId('agent-log-page-log-panel')).toBeInTheDocument();
    });
  });
});
