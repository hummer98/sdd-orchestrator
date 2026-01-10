/**
 * Modal Component Tests
 * TDD: Test-first implementation for shared Modal component
 * Requirements: 3.1 (Component sharing)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from './Modal';

describe('Modal', () => {
  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });
  });

  describe('Backdrop', () => {
    it('should render backdrop when open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when closeOnBackdrop is false', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeOnBackdrop={false}>
          <div>Content</div>
        </Modal>
      );
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Size', () => {
    it('should render with default size (md)', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div data-testid="modal-dialog">Content</div>
        </Modal>
      );
      const container = screen.getByTestId('modal-container');
      expect(container.className).toContain('max-w-md');
    });

    it('should render with small size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="sm">
          <div>Content</div>
        </Modal>
      );
      const container = screen.getByTestId('modal-container');
      expect(container.className).toContain('max-w-sm');
    });

    it('should render with large size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          <div>Content</div>
        </Modal>
      );
      const container = screen.getByTestId('modal-container');
      expect(container.className).toContain('max-w-lg');
    });

    it('should render with xl size', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} size="xl">
          <div>Content</div>
        </Modal>
      );
      const container = screen.getByTestId('modal-container');
      expect(container.className).toContain('max-w-xl');
    });
  });

  describe('Composition', () => {
    it('should render header, content, and footer', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalHeader>
            <ModalTitle>Modal Title</ModalTitle>
          </ModalHeader>
          <ModalContent>Modal body content</ModalContent>
          <ModalFooter>Footer actions</ModalFooter>
        </Modal>
      );

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
      expect(screen.getByText('Footer actions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should support aria-labelledby', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} aria-labelledby="title">
          <ModalHeader>
            <ModalTitle id="title">Modal Title</ModalTitle>
          </ModalHeader>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'title');
    });
  });
});
