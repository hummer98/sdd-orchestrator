/**
 * DocsTabs Component Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * github-issue-integration: Bugs tab replaced with Issues
 */

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocsTabs, type DocsTab } from './DocsTabs';
import { useProjectStore, useAgentStore } from '../stores';

// Mock stores
const mockSelectAgent = vi.fn();

vi.mock('../stores', () => ({
  useProjectStore: vi.fn(),
  useAgentStore: vi.fn(),
}));

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

// Mock child components
vi.mock('./SpecList', () => ({
  SpecList: () => <div data-testid="spec-list">SpecList</div>,
}));

vi.mock('./CreateSpecDialog', () => ({
  CreateSpecDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="create-spec-dialog">
        <button onClick={onClose} data-testid="close-spec-dialog">Close</button>
      </div>
    ) : null,
}));

describe('DocsTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreWithSelector(useProjectStore as unknown as ReturnType<typeof vi.fn>, {
      currentProject: '/test/project',
    });
    mockStoreWithSelector(useAgentStore as unknown as ReturnType<typeof vi.fn>, {
      selectAgent: mockSelectAgent,
    });
  });

  // ============================================================
  // Task 8.1: Tab display and switching
  // Requirements: 1.1, 1.3, 1.4
  // github-issue-integration: Bugs tab replaced with Issues
  // ============================================================
  describe('tab display and switching', () => {
    it('should render tabs container', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('docs-tabs')).toBeInTheDocument();
    });

    it('should display Specs and Issues tabs', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('tab-specs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-issues')).toBeInTheDocument();
    });

    it('should show Specs tab as active by default', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-issues')).toHaveAttribute('aria-selected', 'false');
    });

    it('should show SpecList by default', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('tabpanel-specs')).toBeInTheDocument();
      expect(screen.getByTestId('spec-list')).toBeInTheDocument();
    });

    it('should switch to Issues tab when clicked', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('tab-issues'));

      expect(screen.getByTestId('tab-issues')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'false');
    });

    it('should switch back to Specs tab when clicked', () => {
      render(<DocsTabsWrapper />);

      // Switch to issues
      fireEvent.click(screen.getByTestId('tab-issues'));
      // Switch back to specs
      fireEvent.click(screen.getByTestId('tab-specs'));

      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tabpanel-specs')).toBeInTheDocument();
    });

    it('should preserve selection state when switching tabs (no clear calls)', () => {
      render(<DocsTabsWrapper />);

      // Switch to issues and back to specs
      fireEvent.click(screen.getByTestId('tab-issues'));
      fireEvent.click(screen.getByTestId('tab-specs'));

      // Only agent selection should be cleared (twice, once per tab switch)
      expect(mockSelectAgent).toHaveBeenCalledTimes(2);
      expect(mockSelectAgent).toHaveBeenCalledWith(null);
    });

    it('should clear agent selection when switching tabs', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('tab-issues'));

      expect(mockSelectAgent).toHaveBeenCalledWith(null);
    });
  });

  // ============================================================
  // Task 8.2: Create button
  // Requirements: 1.1, 1.2
  // ============================================================
  describe('create button', () => {
    it('should display create button when project is selected and on specs tab', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('create-button')).toBeInTheDocument();
    });

    it('should not display create button when no project is selected', () => {
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

    it('should not show create button on Issues tab (no createLabel)', () => {
      render(<DocsTabsWrapper initialTab="issues" />);

      expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
    });

    it('should close CreateSpecDialog when close is called', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('create-button'));
      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-spec-dialog'));
      expect(screen.queryByTestId('create-spec-dialog')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // project-config-editor Task 4.1: Project tab support
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================
  describe('Project tab support', () => {
    it('should display Project tab', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('tab-project')).toBeInTheDocument();
    });

    it('should switch to Project tab when clicked', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('tab-project'));

      expect(screen.getByTestId('tab-project')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'false');
    });

    it('should not show create button on Project tab', () => {
      render(<DocsTabsWrapper initialTab="project" />);

      // Create button should not be visible for Project tab
      expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
    });

    it('should call onTabChange with project when Project tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<DocsTabs activeTab="specs" onTabChange={onTabChange} />);

      fireEvent.click(screen.getByTestId('tab-project'));

      expect(onTabChange).toHaveBeenCalledWith('project');
    });

    it('should clear agent selection when switching to Project tab', () => {
      render(<DocsTabsWrapper />);

      fireEvent.click(screen.getByTestId('tab-project'));

      expect(mockSelectAgent).toHaveBeenCalledWith(null);
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

      const tabs = screen.getAllByRole('tab');
      // Now 3 tabs: specs, issues, project
      expect(tabs).toHaveLength(3);
    });

    it('should have tabpanel role on content', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should set aria-controls on tabs', () => {
      render(<DocsTabsWrapper />);

      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-controls', 'tabpanel-specs');
      expect(screen.getByTestId('tab-issues')).toHaveAttribute('aria-controls', 'tabpanel-issues');
    });
  });

  // ============================================================
  // Tab state persistence
  // Requirements: 1.4
  // ============================================================
  describe('tab state persistence', () => {
    it('should maintain tab state when re-rendered', () => {
      const { rerender } = render(<DocsTabsWrapper />);

      // Switch to issues
      fireEvent.click(screen.getByTestId('tab-issues'));
      expect(screen.getByTestId('tab-issues')).toHaveAttribute('aria-selected', 'true');

      // Re-render
      rerender(<DocsTabsWrapper />);

      // Tab state should be maintained (component state is preserved in rerender)
      expect(screen.getByTestId('tab-issues')).toHaveAttribute('aria-selected', 'true');
    });
  });
});
