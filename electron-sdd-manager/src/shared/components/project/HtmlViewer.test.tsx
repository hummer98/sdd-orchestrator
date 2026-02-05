/**
 * HtmlViewer Tests
 *
 * TDD: Tests written first for project-docs-viewer Task 5.2
 * Requirements: 6.3
 *
 * Test cases:
 * - iframe rendering with sandbox attribute
 * - srcdoc usage for HTML content
 * - Security: script execution disabled
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HtmlViewer } from './HtmlViewer';

describe('HtmlViewer', () => {
  describe('rendering', () => {
    it('should render iframe with HTML content', () => {
      const content = '<h1>Hello World</h1>';
      render(<HtmlViewer content={content} />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('srcdoc', content);
    });

    it('should set iframe to full size', () => {
      render(<HtmlViewer content="<p>Test</p>" />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      expect(iframe).toHaveClass('w-full');
      expect(iframe).toHaveClass('h-full');
    });
  });

  describe('security', () => {
    // Requirement: sandbox="allow-same-origin" for security
    it('should have sandbox attribute with allow-same-origin', () => {
      render(<HtmlViewer content="<p>Test</p>" />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
    });

    it('should NOT allow scripts (no allow-scripts in sandbox)', () => {
      render(<HtmlViewer content="<script>alert('xss')</script>" />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      const sandbox = iframe.getAttribute('sandbox');
      expect(sandbox).not.toContain('allow-scripts');
    });

    it('should NOT allow forms (no allow-forms in sandbox)', () => {
      render(<HtmlViewer content="<form>...</form>" />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      const sandbox = iframe.getAttribute('sandbox');
      expect(sandbox).not.toContain('allow-forms');
    });

    it('should NOT allow popups (no allow-popups in sandbox)', () => {
      render(<HtmlViewer content="<a target='_blank'>...</a>" />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      const sandbox = iframe.getAttribute('sandbox');
      expect(sandbox).not.toContain('allow-popups');
    });
  });

  describe('different content', () => {
    it('should handle complex HTML content', () => {
      const content = `
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body><h1>Title</h1><p>Content</p></body>
        </html>
      `;
      render(<HtmlViewer content={content} />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      expect(iframe).toHaveAttribute('srcdoc', content);
    });

    it('should handle empty content', () => {
      render(<HtmlViewer content="" />);

      const iframe = screen.getByTestId('html-viewer-iframe');
      expect(iframe).toHaveAttribute('srcdoc', '');
    });
  });
});
