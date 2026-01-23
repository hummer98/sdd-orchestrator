/**
 * BugsView Component Tests
 *
 * Task 13.5: Bugsタブの機能UIを実装する
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BugsView } from './BugsView';
import type { BugMetadata, ApiClient } from '@shared/api/types';

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
// Tests
// =============================================================================

describe('BugsView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<BugsView apiClient={mockApiClient} />);
      expect(screen.getByTestId('bugs-view-loading')).toBeInTheDocument();
    });

    it('renders bug list after loading', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bugs-list')).toBeInTheDocument();
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
        expect(screen.getByTestId('bugs-empty-state')).toBeInTheDocument();
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
        expect(screen.getByTestId('bugs-error-state')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load bugs/)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('renders search input', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('bugs-search-input')).toBeInTheDocument();
      });
    });

    it('filters bugs by search query', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('login-timeout-bug')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('bugs-search-input');
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

      const searchInput = screen.getByTestId('bugs-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('bugs-no-results')).toBeInTheDocument();
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
        <BugsView
          apiClient={mockApiClient}
          selectedBugId="login-timeout-bug"
        />
      );

      await waitFor(() => {
        const selectedItem = screen.getByTestId('bug-item-login-timeout-bug');
        expect(selectedItem).toBeInTheDocument();
        // The item should have selected styling (check for blue background class on the element itself)
        expect(selectedItem.className).toContain('bg-blue');
      });
    });
  });

  describe('Event Subscriptions', () => {
    it('subscribes to bugs updates on mount', async () => {
      render(<BugsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.onBugsUpdated).toHaveBeenCalled();
      });
    });

    it('unsubscribes from bugs updates on unmount', async () => {
      const unsubscribe = vi.fn();
      const apiClient = createMockApiClient({
        onBugsUpdated: vi.fn().mockReturnValue(unsubscribe),
      });

      const { unmount } = render(<BugsView apiClient={apiClient} />);

      await waitFor(() => {
        expect(apiClient.onBugsUpdated).toHaveBeenCalled();
      });

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
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
