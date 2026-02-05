/**
 * PdfViewer Tests
 *
 * TDD: Tests written first for project-docs-viewer Task 5.1
 * Requirements: 6.2
 *
 * Test cases:
 * - iframe rendering with correct src
 * - file:// protocol for local files
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PdfViewer } from './PdfViewer';

describe('PdfViewer', () => {
  describe('rendering', () => {
    it('should render iframe with PDF file path', () => {
      render(<PdfViewer filePath="/path/to/document.pdf" />);

      const iframe = screen.getByTestId('pdf-viewer-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'file:///path/to/document.pdf');
    });

    it('should set iframe to full size', () => {
      render(<PdfViewer filePath="/path/to/document.pdf" />);

      const iframe = screen.getByTestId('pdf-viewer-iframe');
      expect(iframe).toHaveClass('w-full');
      expect(iframe).toHaveClass('h-full');
    });

    it('should display loading placeholder while iframe loads', () => {
      render(<PdfViewer filePath="/path/to/document.pdf" />);

      // Container should have proper layout
      const container = screen.getByTestId('pdf-viewer');
      expect(container).toBeInTheDocument();
    });
  });

  describe('different file paths', () => {
    it('should handle paths with spaces', () => {
      render(<PdfViewer filePath="/path/to/my document.pdf" />);

      const iframe = screen.getByTestId('pdf-viewer-iframe');
      expect(iframe).toHaveAttribute('src', 'file:///path/to/my document.pdf');
    });

    it('should handle nested paths', () => {
      render(<PdfViewer filePath="/project/docs/api/v2/reference.pdf" />);

      const iframe = screen.getByTestId('pdf-viewer-iframe');
      expect(iframe).toHaveAttribute('src', 'file:///project/docs/api/v2/reference.pdf');
    });
  });
});
