/**
 * BugsView Component
 *
 * Task 13.5: Bugsタブの機能UIを実装する
 * Task 4.3: Bug作成ボタンとダイアログの統合 (remote-ui-bug-advanced-features)
 *
 * Bug一覧表示コンポーネント。共有bugStoreとApiClientを使用。
 * BugListItemを使用したリスト表示（検索・フィルタリング）。
 * Bug作成ボタン（Desktop: ヘッダー、SP: FAB）とダイアログ。
 *
 * Requirements: 7.2, 1.1, 1.4 (remote-ui-bug-advanced-features)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Bug } from 'lucide-react';
import { clsx } from 'clsx';
import { BugListItem } from '@shared/components/bug/BugListItem';
import { Spinner } from '@shared/components/ui/Spinner';
import type { ApiClient, BugMetadataWithPath } from '@shared/api/types';
import { CreateBugButtonRemote } from '../components/CreateBugButtonRemote';
import { CreateBugDialogRemote } from '../components/CreateBugDialogRemote';

// =============================================================================
// Types
// =============================================================================

// spec-path-ssot-refactor: Remote UI uses BugMetadataWithPath from WebSocket API
export interface BugsViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Currently selected bug ID */
  selectedBugId?: string | null;
  /** Called when a bug is selected */
  onSelectBug?: (bug: BugMetadataWithPath) => void;
  /** Device type for responsive layout */
  deviceType?: 'desktop' | 'smartphone';
}

// =============================================================================
// Component
// =============================================================================

export function BugsView({
  apiClient,
  selectedBugId,
  onSelectBug,
  deviceType = 'desktop',
}: BugsViewProps): React.ReactElement {
  // State
  // spec-path-ssot-refactor: Remote UI receives BugMetadataWithPath from WebSocket
  const [bugs, setBugs] = useState<BugMetadataWithPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Task 4.3: Bug作成ダイアログ表示状態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Load bugs on mount
  useEffect(() => {
    let isMounted = true;

    async function loadBugs() {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getBugs();

      if (!isMounted) return;

      if (result.ok) {
        // spec-path-ssot-refactor: WebSocket API returns BugMetadataWithPath
        const bugsWithPath = result.value as unknown as BugMetadataWithPath[];
        setBugs(bugsWithPath);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    }

    loadBugs();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  // Subscribe to bug updates
  useEffect(() => {
    const unsubscribe = apiClient.onBugsUpdated((updatedBugs) => {
      // spec-path-ssot-refactor: WebSocket API returns BugMetadataWithPath
      const bugsWithPath = updatedBugs as unknown as BugMetadataWithPath[];
      setBugs(bugsWithPath);
    });

    return unsubscribe;
  }, [apiClient]);

  // Handle bug selection
  // spec-path-ssot-refactor: Using BugMetadataWithPath for Remote UI
  const handleSelectBug = useCallback(
    (bug: BugMetadataWithPath) => {
      onSelectBug?.(bug);
    },
    [onSelectBug]
  );

  // Sort bugs by updatedAt descending (matching Electron version)
  const sortedBugs = useMemo(() => {
    return [...bugs].sort((a, b) => {
      // Sort by updatedAt descending (newest first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [bugs]);

  // Filter bugs by search query
  const filteredBugs = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedBugs;
    }

    const query = searchQuery.toLowerCase();
    return sortedBugs.filter((bug) => bug.name.toLowerCase().includes(query));
  }, [sortedBugs, searchQuery]);

  // Render loading state
  if (isLoading) {
    return (
      <div
        data-testid="bugs-view-loading"
        className="flex items-center justify-center h-full p-8"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        data-testid="bugs-error-state"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div className="text-red-500 mb-2">
          <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
        </div>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Render empty state
  if (bugs.length === 0) {
    return (
      <div
        data-testid="bugs-empty-state"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <Bug className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Bugがありません</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          デスクトップアプリでBugを作成してください
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="bugs-view">
      {/* Header with Search and Create Button (Desktop) */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              data-testid="bugs-search-input"
              placeholder="Bugを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={clsx(
                'w-full pl-9 pr-3 py-2 text-sm rounded-lg',
                'bg-gray-100 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              )}
            />
          </div>
          {/* Desktop: Create Bug Button */}
          {deviceType === 'desktop' && (
            <CreateBugButtonRemote
              onClick={() => setIsCreateDialogOpen(true)}
              deviceType={deviceType}
            />
          )}
        </div>
      </div>

      {/* Bug List */}
      <div className="flex-1 overflow-y-auto">
        {filteredBugs.length === 0 ? (
          <div
            data-testid="bugs-no-results"
            className="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <Search className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              "{searchQuery}" に一致するBugがありません
            </p>
          </div>
        ) : (
          <ul data-testid="bugs-list" className="divide-y-0">
            {/* remote-ui-vanilla-removal: Added remote-bug-list wrapper for E2E */}
            <div data-testid="remote-bug-list">
              {filteredBugs.map((bug) => (
                <div key={bug.name} data-testid={`remote-bug-item-${bug.name}`}>
                  <BugListItem
                    bug={bug}
                    isSelected={selectedBugId === bug.name}
                    onSelect={() => handleSelectBug(bug)}
                  />
                </div>
              ))}
            </div>
          </ul>
        )}
      </div>

      {/* Smartphone: FAB (Floating Action Button) */}
      {deviceType === 'smartphone' && (
        <CreateBugButtonRemote
          onClick={() => setIsCreateDialogOpen(true)}
          deviceType={deviceType}
        />
      )}

      {/* Create Bug Dialog */}
      <CreateBugDialogRemote
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        apiClient={apiClient}
        deviceType={deviceType}
      />
    </div>
  );
}

export default BugsView;
