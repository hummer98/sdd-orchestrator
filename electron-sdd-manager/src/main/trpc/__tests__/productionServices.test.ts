/**
 * Production Services Wiring Completeness Tests
 * trpc-service-wiring-completion Tasks 6.1, 6.2
 * Requirements: 10.1, 10.2, 10.3, 10.4
 *
 * Verifies that createProductionServices() wires all ContextServices properties
 * that are not injected by handler.ts (eventBus, getInitialSelectResult, clearInitialSelectResult).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron modules before importing productionServices
vi.mock('electron', () => ({
  dialog: { showOpenDialog: vi.fn() },
  clipboard: { writeText: vi.fn() },
  shell: { openExternal: vi.fn(), openPath: vi.fn() },
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  app: {
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    getAppPath: vi.fn().mockReturnValue('/app'),
    isPackaged: false,
  },
}));

// Mock all service dependencies to avoid side effects
vi.mock('../../services/projectLogger', () => ({
  projectLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../services/configStore', () => ({
  getConfigStore: vi.fn().mockReturnValue({
    getRecentProjects: vi.fn().mockReturnValue([]),
    addRecentProject: vi.fn(),
    removeRecentProject: vi.fn(),
    getHangThreshold: vi.fn().mockReturnValue(30000),
    setHangThreshold: vi.fn(),
    getLayout: vi.fn().mockReturnValue(null),
    setLayout: vi.fn(),
    resetLayout: vi.fn(),
    setToolPath: vi.fn(),
    getBugsWorktreeDefault: vi.fn().mockReturnValue(false),
    setBugsWorktreeDefault: vi.fn(),
    getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
    setMcpSettings: vi.fn(),
  }),
}));
vi.mock('../../services/fileService', () => ({
  FileService: vi.fn().mockImplementation(() => ({
    readSpecs: vi.fn(),
    readSpecJson: vi.fn(),
    updateSpecJsonFromPhase: vi.fn(),
    readArtifact: vi.fn(),
    writeArtifact: vi.fn(),
    listMarkdownFilesInSpec: vi.fn(),
    writeFile: vi.fn(),
    getArtifactPath: vi.fn(),
    readFileContent: vi.fn(),
    resolveSpecPath: vi.fn(),
    resolveBugPath: vi.fn(),
    validateKiroDirectory: vi.fn(),
  })),
}));
vi.mock('../../services/bugService', () => ({
  BugService: vi.fn().mockImplementation(() => ({
    readBugs: vi.fn(),
    readBugDetail: vi.fn(),
    updateBugJsonPhase: vi.fn(),
    bugExists: vi.fn(),
    readBugJson: vi.fn(),
  })),
}));
vi.mock('../../services/specManagerService', () => ({
  SpecManagerService: vi.fn(),
}));
vi.mock('../helpers/projectSetup', () => {
  const mockCoordinator = {
    start: vi.fn(), stop: vi.fn(), getStatus: vi.fn(),
    getAllStatuses: vi.fn(), retryFrom: vi.fn(), resetAll: vi.fn(),
    resetImplRetryCount: vi.fn(),
  };
  return {
    getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
    setProjectPath: vi.fn(),
    getInitialProjectPath: vi.fn().mockReturnValue(null),
    setInitialProjectPath: vi.fn(),
    getSpecManagerService: vi.fn().mockReturnValue({}),
    selectProject: vi.fn(),
    getAutoExecutionCoordinator: vi.fn().mockReturnValue(mockCoordinator),
    getAutoExecutionCoordinatorInternal: vi.fn().mockReturnValue(mockCoordinator),
    getMetricsService: vi.fn().mockReturnValue({
      recordHumanSession: vi.fn(),
      getSpecMetrics: vi.fn(),
      getProjectMetrics: vi.fn(),
    }),
  };
});
vi.mock('../helpers/projectFileUtils', () => ({
  listProjectFilesCore: vi.fn(),
  readProjectFileCore: vi.fn(),
  writeProjectFileCore: vi.fn(),
}));
vi.mock('../helpers/watcherUtils', () => ({
  startSpecsWatcher: vi.fn(),
  stopSpecsWatcher: vi.fn(),
  startBugsWatcher: vi.fn(),
  stopBugsWatcher: vi.fn(),
}));
vi.mock('../../services/bugsWatcherService', () => ({}));
vi.mock('../../services/bugWorkflowService', () => ({
  BugWorkflowService: vi.fn().mockImplementation(() => ({
    createWorktree: vi.fn(),
    removeWorktree: vi.fn(),
    autoExecution: vi.fn(),
  })),
}));
vi.mock('../../services/convertBugWorktreeService', () => ({
  ConvertBugWorktreeService: vi.fn().mockImplementation(() => ({
    convert: vi.fn(),
  })),
}));
vi.mock('../../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    checkMain: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    resolvePath: vi.fn(),
    implStart: vi.fn(),
    normalModeImplStart: vi.fn(),
    rebaseFromMain: vi.fn(),
  })),
}));
vi.mock('../../services/convertWorktreeService', () => ({
  ConvertWorktreeService: vi.fn().mockImplementation(() => ({
    check: vi.fn(),
    convert: vi.fn(),
  })),
}));
vi.mock('../../services/commandInstallerService', () => ({
  CommandInstallerService: vi.fn().mockImplementation(() => ({
    installCommands: vi.fn(),
    installSettings: vi.fn(),
    installAll: vi.fn(),
    forceReinstallAll: vi.fn(),
    confirmCommonCommands: vi.fn(),
  })),
}));
vi.mock('../../services/agentLifecycleSetup', () => ({
  getAgentLifecycleManager: vi.fn().mockReturnValue({
    stopAgent: vi.fn(),
  }),
}));
vi.mock('../../services/logParserService', () => ({
  LogParserService: vi.fn().mockImplementation(() => ({
    parseLogs: vi.fn(),
  })),
}));
vi.mock('../../services/agentRecordService', () => ({
  getDefaultAgentRecordService: vi.fn().mockReturnValue({
    getRunningAgentCounts: vi.fn(),
  }),
}));
vi.mock('../../services/GitService', () => ({
  GitService: vi.fn().mockImplementation(() => ({
    getStatus: vi.fn(),
    getDiff: vi.fn(),
    watchChanges: vi.fn(),
    unwatchChanges: vi.fn(),
  })),
}));
vi.mock('../../services/projectChecker', () => ({
  ProjectChecker: vi.fn().mockImplementation(() => ({
    checkAll: vi.fn(),
  })),
}));
vi.mock('../../services/unifiedCommandsetInstaller', () => ({
  UnifiedCommandsetInstaller: vi.fn().mockImplementation(() => ({
    checkAllInstallStatus: vi.fn(),
    installByProfile: vi.fn(),
  })),
}));
vi.mock('../../services/experimentalToolsInstallerService', () => ({
  ExperimentalToolsInstallerService: vi.fn().mockImplementation(() => ({
    installDebugAgent: vi.fn(),
    checkTargetExists: vi.fn(),
    installGeminiDocumentReview: vi.fn(),
    checkGeminiDocumentReviewExists: vi.fn(),
  })),
}));
vi.mock('../../services/commandsetVersionService', () => ({
  CommandsetVersionService: vi.fn().mockImplementation(() => ({
    checkVersions: vi.fn(),
  })),
}));
vi.mock('../../services/cliInstallerService', () => ({
  getCliInstallStatus: vi.fn(),
  installCliCommand: vi.fn(),
  getManualInstallInstructions: vi.fn(),
}));
vi.mock('../../services/migrationService', () => ({
  getDefaultMigrationService: vi.fn().mockReturnValue({
    checkMigrationNeeded: vi.fn(),
    migrateSpec: vi.fn(),
    declineMigration: vi.fn(),
  }),
}));
vi.mock('../../services/toolPathResolverService', () => ({
  getToolPathResolverService: vi.fn().mockReturnValue({
    getAllStatuses: vi.fn().mockReturnValue([]),
    resolveTool: vi.fn(),
    getStatus: vi.fn(),
  }),
}));
vi.mock('../../services/layoutConfigService', () => ({
  layoutConfigService: {
    loadSkipPermissions: vi.fn(),
    saveSkipPermissions: vi.fn(),
    loadProjectDefaults: vi.fn(),
    saveProjectDefaults: vi.fn(),
    loadProfile: vi.fn(),
    loadRemoteUiAutoStart: vi.fn(),
    saveRemoteUiAutoStart: vi.fn(),
  },
}));
vi.mock('../../services/settingsFileManager', () => ({
  SettingsFileManager: vi.fn().mockImplementation(() => ({
    getVcsScheme: vi.fn(),
    setVcsScheme: vi.fn(),
  })),
}));
vi.mock('../../services/engineConfigService', () => ({
  engineConfigService: {
    loadEngineConfig: vi.fn(),
    saveEngineConfig: vi.fn(),
  },
}));
vi.mock('../../services/remoteAccessSetup', () => ({
  getRemoteAccessServer: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
    getStatus: vi.fn().mockReturnValue({ isRunning: false }),
  }),
}));
vi.mock('../../services/ssh/sshConnectionService', () => ({
  sshConnectionService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getStatus: vi.fn().mockReturnValue({ connected: false, host: null }),
    getConnectionInfo: vi.fn(),
    getRecentRemoteProjects: vi.fn().mockReturnValue([]),
    addRecentRemoteProject: vi.fn(),
    removeRecentRemoteProject: vi.fn(),
  },
}));
vi.mock('../../services/permissionsService', () => ({
  addShellPermissions: vi.fn(),
  addPermissionsToProject: vi.fn(),
  checkRequiredPermissions: vi.fn(),
}));
vi.mock('../../services/idleTimeTracker', () => ({
  setLastActivityTime: vi.fn(),
  getDefaultIdleTimeTracker: vi.fn().mockReturnValue({
    setLastActivityTime: vi.fn(),
  }),
}));
vi.mock('../../services/bugAutoExecutionCoordinator', () => ({
  getBugAutoExecutionCoordinator: vi.fn().mockReturnValue({
    start: vi.fn(), stop: vi.fn(), getStatus: vi.fn(),
    getAllStatuses: vi.fn(), retryFrom: vi.fn(), resetAll: vi.fn(),
  }),
}));
vi.mock('../../services/cloudflareConfigStore', () => ({
  getCloudflareConfigStore: vi.fn().mockReturnValue({
    getTunnelToken: vi.fn(),
    setTunnelToken: vi.fn(),
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    getPublishToCloudflare: vi.fn().mockReturnValue(false),
    setPublishToCloudflare: vi.fn(),
    getCloudflaredPath: vi.fn(),
    setCloudflaredPath: vi.fn(),
  }),
}));
vi.mock('../../services/cloudflareTunnelManager', () => ({
  getCloudflareTunnelManager: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
    getStatus: vi.fn().mockReturnValue({ state: 'stopped', url: null, pid: null }),
  }),
}));
vi.mock('../../services/cloudflaredBinaryChecker', () => ({
  getCloudflaredBinaryChecker: vi.fn().mockReturnValue({
    check: vi.fn(),
  }),
}));
vi.mock('../../services/mcp/mcpAutoStart', () => ({
  getMcpServerService: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
    getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
  }),
}));
vi.mock('../../services/scheduleTaskService', () => ({
  getDefaultScheduleTaskService: vi.fn().mockReturnValue({
    getAllTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  }),
}));
vi.mock('../../services/scheduleTaskSetup', () => ({
  getScheduleTaskCoordinator: vi.fn().mockReturnValue({
    executeImmediately: vi.fn(),
    getQueuedTasks: vi.fn().mockReturnValue([]),
    getRunningTasks: vi.fn().mockReturnValue([]),
  }),
}));
vi.mock('../../services/accessTokenService', () => ({
  getAccessTokenService: vi.fn().mockReturnValue({
    refreshToken: vi.fn(),
  }),
}));
vi.mock('../../services/windowManager', () => ({
  getWindowManager: vi.fn().mockReturnValue({
    createNewWindow: vi.fn(),
  }),
}));
vi.mock('../../services/llmEngineService', () => ({
  getAvailableLlmEngines: vi.fn().mockReturnValue([]),
}));
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  rm: vi.fn(),
}));

import { createProductionServices } from '../productionServices';
import { createMockServices } from '../helpers/test-helpers';

describe('productionServices', () => {
  describe('createProductionServices', () => {
    it('should return a Partial<ContextServices> object', () => {
      const services = createProductionServices();
      expect(services).toBeDefined();
      expect(typeof services).toBe('object');
    });

    it('should return 71 service properties (all except 4 externally injected)', () => {
      const services = createProductionServices();
      const keys = Object.keys(services);
      // productionServices should wire all ContextServices properties except:
      // - eventBus, getInitialSelectResult, clearInitialSelectResult (injected by handler.ts)
      // - createNewWindow (injected by windowFactory.ts via setupTRPCHandler serviceOverrides)
      expect(keys.length).toBeGreaterThanOrEqual(71);
    });

    it('should NOT include handler.ts injected properties (eventBus, getInitialSelectResult, clearInitialSelectResult)', () => {
      const services = createProductionServices();
      const keys = Object.keys(services);
      expect(keys).not.toContain('eventBus');
      expect(keys).not.toContain('getInitialSelectResult');
      expect(keys).not.toContain('clearInitialSelectResult');
    });
  });

  describe('wiring completeness - productionServices keys vs mockServices keys', () => {
    // These properties are NOT in productionServices — they are injected externally:
    // - eventBus, getInitialSelectResult, clearInitialSelectResult: injected by handler.ts
    // - createNewWindow: injected by windowFactory.ts via setupTRPCHandler serviceOverrides
    const HANDLER_INJECTED_KEYS = ['eventBus', 'getInitialSelectResult', 'clearInitialSelectResult', 'createNewWindow'];

    it('should cover all ContextServices properties that mockServices covers (minus handler.ts injected)', () => {
      const productionKeys = new Set(Object.keys(createProductionServices()));
      const mockKeys = new Set(Object.keys(createMockServices()));

      // Remove handler.ts injected keys from mock keys for comparison
      for (const key of HANDLER_INJECTED_KEYS) {
        mockKeys.delete(key);
      }

      // Find keys in mockServices but NOT in productionServices
      const missingInProduction: string[] = [];
      for (const key of mockKeys) {
        if (!productionKeys.has(key)) {
          missingInProduction.push(key);
        }
      }

      expect(missingInProduction).toEqual(
        expect.arrayContaining([]),
      );
      if (missingInProduction.length > 0) {
        throw new Error(
          `Missing wiring in productionServices for: ${missingInProduction.join(', ')}. ` +
          `These services are defined in createMockServices but not wired in createProductionServices.`
        );
      }
    });

    it('should not have extra keys that are not in mockServices', () => {
      const productionKeys = new Set(Object.keys(createProductionServices()));
      const mockKeys = new Set(Object.keys(createMockServices()));

      // Find keys in productionServices but NOT in mockServices
      const extraInProduction: string[] = [];
      for (const key of productionKeys) {
        if (!mockKeys.has(key)) {
          extraInProduction.push(key);
        }
      }

      if (extraInProduction.length > 0) {
        throw new Error(
          `Extra keys in productionServices not in mockServices: ${extraInProduction.join(', ')}. ` +
          `These might be typos or should be added to createMockServices.`
        );
      }
    });

    it('should have exactly mockServices keys minus handler.ts injected keys', () => {
      const productionKeys = Object.keys(createProductionServices()).sort();
      const mockKeys = Object.keys(createMockServices())
        .filter(k => !HANDLER_INJECTED_KEYS.includes(k))
        .sort();

      expect(productionKeys).toEqual(mockKeys);
    });
  });

  describe('individual domain service wiring - non-null checks', () => {
    let services: ReturnType<typeof createProductionServices>;

    beforeEach(() => {
      services = createProductionServices();
    });

    // File Domain (Task 1.1)
    it('should wire listProjectFiles', () => {
      expect(services.listProjectFiles).toBeDefined();
      expect(typeof services.listProjectFiles).toBe('function');
    });

    it('should wire readProjectFile', () => {
      expect(services.readProjectFile).toBeDefined();
      expect(typeof services.readProjectFile).toBe('function');
    });

    it('should wire writeProjectFile', () => {
      expect(services.writeProjectFile).toBeDefined();
      expect(typeof services.writeProjectFile).toBe('function');
    });

    // Project Domain (Task 1.2)
    it('should wire showOpenDialog', () => {
      expect(services.showOpenDialog).toBeDefined();
      expect(typeof services.showOpenDialog).toBe('function');
    });

    it('should NOT include createNewWindow (injected via windowFactory.ts → setupTRPCHandler)', () => {
      // createNewWindow is no longer in productionServices — it's injected as a
      // serviceOverride from windowFactory.ts to eliminate circular dependency.
      expect(services.createNewWindow).toBeUndefined();
    });

    // Bug Domain (Task 1.3)
    it('should wire bugsWatcherStart', () => {
      expect(services.bugsWatcherStart).toBeDefined();
    });

    it('should wire bugWorktreeCreate', () => {
      expect(services.bugWorktreeCreate).toBeDefined();
    });

    it('should wire validateWorktreeMainBranch', () => {
      expect(services.validateWorktreeMainBranch).toBeDefined();
    });

    // Spec Domain (Task 2.1)
    it('should wire confirmCommonCommands', () => {
      expect(services.confirmCommonCommands).toBeDefined();
    });

    // Agent Domain (Task 2.2)
    it('should wire agentStop', () => {
      expect(services.agentStop).toBeDefined();
    });

    it('should wire agentGetLogs', () => {
      expect(services.agentGetLogs).toBeDefined();
    });

    it('should wire agentGetRunningCounts', () => {
      expect(services.agentGetRunningCounts).toBeDefined();
    });

    // Git Domain (Task 3.1)
    it('should wire gitGetStatus', () => {
      expect(services.gitGetStatus).toBeDefined();
    });

    // Worktree Domain (Task 3.2)
    it('should wire worktreeCheckMain', () => {
      expect(services.worktreeCheckMain).toBeDefined();
    });

    it('should wire convertToWorktree', () => {
      expect(services.convertToWorktree).toBeDefined();
    });

    // Install Domain (Task 4.1, 4.2)
    it('should wire installProjectChecker', () => {
      expect(services.installProjectChecker).toBeDefined();
    });

    it('should wire installCommandInstallerService', () => {
      expect(services.installCommandInstallerService).toBeDefined();
    });

    it('should wire installGetCliInstallStatus', () => {
      expect(services.installGetCliInstallStatus).toBeDefined();
    });

    // Schedule Domain (Task 5.1)
    it('should wire reportIdleTime', () => {
      expect(services.reportIdleTime).toBeDefined();
    });

    // Misc Domain (Task 5.2, 5.3)
    it('should wire openInVscode', () => {
      expect(services.openInVscode).toBeDefined();
    });

    it('should wire sshConnect', () => {
      expect(services.sshConnect).toBeDefined();
    });

    // AutoExecution / Cloudflare / MCP / Schedule (Task 5.4)
    it('should wire autoExecutionCoordinator', () => {
      expect(services.autoExecutionCoordinator).toBeDefined();
    });

    it('should wire cloudflareService', () => {
      expect(services.cloudflareService).toBeDefined();
    });

    it('should wire mcpServerService', () => {
      expect(services.mcpServerService).toBeDefined();
    });

    it('should wire scheduleTaskService', () => {
      expect(services.scheduleTaskService).toBeDefined();
    });

    it('should wire scheduleTaskCoordinator', () => {
      expect(services.scheduleTaskCoordinator).toBeDefined();
    });
  });
});
