/**
 * SessionInfoBlock tests
 * Task 5.6: cwd, model, version display and visual distinction tests
 * Requirements: 5.1, 5.2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionInfoBlock } from './SessionInfoBlock';

describe('SessionInfoBlock', () => {
  describe('session info display (Requirement 5.1)', () => {
    it('should display working directory', () => {
      render(
        <SessionInfoBlock
          session={{
            cwd: '/path/to/project',
          }}
        />
      );

      expect(screen.getByText('/path/to/project')).toBeInTheDocument();
    });

    it('should display model name', () => {
      render(
        <SessionInfoBlock
          session={{
            model: 'claude-3-opus-20240229',
          }}
        />
      );

      expect(screen.getByText(/claude-3-opus/)).toBeInTheDocument();
    });

    it('should display version', () => {
      render(
        <SessionInfoBlock
          session={{
            version: '1.2.3',
          }}
        />
      );

      expect(screen.getByText(/1.2.3/)).toBeInTheDocument();
    });

    it('should display all fields when provided', () => {
      render(
        <SessionInfoBlock
          session={{
            cwd: '/path/to/project',
            model: 'claude-3-opus-20240229',
            version: '1.2.3',
          }}
        />
      );

      expect(screen.getByText('/path/to/project')).toBeInTheDocument();
      expect(screen.getByText(/claude-3-opus/)).toBeInTheDocument();
      expect(screen.getByText(/1.2.3/)).toBeInTheDocument();
    });
  });

  describe('visual distinction (Requirement 5.2)', () => {
    it('should have distinct background color', () => {
      const { container } = render(
        <SessionInfoBlock
          session={{
            cwd: '/path/to/project',
          }}
        />
      );

      // Should have cyan/blue background for visual distinction
      const element = container.querySelector('[class*="bg-cyan"], [class*="bg-blue"]');
      expect(element).toBeInTheDocument();
    });

    it('should have session info icon', () => {
      render(
        <SessionInfoBlock
          session={{
            cwd: '/path/to/project',
          }}
        />
      );

      // Should have an icon
      expect(screen.getByTestId('session-info-icon')).toBeInTheDocument();
    });
  });

  describe('empty state handling', () => {
    it('should not render when all fields are undefined', () => {
      const { container } = render(
        <SessionInfoBlock
          session={{}}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when at least one field is defined', () => {
      render(
        <SessionInfoBlock
          session={{
            cwd: '/path/to/project',
          }}
        />
      );

      expect(screen.getByTestId('session-info-block')).toBeInTheDocument();
    });
  });

  describe('theme support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <SessionInfoBlock
          session={{
            cwd: '/path/to/project',
          }}
        />
      );

      // Check for dark: prefix classes
      const element = container.querySelector('[class*="dark:"]');
      expect(element).toBeInTheDocument();
    });
  });
});
