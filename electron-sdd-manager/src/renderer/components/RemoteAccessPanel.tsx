/**
 * RemoteAccessPanel Component
 * Control panel for remote access server
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 2.2, 8.5
 * Task 5.1: Remote Access Control Panel
 * Task 9.1-9.4: Cloudflare Tunnel integration
 */

import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import {
  Wifi,
  WifiOff,
  Loader2,
  Copy,
  Check,
  X,
  Smartphone,
  Users,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useRemoteAccessStore } from '../stores/remoteAccessStore';

/**
 * RemoteAccessPanel Props
 */
export interface RemoteAccessPanelProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * RemoteAccessPanel Component
 *
 * Provides UI controls for the remote access server:
 * - Server enable/disable checkbox
 * - Connection URL display with copy functionality
 * - QR code display for mobile scanning
 * - Connected client count
 * - Server status indicator
 * - Error display
 *
 * @example
 * <RemoteAccessPanel />
 */
export function RemoteAccessPanel({ className }: RemoteAccessPanelProps) {
  const {
    isRunning,
    port,
    url,
    qrCodeDataUrl,
    clientCount,
    error,
    localIp,
    isLoading,
    startServer,
    stopServer,
    clearError,
    // Cloudflare Tunnel state (Task 9.1-9.4)
    publishToCloudflare,
    tunnelUrl,
    tunnelQrCodeDataUrl,
    tunnelStatus,
    tunnelError,
    accessToken,
    hasTunnelToken,
    setPublishToCloudflare,
    refreshAccessToken,
  } = useRemoteAccessStore();

  const [copySuccess, setCopySuccess] = useState(false);
  const [tunnelCopySuccess, setTunnelCopySuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Construct URLs with access token for display and copy
  const urlWithToken = url && accessToken ? `${url}?token=${accessToken}` : url;
  const tunnelUrlWithToken = tunnelUrl && accessToken ? `${tunnelUrl}?token=${accessToken}` : tunnelUrl;

  // Handle checkbox toggle
  const handleToggle = useCallback(async () => {
    if (isLoading) return;

    if (isRunning) {
      await stopServer();
    } else {
      await startServer();
    }
  }, [isRunning, isLoading, startServer, stopServer]);

  // Handle URL copy (with access token)
  const handleCopyUrl = useCallback(async () => {
    if (!urlWithToken) return;

    try {
      await navigator.clipboard.writeText(urlWithToken);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('[RemoteAccessPanel] Failed to copy URL:', err);
    }
  }, [urlWithToken]);

  // Handle error dismiss
  const handleDismissError = useCallback(() => {
    clearError();
  }, [clearError]);

  // Handle Tunnel URL copy (Task 9.2) - with access token
  const handleCopyTunnelUrl = useCallback(async () => {
    if (!tunnelUrlWithToken) return;

    try {
      await navigator.clipboard.writeText(tunnelUrlWithToken);
      setTunnelCopySuccess(true);
      setTimeout(() => setTunnelCopySuccess(false), 2000);
    } catch (err) {
      console.error('[RemoteAccessPanel] Failed to copy Tunnel URL:', err);
    }
  }, [tunnelUrlWithToken]);

  // Handle Cloudflare publish toggle (Task 9.1)
  const handleCloudflareToggle = useCallback(() => {
    if (setPublishToCloudflare) {
      setPublishToCloudflare(!publishToCloudflare);
    }
  }, [publishToCloudflare, setPublishToCloudflare]);

  // Handle access token refresh (Task 9.4)
  const handleRefreshToken = useCallback(async () => {
    if (!refreshAccessToken || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshAccessToken();
    } catch (err) {
      console.error('[RemoteAccessPanel] Failed to refresh token:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAccessToken, isRefreshing]);

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Remote Access
        </h2>

        {/* Server Status Indicator */}
        <div data-testid="server-status" className="flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2
                data-testid="loading-indicator"
                className="w-4 h-4 text-blue-500 animate-spin"
              />
              <span className="text-sm text-gray-500">Starting...</span>
            </>
          ) : isRunning ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Running</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Stopped</span>
            </>
          )}
        </div>
      </div>

      {/* Enable/Disable Checkbox */}
      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={isRunning}
          onChange={handleToggle}
          disabled={isLoading}
          className={clsx(
            'w-5 h-5 rounded border-gray-300 text-blue-600',
            'focus:ring-blue-500 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Enable remote access server"
        />
        <span className="text-gray-700 dark:text-gray-300">
          Enable remote access
        </span>
      </label>

      {/* Cloudflare Publish Checkbox (Task 9.1) */}
      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={publishToCloudflare ?? false}
            onChange={handleCloudflareToggle}
            disabled={!hasTunnelToken || isLoading}
            className={clsx(
              'w-5 h-5 rounded border-gray-300 text-orange-600',
              'focus:ring-orange-500 focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Cloudflareに公開"
          />
          <span className={clsx(
            'flex items-center gap-2',
            hasTunnelToken ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
          )}>
            {publishToCloudflare ? (
              <Cloud className="w-4 h-4 text-orange-500" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
            Cloudflareに公開
          </span>
        </label>
        {!hasTunnelToken && (
          <p className="mt-1 ml-8 text-xs text-gray-400 dark:text-gray-500">
            Tunnel Tokenが設定されていません
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          role="alert"
          className={clsx(
            'mb-4 p-3 rounded-lg',
            'bg-red-50 dark:bg-red-900/20',
            'border border-red-200 dark:border-red-800',
            'flex items-start justify-between gap-2'
          )}
        >
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={handleDismissError}
            className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Server Details (shown when running) */}
      {isRunning && (
        <div className="space-y-4">
          {/* Connection URL */}
          {urlWithToken && (
            <div data-testid="connection-url">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Connection URL
              </label>
              <div className="flex items-center gap-2">
                <code
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-md text-sm',
                    'bg-gray-100 dark:bg-gray-900',
                    'text-gray-800 dark:text-gray-200',
                    'font-mono overflow-x-auto'
                  )}
                >
                  {urlWithToken}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className={clsx(
                    'p-2 rounded-md transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    copySuccess
                      ? 'text-green-500'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                  aria-label="Copy URL"
                >
                  {copySuccess ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* QR Code */}
          {qrCodeDataUrl && (
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Scan QR Code
              </label>
              <div
                className={clsx(
                  'p-3 rounded-lg',
                  'bg-white border border-gray-200',
                  'inline-block'
                )}
              >
                <img
                  data-testid="qr-code"
                  src={qrCodeDataUrl}
                  alt="QR Code for mobile connection"
                  className="w-32 h-32"
                />
              </div>
            </div>
          )}

          {/* Tunnel Status (Task 9.2) */}
          {publishToCloudflare && tunnelStatus === 'connecting' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                Tunnel 接続中...
              </span>
            </div>
          )}

          {/* Tunnel Error (Task 9.2) */}
          {publishToCloudflare && tunnelStatus === 'error' && tunnelError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-400">
                Tunnel Error: {tunnelError}
              </span>
            </div>
          )}

          {/* Tunnel URL (Task 9.2) */}
          {tunnelUrlWithToken && (
            <div data-testid="tunnel-url">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Cloud className="w-4 h-4 text-orange-500" />
                Tunnel URL
              </label>
              <div className="flex items-center gap-2">
                <code
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-md text-sm',
                    'bg-orange-50 dark:bg-orange-900/20',
                    'text-orange-800 dark:text-orange-200',
                    'font-mono overflow-x-auto',
                    'border border-orange-200 dark:border-orange-800'
                  )}
                >
                  {tunnelUrlWithToken}
                </code>
                <button
                  onClick={handleCopyTunnelUrl}
                  className={clsx(
                    'p-2 rounded-md transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    tunnelCopySuccess
                      ? 'text-green-500'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                  aria-label="Copy URL"
                >
                  {tunnelCopySuccess ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tunnel QR Code (Task 9.3) */}
          {tunnelQrCodeDataUrl && (
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Cloud className="w-4 h-4 text-orange-500" />
                Tunnel QR Code (with Token)
              </label>
              <div
                className={clsx(
                  'p-3 rounded-lg',
                  'bg-white border border-orange-200',
                  'inline-block'
                )}
              >
                <img
                  data-testid="tunnel-qr-code"
                  src={tunnelQrCodeDataUrl}
                  alt="QR Code for Tunnel connection with access token"
                  className="w-32 h-32"
                />
              </div>
            </div>
          )}

          {/* Access Token Refresh (Task 9.4) */}
          {tunnelUrl && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshToken}
                disabled={isRefreshing}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                  'text-sm font-medium',
                  isRefreshing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                )}
                aria-label="トークンをリフレッシュ"
              >
                <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'リフレッシュ中...' : 'トークンをリフレッシュ'}
              </button>
              {accessToken && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Token: {accessToken.substring(0, 4)}...
                </span>
              )}
            </div>
          )}

          {/* Connected Clients */}
          <div
            data-testid="client-count"
            className={clsx(
              'flex items-center gap-2 p-3 rounded-lg',
              'bg-gray-50 dark:bg-gray-900/50',
              'border border-gray-200 dark:border-gray-700'
            )}
          >
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Connected clients:
            </span>
            <span
              className={clsx(
                'text-sm font-semibold',
                clientCount > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500'
              )}
            >
              {clientCount}
            </span>
          </div>

          {/* Port Info */}
          {port && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Server running on port {port}
              {localIp && ` (${localIp})`}
            </p>
          )}
        </div>
      )}

      {/* Instructions when stopped */}
      {!isRunning && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Enable remote access to control SDD workflow from your mobile device.
        </p>
      )}
    </div>
  );
}
