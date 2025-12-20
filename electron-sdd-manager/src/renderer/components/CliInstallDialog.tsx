/**
 * CliInstallDialog Component
 * Dialog for installing the 'sdd' CLI command
 */

import { useState, useEffect } from 'react';
import { X, Terminal, Check, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { CliInstallResult, CliInstallInstructions } from '../types/electron.d';

interface CliInstallDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type InstallResult = CliInstallResult & { instructions: CliInstallInstructions };

export function CliInstallDialog({ isOpen, onClose }: CliInstallDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [location, setLocation] = useState<'user' | 'system'>('user');

  const handleInstall = async () => {
    setIsLoading(true);
    setCopied(false);

    try {
      const res = await window.electronAPI.installCliCommand(location);
      setResult(res);
    } catch (error) {
      console.error('CLI install error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyCommand = async () => {
    const commandToCopy = result?.requiresSudo && result.command
      ? result.command
      : result?.instructions.command;

    if (commandToCopy) {
      await navigator.clipboard.writeText(commandToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="cli-install-dialog-backdrop">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-lg p-6 rounded-lg shadow-xl',
          'bg-white dark:bg-gray-900'
        )}
        data-testid="cli-install-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              「sdd」コマンドのインストール
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            data-testid="cli-install-close-button"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {!result ? (
          <div className="space-y-4">
            {/* Installation location selection */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                インストール先を選択してください：
              </p>
              <div className="space-y-2">
                <label
                  className={clsx(
                    'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer',
                    location === 'user'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  )}
                  data-testid="cli-install-location-user"
                >
                  <input
                    type="radio"
                    name="location"
                    value="user"
                    checked={location === 'user'}
                    onChange={(e) => setLocation(e.target.value as 'user' | 'system')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      ユーザーディレクトリ（推奨）
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ~/.local/bin/sdd - sudoは不要です
                    </div>
                  </div>
                </label>
                <label
                  className={clsx(
                    'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer',
                    location === 'system'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  )}
                  data-testid="cli-install-location-system"
                >
                  <input
                    type="radio"
                    name="location"
                    value="system"
                    checked={location === 'system'}
                    onChange={(e) => setLocation(e.target.value as 'user' | 'system')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      システム全体
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      /usr/local/bin/sdd - 管理者権限が必要です
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              disabled={isLoading}
              className={clsx(
                'w-full px-4 py-3 rounded-md font-semibold',
                'bg-blue-500 hover:bg-blue-600',
                'text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              data-testid="cli-install-submit-button"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  インストール中...
                </span>
              ) : (
                'インストール'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status message */}
            <div
              className={clsx(
                'flex items-start gap-3 p-4 rounded-lg',
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : result.requiresSudo
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
              )}
              data-testid="cli-install-result"
            >
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              ) : result.requiresSudo ? (
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <p
                className={clsx(
                  'text-sm',
                  result.success
                    ? 'text-green-700 dark:text-green-300'
                    : result.requiresSudo
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                )}
              >
                {result.message}
              </p>
            </div>

            {/* Command to copy (if sudo required or always show for reference) */}
            {(result.requiresSudo || !result.success) && result.command && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ターミナルで以下のコマンドを実行してください：
                </p>
                <div className="relative">
                  <pre
                    className={clsx(
                      'p-3 pr-12 rounded-lg overflow-x-auto',
                      'bg-gray-100 dark:bg-gray-800',
                      'text-sm font-mono text-gray-800 dark:text-gray-200'
                    )}
                  >
                    {result.command}
                  </pre>
                  <button
                    onClick={handleCopyCommand}
                    className={clsx(
                      'absolute top-2 right-2 p-1.5 rounded',
                      'hover:bg-gray-200 dark:hover:bg-gray-700',
                      'text-gray-500 dark:text-gray-400'
                    )}
                    title="コマンドをコピー"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* PATH note for user installation */}
            {result.instructions.pathNote && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ℹ️ {result.instructions.pathNote}
                </p>
              </div>
            )}

            {/* Usage examples */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {result.instructions.usage.title}
              </h3>
              <div className="space-y-2">
                {result.instructions.usage.examples.map((example, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'flex items-center gap-4 p-2 rounded',
                      'bg-gray-50 dark:bg-gray-800/50'
                    )}
                  >
                    <code className="font-mono text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {example.command}
                    </code>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {example.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          {result && !result.success && (
            <button
              onClick={() => setResult(null)}
              className={clsx(
                'px-4 py-2 rounded-md',
                'bg-blue-100 dark:bg-blue-800',
                'text-blue-700 dark:text-blue-300',
                'hover:bg-blue-200 dark:hover:bg-blue-700'
              )}
            >
              もう一度試す
            </button>
          )}
          <button
            onClick={onClose}
            className={clsx(
              'px-4 py-2 rounded-md',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
