/**
 * LogEntryErrorBoundary tests
 * Verifies error boundary catches rendering errors without affecting siblings.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogEntryErrorBoundary } from './LogEntryErrorBoundary';

/** Component that always throws during render */
function ThrowingChild(): React.ReactElement {
  throw new Error('Render explosion');
}

/** Normal component */
function GoodChild(): React.ReactElement {
  return <div data-testid="good-child">Normal content</div>;
}

describe('LogEntryErrorBoundary', () => {
  // Suppress React error boundary console output during tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children normally when no error', () => {
    render(
      <LogEntryErrorBoundary entryId="test-1">
        <GoodChild />
      </LogEntryErrorBoundary>
    );

    expect(screen.getByTestId('good-child')).toBeInTheDocument();
    expect(screen.queryByTestId('log-entry-error')).not.toBeInTheDocument();
  });

  it('should catch rendering errors and show error indicator', () => {
    render(
      <LogEntryErrorBoundary entryId="broken-entry">
        <ThrowingChild />
      </LogEntryErrorBoundary>
    );

    expect(screen.getByTestId('log-entry-error')).toBeInTheDocument();
    expect(screen.getByText(/ログエントリの表示に失敗しました/)).toBeInTheDocument();
    expect(screen.getByText(/Render explosion/)).toBeInTheDocument();
  });

  it('should not affect sibling entries when one entry fails', () => {
    render(
      <div>
        <LogEntryErrorBoundary entryId="good-1">
          <GoodChild />
        </LogEntryErrorBoundary>
        <LogEntryErrorBoundary entryId="broken">
          <ThrowingChild />
        </LogEntryErrorBoundary>
        <LogEntryErrorBoundary entryId="good-2">
          <div data-testid="good-sibling">Still works</div>
        </LogEntryErrorBoundary>
      </div>
    );

    // Good siblings should still render
    expect(screen.getByTestId('good-child')).toBeInTheDocument();
    expect(screen.getByTestId('good-sibling')).toBeInTheDocument();

    // Broken entry should show error
    expect(screen.getByTestId('log-entry-error')).toBeInTheDocument();
  });
});
