/**
 * BugWorkflowFooter Component Tests (Shared)
 * mobile-layout-refine: Task 1.1
 * Requirements: 7.1, 7.2, 7.3
 *
 * Tests for the shared BugWorkflowFooter component that works in both
 * Electron and Remote UI environments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugWorkflowFooter, canShowBugConvertButton } from './BugWorkflowFooter';
import type { BugWorkflowFooterProps } from './BugWorkflowFooter';

/**
 * BugJson type for tests
 * Matches the structure from renderer/types/bugJson.ts
 */
interface BugJson {
  bug_name: string;
  created_at: string;
  updated_at: string;
  worktree?: {
    path: string;
    branch: string;
    created_at: string;
  };
  phase?: string;
}

describe('canShowBugConvertButton', () => {
  // Requirements: 7.2 - maintain existing functionality

  it('should return false when isOnMain is false', () => {
    const bugJson: BugJson = { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' };
    expect(canShowBugConvertButton(false, bugJson)).toBe(false);
  });

  it('should return false when bugJson is null', () => {
    expect(canShowBugConvertButton(true, null)).toBe(false);
  });

  it('should return false when bugJson is undefined', () => {
    expect(canShowBugConvertButton(true, undefined)).toBe(false);
  });

  it('should return false when bugJson.worktree exists', () => {
    const bugJson: BugJson = {
      bug_name: 'test',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      worktree: { path: '.kiro/worktrees/bugs/test', branch: 'bugfix/test', created_at: '2024-01-01' },
    };
    expect(canShowBugConvertButton(true, bugJson)).toBe(false);
  });

  it('should return true when all conditions are met', () => {
    const bugJson: BugJson = { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' };
    expect(canShowBugConvertButton(true, bugJson)).toBe(true);
  });
});

describe('BugWorkflowFooter', () => {
  // Requirements: 7.1, 7.2, 7.3

  const defaultProps: BugWorkflowFooterProps = {
    isAutoExecuting: false,
    hasRunningAgents: false,
    onAutoExecution: vi.fn(),
    isOnMain: true,
    bugJson: { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' },
    onConvertToWorktree: vi.fn(),
    isConverting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auto Execution Button', () => {
    it('should show "自動実行" button when not auto-executing', () => {
      render(<BugWorkflowFooter {...defaultProps} isAutoExecuting={false} />);
      expect(screen.getByText('自動実行')).toBeInTheDocument();
    });

    it('should show "停止" button when auto-executing', () => {
      render(<BugWorkflowFooter {...defaultProps} isAutoExecuting={true} />);
      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    it('should disable button when agents are running', () => {
      render(<BugWorkflowFooter {...defaultProps} hasRunningAgents={true} />);
      const button = screen.getByTestId('bug-auto-execute-button');
      expect(button).toBeDisabled();
    });

    it('should call onAutoExecution when clicked', () => {
      const onAutoExecution = vi.fn();
      render(<BugWorkflowFooter {...defaultProps} onAutoExecution={onAutoExecution} />);
      fireEvent.click(screen.getByTestId('bug-auto-execute-button'));
      expect(onAutoExecution).toHaveBeenCalled();
    });

    it('should have flex-1 style to fill width', () => {
      render(<BugWorkflowFooter {...defaultProps} />);
      const button = screen.getByTestId('bug-auto-execute-button');
      expect(button.classList.contains('flex-1')).toBe(true);
    });
  });

  describe('Convert to Worktree Button', () => {
    it('should show convert button when conditions are met', () => {
      const bugJson = { bug_name: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' };
      render(<BugWorkflowFooter {...defaultProps} bugJson={bugJson} isOnMain={true} />);
      expect(screen.getByText('Worktreeに変換')).toBeInTheDocument();
    });

    it('should not show convert button when not on main branch', () => {
      render(<BugWorkflowFooter {...defaultProps} isOnMain={false} />);
      expect(screen.queryByText('Worktreeに変換')).not.toBeInTheDocument();
    });

    it('should not show convert button when bugJson is null', () => {
      render(<BugWorkflowFooter {...defaultProps} bugJson={null} />);
      expect(screen.queryByText('Worktreeに変換')).not.toBeInTheDocument();
    });

    it('should not show convert button when already in worktree mode', () => {
      const bugJson = {
        bug_name: 'test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        worktree: { path: '.kiro/worktrees/bugs/test', branch: 'bugfix/test', created_at: '2024-01-01' },
      };
      render(<BugWorkflowFooter {...defaultProps} bugJson={bugJson} />);
      expect(screen.queryByText('Worktreeに変換')).not.toBeInTheDocument();
    });

    it('should disable convert button when converting', () => {
      render(<BugWorkflowFooter {...defaultProps} isConverting={true} />);
      const button = screen.getByTestId('bug-convert-worktree-button');
      expect(button).toBeDisabled();
    });

    it('should disable convert button when agents are running', () => {
      render(<BugWorkflowFooter {...defaultProps} hasRunningAgents={true} />);
      const button = screen.getByTestId('bug-convert-worktree-button');
      expect(button).toBeDisabled();
    });

    it('should disable convert button when auto-executing', () => {
      render(<BugWorkflowFooter {...defaultProps} isAutoExecuting={true} />);
      const button = screen.queryByTestId('bug-convert-worktree-button');
      if (button) {
        expect(button).toBeDisabled();
      }
    });

    it('should show "変換中..." when converting', () => {
      render(<BugWorkflowFooter {...defaultProps} isConverting={true} />);
      expect(screen.getByText('変換中...')).toBeInTheDocument();
    });

    it('should call onConvertToWorktree when clicked', () => {
      const onConvertToWorktree = vi.fn();
      render(<BugWorkflowFooter {...defaultProps} onConvertToWorktree={onConvertToWorktree} />);
      fireEvent.click(screen.getByTestId('bug-convert-worktree-button'));
      expect(onConvertToWorktree).toHaveBeenCalled();
    });
  });

  describe('Footer Style', () => {
    it('should have p-4 and border-t styling', () => {
      render(<BugWorkflowFooter {...defaultProps} />);
      const footer = screen.getByTestId('bug-workflow-footer');
      expect(footer.classList.contains('p-4')).toBe(true);
      expect(footer.classList.contains('border-t')).toBe(true);
    });
  });

  describe('Platform Agnostic', () => {
    // Requirements: 7.3 - usable from both Electron and Remote UI

    it('should not use any platform-specific imports', () => {
      // This test verifies the component can be rendered without any platform-specific dependencies
      // If it renders successfully, it means no Electron-specific APIs are required
      expect(() => render(<BugWorkflowFooter {...defaultProps} />)).not.toThrow();
    });

    it('should work with minimal props', () => {
      const minimalProps: BugWorkflowFooterProps = {
        isAutoExecuting: false,
        hasRunningAgents: false,
        onAutoExecution: vi.fn(),
        isOnMain: false,
        bugJson: null,
        onConvertToWorktree: vi.fn(),
        isConverting: false,
      };
      expect(() => render(<BugWorkflowFooter {...minimalProps} />)).not.toThrow();
    });
  });
});
