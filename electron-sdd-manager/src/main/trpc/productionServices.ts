/**
 * Production Services - DI Assembly for tRPC Context
 * trpc-service-wiring-completion: All 72 services wired for production use
 *
 * Creates the Partial<ContextServices> object that setupTRPCHandler merges into context.
 * handler.ts injects eventBus, getInitialSelectResult, clearInitialSelectResult separately.
 * This file must NOT return those 3 properties to avoid overwriting handler.ts values.
 *
 * Design Decisions:
 * - DD-001: Existing createProductionServices() pattern
 * - DD-003: showOpenDialog / createNewWindow window reference resolution
 * - DD-004: Closure pattern for project-path-dependent services
 */

import { app, dialog, clipboard, shell, BrowserWindow } from 'electron';
import { access, rm } from 'fs/promises';
import { join } from 'path';

import type { ContextServices } from './context';

// ============================================================
// Service Imports
// ============================================================

// State / Setup
import {
  getCurrentProjectPath,
  setProjectPath,
  getInitialProjectPath,
  setInitialProjectPath,
  getSpecManagerService,
  selectProject,
  getAutoExecutionCoordinator,
} from './helpers/projectSetup';

// File Domain
import {
  listProjectFilesCore,
  readProjectFileCore,
  writeProjectFileCore,
} from './helpers/projectFileUtils';

// Config Domain
import { getConfigStore } from '../services/configStore';
import { layoutConfigService } from '../services/layoutConfigService';
import { engineConfigService } from '../services/engineConfigService';
import { getToolPathResolverService } from '../services/toolPathResolverService';
import { SettingsFileManager } from '../services/settingsFileManager';
import { getTemplatesPath } from '../utils/resourcePaths';

// File/Bug Services
import { FileService } from '../services/fileService';
import { BugService } from '../services/bugService';

// Bug Domain
import { BugsWatcherService } from '../services/bugsWatcherService';
import { BugWorkflowService } from '../services/bugWorkflowService';
import { ConvertBugWorktreeService } from '../services/convertBugWorktreeService';

// Agent Domain
import { getAgentLifecycleManager } from '../services/agentLifecycleSetup';
import { getDefaultAgentRecordService } from '../services/agentRecordService';

// Git / Worktree Domain
import { GitService } from '../services/GitService';
import { GitFileWatcherService } from '../services/GitFileWatcherService';
import { WorktreeService } from '../services/worktreeService';
import { ConvertWorktreeService } from '../services/convertWorktreeService';

// Install Domain
import { ProjectChecker } from '../services/projectChecker';
import { CommandInstallerService } from '../services/commandInstallerService';
import { UnifiedCommandsetInstaller } from '../services/unifiedCommandsetInstaller';
import { CcSddWorkflowInstaller } from '../services/ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from '../services/bugWorkflowInstaller';
import { ExperimentalToolsInstallerService } from '../services/experimentalToolsInstallerService';
import { CommandsetVersionService } from '../services/commandsetVersionService';
import { getCliInstallStatus, installCliCommand, getManualInstallInstructions } from '../services/cliInstallerService';

// Schedule Domain
import { setLastActivityTime } from '../services/idleTimeTracker';

// Misc Domain - Remote / SSH
import { getRemoteAccessServer } from '../services/remoteAccessSetup';
import { sshConnectionService } from '../services/ssh/sshConnectionService';
import { getRecentRemoteProjectsService } from '../services/ssh/recentRemoteProjects';
import { getDefaultMetricsService } from '../services/metricsService';
import { addShellPermissions, addPermissionsToProject, checkRequiredPermissions } from '../services/permissionsService';
import { REQUIRED_PERMISSIONS } from '../services/projectChecker';
import { projectLogger } from '../services/projectLogger';

// AutoExecution / Cloudflare / MCP / Schedule
import { getBugAutoExecutionCoordinator } from '../services/bugAutoExecutionCoordinator';
import { getCloudflareConfigStore } from '../services/cloudflareConfigStore';
import { getCloudflareTunnelManager } from '../services/cloudflareTunnelManager';
import { getCloudflaredBinaryChecker } from '../services/cloudflaredBinaryChecker';
import { getMcpServerService } from '../services/mcp/mcpAutoStart';
import { getDefaultScheduleTaskService } from '../services/scheduleTaskService';
import { getScheduleTaskCoordinator } from '../services/scheduleTaskSetup';
import { getAccessTokenService } from '../services/accessTokenService';

// ============================================================
// Service Instances (created once at module level)
// ============================================================
const fileService = new FileService();
const bugService = new BugService();
const settingsFileManager = new SettingsFileManager();
const gitService = new GitService();
const gitFileWatcherService = new GitFileWatcherService(gitService);

// Install domain: construct with template directory
const templateDir = getTemplatesPath();
const commandInstallerService = new CommandInstallerService(templateDir);
const ccSddInstaller = new CcSddWorkflowInstaller(templateDir);
const bugWorkflowInstaller = new BugWorkflowInstaller(templateDir);
const unifiedCommandsetInstaller = new UnifiedCommandsetInstaller(ccSddInstaller, bugWorkflowInstaller, templateDir);
const experimentalToolsInstaller = new ExperimentalToolsInstallerService(templateDir);
const commandsetVersionService = new CommandsetVersionService();
const projectChecker = new ProjectChecker();

/**
 * Create production services for tRPC context DI.
 * Returns all ContextServices properties EXCEPT:
 * - eventBus (injected by handler.ts)
 * - getInitialSelectResult (injected by handler.ts)
 * - clearInitialSelectResult (injected by handler.ts)
 *
 * @returns Partial<ContextServices> with 72+ properties wired to production implementations
 */
export function createProductionServices(): Partial<ContextServices> {
  return {
    // ============================================================
    // State Getters/Setters
    // ============================================================
    getCurrentProjectPath,
    setProjectPath,
    getInitialProjectPath,
    setInitialProjectPath,

    // ============================================================
    // System Information
    // ============================================================
    getAppVersion: () => app.getVersion(),
    getPlatform: () => process.platform,
    getAppPath: () => app.getAppPath(),
    getNodeEnv: () => process.env.NODE_ENV || 'production',

    // ============================================================
    // Service Instances
    // ============================================================
    fileService,
    configStore: getConfigStore(),
    bugService,
    getSpecManagerService,

    // ============================================================
    // Config Domain Services
    // ============================================================
    layoutConfigService,
    engineConfigService,
    toolPathResolverService: getToolPathResolverService(),
    settingsFileManager,
    getAvailableLlmEngines: () => [
      { id: 'claude', label: 'Claude' },
      { id: 'gemini', label: 'Gemini' },
    ],

    // ============================================================
    // File Domain Services (Task 1.1)
    // ============================================================
    listProjectFiles: listProjectFilesCore,
    readProjectFile: readProjectFileCore,
    writeProjectFile: writeProjectFileCore,

    // ============================================================
    // Project Domain Services (Task 1.2)
    // DD-003: showOpenDialog uses BrowserWindow.getFocusedWindow() with fallback
    // ============================================================
    selectProject: selectProject as unknown as ContextServices['selectProject'],
    showOpenDialog: async () => {
      const focusedWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
      if (!focusedWindow) return null;
      const result = await dialog.showOpenDialog(focusedWindow, {
        properties: ['openDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    },
    createNewWindow: async () => {
      // Dynamic import to avoid circular dependency with index.ts
      const { createWindow } = await import('../index');
      createWindow();
    },
    getIsE2ETest: () => process.argv.includes('--e2e-test'),

    // ============================================================
    // Bug Domain Services (Task 1.3)
    // DD-004: Closure pattern for project-path-dependent services
    // ============================================================
    bugsWatcherStart: async () => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return;
      const watcher = new BugsWatcherService(projectPath);
      await watcher.start();
    },
    bugsWatcherStop: async () => {
      // Stop is handled at application level via watcherUtils
      const { stopBugsWatcher } = await import('./helpers/watcherUtils');
      await stopBugsWatcher();
    },
    bugWorktreeCreate: (async (bugName: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
      const worktreeService = new WorktreeService(projectPath);
      return worktreeService.createBugWorktree(bugName);
    }) as ContextServices['bugWorktreeCreate'],
    bugWorktreeRemove: (async (bugName: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
      const worktreeService = new WorktreeService(projectPath);
      return worktreeService.removeBugWorktree(bugName);
    }) as ContextServices['bugWorktreeRemove'],
    bugWorktreeAutoExecution: (async (bugName: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
      const configStore = getConfigStore();
      const worktreeServiceFactory = (pp: string) => new WorktreeService(pp);
      const bugWorkflowService = new BugWorkflowService(configStore, worktreeServiceFactory, bugService);
      const bugPath = join(projectPath, '.kiro', 'bugs', bugName);
      return bugWorkflowService.startBugFixWithAutoWorktree(bugName, projectPath, bugPath);
    }) as ContextServices['bugWorktreeAutoExecution'],
    bugConvertToWorktree: (async (bugName: string) => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return { ok: false, error: { type: 'NO_PROJECT', message: 'No project selected' } };
      const worktreeService = new WorktreeService(projectPath);
      const convertService = new ConvertBugWorktreeService(worktreeService, bugService);
      const bugPath = join(projectPath, '.kiro', 'bugs', bugName);
      return convertService.convertToWorktree(projectPath, bugPath, bugName);
    }) as ContextServices['bugConvertToWorktree'],
    validateWorktreeMainBranch: async (projectPath: string) => {
      const worktreeService = new WorktreeService(projectPath);
      const result = await worktreeService.isOnMainBranch();
      if (!result.ok) return { ok: false, error: { message: 'Failed to check branch' } };
      return { ok: result.value };
    },

    // ============================================================
    // Spec Domain Services (Task 2.1)
    // confirmCommonCommands delegates to UnifiedCommandsetInstaller
    // ============================================================
    confirmCommonCommands: async (projectPath, decisions) => {
      const result = await unifiedCommandsetInstaller.installCommonCommandsWithDecisions(
        projectPath,
        decisions.map(d => ({ name: d.name, action: d.action })),
      );
      return result as Awaited<ReturnType<NonNullable<ContextServices['confirmCommonCommands']>>>;
    },

    // ============================================================
    // Agent Domain Services (Task 2.2)
    // ============================================================
    agentStop: async (agentId: string) => {
      const manager = getAgentLifecycleManager();
      if (manager) {
        await manager.stopAgent(agentId, 'user_request');
      } else {
        // Fallback to SpecManagerService
        const specManager = getSpecManagerService();
        await specManager.stopAgent?.(agentId);
      }
    },
    agentGetLogs: async (specId: string, agentId: string) => {
      const { readParsedLogs } = await import('../services/logFileService');
      return readParsedLogs(specId, agentId);
    },
    agentGetRunningCounts: async () => {
      const service = getDefaultAgentRecordService();
      const countsMap = await service.getRunningAgentCounts();
      // Convert Map<string, number> to Record<string, number>
      const record: Record<string, number> = {};
      for (const [key, value] of countsMap) {
        record[key] = value;
      }
      return record;
    },
    agentCheckFolderExists: async (projectPath: string) => {
      const folderPath = join(projectPath, '.claude', 'agents', 'kiro');
      try {
        await access(folderPath);
        return true;
      } catch {
        return false;
      }
    },
    agentDeleteFolder: async (projectPath: string) => {
      const folderPath = join(projectPath, '.claude', 'agents', 'kiro');
      try {
        await rm(folderPath, { recursive: true, force: true });
        return { ok: true as const };
      } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    // ============================================================
    // Git Domain Services (Task 3.1)
    // GitService is stateless - methods take projectPath as first param
    // ============================================================
    gitGetStatus: async (projectPath: string) => {
      return gitService.getStatus(projectPath);
    },
    gitGetDiff: async (projectPath: string, filePath: string) => {
      return gitService.getDiff(projectPath, filePath);
    },
    gitWatchChanges: async (projectPath: string) => {
      return gitFileWatcherService.startWatching(projectPath);
    },
    gitUnwatchChanges: async (projectPath: string) => {
      return gitFileWatcherService.stopWatching(projectPath);
    },

    // ============================================================
    // Worktree Domain Services (Task 3.2)
    // DD-004: Closure pattern for project-path-dependent services
    // ============================================================
    worktreeCheckMain: async (projectPath: string) => {
      const service = new WorktreeService(projectPath);
      const branchResult = await service.getCurrentBranch();
      const isMainResult = await service.isOnMainBranch();
      if (!isMainResult.ok) return { ok: false, error: isMainResult.error };
      return {
        ok: true,
        value: {
          isMain: isMainResult.value,
          currentBranch: branchResult.ok ? branchResult.value : 'unknown',
        },
      };
    },
    worktreeCreate: async (projectPath: string, featureName: string) => {
      const service = new WorktreeService(projectPath);
      return service.createWorktree(featureName);
    },
    worktreeRemove: async (projectPath: string, featureName: string) => {
      const service = new WorktreeService(projectPath);
      return service.removeWorktree(featureName);
    },
    worktreeResolvePath: async (projectPath: string, relativePath: string) => {
      const service = new WorktreeService(projectPath);
      try {
        const absolutePath = service.resolveWorktreePath(relativePath);
        return { ok: true, value: { absolutePath } };
      } catch (error) {
        return { ok: false, error: { type: 'RESOLVE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },
    worktreeImplStart: async (projectPath: string, specPath: string, featureName: string) => {
      const service = new WorktreeService(projectPath);
      // Impl start: commit spec changes, create worktree, create symlinks
      const commitResult = await service.commitSpecChanges(specPath, featureName);
      if (!commitResult.ok) return commitResult;
      const createResult = await service.createWorktree(featureName);
      if (!createResult.ok) return createResult;
      const symlinkResult = await service.createSymlinksForWorktree(createResult.value.absolutePath, featureName);
      if (!symlinkResult.ok) return symlinkResult;
      return { ok: true, value: { worktreePath: createResult.value.absolutePath, worktreeConfig: createResult.value } };
    },
    normalModeImplStart: async (projectPath: string, _specPath: string) => {
      const service = new WorktreeService(projectPath);
      const branchResult = await service.getCurrentBranch();
      return { ok: true, value: { branch: branchResult.ok ? branchResult.value : 'unknown' } };
    },
    worktreeRebaseFromMain: async (projectPath: string, specOrBugPath: string) => {
      const service = new WorktreeService(projectPath);
      return service.executeRebaseFromMain(specOrBugPath);
    },
    convertCheck: async (projectPath: string, specPath: string) => {
      const worktreeService = new WorktreeService(projectPath);
      const convertService = new ConvertWorktreeService(worktreeService, fileService);
      return convertService.canConvert(projectPath, specPath);
    },
    convertToWorktree: async (projectPath: string, specPath: string, featureName: string) => {
      const worktreeService = new WorktreeService(projectPath);
      const convertService = new ConvertWorktreeService(worktreeService, fileService);
      return convertService.convertToWorktree(projectPath, specPath, featureName);
    },

    // ============================================================
    // Install Domain Services (Task 4.1)
    // Cast via 'as any' to bridge readonly string[] vs mutable string[] interface
    // ============================================================
    installProjectChecker: projectChecker as any,
    installCommandInstallerService: commandInstallerService as any,
    installUnifiedCommandsetInstaller: unifiedCommandsetInstaller as any,
    installExperimentalToolsInstaller: experimentalToolsInstaller as any,
    installCommandsetVersionService: commandsetVersionService as any,

    // ============================================================
    // Install Domain Services - CLI / Migration / jj (Task 4.2)
    // ============================================================
    installGetCliInstallStatus: async (location?: string) => {
      const status = await getCliInstallStatus(location as any);
      return {
        installed: status.isInstalled,
        path: status.symlinkPath,
        location: location ?? 'user',
      };
    },
    installInstallCliCommand: async (location?: string) => {
      const result = await installCliCommand(location as any);
      return result;
    },
    installGetManualInstallInstructions: (location?: string) => getManualInstallInstructions(location as any),
    installMigrationService: undefined, // Initialized lazily after project selection via setProjectPath
    installCheckJjAvailability: () => {
      const resolver = getToolPathResolverService();
      const status = resolver.getStatus('jj');
      return {
        name: 'jj',
        available: status?.resolution.resolved ?? false,
        installGuidance: status?.definition.installGuidance ?? 'brew install jj',
      };
    },
    installInstallJj: async () => {
      const resolver = getToolPathResolverService();
      const result = await resolver.resolveTool('jj', { forceResolve: true });
      return { success: result.resolved, error: result.error };
    },
    installIgnoreJjInstall: async (projectPath: string, ignored: boolean) => {
      try {
        await layoutConfigService.saveJjInstallIgnored?.(projectPath, ignored);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    // ============================================================
    // Schedule Domain Services (Task 5.1)
    // ============================================================
    reportIdleTime: (lastActivityTime: number) => {
      setLastActivityTime(lastActivityTime);
    },

    // ============================================================
    // Misc Domain Services - VSCode, Clipboard, Log, Metrics, Permissions (Task 5.2)
    // ============================================================
    openInVscode: async (projectPath: string) => {
      await shell.openExternal(`vscode://file/${projectPath}`);
    },
    copyToClipboard: (text: string) => {
      clipboard.writeText(text);
    },
    logRenderer: (level, message, context) => {
      projectLogger[level](`[renderer] ${message}`, context ? { rendererContext: context } : undefined);
    },
    recordHumanSession: async (session) => {
      const service = getDefaultMetricsService();
      await service.recordHumanSession(session);
      return { ok: true as const };
    },
    getSpecMetrics: async (specId) => {
      const service = getDefaultMetricsService();
      const metrics = await service.getMetricsForSpec(specId);
      return { ok: true as const, value: metrics as unknown as Record<string, unknown> };
    },
    getProjectMetrics: async () => {
      const service = getDefaultMetricsService();
      const metrics = await service.getProjectMetrics();
      return { ok: true as const, value: metrics as unknown as Record<string, unknown> };
    },
    getProjectLogPath: () => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return null;
      return join(projectPath, '.kiro', 'logs', 'main.log');
    },
    openLogInBrowser: async () => {
      const projectPath = getCurrentProjectPath();
      if (!projectPath) return;
      const logDir = join(projectPath, '.kiro', 'logs');
      await shell.openPath(logDir);
    },
    addShellPermissions: async (projectPath) => {
      return addShellPermissions(projectPath) as any;
    },
    addMissingPermissions: async (projectPath, permissions) => {
      return addPermissionsToProject(projectPath, permissions) as any;
    },
    checkRequiredPermissions: async (projectPath) => {
      const result = await checkRequiredPermissions(projectPath, REQUIRED_PERMISSIONS as unknown as string[]);
      if (!result.ok) {
        return { allPresent: false, missing: [] as string[], present: [] as string[] };
      }
      return {
        allPresent: result.value.allPresent,
        missing: [...result.value.missing] as string[],
        present: [...result.value.present] as string[],
      };
    },

    // ============================================================
    // Misc Domain Services - Remote Server, SSH (Task 5.3)
    // ============================================================
    startRemoteServer: (async (preferredPort?: number) => {
      const server = getRemoteAccessServer();
      return server.start(preferredPort);
    }) as ContextServices['startRemoteServer'],
    stopRemoteServer: async () => {
      const server = getRemoteAccessServer();
      await server.stop();
    },
    getRemoteServerStatus: () => {
      const server = getRemoteAccessServer();
      const status = server.getStatus();
      const tokenService = getAccessTokenService();
      return {
        running: status.isRunning,
        port: status.port ?? null,
        url: status.url ?? null,
        clientCount: status.clientCount ?? 0,
        accessToken: status.isRunning ? tokenService.getToken() : null,
      };
    },
    refreshAccessToken: async () => {
      try {
        const server = getRemoteAccessServer();
        const result = await server.refreshAccessToken();
        if (!result) {
          return { ok: false as const, error: { type: 'NOT_RUNNING', message: 'Server is not running' } };
        }
        return { ok: true as const, value: { accessToken: result.accessToken, tunnelQrCodeDataUrl: result.tunnelQrCodeDataUrl } };
      } catch (error) {
        return { ok: false as const, error: { type: 'REFRESH_FAILED', message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },
    sshConnect: async (uri: string) => {
      const { sshUriParser } = await import('../services/ssh/sshUriParser');
      const parseResult = sshUriParser.parse(uri);
      if (!parseResult.ok) {
        return { ok: false, error: { type: 'INVALID_URI', message: `Invalid SSH URI: ${parseResult.error.type}` } };
      }
      return sshConnectionService.connect(parseResult.value);
    },
    sshDisconnect: async () => {
      await sshConnectionService.disconnect();
    },
    sshGetStatus: () => {
      const status = sshConnectionService.getStatus();
      const connInfo = sshConnectionService.getConnectionInfo();
      return { connected: status === 'connected', host: connInfo?.host ?? null };
    },
    sshGetConnectionInfo: () => {
      const info = sshConnectionService.getConnectionInfo();
      if (!info) return null;
      return {
        host: info.host,
        port: info.port,
        user: info.user,
        connectedAt: info.connectedAt.toISOString(),
        bytesTransferred: info.bytesTransferred,
      };
    },
    sshGetRecentRemoteProjects: () => {
      const service = getRecentRemoteProjectsService();
      return service.getRecentRemoteProjects();
    },
    sshAddRecentRemoteProject: (uri, displayName, connectionSuccessful) => {
      const service = getRecentRemoteProjectsService();
      service.addRecentRemoteProject(uri, displayName, connectionSuccessful);
    },
    sshRemoveRecentRemoteProject: (uri) => {
      const service = getRecentRemoteProjectsService();
      service.removeRecentRemoteProject(uri);
    },

    // ============================================================
    // AutoExecution / Cloudflare / MCP / Schedule (Task 5.4)
    // ============================================================
    autoExecutionCoordinator: getAutoExecutionCoordinator() as unknown as ContextServices['autoExecutionCoordinator'],
    bugAutoExecutionCoordinator: getBugAutoExecutionCoordinator() as unknown as ContextServices['bugAutoExecutionCoordinator'],
    cloudflareService: {
      getAllSettings: () => {
        const store = getCloudflareConfigStore();
        return {
          hasTunnelToken: !!store.getTunnelToken(),
          tunnelTokenSource: store.getTunnelToken() ? (process.env.CLOUDFLARE_TUNNEL_TOKEN ? 'env' : 'stored') : 'none',
          accessToken: store.getAccessToken(),
          publishToCloudflare: store.getPublishToCloudflare(),
          cloudflaredPath: store.getCloudflaredPath(),
        };
      },
      setTunnelToken: (token: string) => getCloudflareConfigStore().setTunnelToken(token),
      refreshAccessToken: () => {
        const tokenService = getAccessTokenService();
        return tokenService.refreshToken();
      },
      ensureAccessToken: () => {
        const tokenService = getAccessTokenService();
        return tokenService.ensureToken();
      },
      checkBinary: async () => {
        const checker = getCloudflaredBinaryChecker();
        const result = await checker.checkBinaryExists();
        if (result.exists) {
          return { exists: true, path: result.path };
        }
        return { exists: false, installInstructions: checker.getInstallInstructions() };
      },
      setPublishToCloudflare: (enabled: boolean) => getCloudflareConfigStore().setPublishToCloudflare(enabled),
      setCloudflaredPath: (path: string | null) => getCloudflareConfigStore().setCloudflaredPath(path),
      startTunnel: (localPort: number) => getCloudflareTunnelManager().start(localPort),
      stopTunnel: () => getCloudflareTunnelManager().stop(),
      getTunnelStatus: () => getCloudflareTunnelManager().getStatus(),
    },
    mcpServerService: getMcpServerService() as unknown as ContextServices['mcpServerService'],
    scheduleTaskService: getDefaultScheduleTaskService() as unknown as ContextServices['scheduleTaskService'],
    scheduleTaskCoordinator: (getScheduleTaskCoordinator() ?? undefined) as unknown as ContextServices['scheduleTaskCoordinator'],
  };
}
