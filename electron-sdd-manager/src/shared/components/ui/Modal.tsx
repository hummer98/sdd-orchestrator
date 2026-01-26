/**
 * Modal Component
 * Shared modal/dialog component used by both Electron and Remote UI
 * Requirements: 3.1 (Component sharing)
 */

import React from 'react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Called when the modal should close
   */
  onClose: () => void;

  /**
   * Modal size
   * @default 'md'
   */
  size?: ModalSize;

  /**
   * Whether clicking the backdrop closes the modal
   * @default true
   */
  closeOnBackdrop?: boolean;

  /**
   * ARIA labelledby attribute
   */
  'aria-labelledby'?: string;

  /**
   * Additional CSS classes for the modal container
   */
  className?: string;

  /**
   * Modal content
   */
  children: React.ReactNode;
}

// =============================================================================
// Size Styles
// =============================================================================

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

// =============================================================================
// Modal
// =============================================================================

/**
 * Modal - Dialog component with backdrop
 *
 * Usage:
 * ```tsx
 * <Modal isOpen={isOpen} onClose={handleClose}>
 *   <ModalHeader>
 *     <ModalTitle>Title</ModalTitle>
 *   </ModalHeader>
 *   <ModalContent>Content here</ModalContent>
 *   <ModalFooter>
 *     <Button onClick={handleClose}>Close</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  size = 'md',
  closeOnBackdrop = true,
  'aria-labelledby': ariaLabelledby,
  className,
  children,
}: ModalProps): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        data-testid="modal-container"
        className={clsx(
          'relative z-10 w-full p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900',
          sizeStyles[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// ModalHeader
// =============================================================================

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * ModalHeader - Header section of a modal
 */
export function ModalHeader({
  className,
  children,
  ...props
}: ModalHeaderProps): React.ReactElement {
  return (
    <div
      className={clsx('mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// ModalTitle
// =============================================================================

export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * ModalTitle - Title component for modal headers
 */
export function ModalTitle({
  className,
  children,
  ...props
}: ModalTitleProps): React.ReactElement {
  return (
    <h2
      className={clsx(
        'text-xl font-bold',
        'text-gray-800 dark:text-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

// =============================================================================
// ModalContent
// =============================================================================

export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * ModalContent - Main content area of a modal
 */
export function ModalContent({
  className,
  children,
  ...props
}: ModalContentProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'text-gray-600 dark:text-gray-400',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// ModalFooter
// =============================================================================

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * ModalFooter - Footer section of a modal (for action buttons)
 */
export function ModalFooter({
  className,
  children,
  ...props
}: ModalFooterProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'mt-6 flex justify-end gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
