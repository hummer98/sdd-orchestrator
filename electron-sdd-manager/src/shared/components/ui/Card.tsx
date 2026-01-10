/**
 * Card Component
 * Shared card component used by both Electron and Remote UI
 * Requirements: 3.1 (Component sharing)
 */

import React from 'react';
import { clsx } from 'clsx';

// =============================================================================
// Card
// =============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Padding variant
   * @default 'default'
   */
  padding?: 'none' | 'default';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Card content
   */
  children: React.ReactNode;
}

/**
 * Card - Container component with border and shadow
 */
export function Card({
  padding = 'default',
  className,
  children,
  ...props
}: CardProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'rounded-lg border',
        'bg-white dark:bg-gray-900',
        'border-gray-200 dark:border-gray-700',
        'shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CardHeader
// =============================================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * CardHeader - Header section of a card
 */
export function CardHeader({
  className,
  children,
  ...props
}: CardHeaderProps): React.ReactElement {
  return (
    <div
      className={clsx('p-4 space-y-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CardTitle
// =============================================================================

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Heading level
   * @default 'h3'
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  className?: string;
  children: React.ReactNode;
}

/**
 * CardTitle - Title component for card headers
 */
export function CardTitle({
  as: Component = 'h3',
  className,
  children,
  ...props
}: CardTitleProps): React.ReactElement {
  return (
    <Component
      className={clsx(
        'text-lg font-semibold',
        'text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// =============================================================================
// CardDescription
// =============================================================================

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * CardDescription - Description text for card headers
 */
export function CardDescription({
  className,
  children,
  ...props
}: CardDescriptionProps): React.ReactElement {
  return (
    <p
      className={clsx(
        'text-sm',
        'text-gray-500 dark:text-gray-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// =============================================================================
// CardContent
// =============================================================================

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * CardContent - Main content area of a card
 */
export function CardContent({
  className,
  children,
  ...props
}: CardContentProps): React.ReactElement {
  return (
    <div
      className={clsx('p-4 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CardFooter
// =============================================================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/**
 * CardFooter - Footer section of a card
 */
export function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'p-4 pt-0',
        'border-t border-gray-200 dark:border-gray-700',
        'flex items-center gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
