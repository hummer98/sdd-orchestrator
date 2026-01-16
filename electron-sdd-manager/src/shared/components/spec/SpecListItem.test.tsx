/**
 * SpecListItem Component Tests
 * TDD: Test-first implementation for shared SpecListItem component
 * Requirements: 3.1, 7.1
 * git-worktree-support: Task 11.1, 11.2 - worktree badge display
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecListItem } from './SpecListItem';
import type { SpecMetadata, SpecPhase } from '@shared/api/types';
import type { WorktreeConfig } from '@renderer/types/worktree';
import type { DocumentReviewState } from '@shared/types/review';

const createMockSpec = (overrides: Partial<SpecMetadata> = {}): SpecMetadata => ({
  name: 'test-feature',
  path: '/project/.kiro/specs/test-feature',
  phase: 'requirements-generated' as SpecPhase,
  updatedAt: Date.now(),
  ...overrides,
});

/**
 * Create mock worktree config for testing
 * git-worktree-support: Task 11.1, 11.2
 */
const createMockWorktree = (overrides: Partial<WorktreeConfig> = {}): WorktreeConfig => ({
  path: '../my-project-worktrees/test-feature',
  branch: 'feature/test-feature',
  created_at: '2026-01-12T12:00:00+09:00',
  ...overrides,
});

/**
 * Create mock document review state for testing
 */
const createMockDocumentReview = (
  overrides: Partial<DocumentReviewState> = {}
): DocumentReviewState => ({
  status: 'approved',
  roundDetails: [
    {
      roundNumber: 1,
      status: 'reply_complete',
      reviewCompletedAt: '2026-01-12T10:00:00Z',
      replyCompletedAt: '2026-01-12T11:00:00Z',
      fixStatus: 'not_required',
    },
  ],
  ...overrides,
});

describe('SpecListItem', () => {
  describe('Basic rendering', () => {
    it('should render spec name', () => {
      const spec = createMockSpec({ name: 'my-feature' });
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByText('my-feature')).toBeInTheDocument();
    });

    it('should render phase badge', () => {
      const spec = createMockSpec({ phase: 'design-generated' });
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      // The component should show a phase label
      expect(screen.getByTestId('phase-badge')).toBeInTheDocument();
    });

    it('should render updated date', () => {
      const spec = createMockSpec({ updatedAt: Date.now() });
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('updated-date')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn();
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={false} onSelect={onSelect} />);
      // Get the main clickable area (the div with role="button")
      const listItem = screen.getByTestId(`spec-item-${spec.name}`).querySelector('[role="button"]');
      fireEvent.click(listItem!);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should have selected styling when isSelected is true', () => {
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={true} onSelect={() => {}} />);
      const listItem = screen.getByTestId(`spec-item-${spec.name}`).querySelector('[role="button"]');
      expect(listItem?.className).toContain('bg-blue');
    });

    it('should support keyboard navigation with Enter', () => {
      const onSelect = vi.fn();
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={false} onSelect={onSelect} />);
      const listItem = screen.getByTestId(`spec-item-${spec.name}`).querySelector('[role="button"]');
      fireEvent.keyDown(listItem!, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard navigation with Space', () => {
      const onSelect = vi.fn();
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={false} onSelect={onSelect} />);
      const listItem = screen.getByTestId(`spec-item-${spec.name}`).querySelector('[role="button"]');
      fireEvent.keyDown(listItem!, { key: ' ' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Running agents indicator', () => {
    it('should show running agent count when provided and > 0', () => {
      const spec = createMockSpec();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          runningAgentCount={2}
        />
      );
      expect(screen.getByTestId('running-agent-count')).toHaveTextContent('2');
    });

    it('should not show running agent count when 0', () => {
      const spec = createMockSpec();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          runningAgentCount={0}
        />
      );
      expect(screen.queryByTestId('running-agent-count')).not.toBeInTheDocument();
    });

    it('should not show running agent count when not provided', () => {
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.queryByTestId('running-agent-count')).not.toBeInTheDocument();
    });
  });

  describe('Phase display', () => {
    const phases: SpecPhase[] = [
      'initialized',
      'requirements-generated',
      'design-generated',
      'tasks-generated',
      'implementation-complete',
    ];

    it.each(phases)('should render phase "%s" with appropriate styling', (phase) => {
      const spec = createMockSpec({ phase });
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('phase-badge')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have data-testid for testing', () => {
      const spec = createMockSpec({ name: 'my-spec' });
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('spec-item-my-spec')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      const listItem = screen.getByTestId(`spec-item-${spec.name}`).querySelector('[role="button"]');
      expect(listItem).toHaveAttribute('tabIndex', '0');
    });
  });

  /**
   * git-worktree-support: Task 11.1, 11.2
   * Worktree badge display tests
   * Requirements: 4.1, 4.2
   */
  describe('Worktree badge display', () => {
    it('should show worktree badge when worktree prop is provided', () => {
      const spec = createMockSpec();
      const worktree = createMockWorktree();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          worktree={worktree}
        />
      );
      expect(screen.getByTestId('worktree-badge')).toBeInTheDocument();
      expect(screen.getByTestId('worktree-badge')).toHaveTextContent('worktree');
    });

    it('should not show worktree badge when worktree prop is not provided', () => {
      const spec = createMockSpec();
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument();
    });

    it('should not show worktree badge when worktree prop is undefined', () => {
      const spec = createMockSpec();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          worktree={undefined}
        />
      );
      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument();
    });

    it('should show GitBranch icon in worktree badge', () => {
      const spec = createMockSpec();
      const worktree = createMockWorktree();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          worktree={worktree}
        />
      );
      const badge = screen.getByTestId('worktree-badge');
      // Check that the badge contains an SVG (GitBranch icon)
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });

    it('should show worktree path and branch in tooltip', () => {
      const spec = createMockSpec();
      const worktree = createMockWorktree({
        path: '../project-worktrees/my-feature',
        branch: 'feature/my-feature',
      });
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          worktree={worktree}
        />
      );
      const badge = screen.getByTestId('worktree-badge');
      // Check title attribute contains path and branch
      expect(badge).toHaveAttribute('title');
      const title = badge.getAttribute('title') ?? '';
      expect(title).toContain('../project-worktrees/my-feature');
      expect(title).toContain('feature/my-feature');
    });
  });

  /**
   * Document review state in phase badge
   * When phase is 'tasks-generated', phase badge shows document review state
   */
  describe('Document review state in phase badge', () => {
    it('should show "レビュー済" in phase badge when phase is tasks-generated and documentReview has at least 1 round', () => {
      const spec = createMockSpec({ phase: 'tasks-generated' });
      const documentReview = createMockDocumentReview();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          documentReview={documentReview}
        />
      );
      expect(screen.getByTestId('phase-badge')).toHaveTextContent('レビュー済');
    });

    it('should show "レビュー中" in phase badge when phase is tasks-generated and documentReview status is in_progress', () => {
      const spec = createMockSpec({ phase: 'tasks-generated' });
      const documentReview: DocumentReviewState = { status: 'in_progress' };
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          documentReview={documentReview}
        />
      );
      expect(screen.getByTestId('phase-badge')).toHaveTextContent('レビュー中');
    });

    it('should show "タスク済" in phase badge when phase is tasks-generated and no documentReview', () => {
      const spec = createMockSpec({ phase: 'tasks-generated' });
      render(<SpecListItem spec={spec} isSelected={false} onSelect={() => {}} />);
      expect(screen.getByTestId('phase-badge')).toHaveTextContent('タスク済');
    });

    it('should show "タスク済" in phase badge when phase is tasks-generated and documentReview has empty roundDetails', () => {
      const spec = createMockSpec({ phase: 'tasks-generated' });
      const documentReview = createMockDocumentReview({ roundDetails: [], status: 'pending' });
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          documentReview={documentReview}
        />
      );
      expect(screen.getByTestId('phase-badge')).toHaveTextContent('タスク済');
    });

    it('should not override phase badge for non-tasks-generated phases', () => {
      const spec = createMockSpec({ phase: 'design-generated' });
      const documentReview = createMockDocumentReview();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          documentReview={documentReview}
        />
      );
      // Should still show the original phase, not review state
      expect(screen.getByTestId('phase-badge')).toHaveTextContent('設計済');
    });

    it('should not override phase badge for implementation-complete phase', () => {
      const spec = createMockSpec({ phase: 'implementation-complete' });
      const documentReview = createMockDocumentReview();
      render(
        <SpecListItem
          spec={spec}
          isSelected={false}
          onSelect={() => {}}
          documentReview={documentReview}
        />
      );
      expect(screen.getByTestId('phase-badge')).toHaveTextContent('実装完了');
    });
  });
});
