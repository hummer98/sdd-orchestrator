/**
 * DesktopLayout - Desktop-optimized layout for Remote UI
 *
 * Design Principle: DesktopLayoutはElectron版のレイアウトに準拠する
 * See: .kiro/steering/tech.md - Remote UI DesktopLayout設計原則
 *
 * Layout Structure (matching Electron App.tsx):
 * - Header: タイトル、プロジェクト名、ProfileBadge、接続状態
 * - Left Sidebar: Specs/Bugsタブ切り替え、一覧表示
 * - Main Panel: Artifact表示、ドキュメントタブ
 * - Right Sidebar: ワークフローパネル、Agent一覧
 * - Footer: Agentログエリア
 *
 * Resize機能（Electron版と同等）:
 * - 左サイドバー幅のリサイズ
 * - 右サイドバー幅のリサイズ
 * - フッター高さのリサイズ
 */

import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { ProfileBadge } from '../../shared/components/ui';
import { ResizeHandle } from '../../shared/components/ui';
import { useApi } from '../../shared';
import type { ProfileName } from '../../shared/components/ui/ProfileBadge';
import type { WebSocketApiClient } from '../../shared/api/WebSocketApiClient';

// =============================================================================
// Types
// =============================================================================

interface DesktopLayoutProps {
  /**
   * Left sidebar content (Spec/Bug list with tabs)
   */
  leftSidebar?: ReactNode;

  /**
   * Main content area (Artifact view, document tabs)
   */
  children?: ReactNode;

  /**
   * Right sidebar content (Workflow panel, Agent list)
   */
  rightSidebar?: ReactNode;

  /**
   * Footer content (Agent log panel)
   */
  footer?: ReactNode;
}

// =============================================================================
// Layout Constants (matching Electron DEFAULT_LAYOUT)
// =============================================================================

const DEFAULT_LEFT_SIDEBAR_WIDTH = 288;  // w-72 = 18rem = 288px
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 320; // w-80 = 20rem = 320px
const DEFAULT_FOOTER_HEIGHT = 192;       // h-48 = 12rem = 192px

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const MIN_FOOTER_HEIGHT = 100;
const MAX_FOOTER_HEIGHT = 400;

// =============================================================================
// Component
// =============================================================================

/**
 * DesktopLayout - Electron版に準拠したデスクトップ向けレイアウト
 */
export function DesktopLayout({
  leftSidebar,
  children,
  rightSidebar,
  footer,
}: DesktopLayoutProps): React.ReactElement {
  const [isFooterCollapsed, setFooterCollapsed] = useState(false);

  // Resizable dimensions
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_LEFT_SIDEBAR_WIDTH);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_FOOTER_HEIGHT);

  // Resize handlers
  const handleLeftSidebarResize = useCallback((delta: number) => {
    setLeftSidebarWidth((prev) =>
      Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, prev + delta))
    );
  }, []);

  const handleRightSidebarResize = useCallback((delta: number) => {
    // 右サイドバーは左方向にドラッグすると幅が増える（deltaを反転）
    setRightSidebarWidth((prev) =>
      Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, prev - delta))
    );
  }, []);

  const handleFooterResize = useCallback((delta: number) => {
    // フッターは上方向にドラッグすると高さが増える（deltaを反転）
    setFooterHeight((prev) =>
      Math.min(MAX_FOOTER_HEIGHT, Math.max(MIN_FOOTER_HEIGHT, prev - delta))
    );
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Electron版のheaderに準拠 */}
      <DesktopHeader />

      {/* Main Content Area - 3ペイン構造 */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Spec/Bugsタブ */}
        <aside
          style={{ width: leftSidebarWidth }}
          className="shrink-0 flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
        >
          {leftSidebar || <LeftSidebarPlaceholder />}
        </aside>

        {/* Left resize handle */}
        <ResizeHandle direction="horizontal" onResize={handleLeftSidebarResize} />

        {/* Main Panel - Artifact表示 */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-gray-950">
          {children || <MainPanelPlaceholder />}
        </main>

        {/* Right resize handle */}
        <ResizeHandle direction="horizontal" onResize={handleRightSidebarResize} />

        {/* Right Sidebar - ワークフローパネル */}
        <aside
          style={{ width: rightSidebarWidth }}
          className="shrink-0 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700"
        >
          {rightSidebar || <RightSidebarPlaceholder />}
        </aside>
      </div>

      {/* Footer resize handle */}
      {!isFooterCollapsed && (
        <ResizeHandle direction="vertical" onResize={handleFooterResize} />
      )}

      {/* Footer - Agentログエリア */}
      {!isFooterCollapsed ? (
        <div
          style={{ height: footerHeight }}
          className="shrink-0 flex flex-col border-t border-gray-200 dark:border-gray-700 bg-gray-900"
        >
          <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between bg-gray-800 text-gray-300">
            <span className="text-sm font-medium">Agent Logs</span>
            <button
              onClick={() => setFooterCollapsed(true)}
              className="text-xs px-2 py-1 hover:bg-gray-700 rounded"
            >
              Collapse
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {footer || <FooterPlaceholder />}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setFooterCollapsed(false)}
          className="shrink-0 h-8 flex items-center justify-center bg-gray-800 text-gray-400 hover:text-gray-200 border-t border-gray-700"
        >
          <span className="text-xs">Show Agent Logs</span>
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * DesktopHeader - Electron版のheaderに準拠
 */
function DesktopHeader(): React.ReactElement {
  const apiClient = useApi();
  const [projectName, setProjectName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState<{ name: string } | null>(null);

  useEffect(() => {
    // Load profile on mount
    if (apiClient.getProfile) {
      apiClient.getProfile().then(result => {
        if (result.ok) {
          setProfile(result.value);
        }
      });
    }

    // Check connection status and get project path
    const wsClient = apiClient as WebSocketApiClient;
    if ('isConnected' in wsClient && typeof wsClient.isConnected === 'function') {
      setIsConnected(wsClient.isConnected());

      // Poll connection status and project path
      const interval = setInterval(() => {
        if ('isConnected' in wsClient && typeof wsClient.isConnected === 'function') {
          setIsConnected(wsClient.isConnected());
        }
        if ('getProjectPath' in wsClient && typeof wsClient.getProjectPath === 'function') {
          const path = wsClient.getProjectPath();
          if (path) {
            setProjectName(path.split('/').pop() || '');
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setIsConnected(true);
    }
  }, [apiClient]);

  return (
    <header className="shrink-0 h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      {/* Left: Title and Project Info */}
      <div className="flex items-center">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          SDD Orchestrator
        </h1>
        <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
          Remote
        </span>

        {/* Project name (matching Electron header) */}
        {projectName && (
          <div className="ml-6 flex items-center gap-2">
            <span className="text-gray-400">/</span>
            <span className="text-base font-medium text-gray-700 dark:text-gray-300">
              {projectName}
            </span>
            <ProfileBadge
              profile={(profile?.name as ProfileName) ?? null}
              className="ml-2"
            />
          </div>
        )}
      </div>

      {/* Right: Connection Status */}
      <div className="flex items-center gap-2">
        <span
          data-testid="remote-status-dot"
          className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
        />
        <span
          data-testid="remote-status-text"
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
    </header>
  );
}

/**
 * LeftSidebarPlaceholder - 左サイドバーのプレースホルダー
 */
function LeftSidebarPlaceholder(): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs placeholder */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button className="flex-1 px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600 dark:text-blue-400">
          Specs
        </button>
        <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          Bugs
        </button>
      </div>
      {/* List placeholder */}
      <div className="flex-1 p-4 text-sm text-gray-500 dark:text-gray-400">
        Loading specs...
      </div>
    </div>
  );
}

/**
 * MainPanelPlaceholder - メインパネルのプレースホルダー
 */
function MainPanelPlaceholder(): React.ReactElement {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg">Select a spec or bug</p>
        <p className="text-sm mt-2">to view documents and artifacts</p>
      </div>
    </div>
  );
}

/**
 * RightSidebarPlaceholder - 右サイドバーのプレースホルダー
 */
function RightSidebarPlaceholder(): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      {/* Workflow header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Workflow
        </h2>
      </div>
      {/* Workflow content placeholder */}
      <div className="flex-1 p-4 text-sm text-gray-500 dark:text-gray-400">
        Select a spec to view workflow
      </div>
      {/* Agent list section */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Agents
          </h2>
        </div>
        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
          No running agents
        </div>
      </div>
    </div>
  );
}

/**
 * FooterPlaceholder - フッターのプレースホルダー
 */
function FooterPlaceholder(): React.ReactElement {
  return (
    <div className="h-full p-4 font-mono text-xs text-gray-500">
      No agent logs yet...
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default DesktopLayout;
