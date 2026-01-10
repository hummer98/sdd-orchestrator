/**
 * Card Component Tests
 * TDD: Test-first implementation for shared Card component
 * Requirements: 3.1 (Component sharing)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card', () => {
  describe('Card base', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should have default styling with rounded corners and shadow', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('rounded');
      expect(card.className).toContain('border');
    });

    it('should support custom className', () => {
      render(<Card className="custom-card">Content</Card>);
      expect(screen.getByText('Content').className).toContain('custom-card');
    });

    it('should support padding variant', () => {
      render(<Card padding="none" data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).not.toContain('p-');
    });
  });

  describe('CardHeader', () => {
    it('should render header content', () => {
      render(
        <Card>
          <CardHeader>Header content</CardHeader>
        </Card>
      );
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should have proper spacing', () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header</CardHeader>
        </Card>
      );
      expect(screen.getByTestId('header').className).toContain('p-');
    });
  });

  describe('CardTitle', () => {
    it('should render as heading', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>My Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = screen.getByText('My Title');
      expect(title.tagName).toBe('H3');
    });

    it('should support custom as prop', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle as="h2">My Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = screen.getByText('My Title');
      expect(title.tagName).toBe('H2');
    });
  });

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Description text</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should have muted text styling', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="desc">Description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByTestId('desc').className).toContain('text-gray');
    });
  });

  describe('CardContent', () => {
    it('should render content', () => {
      render(
        <Card>
          <CardContent>Main content</CardContent>
        </Card>
      );
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('should have proper padding', () => {
      render(
        <Card>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );
      expect(screen.getByTestId('content').className).toContain('p-');
    });
  });

  describe('CardFooter', () => {
    it('should render footer content', () => {
      render(
        <Card>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should have border-top styling', () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );
      expect(screen.getByTestId('footer').className).toContain('border-t');
    });
  });

  describe('Composition', () => {
    it('should render full card composition', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Main content here</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Main content here')).toBeInTheDocument();
      expect(screen.getByText('Footer actions')).toBeInTheDocument();
    });
  });
});
