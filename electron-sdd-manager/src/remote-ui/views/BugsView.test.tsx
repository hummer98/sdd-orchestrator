/**
 * BugsView Component Tests
 *
 * Task 13.5: Bugsタブの機能UIを実装する
 * bugs-view-unification Task 5.1: 共有コンポーネントを使用するよう更新
 * bugs-view-unification Task 8.4: useSharedBugStore使用に更新、PhaseFilter/AgentCount追加
 *
 * Requirements: 6.2, 6.3, 6.4, 7.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BugsView } from './BugsView';
import type { BugMetadata, ApiClient, AgentInfo } from '@shared/api/types';
import { resetSharedBugStore, useSharedBugStore } from '@shared/stores/bugStore';
import { resetSharedAgentStore, useSharedAgentStore } from '@shared/stores/agentStore';

// Mock BugListItem in shared components (used by BugListContainer)
vi.mock('@shared/components/bug/BugListItem', () => ({
  BugListItem: ({
    bug,
    isSelected,
    onSelect,
    runningAgentCount,
  }: {
    bug: BugMetadata;
    isSelected: boolean;
    onSelect: () => void;
    runningAgentCount?: number;
  }) => (
    <li
      data-testid={`bug-item-${bug.name}`}
      data-selected={isSelected}
      data-running-agents={runningAgentCount ?? 0}
      onClick={onSelect}
      className={isSelected ? 'bg-blue-100' : ''}
    >
      {bug.name}
      {runningAgentCount !== undefined && runningAgentCount > 0 && (
        <span data-testid={`bug-item-${bug.name}-agent-count`}>({runningAgentCount})</span>
      )}
    </li>
  ),
}));

// =============================================================================
// Mock Data
// =============================================================================

const mockBugs: BugMetadata[] = [
  {
    name: 'login-timeout-bug',
    path: '/project/.kiro/bugs/login-timeout-bug',
    phase: 'analyzed',
    updatedAt: '2026-01-10T10:00:00Z',
    createdAt: '2026-01-09T08:00:00Z',
  },
  {
    name: 'api-error-handling',
    path: '/project/.kiro/bugs/api-error-handling',
    phase: 'fixed',
    updatedAt: '2026-01-10T12:00:00Z',
    createdAt: '2026-01-08T09:00:00Z',
  },
  {
    name: 'ui-rendering-issue',
    path: '/project/.kiro/bugs/ui-rendering-issue',
    phase: 'reported',
    updatedAt: '2026-01-10T14:00:00Z',
    createdAt: '2026-01-07T10:00:00Z',
  },
];

const mockAgents: AgentInfo[] = [
  {
    id: 'agent-1',
    type: 'kiro',
    status: 'running',
    specId: 'bug:login-timeout-bug',
    startedAt: '2026-01-10T10:00:00Z',
    lastActivityAt: '2026-01-10T10:05:00Z',
  },
  {
    id: 'agent-2',
    type: 'kiro',
    status: 'running',
    specId: 'bug:login-timeout-bug',
    startedAt: '2026-01-10T10:01:00Z',
    lastActivityAt: '2026-01-10T10:06:00Z',
  },
  {
    id: 'agent-3',
    type: 'kiro',
    status: 'stopped',
    specId: 'bug:api-error-handling',
    startedAt: '2026-01-10T09:00:00Z',
    lastActivityAt: '2026-01-10T09:30:00Z',
  },
];

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: mockBugs }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeValidation: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    stopAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAutoExecutionStatus: vi.fn().mockResolvedValue({ ok: true, value: null }),
    saveFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: vi.fn().mockReturnValue(() => {}),
    onBugsUpdated: vi.fn().mockReturnValue(() => {}),
    onAgentOutput: vi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
    // bugs-view-unification Task 8.1: Additional ApiClient methods for watching
    switchAgentWatchScope: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    startBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    stopBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onBugsChanged: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  } as unknown as ApiClient;
}

// =============================================================================
// Tests
// =============================================================================

describe('BugsView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetSharedBugStore();
    resetSharedAgentStore();
  });

  afterEach(() => {
    resetSharedBugStore();
    resetSharedAgentStore();
  });

  describe('Rendering', () => {
    it('renders loading state initially', async () => {
      render(<BugsView apiClient={mockApiClient} />);
      expect(screen.getByTestId('bugs-view-loading')).toBeInTheDocument();
    });

    it('renders bug list after loading', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: testId changed to bugs-view-items
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });

      // All bugs should be rendered
      expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      expect(screen.getByText('api-error-handling')).toBeInTheDocument();
      expect(screen.getByText('ui-rendering-issue')).toBeInTheDocument();
    });

    it('renders empty state when no bugs', async () => {
      const emptyApiClient = createMockApiClient({
        getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      });

      render(<BugsView apiClient={emptyApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: testId changed to bugs-view-empty
        expect(screen.getByTestId('bugs-view-empty')).toBeInTheDocument();
      });
    });

    it('renders error state on API error', async () => {
      const errorApiClient = createMockApiClient({
        getBugs: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'API_ERROR', message: 'Failed to load bugs' },
        }),
      });

      render(<BugsView apiClient={errorApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: testId changed to bugs-view-error
        expect(screen.getByTestId('bugs-view-error')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load bugs/)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('renders search input', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: testId changed to bugs-view-search-input
        expect(screen.getByTestId('bugs-view-search-input')).toBeInTheDocument();
      });
    });

    it('filters bugs by search query', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      // bugs-view-unification: testId changed to bugs-view-search-input
      const searchInput = screen.getByTestId('bugs-view-search-input');
      fireEvent.change(searchInput, { target: { value: 'login' } });

      // Should show only matching bug
      expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      expect(screen.queryByText('api-error-handling')).not.toBeInTheDocument();
      expect(screen.queryByText('ui-rendering-issue')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      // bugs-view-unification: testId changed to bugs-view-search-input
      const searchInput = screen.getByTestId('bugs-view-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      // bugs-view-unification: testId changed to bugs-view-empty
      expect(screen.getByTestId('bugs-view-empty')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelectBug when a bug is clicked', async () => {
      const onSelectBug = vi.fn();
      render(<BugsView apiClient={mockApiClient} onSelectBug={onSelectBug} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('bug-item-login-timeout-bug'));

      expect(onSelectBug).toHaveBeenCalledWith(mockBugs[0]);
    });

    it('highlights selected bug', async () => {
      render(
        <BugsView apiClient={mockApiClient} selectedBugId="login-timeout-bug" />
      );

      await waitFor(() => {
        const selectedItem = screen.getByTestId('bug-item-login-timeout-bug');
        expect(selectedItem).toBeInTheDocument();
        // The item should have selected styling (check for blue background class on the element itself)
        expect(selectedItem.className).toContain('bg-blue');
      });
    });
  });

  // =============================================================================
  // bugs-view-unification Task 8.1: useSharedBugStore usage tests
  // Requirements: 6.2
  // =============================================================================

  describe('useSharedBugStore Integration (Task 8.1)', () => {
    it('uses useSharedBugStore for state management', async () => {
      // Pre-populate store
      useSharedBugStore.setState({
        bugs: mockBugs,
        isLoading: false,
        error: null,
      });

      render(<BugsView apiClient={mockApiClient} />);

      // Should display bugs from store immediately (not waiting for API call)
      await waitFor(() => {
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });

      expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
    });

    it('calls loadBugs through store on mount', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.getBugs).toHaveBeenCalled();
      });

      // After loading, store should have bugs
      const state = useSharedBugStore.getState();
      expect(state.bugs).toHaveLength(3);
    });

    it('calls selectBug through store when bug is selected', async () => {
      const onSelectBug = vi.fn();
      render(<BugsView apiClient={mockApiClient} onSelectBug={onSelectBug} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('bug-item-login-timeout-bug'));
      });

      // Should call switchAgentWatchScope through store's selectBug
      await waitFor(() => {
        expect(mockApiClient.switchAgentWatchScope).toHaveBeenCalledWith(
          'bug:login-timeout-bug'
        );
      });
    });
  });

  // =============================================================================
  // bugs-view-unification Task 8.2: Phase filter tests
  // Requirements: 6.3
  // =============================================================================

  describe('Phase Filter (Task 8.2)', () => {
    it('renders phase filter dropdown', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });

      // Should have phase filter (note: BugListContainer uses 'phase-filter' without prefix)
      expect(screen.getByTestId('phase-filter')).toBeInTheDocument();
    });

    it('filters bugs by phase when filter is changed', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      // Change filter to 'reported' (note: BugListContainer uses 'phase-filter' without prefix)
      const phaseFilter = screen.getByTestId('phase-filter');
      fireEvent.change(phaseFilter, { target: { value: 'reported' } });

      // Should show only reported bug
      expect(screen.getByText('ui-rendering-issue')).toBeInTheDocument();
      expect(screen.queryByText('login-timeout-bug')).not.toBeInTheDocument();
      expect(screen.queryByText('api-error-handling')).not.toBeInTheDocument();
    });

    it('shows all bugs when filter is set to "all"', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      // Change filter to 'reported' first (note: BugListContainer uses 'phase-filter' without prefix)
      const phaseFilter = screen.getByTestId('phase-filter');
      fireEvent.change(phaseFilter, { target: { value: 'reported' } });

      // Then back to 'all'
      fireEvent.change(phaseFilter, { target: { value: 'all' } });

      // Should show all bugs
      expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      expect(screen.getByText('api-error-handling')).toBeInTheDocument();
      expect(screen.getByText('ui-rendering-issue')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // bugs-view-unification Task 8.3: Agent count display tests
  // Requirements: 6.4
  // =============================================================================

  describe('Agent Count Display (Task 8.3)', () => {
    beforeEach(() => {
      // Set up agent store with mock agents
      const agentMap = new Map<string, AgentInfo[]>();
      agentMap.set('bug:login-timeout-bug', mockAgents.filter((a) => a.specId === 'bug:login-timeout-bug'));
      agentMap.set('bug:api-error-handling', mockAgents.filter((a) => a.specId === 'bug:api-error-handling'));

      useSharedAgentStore.setState({
        agents: agentMap,
      });
    });

    it('displays running agent count for bugs with running agents', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });

      // login-timeout-bug has 2 running agents
      const loginBugItem = screen.getByTestId('bug-item-login-timeout-bug');
      expect(loginBugItem.getAttribute('data-running-agents')).toBe('2');
      expect(screen.getByTestId('bug-item-login-timeout-bug-agent-count')).toHaveTextContent('(2)');
    });

    it('does not display agent count for bugs with no running agents', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });

      // api-error-handling has 1 stopped agent (not running)
      const apiBugItem = screen.getByTestId('bug-item-api-error-handling');
      expect(apiBugItem.getAttribute('data-running-agents')).toBe('0');
      expect(screen.queryByTestId('bug-item-api-error-handling-agent-count')).not.toBeInTheDocument();
    });

    it('uses getRunningAgentCount function to get agent counts', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });

      // ui-rendering-issue has no agents
      const uiBugItem = screen.getByTestId('bug-item-ui-rendering-issue');
      expect(uiBugItem.getAttribute('data-running-agents')).toBe('0');
    });
  });

  // =============================================================================
  // Event Subscriptions (Updated for useSharedBugStore)
  // =============================================================================

  describe('Event Subscriptions', () => {
    it('subscribes to bugs updates on mount', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // With useSharedBugStore, we use startWatching which only registers event listener
        // Main Process watcher is already started in SELECT_PROJECT handler
        expect(mockApiClient.onBugsChanged).toHaveBeenCalled();
      });
      // startBugsWatcher should NOT be called from Renderer side
      expect(mockApiClient.startBugsWatcher).not.toHaveBeenCalled();
    });

    it('stops watching on unmount', async () => {
      const { unmount } = render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.onBugsChanged).toHaveBeenCalled();
      });

      unmount();
      expect(mockApiClient.stopBugsWatcher).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Task 5.1: Create Button Removal Tests (remote-ui-create-buttons)
// Requirements: 5.1
// =============================================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

const viewPath = resolve(__dirname, 'BugsView.tsx');

describe('BugsView - Create Button Removal (Task 5.1)', () => {
  it('should NOT import CreateBugButtonRemote', () => {
    const content = readFileSync(viewPath, 'utf-8');
    expect(content).not.toContain('CreateBugButtonRemote');
  });

  it('should NOT import CreateBugDialogRemote', () => {
    const content = readFileSync(viewPath, 'utf-8');
    expect(content).not.toContain('CreateBugDialogRemote');
  });

  it('should NOT have create-bug-fab data-testid', () => {
    const content = readFileSync(viewPath, 'utf-8');
    expect(content).not.toContain('data-testid="create-bug-fab"');
  });
});

// =============================================================================
// bugs-view-unification Task 8.4: Source code verification tests
// Requirements: 6.2, 6.3, 6.4
// =============================================================================

describe('BugsView - Source Code Verification (Task 8.4)', () => {
  it('should import useSharedBugStore', () => {
    const content = readFileSync(viewPath, 'utf-8');
    expect(content).toContain('useSharedBugStore');
  });

  it('should NOT use local useState for bugs', () => {
    const content = readFileSync(viewPath, 'utf-8');
    // Should not have useState<BugMetadataWithPath[]>([]) or similar local state for bugs
    expect(content).not.toMatch(/useState.*bugs.*\[\]/i);
    expect(content).not.toMatch(/const \[bugs, setBugs\]/);
  });

  it('should have showPhaseFilter set to true', () => {
    const content = readFileSync(viewPath, 'utf-8');
    // Check for showPhaseFilter={true} in JSX
    expect(content).toMatch(/showPhaseFilter=\{true\}/);
  });

  it('should have getRunningAgentCount', () => {
    const content = readFileSync(viewPath, 'utf-8');
    expect(content).toContain('getRunningAgentCount');
  });

  it('should import useSharedAgentStore', () => {
    const content = readFileSync(viewPath, 'utf-8');
    expect(content).toContain('useSharedAgentStore');
  });
});
