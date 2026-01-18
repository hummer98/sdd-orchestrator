/**
 * BugListItem Component Tests
 * Requirements: 2.2, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugListItem } from '@shared/components/bug';
import type { BugMetadata } from '@shared/api/types';

describe('BugListItem', () => {
  const mockBug: BugMetadata = {
    name: 'test-bug',
    path: '/project/.kiro/bugs/test-bug',
    phase: 'reported',
    updatedAt: new Date().toISOString(),
    reportedAt: new Date().toISOString(),
  };

  const defaultProps = {
    bug: mockBug,
    isSelected: false,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // ============================================================
  // Bug display
  // ============================================================
  describe('bug display', () => {
    it('should display bug name', () => {
      render(<BugListItem {...defaultProps} />);

      expect(screen.getByText('test-bug')).toBeInTheDocument();
    });

    it('should display phase badge', () => {
      render(<BugListItem {...defaultProps} />);

      expect(screen.getByText('報告済')).toBeInTheDocument();
    });

    it('should display correct phase label for analyzed phase', () => {
      render(<BugListItem {...defaultProps} bug={{ ...mockBug, phase: 'analyzed' }} />);

      expect(screen.getByText('分析済')).toBeInTheDocument();
    });

    it('should display formatted date', () => {
      // Set a specific date for testing
      const pastDate = new Date('2024-01-15T10:30:00');
      render(
        <BugListItem
          {...defaultProps}
          bug={{ ...mockBug, updatedAt: pastDate.toISOString() }}
        />
      );

      // Should show short date format (not today)
      expect(screen.getByText(/1月15日|Jan 15/)).toBeInTheDocument();
    });

    it('should show time if updated today', () => {
      const today = new Date();
      today.setHours(14, 30, 0, 0);
      render(
        <BugListItem
          {...defaultProps}
          bug={{ ...mockBug, updatedAt: today.toISOString() }}
        />
      );

      // Should show time format
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Selection
  // ============================================================
  describe('selection', () => {
    it('should apply selected styles when isSelected is true', () => {
      render(<BugListItem {...defaultProps} isSelected={true} />);

      const item = screen.getByTestId('bug-item-test-bug');
      expect(item.className).toContain('bg-blue-100');
      expect(item.className).toContain('border-l-blue-500');
    });

    it('should not apply selected styles when isSelected is false', () => {
      render(<BugListItem {...defaultProps} isSelected={false} />);

      const item = screen.getByTestId('bug-item-test-bug');
      expect(item.className).not.toContain('bg-blue-100');
    });

    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn();
      render(<BugListItem {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('bug-item-test-bug'));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when Enter key is pressed', () => {
      const onSelect = vi.fn();
      render(<BugListItem {...defaultProps} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByTestId('bug-item-test-bug'), { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when Space key is pressed', () => {
      const onSelect = vi.fn();
      render(<BugListItem {...defaultProps} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByTestId('bug-item-test-bug'), { key: ' ' });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Copy button
  // ============================================================
  describe('copy button', () => {
    it('should copy bug name when copy button is clicked', async () => {
      render(<BugListItem {...defaultProps} />);

      fireEvent.click(screen.getByTestId('copy-button-test-bug'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-bug');
    });

    it('should not trigger selection when copy button is clicked', () => {
      const onSelect = vi.fn();
      render(<BugListItem {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('copy-button-test-bug'));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should show check icon after copying', async () => {
      render(<BugListItem {...defaultProps} />);

      expect(screen.getByTestId('copy-icon')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('copy-button-test-bug'));

      expect(screen.getByTestId('copy-check')).toBeInTheDocument();
      expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Phase badge
  // Requirements: 3.2, 3.3, 3.4
  // ============================================================
  describe('phase badge', () => {
    const phases: Array<{ phase: BugMetadata['phase']; expectedLabel: string }> = [
      { phase: 'reported', expectedLabel: '報告済' },
      { phase: 'analyzed', expectedLabel: '分析済' },
      { phase: 'fixed', expectedLabel: '修正済' },
      { phase: 'verified', expectedLabel: '検証済' },
    ];

    phases.forEach(({ phase, expectedLabel }) => {
      it(`should display correct label for ${phase} phase`, () => {
        render(<BugListItem {...defaultProps} bug={{ ...mockBug, phase }} />);

        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Running agent count
  // ============================================================
  describe('running agent count', () => {
    it('should display running agent count when runningAgentCount > 0', () => {
      render(<BugListItem {...defaultProps} runningAgentCount={2} />);

      expect(screen.getByTestId('running-agent-count')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not display running agent count when runningAgentCount is 0', () => {
      render(<BugListItem {...defaultProps} runningAgentCount={0} />);

      expect(screen.queryByTestId('running-agent-count')).not.toBeInTheDocument();
    });

    it('should not display running agent count when runningAgentCount is undefined', () => {
      render(<BugListItem {...defaultProps} />);

      expect(screen.queryByTestId('running-agent-count')).not.toBeInTheDocument();
    });

    it('should display Bot icon with running agent count', () => {
      render(<BugListItem {...defaultProps} runningAgentCount={1} />);

      const agentBadge = screen.getByTestId('running-agent-count');
      expect(agentBadge.querySelector('svg')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Accessibility
  // ============================================================
  describe('accessibility', () => {
    it('should have role="button" on the main container', () => {
      render(<BugListItem {...defaultProps} />);

      // The main container has role="button", plus there's a copy button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(2);
      expect(screen.getByTestId('bug-item-test-bug')).toHaveAttribute('role', 'button');
    });

    it('should be focusable with tabIndex', () => {
      render(<BugListItem {...defaultProps} />);

      const item = screen.getByTestId('bug-item-test-bug');
      expect(item).toHaveAttribute('tabIndex', '0');
    });

    it('should have tooltip with full date', () => {
      const pastDate = new Date('2024-01-15T10:30:00');
      render(
        <BugListItem
          {...defaultProps}
          bug={{ ...mockBug, updatedAt: pastDate.toISOString() }}
        />
      );

      const dateElement = screen.getByText(/1月15日|Jan 15/);
      expect(dateElement).toHaveAttribute('title');
      expect(dateElement.getAttribute('title')).toContain('2024');
    });
  });
});
