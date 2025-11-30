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
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setCopied(false);

      // Attempt to install the CLI command
      window.electronAPI.installCliCommand().then((res) => {
        setResult(res);
        setIsLoading(false);
      }).catch((error) => {
        console.error('CLI install error:', error);
        setIsLoading(false);
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : result ? (
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
        ) : (
          <div className="text-center py-8 text-gray-500">
            インストール情報を取得できませんでした
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end mt-6">
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
