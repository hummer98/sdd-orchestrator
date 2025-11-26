/**
 * CreateSpecDialog Component
 * Dialog for creating new specifications
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { useProjectStore, useSpecStore, notify } from '../stores';
import { createSpecSchema, type CreateSpecInput } from '../utils/validation';
import { clsx } from 'clsx';

interface CreateSpecDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSpecDialog({ isOpen, onClose }: CreateSpecDialogProps) {
  const { currentProject } = useProjectStore();
  const { refreshSpecs } = useSpecStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [isCreating, setIsCreating] = useState(false);

  const validateField = (field: 'name' | 'description', value: string) => {
    const data: CreateSpecInput = {
      name: field === 'name' ? value : name,
      description: field === 'description' ? value : description,
    };

    const result = createSpecSchema.safeParse(data);

    if (!result.success) {
      const fieldError = result.error.errors.find((e) => e.path[0] === field);
      setErrors((prev) => ({
        ...prev,
        [field]: fieldError?.message,
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    validateField('name', value);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    validateField('description', value);
  };

  const handleCreate = async () => {
    if (!currentProject) return;

    const result = createSpecSchema.safeParse({ name, description });

    if (!result.success) {
      const newErrors: { name?: string; description?: string } = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as 'name' | 'description';
        newErrors[field] = e.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsCreating(true);

    try {
      await window.electronAPI.createSpec(currentProject, name, description);
      await refreshSpecs();
      notify.success(`仕様「${name}」を作成しました`);
      handleClose();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '仕様の作成に失敗しました'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            新規仕様を作成
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name field */}
          <div>
            <label
              htmlFor="spec-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              仕様名
            </label>
            <input
              id="spec-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="my-feature"
              className={clsx(
                'w-full px-3 py-2 rounded-md',
                'bg-gray-50 dark:bg-gray-800',
                'border',
                errors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                'focus:outline-none focus:ring-2'
              )}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              小文字・数字・ハイフンのみ使用可能
            </p>
          </div>

          {/* Description field */}
          <div>
            <label
              htmlFor="spec-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              説明
            </label>
            <textarea
              id="spec-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="機能の概要を入力してください..."
              rows={4}
              className={clsx(
                'w-full px-3 py-2 rounded-md resize-none',
                'bg-gray-50 dark:bg-gray-800',
                'border',
                errors.description
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                'focus:outline-none focus:ring-2'
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              10文字以上で入力してください（{[...description].length}/10）
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className={clsx(
              'px-4 py-2 rounded-md',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name || !description}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                作成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
