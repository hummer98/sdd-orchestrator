/**
 * ProjectSettingsDialog Component
 * debatex-document-review Task 4.1: Project settings dialog for default scheme selection
 * Requirements: 4.5
 */

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useProjectStore } from '../stores/projectStore';
import { useSpecDetailStore } from '../stores/spec/specDetailStore';
import { SchemeSelector, type ReviewerScheme } from '@shared/components/review';
import { DEFAULT_REVIEWER_SCHEME } from '@shared/registry';

interface ProjectSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSettingsDialog({
  isOpen,
  onClose,
}: ProjectSettingsDialogProps): React.ReactElement | null {
  const currentProject = useProjectStore((state) => state.currentProject);
  const setProjectDefaultScheme = useSpecDetailStore((state) => state.setProjectDefaultScheme);

  // Local state for form
  const [selectedScheme, setSelectedScheme] = useState<ReviewerScheme>(DEFAULT_REVIEWER_SCHEME);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project defaults when dialog opens
  useEffect(() => {
    if (isOpen && currentProject) {
      setIsLoading(true);
      setError(null);
      window.electronAPI
        .loadProjectDefaults(currentProject)
        .then((defaults) => {
          const scheme = defaults?.documentReview?.scheme as ReviewerScheme | undefined;
          setSelectedScheme(scheme ?? DEFAULT_REVIEWER_SCHEME);
        })
        .catch((err) => {
          console.error('[ProjectSettingsDialog] Failed to load project defaults:', err);
          setSelectedScheme(DEFAULT_REVIEWER_SCHEME);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, currentProject]);

  // Reset state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSchemeChange = useCallback((scheme: ReviewerScheme) => {
    setSelectedScheme(scheme);
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentProject) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await window.electronAPI.saveProjectDefaults(currentProject, {
        documentReview: { scheme: selectedScheme },
      });

      // Update specDetailStore with new project default scheme
      setProjectDefaultScheme(selectedScheme);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, selectedScheme, setProjectDefaultScheme, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-testid="dialog-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            プロジェクト設定
          </h2>
          <button
            data-testid="close-button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Document Review Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">
              ドキュメントレビュー
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                デフォルトエンジン:
              </span>
              <SchemeSelector
                scheme={selectedScheme}
                onChange={handleSchemeChange}
                disabled={isLoading || isSaving}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              spec.json で未設定の場合に使用されます
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className={clsx(
              'px-4 py-2 rounded-md text-sm',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'transition-colors'
            )}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !currentProject}
            className={clsx(
              'px-4 py-2 rounded-md text-sm',
              'bg-blue-500 text-white',
              'hover:bg-blue-600',
              'transition-colors',
              (isSaving || !currentProject) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
