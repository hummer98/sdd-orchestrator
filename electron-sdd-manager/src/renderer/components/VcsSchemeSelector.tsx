/**
 * VcsSchemeSelector Component
 * vcs-scheme-switching: Task 4.1 - VCS scheme selector UI
 * Requirements: 1.3, 1.4, 2.2, 2.3, 7.1, 7.2, 7.3, 7.5
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import type { VcsScheme } from '../../shared/types/worktree';

// ============================================================
// VCS Scheme options configuration
// ============================================================

interface VcsSchemeOption {
  scheme: VcsScheme;
  label: string;
  description: string;
}

const VCS_SCHEME_OPTIONS: readonly VcsSchemeOption[] = [
  {
    scheme: 'git',
    label: 'Git',
    description: 'git worktreeを使用',
  },
  {
    scheme: 'jj',
    label: 'Jujutsu (jj)',
    description: 'jj workspaceを使用',
  },
] as const;

// ============================================================
// VcsSchemeSelector Component
// Requirements: 1.3, 1.4, 7.1, 7.2, 7.5
// ============================================================

export interface VcsSchemeSelectorProps {
  /** Current scheme */
  scheme: VcsScheme;
  /** Called when scheme changes */
  onChange: (scheme: VcsScheme) => void;
  /** Project path for API calls */
  projectPath: string;
  /** Disable selector */
  disabled?: boolean;
  /** Whether running in Desktop UI (false hides the component) */
  isDesktop?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Dropdown selector for choosing VCS scheme (git or jj)
 * Requirements:
 * - 1.3: VCSスキーム選択UIを設定画面に追加
 * - 1.4: 選択肢は「Git」と「Jujutsu (jj)」の2つ
 * - 2.2: jj選択時にインストールチェックを実行
 * - 2.3: エラーメッセージ「jjがインストールされていません。インストール後に再度お試しください。」
 * - 7.5: Remote UIでは非表示 (isDesktop prop)
 */
export function VcsSchemeSelector({
  scheme,
  onChange,
  projectPath,
  disabled = false,
  isDesktop = true,
  className,
}: VcsSchemeSelectorProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = VCS_SCHEME_OPTIONS.find((opt) => opt.scheme === scheme) ?? VCS_SCHEME_OPTIONS[0];

  // Requirement 7.5: Remote UIでは非表示
  if (!isDesktop) {
    return null;
  }

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
    if (!disabled && !isChecking) {
      setIsOpen((prev) => !prev);
      setError(null);
    }
  }, [disabled, isChecking]);

  const handleSelect = useCallback(
    async (selectedScheme: VcsScheme) => {
      // If selecting git, no check needed
      if (selectedScheme === 'git') {
        setIsOpen(false);
        setError(null);
        onChange(selectedScheme);
        return;
      }

      // Requirement 2.1, 2.2: jj選択時にインストールチェックを実行
      setIsChecking(true);
      setError(null);

      try {
        const jjCheck = await window.electronAPI.checkJjAvailability();

        if (!jjCheck.available) {
          // Requirement 2.3: エラーメッセージ日本語
          setError('jjがインストールされていません。インストール後に再度お試しください。');
          setIsChecking(false);
          return;
        }

        // jj is available, try to set the scheme
        const result = await window.electronAPI.setVcsScheme(projectPath, selectedScheme);

        if (!result.success) {
          setError(result.error || 'VCSスキームの設定に失敗しました');
          setIsChecking(false);
          return;
        }

        setIsOpen(false);
        setError(null);
        onChange(selectedScheme);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'VCSスキームの確認に失敗しました');
      } finally {
        setIsChecking(false);
      }
    },
    [onChange, projectPath]
  );

  return (
    <div ref={containerRef} className={clsx('relative', className)} data-testid="vcs-scheme-selector">
      {/* Trigger Button */}
      <button
        data-testid="vcs-scheme-selector-button"
        type="button"
        onClick={handleToggle}
        disabled={disabled || isChecking}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
          'bg-gray-100 dark:bg-gray-800',
          'border border-gray-300 dark:border-gray-600',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'transition-colors',
          (disabled || isChecking) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span>{currentOption.label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="vcs-scheme-dropdown"
          className={clsx(
            'absolute z-50 mt-1 py-1 w-48',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-md shadow-lg'
          )}
        >
          {VCS_SCHEME_OPTIONS.map((opt) => {
            const isSelected = opt.scheme === scheme;
            return (
              <button
                key={opt.scheme}
                type="button"
                data-testid={`vcs-scheme-option-${opt.scheme}`}
                onClick={() => handleSelect(opt.scheme)}
                disabled={isChecking}
                className={clsx(
                  'w-full px-3 py-2 text-left flex items-center gap-2',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors',
                  isChecking && 'opacity-50'
                )}
              >
                {/* Check mark for selected item */}
                <span className="w-4 shrink-0">
                  {isSelected && (
                    <Check className="w-4 h-4 text-green-500" data-testid="vcs-scheme-check-icon" />
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {opt.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          data-testid="vcs-scheme-error"
          className="mt-2 p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default VcsSchemeSelector;
