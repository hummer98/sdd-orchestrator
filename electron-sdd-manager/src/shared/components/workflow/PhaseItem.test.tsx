/**
 * PhaseItem Component Tests
 * TDD: Test-first implementation for shared PhaseItem component
 * Requirements: 3.1, 7.1, 7.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseItem } from './PhaseItem';

/**
 * document-review-phase Task 1.1: 'document-review' を追加
 * Requirements: 1.2
 */
type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'document-review' | 'impl' | 'inspection' | 'deploy';
type PhaseStatus = 'pending' | 'generated' | 'approved';

const defaultProps = {
  phase: 'requirements' as WorkflowPhase,
  label: '要件定義',
  status: 'pending' as PhaseStatus,
  previousStatus: null as PhaseStatus | null,
  autoExecutionPermitted: false,
  isExecuting: false,
  canExecute: true,
  onExecute: vi.fn(),
  onApprove: vi.fn(),
  onApproveAndExecute: vi.fn(),
  onToggleAutoPermission: vi.fn(),
};

describe('PhaseItem', () => {
  describe('Basic rendering', () => {
    it('should render the phase label', () => {
      render(<PhaseItem {...defaultProps} />);
      expect(screen.getByText('要件定義')).toBeInTheDocument();
    });

    it('should have data-testid for testing', () => {
      render(<PhaseItem {...defaultProps} />);
      expect(screen.getByTestId('phase-item-requirements')).toBeInTheDocument();
    });
  });

  describe('Status display', () => {
    it('should show pending icon for pending status', () => {
      render(<PhaseItem {...defaultProps} status="pending" />);
      expect(screen.getByTestId('progress-icon-pending')).toBeInTheDocument();
    });

    it('should show generated icon for generated status', () => {
      render(<PhaseItem {...defaultProps} status="generated" />);
      expect(screen.getByTestId('progress-icon-generated')).toBeInTheDocument();
    });

    it('should show approved icon for approved status', () => {
      render(<PhaseItem {...defaultProps} status="approved" />);
      expect(screen.getByTestId('progress-icon-approved')).toBeInTheDocument();
    });

    it('should show executing icon when isExecuting is true', () => {
      render(<PhaseItem {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('progress-icon-executing')).toBeInTheDocument();
    });
  });

  describe('Execute button', () => {
    it('should show execute button when status is pending and can execute', () => {
      render(<PhaseItem {...defaultProps} status="pending" canExecute={true} />);
      expect(screen.getByTestId('phase-button-requirements')).toBeInTheDocument();
    });

    it('should call onExecute when execute button is clicked', () => {
      const onExecute = vi.fn();
      render(<PhaseItem {...defaultProps} status="pending" canExecute={true} onExecute={onExecute} />);
      fireEvent.click(screen.getByTestId('phase-button-requirements'));
      expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('should disable execute button when canExecute is false', () => {
      render(<PhaseItem {...defaultProps} status="pending" canExecute={false} />);
      const button = screen.getByTestId('phase-button-requirements');
      expect(button).toBeDisabled();
    });

    it('should hide execute button when isExecuting is true', () => {
      render(<PhaseItem {...defaultProps} status="pending" isExecuting={true} />);
      expect(screen.queryByTestId('phase-button-requirements')).not.toBeInTheDocument();
    });
  });

  describe('Approve button', () => {
    it('should show approve button when status is generated', () => {
      render(<PhaseItem {...defaultProps} status="generated" />);
      expect(screen.getByText('承認')).toBeInTheDocument();
    });

    it('should call onApprove when approve button is clicked', () => {
      const onApprove = vi.fn();
      render(<PhaseItem {...defaultProps} status="generated" onApprove={onApprove} />);
      fireEvent.click(screen.getByText('承認'));
      expect(onApprove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Approve and Execute button', () => {
    it('should show approve and execute button when previous phase is generated and current is pending', () => {
      render(
        <PhaseItem
          {...defaultProps}
          previousStatus="generated"
          status="pending"
          canExecute={true}
        />
      );
      expect(screen.getByTestId('phase-button-approve-and-execute-requirements')).toBeInTheDocument();
    });

    it('should call onApproveAndExecute when button is clicked', () => {
      const onApproveAndExecute = vi.fn();
      render(
        <PhaseItem
          {...defaultProps}
          previousStatus="generated"
          status="pending"
          canExecute={true}
          onApproveAndExecute={onApproveAndExecute}
        />
      );
      fireEvent.click(screen.getByTestId('phase-button-approve-and-execute-requirements'));
      expect(onApproveAndExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto execution permission toggle', () => {
    it('should show permitted icon when auto execution is permitted', () => {
      render(<PhaseItem {...defaultProps} autoExecutionPermitted={true} />);
      expect(screen.getByTestId('auto-permitted-icon')).toBeInTheDocument();
    });

    it('should show forbidden icon when auto execution is not permitted', () => {
      render(<PhaseItem {...defaultProps} autoExecutionPermitted={false} />);
      expect(screen.getByTestId('auto-forbidden-icon')).toBeInTheDocument();
    });

    it('should call onToggleAutoPermission when toggle is clicked', () => {
      const onToggleAutoPermission = vi.fn();
      render(<PhaseItem {...defaultProps} onToggleAutoPermission={onToggleAutoPermission} />);
      fireEvent.click(screen.getByTestId('auto-permission-toggle'));
      expect(onToggleAutoPermission).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto phase highlight', () => {
    it('should have highlight styling when isAutoPhase is true', () => {
      render(<PhaseItem {...defaultProps} isAutoPhase={true} />);
      const phaseItem = screen.getByTestId('phase-item-requirements');
      expect(phaseItem.className).toContain('ring');
    });
  });

  describe('Agent Icon in execute button (agent-button-icon-unification)', () => {
    it('should show AgentIcon (Bot icon) in execute button', () => {
      render(<PhaseItem {...defaultProps} status="pending" canExecute={true} />);
      const button = screen.getByTestId('phase-button-requirements');
      // Check that the button contains a Bot icon (AgentIcon component)
      const svgs = button.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should NOT use Play icon in execute button (replaced with AgentIcon)', () => {
      render(<PhaseItem {...defaultProps} status="pending" canExecute={true} />);
      const button = screen.getByTestId('phase-button-requirements');
      // AgentIcon uses Bot which is different from Play
      // The AgentIcon applies AGENT_ICON_COLOR (text-white) by default
      const svg = button.querySelector('svg');
      expect(svg).not.toBeNull();
      // Verify it's styled as AgentIcon (white color on blue button background)
      const classNames = svg?.getAttribute('class') || '';
      expect(classNames).toContain('text-white');
    });

    it('should keep auto execution toggle with PlayCircle icon unchanged', () => {
      render(<PhaseItem {...defaultProps} autoExecutionPermitted={true} />);
      // PlayCircle is used for auto-permitted-icon (not changed)
      expect(screen.getByTestId('auto-permitted-icon')).toBeInTheDocument();
    });

    it('should keep executing status icon unchanged (Bot with animate-pulse)', () => {
      render(<PhaseItem {...defaultProps} isExecuting={true} />);
      const executingIcon = screen.getByTestId('progress-icon-executing');
      expect(executingIcon).toBeInTheDocument();
      const classNames = executingIcon.getAttribute('class') || '';
      expect(classNames).toContain('animate-pulse');
      expect(classNames).toContain('text-blue-500');
    });
  });
});
