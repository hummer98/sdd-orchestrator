/**
 * SSH Connect Dialog
 * Dialog for entering SSH URI to connect to remote project
 * Requirements: 1.3, 1.4
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { X, Server, Loader2 } from 'lucide-react';

interface SSHConnectDialogProps {
  isOpen: boolean;
  onConnect: (uri: string) => void;
  onCancel: () => void;
  isConnecting?: boolean;
  initialUri?: string;
}

/**
 * Validate SSH URI format
 * Returns error message if invalid, null if valid
 */
function validateSSHUri(uri: string): string | null {
  if (!uri) {
    return 'URI is required';
  }

  // Check scheme
  if (!uri.startsWith('ssh://')) {
    return 'Invalid SSH URI: must start with ssh://';
  }

  try {
    const withoutScheme = uri.slice(6); // Remove 'ssh://'

    // Parse user@host part
    const atIndex = withoutScheme.indexOf('@');
    if (atIndex === -1) {
      return 'User is required in SSH URI (format: ssh://user@host/path)';
    }

    const user = withoutScheme.slice(0, atIndex);
    if (!user) {
      return 'User is required in SSH URI (format: ssh://user@host/path)';
    }

    const hostAndPath = withoutScheme.slice(atIndex + 1);
    const slashIndex = hostAndPath.indexOf('/');

    if (slashIndex === -1) {
      return 'Path is required in SSH URI (format: ssh://user@host/path)';
    }

    const hostPort = hostAndPath.slice(0, slashIndex);
    const path = hostAndPath.slice(slashIndex);

    if (!hostPort) {
      return 'Host is required in SSH URI';
    }

    if (!path || path === '/') {
      return 'Path is required in SSH URI';
    }

    // Validate port if present
    const colonIndex = hostPort.indexOf(':');
    if (colonIndex !== -1) {
      const port = hostPort.slice(colonIndex + 1);
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return 'Invalid port number';
      }
    }

    return null;
  } catch (error) {
    return 'Invalid SSH URI format';
  }
}

/**
 * SSH Connect Dialog Component
 */
export function SSHConnectDialog({
  isOpen,
  onConnect,
  onCancel,
  isConnecting = false,
  initialUri = '',
}: SSHConnectDialogProps): JSX.Element | null {
  const [uri, setUri] = useState(initialUri);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUri(initialUri);
      setError(null);
    }
  }, [isOpen, initialUri]);

  // Clear error when input changes
  const handleUriChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUri(e.target.value);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateSSHUri(uri);
    if (validationError) {
      setError(validationError);
      return;
    }

    onConnect(uri);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SSH Remote Project
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isConnecting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label
              htmlFor="ssh-uri"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              SSH URI
            </label>
            <input
              id="ssh-uri"
              type="text"
              value={uri}
              onChange={handleUriChange}
              placeholder="ssh://user@host[:port]/path/to/project"
              className={`w-full px-3 py-2 border rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700
                ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isConnecting}
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Format: ssh://user@host[:port]/path/to/project
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!uri || isConnecting}
              className={`px-4 py-2 rounded-md text-white flex items-center gap-2
                ${!uri || isConnecting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
