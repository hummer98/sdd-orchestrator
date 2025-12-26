/**
 * DocsTabs Integration Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocsTabs, type DocsTab } from './DocsTabs';
import { useProjectStore } from '../stores/projectStore';
import { useSpecStore } from '../stores/specStore';
import { useBugStore } from '../stores/bugStore';

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
const mockClearSelectedBug = vi.fn();

vi.mock('../stores/specStore', () => ({
  useSpecStore: vi.fn(),
}));

vi.mock('../stores/bugStore', () => ({
  useBugStore: vi.fn(),
}));

// Mock child list components
vi.mock('./SpecList', () => ({
  SpecList: () => <div data-testid="spec-list">SpecList</div>,
}));

vi.mock('./BugList', () => ({
  BugList: () => (
    <div data-testid="bug-list">
      <div>bug-001</div>
      <div>bug-002</div>
    </div>
  ),
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

vi.mock('./CreateBugDialog', () => ({
  CreateBugDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="create-bug-dialog">
        <button data-testid="close-button" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    startAgent: vi.fn().mockResolvedValue('agent-123'),
    selectForProjectAgents: vi.fn(),
    selectAgent: vi.fn(),
    getAgentsForSpec: vi.fn().mockReturnValue([]),
    agents: [],
    projectAgents: [],
  })),
}));

vi.mock('../stores/notificationStore', () => ({
  useNotificationStore: vi.fn(() => ({
    addNotification: vi.fn(),
  })),
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock electronAPI
const mockReadBugs = vi.fn();
const mockReadBugDetail = vi.fn();
const mockStartBugsWatcher = vi.fn();
const mockStopBugsWatcher = vi.fn();
const mockOnBugsChanged = vi.fn();

vi.stubGlobal('window', {
  electronAPI: {
    readBugs: mockReadBugs,
    readBugDetail: mockReadBugDetail,
    startBugsWatcher: mockStartBugsWatcher,
    stopBugsWatcher: mockStopBugsWatcher,
    onBugsChanged: mockOnBugsChanged,
    startAgent: vi.fn().mockResolvedValue('agent-123'),
    getAgentLogs: vi.fn().mockResolvedValue([]),
  },
});

describe('DocsTabs Integration', () => {
  const mockSpecs = [
    { id: 'spec-1', name: 'Feature A', phase: 'design', description: 'Test spec 1' },
    { id: 'spec-2', name: 'Feature B', phase: 'implementation', description: 'Test spec 2' },
  ];

  const mockBugs = [
    {
      name: 'bug-001',
      path: '/project/.kiro/bugs/bug-001',
      phase: 'reported',
      updatedAt: '2024-01-15T10:00:00Z',
      reportedAt: '2024-01-15T09:00:00Z',
    },
    {
      name: 'bug-002',
      path: '/project/.kiro/bugs/bug-002',
      phase: 'analyzed',
      updatedAt: '2024-01-14T15:00:00Z',
      reportedAt: '2024-01-14T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default project mock
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProject: '/Users/test/project',
    });

    // Default spec store mock
    (useSpecStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      specs: mockSpecs,
      selectedSpec: null,
      isLoading: false,
      error: null,
      selectSpec: vi.fn(),
      getSortedFilteredSpecs: () => mockSpecs,
      clearSelectedSpec: mockClearSelectedSpec,
    });

    // Default bug store mock
    (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      bugs: mockBugs,
      selectedBug: null,
      bugDetail: null,
      isLoading: false,
      error: null,
      isWatching: false,
      selectBug: vi.fn(),
      getSortedBugs: () => mockBugs,
      clearSelectedBug: mockClearSelectedBug,
    });

    // Default mock implementations
    mockReadBugs.mockResolvedValue(mockBugs);
    mockReadBugDetail.mockResolvedValue({});
    mockStartBugsWatcher.mockResolvedValue(undefined);
    mockStopBugsWatcher.mockResolvedValue(undefined);
    mockOnBugsChanged.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 10.2: Tab switching
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================
  describe('tab switching', () => {
    it('should display both Specs and Bugs tabs', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tab', { name: /specs/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /bugs/i })).toBeInTheDocument();
    });

    it('should show Specs tab content by default', () => {
      render(<DocsTabsWrapper />);

      // Specs tab should be selected
      const specsTab = screen.getByRole('tab', { name: /specs/i });
      expect(specsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Bugs tab when clicked', () => {
      render(<DocsTabsWrapper />);

      // Click Bugs tab
      const bugsTab = screen.getByRole('tab', { name: /bugs/i });
      fireEvent.click(bugsTab);

      // Bugs tab should now be selected
      expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Specs tab should not be selected
      const specsTab = screen.getByRole('tab', { name: /specs/i });
      expect(specsTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should display BugList when Bugs tab is selected', () => {
      // bugs are already set in beforeEach mock
      render(<DocsTabsWrapper />);

      // Switch to Bugs tab
      const bugsTab = screen.getByRole('tab', { name: /bugs/i });
      fireEvent.click(bugsTab);

      // Bug list should be visible
      expect(screen.getByText('bug-001')).toBeInTheDocument();
      expect(screen.getByText('bug-002')).toBeInTheDocument();
    });

    it('should switch back to Specs tab when clicked', () => {
      render(<DocsTabsWrapper />);

      // Switch to Bugs tab
      fireEvent.click(screen.getByRole('tab', { name: /bugs/i }));

      // Switch back to Specs tab
      fireEvent.click(screen.getByRole('tab', { name: /specs/i }));

      // Specs tab should be selected
      const specsTab = screen.getByRole('tab', { name: /specs/i });
      expect(specsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ============================================================
  // Task 10.2: Tab state persistence
  // Requirements: 1.4
  // ============================================================
  describe('tab state persistence', () => {
    it('should maintain tab state between re-renders', () => {
      const { rerender } = render(<DocsTabsWrapper />);

      // Switch to Bugs tab
      fireEvent.click(screen.getByRole('tab', { name: /bugs/i }));

      // Verify Bugs tab is selected
      expect(screen.getByRole('tab', { name: /bugs/i })).toHaveAttribute('aria-selected', 'true');

      // Re-render
      rerender(<DocsTabsWrapper />);

      // Bugs tab should still be selected (component maintains internal state)
      expect(screen.getByRole('tab', { name: /bugs/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ============================================================
  // Task 10.2: Create dialog integration
  // Requirements: 1.1, 1.2
  // ============================================================
  describe('create dialog integration', () => {
    it('should show create button when project is selected', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('create-button')).toBeInTheDocument();
    });

    it('should not show create button when no project is selected', () => {
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        currentProject: null,
      });

      render(<DocsTabsWrapper />);

      expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
    });

    it('should open CreateSpecDialog when create button is clicked on Specs tab', () => {
      render(<DocsTabsWrapper />);

      // Click create button
      fireEvent.click(screen.getByTestId('create-button'));

      // CreateSpecDialog should be open
      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();
    });

    it('should open CreateBugDialog when create button is clicked on Bugs tab', () => {
      render(<DocsTabsWrapper />);

      // Switch to Bugs tab
      fireEvent.click(screen.getByRole('tab', { name: /bugs/i }));

      // Click create button
      fireEvent.click(screen.getByTestId('create-button'));

      // CreateBugDialog should be open
      expect(screen.getByTestId('create-bug-dialog')).toBeInTheDocument();
    });

    it('should close CreateSpecDialog when close is called', async () => {
      const { container } = render(<DocsTabsWrapper />);

      // Open dialog
      fireEvent.click(screen.getByTestId('create-button'));
      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();

      // Close dialog via close button
      fireEvent.click(screen.getByTestId('close-button'));

      // Dialog should be closed
      await waitFor(
        () => {
          expect(screen.queryByTestId('create-spec-dialog')).not.toBeInTheDocument();
        },
        { container }
      );
    });

    it('should close CreateBugDialog when close is called', async () => {
      const { container } = render(<DocsTabsWrapper />);

      // Switch to Bugs tab and open dialog
      fireEvent.click(screen.getByRole('tab', { name: /bugs/i }));
      fireEvent.click(screen.getByTestId('create-button'));
      expect(screen.getByTestId('create-bug-dialog')).toBeInTheDocument();

      // Close dialog via close button
      fireEvent.click(screen.getByTestId('close-button'));

      // Dialog should be closed
      await waitFor(
        () => {
          expect(screen.queryByTestId('create-bug-dialog')).not.toBeInTheDocument();
        },
        { container }
      );
    });
  });

  // ============================================================
  // Task 10.2: Accessibility
  // Requirements: 1.3
  // ============================================================
  describe('accessibility', () => {
    it('should have tablist role on tab container', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have tab role on tabs', () => {
      render(<DocsTabsWrapper />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('should have tabpanel role on content', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should set aria-controls on tabs', () => {
      render(<DocsTabsWrapper />);

      const specsTab = screen.getByRole('tab', { name: /specs/i });
      const bugsTab = screen.getByRole('tab', { name: /bugs/i });

      // Each tab controls its own tabpanel
      expect(specsTab).toHaveAttribute('aria-controls', 'tabpanel-specs');
      expect(bugsTab).toHaveAttribute('aria-controls', 'tabpanel-bugs');
    });
  });
});
