/**
 * BugsView Component Sharing Verification Tests
 *
 * Task 9.2: Bugs一覧とフィルタの共用を確認する
 * bugs-view-unification: Updated to verify BugListContainer usage
 *
 * Verification of:
 * - shared/BugListContainer usage
 * - Filter area fixed header display (via BugListContainer)
 * - Shared component integration
 *
 * Requirements: 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BugsView } from './BugsView';
import type { ApiClient, BugMetadata } from '@shared/api/types';
import { resetSharedBugStore } from '@shared/stores/bugStore';
import { resetSharedAgentStore } from '@shared/stores/agentStore';

// =============================================================================
// Constants
// =============================================================================

const BUGS_VIEW_PATH = resolve(__dirname, 'BugsView.tsx');
const BUG_LIST_ITEM_PATH = resolve(__dirname, '../../shared/components/bug/BugListItem.tsx');
const BUG_LIST_CONTAINER_PATH = resolve(__dirname, '../../shared/components/bug/BugListContainer.tsx');

// =============================================================================
// Mock BugListItem (used by BugListContainer)
// =============================================================================

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
    </li>
  ),
}));

// =============================================================================
// Mock Data
// =============================================================================

const mockBugs: BugMetadata[] = [
  {
    name: 'test-bug-1',
    path: '/project/.kiro/bugs/test-bug-1',
    phase: 'analyzed',
    updatedAt: '2026-01-24T10:00:00Z',
    createdAt: '2026-01-23T08:00:00Z',
  },
  {
    name: 'test-bug-2',
    path: '/project/.kiro/bugs/test-bug-2',
    phase: 'fixed',
    updatedAt: '2026-01-24T12:00:00Z',
    createdAt: '2026-01-22T09:00:00Z',
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
    // bugs-view-unification: Additional ApiClient methods for watching
    switchAgentWatchScope: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    startBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    stopBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onBugsChanged: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  } as unknown as ApiClient;
}

// =============================================================================
// Task 9.2: Bugs一覧とフィルタの共用を確認する
// Requirements: 8.2, 8.3, 8.4
// =============================================================================

describe('Task 9.2: Bugs一覧とフィルタの共用を確認する', () => {
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

  describe('Requirements 8.2: Bugs一覧共有確認', () => {
    it('should use shared BugListContainer from shared/components/bug/', () => {
      // bugs-view-unification: BugsView now uses BugListContainer which internally uses BugListItem
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain("from '@shared/components/bug/BugListContainer'");
    });

    it('should verify BugListItem exists in shared components', () => {
      // Verify BugListItem component exists
      const content = readFileSync(BUG_LIST_ITEM_PATH, 'utf-8');
      expect(content).toContain('export function BugListItem');
    });

    it('should verify BugListContainer exists in shared components', () => {
      // bugs-view-unification: Verify BugListContainer component exists
      const content = readFileSync(BUG_LIST_CONTAINER_PATH, 'utf-8');
      expect(content).toContain('export function BugListContainer');
    });

    it('should render bug list items using shared component', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // Verify bug items are rendered with correct test IDs from shared BugListItem
        expect(screen.getByTestId('bug-item-test-bug-1')).toBeInTheDocument();
        expect(screen.getByTestId('bug-item-test-bug-2')).toBeInTheDocument();
      });
    });
  });

  describe('Requirements 8.3: フィルタエリア固定ヘッダー表示確認', () => {
    it('should render filter area as fixed header in BugListContainer', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: testIdPrefix is 'bugs-view', so testid is 'bugs-view-search-input'
        const searchInput = screen.getByTestId('bugs-view-search-input');
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should have filter area with border-b for visual separation in BugListContainer', () => {
      // bugs-view-unification: Filter area styles are in BugListContainer
      const content = readFileSync(BUG_LIST_CONTAINER_PATH, 'utf-8');
      expect(content).toContain('border-b');
    });

    it('should render search input in header area', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: testIdPrefix is 'bugs-view', so testid is 'bugs-view-search-input'
        const searchInput = screen.getByTestId('bugs-view-search-input');
        expect(searchInput).toBeInTheDocument();
        expect(searchInput.getAttribute('placeholder')).toBe('Bugを検索...');
      });
    });
  });

  describe('Requirements 8.4: BugListContainer使用確認', () => {
    it('should use existing BugsView component in remote-ui/views', () => {
      // Verify BugsView exists and is the primary implementation
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain('export function BugsView');
    });

    it('should verify BugListContainer exists (shared component)', () => {
      // bugs-view-unification: BugListContainer now exists as shared component
      const content = readFileSync(BUG_LIST_CONTAINER_PATH, 'utf-8');
      expect(content).toContain('export function BugListContainer');
    });

    it('should have BugsView using BugListContainer', () => {
      // bugs-view-unification: BugsView uses BugListContainer
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain('BugListContainer');
      expect(content).toContain("from '@shared/components/bug/BugListContainer'");
    });

    it('should have complete BugsView implementation with all essential features', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: Both BugsView and BugListContainer have 'bugs-view' testId
        // Use getAllByTestId since there are multiple elements with this testId
        const bugsViewElements = screen.getAllByTestId('bugs-view');
        expect(bugsViewElements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTestId('bugs-view-search-input')).toBeInTheDocument();
        // The list testId is bugs-view-items (from BugListContainer with testIdPrefix)
        expect(screen.getByTestId('bugs-view-items')).toBeInTheDocument();
      });
    });
  });

  describe('Integration: Filter with Fixed Header Layout', () => {
    it('should have proper layout structure: fixed header + scrollable list', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // bugs-view-unification: Multiple elements have 'bugs-view' testId
        // Get the first one (BugsView's outer container)
        const bugsViewElements = screen.getAllByTestId('bugs-view');
        const bugsView = bugsViewElements[0];

        // Verify layout structure
        expect(bugsView.className).toContain('flex');
        expect(bugsView.className).toContain('flex-col');
        expect(bugsView.className).toContain('h-full');
      });
    });

    it('should have scrollable list area with overflow-y-auto in BugListContainer', () => {
      // bugs-view-unification: List area styles are in BugListContainer
      const content = readFileSync(BUG_LIST_CONTAINER_PATH, 'utf-8');
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('flex-1');
    });
  });
});
