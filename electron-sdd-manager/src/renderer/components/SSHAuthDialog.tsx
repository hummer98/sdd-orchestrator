/**
 * SSH Auth Dialog
 * Dialog for SSH authentication (password, passphrase, host key verification)
 * Requirements: 2.1, 2.2, 2.3
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { X, Key, Shield, AlertTriangle, Lock, Server } from 'lucide-react';

type AuthDialogType = 'password' | 'passphrase' | 'host-key';

interface SSHAuthDialogProps {
  isOpen: boolean;
  type: AuthDialogType;
  host: string;
  user: string;
  keyPath?: string; // For passphrase mode
  fingerprint?: string; // For host-key mode
  isNewHost?: boolean; // For host-key mode
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/**
 * SSH Auth Dialog Component
 */
export function SSHAuthDialog({
  isOpen,
  type,
  host,
  user,
  keyPath,
  fingerprint,
  isNewHost = true,
  onSubmit,
  onCancel,
}: SSHAuthDialogProps): JSX.Element | null {
  const [inputValue, setInputValue] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'host-key') {
      onSubmit('accept');
    } else {
      onSubmit(inputValue);
    }
  };

  if (!isOpen) {
    return null;
  }

  // Render host key verification dialog
  if (type === 'host-key') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" data-testid="ssh-auth-dialog-backdrop">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4" data-testid="ssh-auth-hostkey-dialog">
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b rounded-t-lg
            ${isNewHost ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center gap-2">
              {isNewHost ? (
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
              )}
              <h2 className={`text-lg font-semibold ${isNewHost ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'}`}>
                {isNewHost ? 'New Host' : 'Host Key Changed - Warning!'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-testid="ssh-auth-close-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="mb-4">
              <p className={`text-sm ${isNewHost ? 'text-gray-700 dark:text-gray-300' : 'text-red-700 dark:text-red-300'}`} data-testid="ssh-auth-message">
                {isNewHost ? (
                  <>
                    This is the first time connecting to <strong>{host}</strong>.
                    Please verify the host fingerprint:
                  </>
                ) : (
                  <>
                    The host key for <strong>{host}</strong> has changed!
                    This could indicate a man-in-the-middle attack.
                    Please verify the new fingerprint:
                  </>
                )}
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-4 font-mono text-sm break-all" data-testid="ssh-auth-fingerprint">
              {fingerprint}
            </div>

            {!isNewHost && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 p-3 rounded-md mb-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Only continue if you know the host key has legitimately changed.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                data-testid="ssh-auth-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 rounded-md text-white
                  ${isNewHost ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}`}
                data-testid="ssh-auth-accept-button"
              >
                {isNewHost ? 'Trust & Accept' : 'Accept Anyway'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render password/passphrase dialog
  const isPassphrase = type === 'passphrase';
  const label = isPassphrase ? 'Passphrase' : 'Password';
  const placeholder = isPassphrase ? 'Enter passphrase for key' : 'Enter password';
  const Icon = isPassphrase ? Key : Lock;

  // Extract key filename from path
  const keyFilename = keyPath ? keyPath.split('/').pop() : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" data-testid="ssh-auth-dialog-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4" data-testid="ssh-auth-password-dialog">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SSH {label}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid="ssh-auth-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <Server className="w-4 h-4" />
              <span>
                {user}@{host}
              </span>
            </div>

            {isPassphrase && keyFilename && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <Key className="w-4 h-4" />
                <span>Key: {keyFilename}</span>
              </div>
            )}

            <label
              htmlFor="auth-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {label}
            </label>
            <input
              id="auth-input"
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                text-gray-900 dark:text-white bg-white dark:bg-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              data-testid="ssh-auth-input"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              data-testid="ssh-auth-cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputValue}
              className={`px-4 py-2 rounded-md text-white
                ${!inputValue
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'}`}
              data-testid="ssh-auth-submit-button"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
