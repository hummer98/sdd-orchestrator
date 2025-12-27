/**
 * CloudflareSettingsPanel Component
 * Settings panel for Cloudflare Tunnel Token configuration
 * Requirements: 2.1, 2.4
 * Task 8.1: SettingsPanelにCloudflare Tunnel Token入力セクションを追加
 */

import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Cloud,
  Eye,
  EyeOff,
  Save,
  Check,
  Loader2,
} from 'lucide-react';

/**
 * CloudflareSettingsPanel Props
 */
export interface CloudflareSettingsPanelProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * CloudflareSettingsPanel Component
 *
 * Provides UI for configuring Cloudflare Tunnel settings:
 * - Tunnel Token input field (masked)
 * - Save button with feedback
 * - Environment variable hint
 *
 * @example
 * <CloudflareSettingsPanel />
 */
export function CloudflareSettingsPanel({ className }: CloudflareSettingsPanelProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasTunnelToken, setHasTunnelToken] = useState(false);

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.getCloudflareSettings();
        setHasTunnelToken(settings.hasTunnelToken);
      } catch (error) {
        console.error('[CloudflareSettingsPanel] Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Handle token visibility toggle
  const handleToggleVisibility = useCallback(() => {
    setShowToken((prev) => !prev);
  }, []);

  // Handle token save
  const handleSave = useCallback(async () => {
    if (!token.trim() || isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await window.electronAPI.setCloudfareTunnelToken(token.trim());
      setSaveSuccess(true);
      setHasTunnelToken(true);
      // Clear token field after successful save for security
      setToken('');
      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[CloudflareSettingsPanel] Failed to save token:', error);
    } finally {
      setIsSaving(false);
    }
  }, [token, isSaving]);

  // Handle Enter key to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && token.trim() && !isSaving) {
        handleSave();
      }
    },
    [token, isSaving, handleSave]
  );

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
        <Cloud className="w-5 h-5 text-orange-500" />
        Cloudflare Tunnel 設定
      </h2>

      {/* Token Status */}
      {hasTunnelToken && (
        <div
          className={clsx(
            'mb-4 p-3 rounded-lg flex items-center gap-2',
            'bg-green-50 dark:bg-green-900/20',
            'border border-green-200 dark:border-green-800'
          )}
        >
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-400">
            Tunnel Token 設定済み
          </span>
        </div>
      )}

      {/* Token Input */}
      <div className="mb-4">
        <label
          htmlFor="tunnel-token-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Tunnel Token
        </label>
        <div className="flex items-center gap-2">
          <input
            id="tunnel-token-input"
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="eyJhIjoiYXBpLmNsb3VkZmxhcmUuY29tIiwidCI6..."
            className={clsx(
              'flex-1 px-3 py-2 rounded-md text-sm',
              'border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-900',
              'text-gray-800 dark:text-gray-200',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
            aria-describedby="token-help-text"
          />
          <button
            onClick={handleToggleVisibility}
            className={clsx(
              'p-2 rounded-md transition-colors',
              'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            aria-label={showToken ? '非表示' : '表示'}
          >
            {showToken ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <p
        id="token-help-text"
        className="text-xs text-gray-500 dark:text-gray-500 mb-4"
      >
        Cloudflare Dashboardから取得したTunnel Tokenを入力してください。
        環境変数 <code className="px-1 bg-gray-100 dark:bg-gray-700 rounded">CLOUDFLARE_TUNNEL_TOKEN</code> が設定されている場合はそちらが優先されます。
      </p>

      {/* Save Button and Feedback */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!token.trim() || isSaving}
          className={clsx(
            'px-4 py-2 rounded-md transition-colors',
            'flex items-center gap-2',
            'text-sm font-medium',
            token.trim() && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              保存
            </>
          )}
        </button>

        {saveSuccess && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="w-4 h-4" />
            保存しました
          </span>
        )}
      </div>
    </div>
  );
}
