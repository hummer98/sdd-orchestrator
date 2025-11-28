/**
 * ArtifactPreview Component Tests
 * TDD: Testing artifact preview display
 * Requirements: 10.1, 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactPreview } from './ArtifactPreview';
import type { ArtifactInfo } from '../types';

describe('ArtifactPreview', () => {
  const mockArtifacts = {
    requirements: {
      exists: true,
      updatedAt: '2024-01-01T00:00:00Z',
      content: '# Requirements\n\nThis is the requirements document.',
    } as ArtifactInfo,
    design: {
      exists: true,
      updatedAt: '2024-01-02T00:00:00Z',
      content: '# Design\n\nThis is the design document.',
    } as ArtifactInfo,
    tasks: null as ArtifactInfo | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 6.1: Artifact list display
  // Requirements: 10.1, 10.2, 10.3
  // ============================================================
  describe('Task 6.1: Artifact list display', () => {
    describe('artifact list', () => {
      it('should display requirements.md in the list', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        expect(screen.getByText('requirements.md')).toBeInTheDocument();
      });

      it('should display design.md in the list', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        expect(screen.getByText('design.md')).toBeInTheDocument();
      });

      it('should display tasks.md in the list', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        expect(screen.getByText('tasks.md')).toBeInTheDocument();
      });
    });

    describe('accordion behavior', () => {
      it('should expand content when clicked', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        const requirementsButton = screen.getByText('requirements.md').closest('button');
        fireEvent.click(requirementsButton!);

        expect(screen.getByText('Requirements')).toBeInTheDocument();
      });

      it('should collapse content when clicked again', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        const requirementsButton = screen.getByText('requirements.md').closest('button');
        fireEvent.click(requirementsButton!); // expand
        fireEvent.click(requirementsButton!); // collapse

        // Content should be hidden (not in DOM or collapsed)
        // Since it's a toggle, let's check the accordion state
        // The content area should be collapsed
        const contentAreas = screen.queryAllByTestId('artifact-content');
        // After collapsing, should have no visible content
        expect(contentAreas.length).toBe(0);
      });

      it('should allow expanding multiple artifacts', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        const requirementsButton = screen.getByText('requirements.md').closest('button');
        const designButton = screen.getByText('design.md').closest('button');

        fireEvent.click(requirementsButton!);
        fireEvent.click(designButton!);

        expect(screen.getByText('Requirements')).toBeInTheDocument();
        expect(screen.getByText('Design')).toBeInTheDocument();
      });
    });

    describe('missing artifacts', () => {
      it('should display "not created" label for missing artifacts', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        // tasks is null, should show "not created" label
        expect(screen.getByText('未作成')).toBeInTheDocument();
      });

      it('should disable click for missing artifacts', () => {
        render(<ArtifactPreview artifacts={mockArtifacts} />);

        const tasksButton = screen.getByText('tasks.md').closest('button');
        expect(tasksButton).toBeDisabled();
      });
    });

    describe('artifact with no content', () => {
      it('should disable click for artifacts with no content', () => {
        const artifactsNoContent = {
          ...mockArtifacts,
          requirements: { exists: true, updatedAt: null, content: undefined } as ArtifactInfo,
        };
        render(<ArtifactPreview artifacts={artifactsNoContent} />);

        const requirementsButton = screen.getByText('requirements.md').closest('button');
        expect(requirementsButton).toBeDisabled();
      });
    });
  });
});
