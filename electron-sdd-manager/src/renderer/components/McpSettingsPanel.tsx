/**
 * McpSettingsPanel Component
 * Settings panel for MCP Server configuration
 * mcp-server-integration: Task 7.2
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Server,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';

/**
 * McpSettingsPanel Props
 */
export interface McpSettingsPanelProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * MCP Settings state
 */
interface McpSettings {
  enabled: boolean;
  port: number;
}

/**
 * McpSettingsPanel Component
 *
 * Provides UI for configuring MCP Server settings:
 * - Enable/disable toggle
 * - Port number configuration
 * - `claude mcp add` command generation and copy
 * - Project path included in command
 *
 * Requirements:
 * - 6.2: 設定画面MCPセクション
 * - 6.3: MCPサーバー無効化
 * - 6.4: MCPサーバー有効化
 * - 6.5: ポート番号設定変更
 * - 6.6: claude mcp addコマンド表示
 * - 6.7: コマンドにプロジェクトパス含む
 * - 6.8: コピーボタン
 *
 * @example
 * <McpSettingsPanel />
 */
export function McpSettingsPanel({ className }: McpSettingsPanelProps) {
  const { currentProject } = useProjectStore();

  // Settings state
  const [settings, setSettings] = useState<McpSettings | null>(null);
  const [port, setPort] = useState<string>('3001');
  const [originalPort, setOriginalPort] = useState<number>(3001);
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const mcpSettings = await window.electronAPI.mcpServer.getSettings();
        setSettings(mcpSettings);
        setPort(mcpSettings.port.toString());
        setOriginalPort(mcpSettings.port);
      } catch (error) {
        console.error('[McpSettingsPanel] Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Generate project name from path
  const projectName = useMemo(() => {
    if (!currentProject) return null;
    const parts = currentProject.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2] || 'project';
  }, [currentProject]);

  // Generate claude mcp add command
  const mcpAddCommand = useMemo(() => {
    if (!projectName) return null;
    const currentPort = port || '3001';
    return `claude mcp add ${projectName} --url http://localhost:${currentPort}`;
  }, [projectName, port]);

  // Handle enabled toggle
  const handleToggleEnabled = useCallback(async () => {
    if (!settings || isSaving) return;

    setIsSaving(true);
    try {
      const newEnabled = !settings.enabled;
      await window.electronAPI.mcpServer.setEnabled(newEnabled);
      setSettings({ ...settings, enabled: newEnabled });
    } catch (error) {
      console.error('[McpSettingsPanel] Failed to toggle enabled:', error);
    } finally {
      setIsSaving(false);
    }
  }, [settings, isSaving]);

  // Handle port change
  const handlePortChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits
    if (/^\d*$/.test(value)) {
      setPort(value);
    }
  }, []);

  // Handle port blur (save on blur)
  const handlePortBlur = useCallback(async () => {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum === originalPort) return;

    setIsSaving(true);
    try {
      await window.electronAPI.mcpServer.setPort(portNum);
      setSettings((prev) => prev ? { ...prev, port: portNum } : null);
      setOriginalPort(portNum);
    } catch (error) {
      console.error('[McpSettingsPanel] Failed to set port:', error);
      // Revert to original value on error
      setPort(originalPort.toString());
    } finally {
      setIsSaving(false);
    }
  }, [port, originalPort]);

  // Handle copy command
  const handleCopyCommand = useCallback(async () => {
    if (!mcpAddCommand) return;

    try {
      await navigator.clipboard.writeText(mcpAddCommand);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      console.error('[McpSettingsPanel] Failed to copy command:', error);
    }
  }, [mcpAddCommand]);

  if (isLoading) {
    return (
      <div
        className={clsx(
          'p-4 rounded-lg border bg-white dark:bg-gray-800',
          'border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

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
        <Server className="w-5 h-5 text-blue-500" />
        MCP Server 設定
      </h2>

      {/* Enabled Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings?.enabled ?? false}
            onChange={handleToggleEnabled}
            disabled={isSaving}
            aria-label="MCP Server を有効化"
            className={clsx(
              'w-5 h-5 rounded border-gray-300 dark:border-gray-600',
              'text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400',
              'bg-white dark:bg-gray-700'
            )}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            MCP Server を有効化
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500 ml-8">
          有効にすると、Electronアプリ起動時にMCPサーバーを自動起動します
        </p>
      </div>

      {/* Port Setting */}
      <div className="mb-4">
        <label
          htmlFor="mcp-port-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          ポート番号
        </label>
        <input
          id="mcp-port-input"
          type="text"
          inputMode="numeric"
          value={port}
          onChange={handlePortChange}
          onBlur={handlePortBlur}
          disabled={isSaving}
          placeholder="3001"
          className={clsx(
            'w-32 px-3 py-2 rounded-md text-sm',
            'border border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-900',
            'text-gray-800 dark:text-gray-200',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            isSaving && 'opacity-50'
          )}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          MCPサーバーのポート番号（デフォルト: 3001、Remote UI: 3000）
        </p>
      </div>

      {/* Claude MCP Add Command */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Claude CLI 登録コマンド
        </label>

        {currentProject ? (
          <div className="flex items-center gap-2">
            <code
              className={clsx(
                'flex-1 px-3 py-2 rounded-md text-sm font-mono',
                'bg-gray-100 dark:bg-gray-900',
                'text-gray-800 dark:text-gray-200',
                'border border-gray-200 dark:border-gray-700',
                'overflow-x-auto whitespace-nowrap'
              )}
            >
              {mcpAddCommand}
            </code>
            <button
              onClick={handleCopyCommand}
              disabled={!mcpAddCommand}
              aria-label="コピー"
              className={clsx(
                'p-2 rounded-md transition-colors',
                'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                copySuccess && 'text-green-500'
              )}
            >
              {copySuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            プロジェクトを選択してください
          </p>
        )}

        {copySuccess && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            コピーしました
          </p>
        )}

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          このコマンドをターミナルで実行すると、Claude CLIにMCPサーバーを登録できます
        </p>
      </div>
    </div>
  );
}
