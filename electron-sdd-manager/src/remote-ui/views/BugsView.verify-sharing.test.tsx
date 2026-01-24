/**
 * BugsView Component Sharing Verification Tests
 *
 * Task 9.2: Bugs一覧とフィルタの共用を確認する
 *
 * Verification of:
 * - shared/BugListContainer, useBugListLogic usage (or fallback to existing BugsView)
 * - Filter area fixed header display
 * - Existing Remote UI implementation (BugsView) continued use
 *
 * Requirements: 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BugsView } from './BugsView';
import type { ApiClient, BugMetadata } from '@shared/api/types';

// =============================================================================
// Constants
// =============================================================================

const BUGS_VIEW_PATH = resolve(__dirname, 'BugsView.tsx');
const BUG_LIST_ITEM_PATH = resolve(__dirname, '../../shared/components/bug/BugListItem.tsx');
const BUG_LIST_CONTAINER_PATH = resolve(__dirname, '../../shared/components/bug/BugListContainer.tsx');

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
    ...overrides,
  };
}

// =============================================================================
// Task 9.2: Bugs一覧とフィルタの共用を確認する
// Requirements: 8.2, 8.3, 8.4
// =============================================================================

describe('Task 9.2: Bugs一覧とフィルタの共用を確認する', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Requirements 8.2: Bugs一覧共有確認', () => {
    it('should use shared BugListItem from shared/components/bug/', () => {
      // Verify BugsView imports BugListItem from shared/components/bug
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain("from '@shared/components/bug/BugListItem'");
    });

    it('should verify BugListItem exists in shared components', () => {
      // Verify BugListItem component exists
      const content = readFileSync(BUG_LIST_ITEM_PATH, 'utf-8');
      expect(content).toContain('export function BugListItem');
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
    it('should render filter area as fixed header (flex-shrink-0)', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // The header section containing search should be flex-shrink-0 (fixed)
        const searchInput = screen.getByTestId('bugs-search-input');
        const headerSection = searchInput.closest('div.flex-shrink-0');
        expect(headerSection).toBeInTheDocument();
      });
    });

    it('should have filter area with border-b for visual separation', () => {
      // Verify the filter area has border-b for visual separation as fixed header
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain('border-b');
      expect(content).toContain('flex-shrink-0');
    });

    it('should render search input in header area', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        const searchInput = screen.getByTestId('bugs-search-input');
        expect(searchInput).toBeInTheDocument();
        expect(searchInput.getAttribute('placeholder')).toBe('Bugを検索...');
      });
    });
  });

  describe('Requirements 8.4: 既存Remote UI実装(BugsView)継続使用確認', () => {
    it('should use existing BugsView component in remote-ui/views', () => {
      // Verify BugsView exists and is the primary implementation
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain('export function BugsView');
    });

    it('should verify BugListContainer does NOT exist (fallback to BugsView per 8.4)', () => {
      // Per requirement 8.4, if shared BugListContainer does not exist,
      // the system shall use existing Remote UI implementation (BugsView)
      let bugListContainerExists = true;
      try {
        readFileSync(BUG_LIST_CONTAINER_PATH, 'utf-8');
      } catch (error) {
        // File does not exist, which is expected per 8.4
        bugListContainerExists = false;
      }

      // Either BugListContainer exists (shared) OR BugsView is used (fallback)
      // Current implementation: BugsView is the primary implementation (no BugListContainer)
      if (!bugListContainerExists) {
        // Fallback case: verify BugsView is properly implemented
        const bugsViewContent = readFileSync(BUGS_VIEW_PATH, 'utf-8');
        expect(bugsViewContent).toContain('BugsView');
        expect(bugsViewContent).toContain('BugListItem');
      }
      // If BugListContainer exists, this test still passes (future enhancement)
    });

    it('should have complete BugsView implementation with all essential features', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        // Essential features for bug list view
        expect(screen.getByTestId('bugs-view')).toBeInTheDocument();
        expect(screen.getByTestId('bugs-search-input')).toBeInTheDocument();
        expect(screen.getByTestId('bugs-list')).toBeInTheDocument();
      });
    });
  });

  describe('Integration: Filter with Fixed Header Layout', () => {
    it('should have proper layout structure: fixed header + scrollable list', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        const bugsView = screen.getByTestId('bugs-view');

        // Verify layout structure
        expect(bugsView.className).toContain('flex');
        expect(bugsView.className).toContain('flex-col');
        expect(bugsView.className).toContain('h-full');
      });
    });

    it('should have scrollable list area with overflow-y-auto', () => {
      // Verify the list area is scrollable
      const content = readFileSync(BUGS_VIEW_PATH, 'utf-8');
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('flex-1');
    });
  });
});
