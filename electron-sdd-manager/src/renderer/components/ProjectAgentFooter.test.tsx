/**
 * ProjectAgentFooter Component Tests
 * project-agent-release-footer: Task 1.1, 1.2, 3.1
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectAgentFooter } from './ProjectAgentFooter';

describe('ProjectAgentFooter', () => {
  const defaultProps = {
    onRelease: vi.fn(),
    isReleaseRunning: false,
    currentProject: '/path/to/project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 1.1: Basic Structure and Release Button', () => {
    it('should render footer with p-4 and border-t styling', () => {
      // Requirements: 1.3, 1.4
      render(<ProjectAgentFooter {...defaultProps} />);
      const footer = screen.getByTestId('project-agent-footer');
      expect(footer.classList.contains('p-4')).toBe(true);
      expect(footer.classList.contains('border-t')).toBe(true);
    });

    it('should render release button with Bot icon and "release" text', () => {
      // Requirements: 2.1, 2.4
      render(<ProjectAgentFooter {...defaultProps} />);
      expect(screen.getByText('release')).toBeInTheDocument();
      // Bot icon is rendered (SVG element)
      const button = screen.getByTestId('release-button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render button with flex-1 style to fill width', () => {
      // Requirements: 2.2
      render(<ProjectAgentFooter {...defaultProps} />);
      const button = screen.getByTestId('release-button');
      expect(button.classList.contains('flex-1')).toBe(true);
    });

    it('should call onRelease when button is clicked', () => {
      // Requirements: 2.3
      const onRelease = vi.fn();
      render(<ProjectAgentFooter {...defaultProps} onRelease={onRelease} />);
      fireEvent.click(screen.getByTestId('release-button'));
      expect(onRelease).toHaveBeenCalledTimes(1);
    });

    it('should accept onRelease and isReleaseRunning props', () => {
      // Requirements: 1.2
      const onRelease = vi.fn();
      // TypeScript compilation would fail if props are not correctly typed
      render(
        <ProjectAgentFooter
          onRelease={onRelease}
          isReleaseRunning={true}
          currentProject="/path/to/project"
        />
      );
      // Component renders without error
      expect(screen.getByTestId('project-agent-footer')).toBeInTheDocument();
    });
  });

  describe('Task 1.2: Disabled State and Tooltip', () => {
    it('should disable button when isReleaseRunning is true', () => {
      // Requirements: 3.1
      render(<ProjectAgentFooter {...defaultProps} isReleaseRunning={true} />);
      const button = screen.getByTestId('release-button');
      expect(button).toBeDisabled();
    });

    it('should disable button when currentProject is null', () => {
      // Requirements: 3.1 (extended for project selection)
      render(<ProjectAgentFooter {...defaultProps} currentProject={null} />);
      const button = screen.getByTestId('release-button');
      expect(button).toBeDisabled();
    });

    it('should disable button when currentProject is undefined', () => {
      // Requirements: 3.1 (extended for project selection)
      render(<ProjectAgentFooter {...defaultProps} currentProject={undefined} />);
      const button = screen.getByTestId('release-button');
      expect(button).toBeDisabled();
    });

    it('should show "release実行中" tooltip when isReleaseRunning is true', () => {
      // Requirements: 3.2
      render(<ProjectAgentFooter {...defaultProps} isReleaseRunning={true} />);
      const button = screen.getByTestId('release-button');
      expect(button.getAttribute('title')).toBe('release実行中');
    });

    it('should show "プロジェクト未選択" tooltip when currentProject is null', () => {
      // Requirements: 3.2 (extended for project selection)
      render(<ProjectAgentFooter {...defaultProps} currentProject={null} />);
      const button = screen.getByTestId('release-button');
      expect(button.getAttribute('title')).toBe('プロジェクト未選択');
    });

    it('should apply disabled visual styling when disabled', () => {
      // Requirements: 3.3
      render(<ProjectAgentFooter {...defaultProps} isReleaseRunning={true} />);
      const button = screen.getByTestId('release-button');
      expect(button.classList.contains('cursor-not-allowed')).toBe(true);
      // Check for gray styling instead of blue
      expect(button.classList.contains('bg-gray-300')).toBe(true);
      expect(button.classList.contains('bg-blue-500')).toBe(false);
    });

    it('should not call onRelease when button is disabled', () => {
      // Requirements: 3.1
      const onRelease = vi.fn();
      render(<ProjectAgentFooter {...defaultProps} onRelease={onRelease} isReleaseRunning={true} />);
      fireEvent.click(screen.getByTestId('release-button'));
      expect(onRelease).not.toHaveBeenCalled();
    });

    it('should enable button when isReleaseRunning is false and currentProject is set', () => {
      // Verify normal state
      render(<ProjectAgentFooter {...defaultProps} />);
      const button = screen.getByTestId('release-button');
      expect(button).not.toBeDisabled();
      expect(button.getAttribute('title')).toBeNull();
    });

    it('should prioritize "release実行中" tooltip when both conditions are disabled', () => {
      // When both isReleaseRunning and no currentProject, show release running message
      render(<ProjectAgentFooter {...defaultProps} isReleaseRunning={true} currentProject={null} />);
      const button = screen.getByTestId('release-button');
      expect(button.getAttribute('title')).toBe('release実行中');
    });
  });
});
