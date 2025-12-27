/**
 * InstallCloudflaredDialog Component
 * Modal dialog for cloudflared installation instructions
 * Requirements: 4.2, 4.3
 * Task 10.1: InstallCloudflaredDialog component
 */

import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import {
  X,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
} from 'lucide-react';

/**
 * Install instructions for cloudflared
 */
export interface InstallInstructions {
  homebrew: string;
  macports: string;
  downloadUrl: string;
}

/**
 * Default install instructions
 */
const DEFAULT_INSTALL_INSTRUCTIONS: InstallInstructions = {
  homebrew: 'brew install cloudflared',
  macports: 'sudo port install cloudflared',
  downloadUrl: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
};

/**
 * InstallCloudflaredDialog Props
 */
export interface InstallCloudflaredDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Custom install instructions (optional) */
  installInstructions?: InstallInstructions;
}

/**
 * CommandBlock component for displaying copyable commands
 */
function CommandBlock({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[InstallCloudflaredDialog] Failed to copy:', err);
    }
  }, [command]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <code
          className={clsx(
            'flex-1 px-3 py-2 rounded-md text-sm',
            'bg-gray-100 dark:bg-gray-900',
            'text-gray-800 dark:text-gray-200',
            'font-mono'
          )}
        >
          {command}
        </code>
        <button
          onClick={handleCopy}
          className={clsx(
            'p-2 rounded-md transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            copied
              ? 'text-green-500'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
          aria-label={`Copy ${label} command`}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * InstallCloudflaredDialog Component
 *
 * A modal dialog that displays cloudflared installation instructions.
 * Shows platform-specific install methods:
 * - Homebrew (macOS)
 * - MacPorts (macOS)
 * - Official download page
 *
 * @example
 * <InstallCloudflaredDialog
 *   isOpen={showInstallDialog}
 *   onClose={() => setShowInstallDialog(false)}
 * />
 */
export function InstallCloudflaredDialog({
  isOpen,
  onClose,
  installInstructions = DEFAULT_INSTALL_INSTRUCTIONS,
}: InstallCloudflaredDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-cloudflared-dialog-title"
    >
      {/* Backdrop */}
      <div
        data-testid="dialog-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Content */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-lg mx-4',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="install-cloudflared-dialog-title"
            className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"
          >
            <Terminal className="w-5 h-5" />
            cloudflared のインストール
          </h2>
          <button
            onClick={onClose}
            className={clsx(
              'p-1 rounded-md transition-colors',
              'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cloudflare Tunnel を使用するには、cloudflared コマンドラインツールをインストールする必要があります。
            以下のいずれかの方法でインストールしてください。
          </p>

          {/* Homebrew Section */}
          <div>
            <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="text-2xl">🍺</span>
              Homebrew (推奨)
            </h3>
            <CommandBlock
              command={installInstructions.homebrew}
              label="Homebrew"
            />
          </div>

          {/* MacPorts Section */}
          <div>
            <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="text-2xl">🚢</span>
              MacPorts
            </h3>
            <CommandBlock
              command={installInstructions.macports}
              label="MacPorts"
            />
          </div>

          {/* Download Section */}
          <div>
            <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5" />
              公式ダウンロード
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Cloudflare の公式ページから直接ダウンロードできます。
            </p>
            <a
              href={installInstructions.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-md',
                'bg-blue-600 text-white',
                'hover:bg-blue-700 transition-colors',
                'text-sm font-medium'
              )}
            >
              <Download className="w-4 h-4" />
              ダウンロードページを開く
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Post-install note */}
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>注意:</strong> インストール後、ターミナルを再起動するか、
              新しいターミナルウィンドウを開いて <code className="px-1 bg-yellow-100 dark:bg-yellow-800 rounded">cloudflared --version</code> で
              インストールが正常に完了したことを確認してください。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className={clsx(
              'px-4 py-2 rounded-md transition-colors',
              'bg-gray-100 dark:bg-gray-700',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-600',
              'text-sm font-medium'
            )}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
