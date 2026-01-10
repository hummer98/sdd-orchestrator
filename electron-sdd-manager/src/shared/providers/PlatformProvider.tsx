/**
 * PlatformProvider - React Context provider for platform capabilities
 *
 * This provider exposes platform-specific capabilities to the component tree,
 * allowing components to conditionally render features based on the current platform.
 *
 * Design Decision: DD-003 in design.md
 * - Electron: Full capabilities (file dialogs, SSH, local file access)
 * - Web: Limited capabilities (remote file operations via WebSocket only)
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Platform type identifier
 */
export type PlatformType = 'electron' | 'web';

/**
 * Platform capabilities - what features are available on this platform
 */
export interface PlatformCapabilities {
  /**
   * Can open native file dialog for directory selection
   * Electron: Yes (via Electron dialog API)
   * Web: No (no access to native file dialogs)
   */
  canOpenFileDialog: boolean;

  /**
   * Can configure SSH connections
   * Electron: Yes (SSH connection settings UI)
   * Web: No (reads from already connected project)
   */
  canConfigureSSH: boolean;

  /**
   * Can select different projects (switch workspace)
   * Electron: Yes (project selector, recent projects)
   * Web: No (bound to single project from server)
   */
  canSelectProject: boolean;

  /**
   * Can save files directly to local filesystem
   * Electron: Yes (direct file system access)
   * Web: No (saves via WebSocket to server)
   */
  canSaveFileLocally: boolean;

  /**
   * Can open files in external editor (VSCode)
   * Electron: Yes (via shell.openPath)
   * Web: No (no access to local applications)
   */
  canOpenInEditor: boolean;

  /**
   * Can configure Remote Access Server
   * Electron: Yes (server start/stop, QR code display)
   * Web: No (is the Remote UI client)
   */
  canConfigureRemoteServer: boolean;

  /**
   * Can install commandsets to project
   * Electron: Yes (file system access)
   * Web: No (read-only project access)
   */
  canInstallCommandsets: boolean;

  /**
   * Current platform type
   */
  platform: PlatformType;
}

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Check if running in Electron environment
 */
function isElectronEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    'electronAPI' in window &&
    window.electronAPI !== undefined
  );
}

/**
 * Create platform capabilities for Electron
 */
function createElectronCapabilities(): PlatformCapabilities {
  return {
    canOpenFileDialog: true,
    canConfigureSSH: true,
    canSelectProject: true,
    canSaveFileLocally: true,
    canOpenInEditor: true,
    canConfigureRemoteServer: true,
    canInstallCommandsets: true,
    platform: 'electron' as const,
  };
}

/**
 * Create platform capabilities for Web
 */
function createWebCapabilities(): PlatformCapabilities {
  return {
    canOpenFileDialog: false,
    canConfigureSSH: false,
    canSelectProject: false,
    canSaveFileLocally: false,
    canOpenInEditor: false,
    canConfigureRemoteServer: false,
    canInstallCommandsets: false,
    platform: 'web' as const,
  };
}

// =============================================================================
// Context
// =============================================================================

const PlatformContext = createContext<PlatformCapabilities | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

interface PlatformProviderProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Optional custom capabilities for testing
   */
  capabilities?: PlatformCapabilities;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * PlatformProvider - Provides platform capabilities to the React component tree
 *
 * Usage:
 * ```tsx
 * // Auto-detection (recommended)
 * <PlatformProvider>
 *   <App />
 * </PlatformProvider>
 *
 * // With custom capabilities (for testing)
 * <PlatformProvider capabilities={mockCapabilities}>
 *   <App />
 * </PlatformProvider>
 * ```
 */
export function PlatformProvider({
  children,
  capabilities,
}: PlatformProviderProps): React.ReactElement {
  const platformCapabilities = useMemo<PlatformCapabilities>(() => {
    // Use custom capabilities if provided (for testing)
    if (capabilities) {
      return capabilities;
    }

    // Auto-detect platform
    if (isElectronEnvironment()) {
      return createElectronCapabilities();
    }

    return createWebCapabilities();
  }, [capabilities]);

  return (
    <PlatformContext.Provider value={platformCapabilities}>
      {children}
    </PlatformContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * usePlatform - Hook to access platform capabilities
 *
 * Must be used within a PlatformProvider.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const platform = usePlatform();
 *
 *   return (
 *     <div>
 *       {platform.canOpenFileDialog && (
 *         <button onClick={handleOpenDialog}>Open Folder</button>
 *       )}
 *       {platform.platform === 'web' && (
 *         <p>Connected via Remote UI</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlatform(): PlatformCapabilities {
  const context = useContext(PlatformContext);

  if (context === null) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }

  return context;
}

// =============================================================================
// Export Context for advanced use cases
// =============================================================================

export { PlatformContext };
