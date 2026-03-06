/**
 * GitHubSettingsSection Component
 * GitHub connection settings section for ProjectPane
 * github-issue-integration: Task 9.1
 * Requirements: 1.1, 1.3, 1.5, 1.6, 12.1, 12.2, 12.3, 12.4
 *
 * Provides:
 * - PAT input field (masked)
 * - GitHub Enterprise URL input field
 * - git remote owner/repo auto-detection display
 * - Connection test button with result display
 * - Connection status indicator (not configured / connected / error)
 *
 * Uses vanillaClient to call issueRouter procedures.
 */

import { useState, useEffect, useCallback } from 'react';
import { Github, CheckCircle, XCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getVanillaClient } from '@shared/trpc/vanillaClient';
import type { ConnectionStatus, GitHubRepoInfo, GitHubUser } from '@shared/types/github';

// =============================================================================
// Types
// =============================================================================

export interface GitHubSettingsSectionProps {
  /** Current project path */
  readonly projectPath: string;
}

type TestResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: GitHubUser }
  | { status: 'error'; message: string };

// =============================================================================
// Component
// =============================================================================

export function GitHubSettingsSection({ projectPath }: GitHubSettingsSectionProps) {
  // Don't render if no project selected
  if (!projectPath) {
    return null;
  }

  return <GitHubSettingsSectionInner projectPath={projectPath} />;
}

/**
 * Inner component to allow hooks after the early return guard.
 */
function GitHubSettingsSectionInner({ projectPath }: { projectPath: string }) {
  // Local state
  const [patInput, setPatInput] = useState('');
  const [enterpriseUrlInput, setEnterpriseUrlInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    configured: false,
    connected: false,
    user: null,
    repoInfo: null,
    error: null,
  });
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);

  // Load connection status and repo info on mount
  useEffect(() => {
    const load = async () => {
      try {
        const status = await getVanillaClient().issue.getConnectionStatus.query({ projectPath });
        setConnectionStatus(status as ConnectionStatus);
      } catch {
        // Silently handle - status will remain default
      }

      try {
        const info = await getVanillaClient().issue.detectRepoInfo.query({ projectPath });
        setRepoInfo(info as GitHubRepoInfo);
        setRepoError(null);
      } catch (err: unknown) {
        setRepoInfo(null);
        setRepoError(err instanceof Error ? err.message : 'リポジトリの検出に失敗しました');
      }
    };
    load();
  }, [projectPath]);

  // Save PAT
  const handleSavePat = useCallback(async () => {
    if (!patInput.trim()) return;
    setIsSaving(true);
    try {
      await getVanillaClient().issue.setGitHubToken.mutate({
        projectPath,
        token: patInput.trim(),
      });
      setPatInput('');
      // Reload connection status
      const status = await getVanillaClient().issue.getConnectionStatus.query({ projectPath });
      setConnectionStatus(status as ConnectionStatus);
    } catch {
      // Error handled silently
    } finally {
      setIsSaving(false);
    }
  }, [projectPath, patInput]);

  // Save Enterprise URL
  const handleSaveEnterpriseUrl = useCallback(async () => {
    if (!enterpriseUrlInput.trim()) return;
    try {
      await getVanillaClient().issue.setEnterpriseUrl.mutate({
        projectPath,
        url: enterpriseUrlInput.trim(),
      });
    } catch {
      // Error handled silently
    }
  }, [projectPath, enterpriseUrlInput]);

  // Remove token
  const handleRemoveToken = useCallback(async () => {
    try {
      await getVanillaClient().issue.removeGitHubToken.mutate({ projectPath });
      // Reload connection status
      const status = await getVanillaClient().issue.getConnectionStatus.query({ projectPath });
      setConnectionStatus(status as ConnectionStatus);
      setTestResult({ status: 'idle' });
    } catch {
      // Error handled silently
    }
  }, [projectPath]);

  // Test connection
  const handleTestConnection = useCallback(async () => {
    setTestResult({ status: 'loading' });
    try {
      const user = await getVanillaClient().issue.testConnection.query({ projectPath });
      setTestResult({ status: 'success', user: user as GitHubUser });
    } catch (err: unknown) {
      setTestResult({
        status: 'error',
        message: err instanceof Error ? err.message : '接続テストに失敗しました',
      });
    }
  }, [projectPath]);

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Github className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          GitHub
        </h3>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      {/* Repo Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {repoInfo ? (
          <span>{repoInfo.owner}/{repoInfo.repo}</span>
        ) : repoError ? (
          <span className="text-red-500 dark:text-red-400">
            リポジトリの検出に失敗しました
          </span>
        ) : null}
      </div>

      {/* PAT Input */}
      <div className="space-y-1">
        <label
          htmlFor="github-pat-input"
          className="text-xs text-gray-600 dark:text-gray-400"
        >
          Personal Access Token
        </label>
        <div className="flex gap-1">
          <input
            id="github-pat-input"
            type="password"
            value={patInput}
            onChange={(e) => setPatInput(e.target.value)}
            placeholder={connectionStatus.configured ? '********' : 'ghp_...'}
            className={clsx(
              'flex-1 px-2 py-1 text-xs rounded border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500'
            )}
          />
          <button
            onClick={handleSavePat}
            disabled={!patInput.trim() || isSaving}
            className={clsx(
              'px-2 py-1 text-xs rounded',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="保存"
          >
            保存
          </button>
        </div>
      </div>

      {/* Enterprise URL Input */}
      <div className="space-y-1">
        <label
          htmlFor="github-enterprise-url-input"
          className="text-xs text-gray-600 dark:text-gray-400"
        >
          Enterprise URL
        </label>
        <div className="flex gap-1">
          <input
            id="github-enterprise-url-input"
            type="url"
            value={enterpriseUrlInput}
            onChange={(e) => setEnterpriseUrlInput(e.target.value)}
            placeholder="https://github.example.com"
            className={clsx(
              'flex-1 px-2 py-1 text-xs rounded border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500'
            )}
          />
          <button
            onClick={handleSaveEnterpriseUrl}
            disabled={!enterpriseUrlInput.trim()}
            className={clsx(
              'px-2 py-1 text-xs rounded',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="URL保存"
          >
            保存
          </button>
        </div>
      </div>

      {/* Connection Test */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTestConnection}
          disabled={testResult.status === 'loading'}
          className={clsx(
            'px-2 py-1 text-xs rounded',
            'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
            'text-gray-700 dark:text-gray-300',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center gap-1'
          )}
          aria-label="接続テスト"
        >
          {testResult.status === 'loading' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : null}
          接続テスト
        </button>

        {/* Test Result */}
        {testResult.status === 'success' && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {testResult.user.login}
          </span>
        )}
        {testResult.status === 'error' && (
          <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {testResult.message}
          </span>
        )}
      </div>

      {/* Token Remove */}
      {connectionStatus.configured && (
        <button
          onClick={handleRemoveToken}
          className={clsx(
            'px-2 py-1 text-xs rounded',
            'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30',
            'text-red-600 dark:text-red-400',
            'flex items-center gap-1'
          )}
          aria-label="トークン削除"
        >
          <Trash2 className="w-3 h-3" />
          トークン削除
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  if (!status.configured) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        未設定
      </span>
    );
  }

  if (status.connected) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        接続済み
      </span>
    );
  }

  return (
    <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
      <XCircle className="w-3 h-3" />
      エラー
    </span>
  );
}
