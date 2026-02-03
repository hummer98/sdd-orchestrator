/**
 * ExternalChangeDialog Component Tests
 *
 * project-config-editor Task 3.3: External change notification dialog
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExternalChangeDialog } from '../ExternalChangeDialog';

describe('ExternalChangeDialog', () => {
  const defaultProps = {
    isOpen: true,
    fileName: 'CLAUDE.md',
    onReload: vi.fn(),
    onIgnore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <ExternalChangeDialog
        {...defaultProps}
        isOpen={false}
      />
    );

    expect(screen.queryByTestId('external-change-dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when isOpen is true', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    expect(screen.getByTestId('external-change-dialog')).toBeInTheDocument();
  });

  it('displays the changed file name', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
  });

  it('displays external change message in Japanese', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    expect(screen.getByText('外部で変更されました')).toBeInTheDocument();
    expect(screen.getByText(/が外部で変更されました/)).toBeInTheDocument();
  });

  it('has reload button', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    const reloadButton = screen.getByRole('button', { name: 'リロード' });
    expect(reloadButton).toBeInTheDocument();
  });

  it('has ignore button', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    const ignoreButton = screen.getByRole('button', { name: '無視' });
    expect(ignoreButton).toBeInTheDocument();
  });

  it('calls onReload when reload button is clicked', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    const reloadButton = screen.getByRole('button', { name: 'リロード' });
    fireEvent.click(reloadButton);

    expect(defaultProps.onReload).toHaveBeenCalledTimes(1);
  });

  it('calls onIgnore when ignore button is clicked', () => {
    render(<ExternalChangeDialog {...defaultProps} />);

    const ignoreButton = screen.getByRole('button', { name: '無視' });
    fireEvent.click(ignoreButton);

    expect(defaultProps.onIgnore).toHaveBeenCalledTimes(1);
  });

  it('displays different file names correctly', () => {
    render(
      <ExternalChangeDialog
        {...defaultProps}
        fileName="product.md"
      />
    );

    expect(screen.getByText('product.md')).toBeInTheDocument();
  });
});
