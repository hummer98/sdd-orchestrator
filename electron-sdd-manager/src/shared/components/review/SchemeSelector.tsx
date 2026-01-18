/**
 * SchemeSelector Component
 * gemini-document-review Task 5.1
 * Requirements: 5.1, 9.4, 4.1, 4.2, 4.3, 4.4
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { getReviewEngine, getAvailableEngines, DEFAULT_REVIEWER_SCHEME } from '@shared/registry';
import type { ReviewerScheme } from '@shared/registry';

// Re-export type for consumers
export type { ReviewerScheme };

// ============================================================
// SchemeTag Component
// Requirements: 4.1, 4.2, 4.3, 4.4
// ============================================================

export interface SchemeTagProps {
  /** Current scheme */
  scheme?: ReviewerScheme;
  /** Additional class names */
  className?: string;
}

/**
 * Display tag showing current review engine
 * Shows Claude by default when scheme is undefined
 */
export function SchemeTag({ scheme, className }: SchemeTagProps): React.ReactElement {
  const engine = getReviewEngine(scheme);

  return (
    <span
      data-testid="scheme-tag"
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        engine.colorClass,
        className
      )}
    >
      {engine.label}
    </span>
  );
}

// ============================================================
// SchemeSelector Component
// Requirements: 5.1, 9.4
// ============================================================

export interface SchemeSelectorProps {
  /** Current scheme */
  scheme?: ReviewerScheme;
  /** Called when scheme changes */
  onChange: (scheme: ReviewerScheme) => void;
  /** Disable selector */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Dropdown selector for choosing review engine
 * Shows a clickable tag that expands to a dropdown menu
 */
export function SchemeSelector({
  scheme,
  onChange,
  disabled = false,
  className,
}: SchemeSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentScheme = scheme ?? DEFAULT_REVIEWER_SCHEME;
  const engine = getReviewEngine(currentScheme);
  const availableEngines = getAvailableEngines();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (selectedScheme: ReviewerScheme) => {
      onChange(selectedScheme);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className={clsx('relative inline-block', className)}>
      {/* Trigger Button */}
      <button
        data-testid="scheme-selector-button"
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          'transition-colors cursor-pointer',
          engine.colorClass,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {engine.label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="scheme-selector-dropdown"
          className={clsx(
            'absolute z-50 mt-1 py-1 w-36',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-md shadow-lg'
          )}
        >
          {availableEngines.map((eng) => {
            const isSelected = eng.scheme === currentScheme;
            return (
              <button
                key={eng.scheme}
                type="button"
                onClick={() => handleSelect(eng.scheme)}
                className={clsx(
                  'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors'
                )}
              >
                {/* Check mark for selected item */}
                <span className="w-4 shrink-0">
                  {isSelected && (
                    <Check className="w-4 h-4 text-green-500" data-testid="scheme-check-icon" />
                  )}
                </span>
                <span
                  className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    eng.colorClass
                  )}
                >
                  {eng.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SchemeSelector;
