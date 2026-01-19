/**
 * BugListItem Component Tests
 * TDD: Test-first implementation for shared BugListItem component
 * Requirements: 3.1, 7.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugListItem } from './BugListItem';
import type { BugMetadata } from '@shared/api/types';

type BugPhase = 'reported' | 'analyzed' | 'fixed' | 'verified';

const createMockBug = (overrides: Partial<BugMetadata> = {}): BugMetadata => ({
  name: 'test-bug',
  path: '/project/.kiro/bugs/test-bug',
  phase: 'reported' as BugPhase,
  updatedAt: Date.now().toString(),
  ...overrides,
});

describe('BugListItem', () => {
  describe('Basic rendering', () => {
    it('should render bug name', () => {
      const bug = createMockBug({ name: 'my-bug' });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByText('my-bug')).toBeInTheDocument();
    });

    it('should render phase badge', () => {
      const bug = createMockBug({ phase: 'analyzed' });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('phase-badge')).toBeInTheDocument();
    });

    it('should render updated date', () => {
      const bug = createMockBug({ updatedAt: Date.now().toString() });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('updated-date')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn();
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={onSelect} />);
      const listItem = screen.getByTestId(`bug-item-${bug.name}`);
      fireEvent.click(listItem);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should have selected styling when isSelected is true', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={true} onSelect={() => {}} />);
      const listItem = screen.getByTestId(`bug-item-${bug.name}`);
      expect(listItem.className).toContain('bg-blue');
    });

    it('should support keyboard navigation with Enter', () => {
      const onSelect = vi.fn();
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={onSelect} />);
      const listItem = screen.getByTestId(`bug-item-${bug.name}`);
      fireEvent.keyDown(listItem, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard navigation with Space', () => {
      const onSelect = vi.fn();
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={onSelect} />);
      const listItem = screen.getByTestId(`bug-item-${bug.name}`);
      fireEvent.keyDown(listItem, { key: ' ' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Phase display', () => {
    const phases: BugPhase[] = ['reported', 'analyzed', 'fixed', 'verified'];

    it.each(phases)('should render phase "%s" with appropriate styling', (phase) => {
      const bug = createMockBug({ phase });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('phase-badge')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have data-testid for testing', () => {
      const bug = createMockBug({ name: 'my-bug' });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('bug-item-my-bug')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      const listItem = screen.getByTestId(`bug-item-${bug.name}`);
      expect(listItem).toHaveAttribute('tabIndex', '0');
    });
  });

  // ============================================================
  // bugs-worktree-support Task 13.1: worktreeインジケーター
  // Requirements: 10.1, 10.2, 10.3
  // ============================================================
  describe('Worktree indicator', () => {
    it('should display worktree badge when bug has worktree field', () => {
      const bug = createMockBug({
        worktree: {
          path: '../test-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2024-01-01T00:00:00Z',
        },
      });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('worktree-badge')).toBeInTheDocument();
    });

    it('should not display worktree badge when bug has no worktree field', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument();
    });

    it('should display GitBranch icon in worktree badge', () => {
      const bug = createMockBug({
        worktree: {
          path: '../test-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2024-01-01T00:00:00Z',
        },
      });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      const badge = screen.getByTestId('worktree-badge');
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });

    it('should display "worktree" text in badge', () => {
      const bug = createMockBug({
        worktree: {
          path: '../test-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2024-01-01T00:00:00Z',
        },
      });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByText('worktree')).toBeInTheDocument();
    });

    // bugs-worktree-directory-mode: Support worktreeBasePath for directory mode
    it('should display worktree badge when bug has worktreeBasePath (directory mode)', () => {
      const bug = createMockBug({
        worktreeBasePath: '.kiro/worktrees/bugs/test-bug',
      });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('worktree-badge')).toBeInTheDocument();
    });

    it('should display worktree badge with correct tooltip for directory mode', () => {
      const bug = createMockBug({
        worktreeBasePath: '.kiro/worktrees/bugs/test-bug',
      });
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      const badge = screen.getByTestId('worktree-badge');
      expect(badge).toHaveAttribute('title', 'Worktree: .kiro/worktrees/bugs/test-bug');
    });
  });

  describe('Running agent count', () => {
    it('should display running agent count when provided and > 0', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} runningAgentCount={2} />);
      expect(screen.getByTestId('running-agent-count')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not display running agent count when 0', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} runningAgentCount={0} />);
      expect(screen.queryByTestId('running-agent-count')).not.toBeInTheDocument();
    });

    it('should not display running agent count when undefined', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} />);
      expect(screen.queryByTestId('running-agent-count')).not.toBeInTheDocument();
    });

    it('should display Bot icon with running agent count', () => {
      const bug = createMockBug();
      render(<BugListItem bug={bug} isSelected={false} onSelect={() => {}} runningAgentCount={1} />);
      const agentBadge = screen.getByTestId('running-agent-count');
      expect(agentBadge.querySelector('svg')).toBeInTheDocument();
    });
  });
});
