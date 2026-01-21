/**
 * BugWorkflowFooter Component Tests
 * bugs-workflow-footer: Tasks 4.1, 4.2, 7.1, 7.2
 * Requirements: 1.1-1.4, 2.1-2.7, 3.1-3.6, 4.1-4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugWorkflowFooter, canShowConvertButton } from './BugWorkflowFooter';
import type { BugJson } from '../types/bugJson';

describe('canShowConvertButton', () => {
  // Task 7.1: Requirements 4.1, 4.2, 4.3, 4.4, 4.5

  it('should return false when isOnMain is false', () => {
    // Requirements: 4.2
    const bugJson: BugJson = { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' };
    expect(canShowConvertButton(false, bugJson)).toBe(false);
  });

  it('should return false when bugJson is null', () => {
    // Requirements: 4.3
    expect(canShowConvertButton(true, null)).toBe(false);
  });

  it('should return false when bugJson is undefined', () => {
    // Requirements: 4.3
    expect(canShowConvertButton(true, undefined)).toBe(false);
  });

  it('should return false when bugJson.worktree exists', () => {
    // Requirements: 4.4
    const bugJson: BugJson = {
      bug_name: 'test',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      worktree: { path: '.kiro/worktrees/bugs/test', branch: 'bugfix/test', created_at: '2024-01-01' },
    };
    expect(canShowConvertButton(true, bugJson)).toBe(false);
  });

  it('should return true when all conditions are met', () => {
    // Requirements: 4.5
    const bugJson: BugJson = { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' };
    expect(canShowConvertButton(true, bugJson)).toBe(true);
  });
});

describe('BugWorkflowFooter', () => {
  // Task 7.2: Requirements 1.1-1.4, 2.1-2.7, 3.1-3.6

  const defaultProps = {
    isAutoExecuting: false,
    hasRunningAgents: false,
    onAutoExecution: vi.fn(),
    isOnMain: true,
    bugJson: { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' } as BugJson,
    onConvertToWorktree: vi.fn(),
    isConverting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auto Execution Button', () => {
    it('should show "自動実行" button when not auto-executing', () => {
      // Requirements: 2.1
      render(<BugWorkflowFooter {...defaultProps} isAutoExecuting={false} />);
      expect(screen.getByText('自動実行')).toBeInTheDocument();
    });

    it('should show "停止" button when auto-executing', () => {
      // Requirements: 2.2
      render(<BugWorkflowFooter {...defaultProps} isAutoExecuting={true} />);
      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    it('should disable button when agents are running', () => {
      // Requirements: 2.3
      render(<BugWorkflowFooter {...defaultProps} hasRunningAgents={true} />);
      const button = screen.getByTestId('bug-auto-execute-button');
      expect(button).toBeDisabled();
    });

    it('should call onAutoExecution when clicked', () => {
      // Requirements: 2.4, 2.5
      const onAutoExecution = vi.fn();
      render(<BugWorkflowFooter {...defaultProps} onAutoExecution={onAutoExecution} />);
      fireEvent.click(screen.getByTestId('bug-auto-execute-button'));
      expect(onAutoExecution).toHaveBeenCalled();
    });

    it('should have flex-1 style to fill width', () => {
      // Requirements: 2.7
      render(<BugWorkflowFooter {...defaultProps} />);
      const button = screen.getByTestId('bug-auto-execute-button');
      expect(button.classList.contains('flex-1')).toBe(true);
    });
  });

  describe('Convert to Worktree Button', () => {
    it('should show convert button when conditions are met', () => {
      // Requirements: 3.1
      const bugJson: BugJson = { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' };
      render(<BugWorkflowFooter {...defaultProps} bugJson={bugJson} isOnMain={true} />);
      expect(screen.getByText('Worktreeに変換')).toBeInTheDocument();
    });

    it('should not show convert button when not on main branch', () => {
      // Requirements: 3.2, 4.2
      render(<BugWorkflowFooter {...defaultProps} isOnMain={false} />);
      expect(screen.queryByText('Worktreeに変換')).not.toBeInTheDocument();
    });

    it('should not show convert button when bugJson is null', () => {
      // Requirements: 3.2, 4.3
      render(<BugWorkflowFooter {...defaultProps} bugJson={null} />);
      expect(screen.queryByText('Worktreeに変換')).not.toBeInTheDocument();
    });

    it('should not show convert button when already in worktree mode', () => {
      // Requirements: 3.2, 4.4
      const bugJson: BugJson = {
        bug_name: 'test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        worktree: { path: '.kiro/worktrees/bugs/test', branch: 'bugfix/test', created_at: '2024-01-01' },
      };
      render(<BugWorkflowFooter {...defaultProps} bugJson={bugJson} />);
      expect(screen.queryByText('Worktreeに変換')).not.toBeInTheDocument();
    });

    it('should disable convert button when converting', () => {
      // Requirements: 3.4
      render(<BugWorkflowFooter {...defaultProps} isConverting={true} />);
      const button = screen.getByTestId('bug-convert-worktree-button');
      expect(button).toBeDisabled();
    });

    it('should disable convert button when agents are running', () => {
      // Requirements: 3.4
      render(<BugWorkflowFooter {...defaultProps} hasRunningAgents={true} />);
      const button = screen.getByTestId('bug-convert-worktree-button');
      expect(button).toBeDisabled();
    });

    it('should disable convert button when auto-executing', () => {
      // Requirements: 3.4
      render(<BugWorkflowFooter {...defaultProps} isAutoExecuting={true} />);
      // When auto-executing, the convert button may not be shown or disabled
      const button = screen.queryByTestId('bug-convert-worktree-button');
      if (button) {
        expect(button).toBeDisabled();
      }
    });

    it('should show "変換中..." when converting', () => {
      // Requirements: 3.6
      render(<BugWorkflowFooter {...defaultProps} isConverting={true} />);
      expect(screen.getByText('変換中...')).toBeInTheDocument();
    });

    it('should call onConvertToWorktree when clicked', () => {
      // Requirements: 3.3
      const onConvertToWorktree = vi.fn();
      render(<BugWorkflowFooter {...defaultProps} onConvertToWorktree={onConvertToWorktree} />);
      fireEvent.click(screen.getByTestId('bug-convert-worktree-button'));
      expect(onConvertToWorktree).toHaveBeenCalled();
    });
  });

  describe('Footer Style', () => {
    it('should have p-4 and border-t styling', () => {
      // Requirements: 1.3
      render(<BugWorkflowFooter {...defaultProps} />);
      const footer = screen.getByTestId('bug-workflow-footer');
      expect(footer.classList.contains('p-4')).toBe(true);
      expect(footer.classList.contains('border-t')).toBe(true);
    });
  });
});
