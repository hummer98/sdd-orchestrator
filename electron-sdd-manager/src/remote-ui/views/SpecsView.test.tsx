/**
 * SpecsView Component Tests
 *
 * Task 13.1: Specsタブの機能UIを実装する
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpecsView } from './SpecsView';
import type { SpecMetadata } from '@shared/api/types';
import type { ApiClient } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockSpecs: SpecMetadata[] = [
  {
    name: 'user-authentication',
    path: '/project/.kiro/specs/user-authentication',
    phase: 'design-generated',
    updatedAt: '2026-01-10T10:00:00Z',
    createdAt: '2026-01-09T08:00:00Z',
  },
  {
    name: 'data-export',
    path: '/project/.kiro/specs/data-export',
    phase: 'tasks-generated',
    updatedAt: '2026-01-10T12:00:00Z',
    createdAt: '2026-01-08T09:00:00Z',
  },
  {
    name: 'remote-ui-react-migration',
    path: '/project/.kiro/specs/remote-ui-react-migration',
    phase: 'implementation-complete',
    updatedAt: '2026-01-10T14:00:00Z',
    createdAt: '2026-01-07T10:00:00Z',
  },
];

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: mockSpecs }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
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

describe('SpecsView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<SpecsView apiClient={mockApiClient} />);
      expect(screen.getByTestId('specs-view-loading')).toBeInTheDocument();
    });

    it('renders spec list after loading', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-list')).toBeInTheDocument();
      });

      // All specs should be rendered
      expect(screen.getByText('user-authentication')).toBeInTheDocument();
      expect(screen.getByText('data-export')).toBeInTheDocument();
      expect(screen.getByText('remote-ui-react-migration')).toBeInTheDocument();
    });

    it('renders empty state when no specs', async () => {
      const emptyApiClient = createMockApiClient({
        getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      });

      render(<SpecsView apiClient={emptyApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-empty-state')).toBeInTheDocument();
      });
    });

    it('renders error state on API error', async () => {
      const errorApiClient = createMockApiClient({
        getSpecs: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'API_ERROR', message: 'Failed to load specs' },
        }),
      });

      render(<SpecsView apiClient={errorApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-error-state')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load specs/)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('renders search input', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-search-input')).toBeInTheDocument();
      });
    });

    it('filters specs by search query', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('user-authentication')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('specs-search-input');
      fireEvent.change(searchInput, { target: { value: 'user' } });

      // Should show only matching spec
      expect(screen.getByText('user-authentication')).toBeInTheDocument();
      expect(screen.queryByText('data-export')).not.toBeInTheDocument();
      expect(screen.queryByText('remote-ui-react-migration')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByText('user-authentication')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('specs-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('specs-no-results')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelectSpec when a spec is clicked', async () => {
      const onSelectSpec = vi.fn();
      render(<SpecsView apiClient={mockApiClient} onSelectSpec={onSelectSpec} />);

      await waitFor(() => {
        expect(screen.getByText('user-authentication')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('user-authentication'));

      expect(onSelectSpec).toHaveBeenCalledWith(mockSpecs[0]);
    });

    it('highlights selected spec', async () => {
      render(
        <SpecsView
          apiClient={mockApiClient}
          selectedSpecId="user-authentication"
        />
      );

      await waitFor(() => {
        const selectedItem = screen.getByTestId('spec-item-user-authentication');
        expect(selectedItem).toBeInTheDocument();
        // The item should have selected styling (check for blue background class)
        expect(selectedItem.querySelector('[class*="bg-blue"]')).toBeInTheDocument();
      });
    });
  });

  describe('Event Subscriptions', () => {
    it('subscribes to specs updates on mount', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(mockApiClient.onSpecsUpdated).toHaveBeenCalled();
      });
    });

    it('unsubscribes from specs updates on unmount', async () => {
      const unsubscribe = vi.fn();
      const apiClient = createMockApiClient({
        onSpecsUpdated: vi.fn().mockReturnValue(unsubscribe),
      });

      const { unmount } = render(<SpecsView apiClient={apiClient} />);

      await waitFor(() => {
        expect(apiClient.onSpecsUpdated).toHaveBeenCalled();
      });

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('updates spec list when onSpecsUpdated is called', async () => {
      let callback: ((specs: SpecMetadata[]) => void) | null = null;
      const apiClient = createMockApiClient({
        onSpecsUpdated: vi.fn().mockImplementation((cb) => {
          callback = cb;
          return () => {};
        }),
      });

      render(<SpecsView apiClient={apiClient} />);

      await waitFor(() => {
        expect(screen.getByText('user-authentication')).toBeInTheDocument();
      });

      // Simulate receiving updated specs
      const updatedSpecs: SpecMetadata[] = [
        {
          name: 'new-spec',
          path: '/project/.kiro/specs/new-spec',
          phase: 'initialized',
          updatedAt: '2026-01-10T15:00:00Z',
          createdAt: '2026-01-10T15:00:00Z',
        },
      ];

      if (callback) {
        callback(updatedSpecs);
      }

      await waitFor(() => {
        expect(screen.getByText('new-spec')).toBeInTheDocument();
        expect(screen.queryByText('user-authentication')).not.toBeInTheDocument();
      });
    });
  });
});
