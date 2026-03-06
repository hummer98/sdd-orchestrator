/**
 * DocsTabs Integration Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * github-issue-integration: Bugs tab replaced with Issues
 */

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocsTabs, type DocsTab } from './DocsTabs';
import { useProjectStore } from '../stores/projectStore';
import { useSpecStore } from '../stores/specStore';

// zustand-selector-optimization: Helper to mock store with selector support
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockStoreWithSelector(store: ReturnType<typeof vi.fn>, state: Record<string, any>) {
  store.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selector?: (s: any) => any) => selector ? selector(state) : state
  );
}

// Helper component to wrap DocsTabs with controlled state
function DocsTabsWrapper({ initialTab = 'specs' as DocsTab }: { initialTab?: DocsTab }) {
  const [activeTab, setActiveTab] = useState<DocsTab>(initialTab);
  return <DocsTabs activeTab={activeTab} onTabChange={setActiveTab} />;
}

// Mock stores
vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

const mockClearSelectedSpec = vi.fn();

vi.mock('../stores/specStore', () => ({
  useSpecStore: vi.fn(),
}));

// Mock child list components
vi.mock('./SpecList', () => ({
  SpecList: () => <div data-testid="spec-list">SpecList</div>,
}));

// Mock dialog components to add data-testid
vi.mock('./CreateSpecDialog', () => ({
  CreateSpecDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="create-spec-dialog">
        <button data-testid="close-button" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// zustand-selector-optimization: Support selector-based calls
vi.mock('../stores/agentStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAgentStore: vi.fn((selector?: (s: any) => any) => {
    const state = { selectAgent: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

// zustand-selector-optimization: Support selector-based calls
vi.mock('../stores/notificationStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useNotificationStore: vi.fn((selector?: (s: any) => any) => {
    const state = { addNotification: vi.fn() };
    return selector ? selector(state) : state;
  }),
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('DocsTabs Integration', () => {
  const mockSpecs = [
    { id: 'spec-1', name: 'Feature A', phase: 'design', description: 'Test spec 1' },
    { id: 'spec-2', name: 'Feature B', phase: 'implementation', description: 'Test spec 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default project mock
    mockStoreWithSelector(useProjectStore as unknown as ReturnType<typeof vi.fn>, {
      currentProject: '/Users/test/project',
    });

    // Default spec store mock
    mockStoreWithSelector(useSpecStore as unknown as ReturnType<typeof vi.fn>, {
      specs: mockSpecs,
      selectedSpec: null,
      isLoading: false,
      error: null,
      selectSpec: vi.fn(),
      getSortedFilteredSpecs: () => mockSpecs,
      clearSelectedSpec: mockClearSelectedSpec,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Tab switching (github-issue-integration: Issues replaces Bugs)
  // ============================================================
  describe('tab switching', () => {
    it('should display Specs and Issues tabs', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tab', { name: /specs/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /issues/i })).toBeInTheDocument();
    });

    it('should show Specs tab content by default', () => {
      render(<DocsTabsWrapper />);

      const specsTab = screen.getByRole('tab', { name: /specs/i });
      expect(specsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Issues tab when clicked', () => {
      render(<DocsTabsWrapper />);

      const issuesTab = screen.getByRole('tab', { name: /issues/i });
      fireEvent.click(issuesTab);

      expect(issuesTab).toHaveAttribute('aria-selected', 'true');

      const specsTab = screen.getByRole('tab', { name: /specs/i });
      expect(specsTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should switch back to Specs tab when clicked', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByRole('tab', { name: /issues/i }));
      fireEvent.click(screen.getByRole('tab', { name: /specs/i }));

      const specsTab = screen.getByRole('tab', { name: /specs/i });
      expect(specsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ============================================================
  // Tab state persistence
  // ============================================================
  describe('tab state persistence', () => {
    it('should maintain tab state between re-renders', () => {
      const { rerender } = render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByRole('tab', { name: /issues/i }));
      expect(screen.getByRole('tab', { name: /issues/i })).toHaveAttribute('aria-selected', 'true');

      rerender(<DocsTabsWrapper />);

      expect(screen.getByRole('tab', { name: /issues/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ============================================================
  // Create dialog integration
  // ============================================================
  describe('create dialog integration', () => {
    it('should show create button when project is selected', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('create-button')).toBeInTheDocument();
    });

    it('should not show create button when no project is selected', () => {
      mockStoreWithSelector(useProjectStore as unknown as ReturnType<typeof vi.fn>, {
        currentProject: null,
      });

      render(<DocsTabsWrapper />);

      expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
    });

    it('should open CreateSpecDialog when create button is clicked on Specs tab', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('create-button'));

      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();
    });

    it('should not show create button on Issues tab', () => {
      render(<DocsTabsWrapper initialTab="issues" />);

      expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
    });

    it('should close CreateSpecDialog when close is called', async () => {
      const { container } = render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('create-button'));
      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-button'));

      await waitFor(
        () => {
          expect(screen.queryByTestId('create-spec-dialog')).not.toBeInTheDocument();
        },
        { container }
      );
    });
  });

  // ============================================================
  // Accessibility
  // ============================================================
  describe('accessibility', () => {
    it('should have tablist role on tab container', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have tab role on tabs', () => {
      render(<DocsTabsWrapper />);

      // project-config-editor: Now includes Project tab (specs, issues, project)
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('should have tabpanel role on content', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should set aria-controls on tabs', () => {
      render(<DocsTabsWrapper />);

      const specsTab = screen.getByRole('tab', { name: /specs/i });
      const issuesTab = screen.getByRole('tab', { name: /issues/i });

      expect(specsTab).toHaveAttribute('aria-controls', 'tabpanel-specs');
      expect(issuesTab).toHaveAttribute('aria-controls', 'tabpanel-issues');
    });
  });
});
