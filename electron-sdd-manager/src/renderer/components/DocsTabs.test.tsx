/**
 * DocsTabs Component Tests
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocsTabs } from './DocsTabs';
import { useProjectStore } from '../stores';

// Mock stores
vi.mock('../stores', () => ({
  useProjectStore: vi.fn(),
}));

// Mock child components
vi.mock('./SpecList', () => ({
  SpecList: () => <div data-testid="spec-list">SpecList</div>,
}));

vi.mock('./BugList', () => ({
  BugList: () => <div data-testid="bug-list">BugList</div>,
}));

vi.mock('./CreateSpecDialog', () => ({
  CreateSpecDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="create-spec-dialog">
        <button onClick={onClose} data-testid="close-spec-dialog">Close</button>
      </div>
    ) : null,
}));

vi.mock('./CreateBugDialog', () => ({
  CreateBugDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="create-bug-dialog">
        <button onClick={onClose} data-testid="close-bug-dialog">Close</button>
      </div>
    ) : null,
}));

describe('DocsTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentProject: '/test/project',
    });
  });

  // ============================================================
  // Task 8.1: Tab display and switching
  // Requirements: 1.1, 1.3, 1.4
  // ============================================================
  describe('tab display and switching', () => {
    it('should render tabs container', () => {
      render(<DocsTabs />);

      expect(screen.getByTestId('docs-tabs')).toBeInTheDocument();
    });

    it('should display Specs and Bugs tabs', () => {
      render(<DocsTabs />);

      expect(screen.getByTestId('tab-specs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-bugs')).toBeInTheDocument();
    });

    it('should show Specs tab as active by default', () => {
      render(<DocsTabs />);

      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-bugs')).toHaveAttribute('aria-selected', 'false');
    });

    it('should show SpecList by default', () => {
      render(<DocsTabs />);

      expect(screen.getByTestId('tabpanel-specs')).toBeInTheDocument();
      expect(screen.getByTestId('spec-list')).toBeInTheDocument();
      expect(screen.queryByTestId('tabpanel-bugs')).not.toBeInTheDocument();
    });

    it('should switch to Bugs tab when clicked', () => {
      render(<DocsTabs />);

      fireEvent.click(screen.getByTestId('tab-bugs'));

      expect(screen.getByTestId('tab-bugs')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'false');
    });

    it('should show BugList when Bugs tab is selected', () => {
      render(<DocsTabs />);

      fireEvent.click(screen.getByTestId('tab-bugs'));

      expect(screen.getByTestId('tabpanel-bugs')).toBeInTheDocument();
      expect(screen.getByTestId('bug-list')).toBeInTheDocument();
      expect(screen.queryByTestId('tabpanel-specs')).not.toBeInTheDocument();
    });

    it('should switch back to Specs tab when clicked', () => {
      render(<DocsTabs />);

      // Switch to bugs
      fireEvent.click(screen.getByTestId('tab-bugs'));
      // Switch back to specs
      fireEvent.click(screen.getByTestId('tab-specs'));

      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tabpanel-specs')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 8.2: Create button
  // Requirements: 1.1, 1.2
  // ============================================================
  describe('create button', () => {
    it('should display create button when project is selected', () => {
      render(<DocsTabs />);

      expect(screen.getByTestId('create-button')).toBeInTheDocument();
    });

    it('should not display create button when no project is selected', () => {
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        currentProject: null,
      });
      render(<DocsTabs />);

      expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
    });

    it('should open CreateSpecDialog when create button is clicked on Specs tab', () => {
      render(<DocsTabs />);

      fireEvent.click(screen.getByTestId('create-button'));

      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();
    });

    it('should open CreateBugDialog when create button is clicked on Bugs tab', () => {
      render(<DocsTabs />);

      // Switch to bugs tab
      fireEvent.click(screen.getByTestId('tab-bugs'));
      // Click create
      fireEvent.click(screen.getByTestId('create-button'));

      expect(screen.getByTestId('create-bug-dialog')).toBeInTheDocument();
    });

    it('should close CreateSpecDialog when close is called', () => {
      render(<DocsTabs />);

      fireEvent.click(screen.getByTestId('create-button'));
      expect(screen.getByTestId('create-spec-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-spec-dialog'));
      expect(screen.queryByTestId('create-spec-dialog')).not.toBeInTheDocument();
    });

    it('should close CreateBugDialog when close is called', () => {
      render(<DocsTabs />);

      fireEvent.click(screen.getByTestId('tab-bugs'));
      fireEvent.click(screen.getByTestId('create-button'));
      expect(screen.getByTestId('create-bug-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-bug-dialog'));
      expect(screen.queryByTestId('create-bug-dialog')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Accessibility
  // ============================================================
  describe('accessibility', () => {
    it('should have tablist role on tab container', () => {
      render(<DocsTabs />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have tab role on tabs', () => {
      render(<DocsTabs />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('should have tabpanel role on content', () => {
      render(<DocsTabs />);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should set aria-controls on tabs', () => {
      render(<DocsTabs />);

      expect(screen.getByTestId('tab-specs')).toHaveAttribute('aria-controls', 'tabpanel-specs');
      expect(screen.getByTestId('tab-bugs')).toHaveAttribute('aria-controls', 'tabpanel-bugs');
    });
  });

  // ============================================================
  // Tab state persistence
  // Requirements: 1.4
  // ============================================================
  describe('tab state persistence', () => {
    it('should maintain tab state when re-rendered', () => {
      const { rerender } = render(<DocsTabs />);

      // Switch to bugs
      fireEvent.click(screen.getByTestId('tab-bugs'));
      expect(screen.getByTestId('tab-bugs')).toHaveAttribute('aria-selected', 'true');

      // Re-render
      rerender(<DocsTabs />);

      // Tab state should be maintained (component state is preserved in rerender)
      expect(screen.getByTestId('tab-bugs')).toHaveAttribute('aria-selected', 'true');
    });
  });
});
