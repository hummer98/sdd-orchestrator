/**
 * Common test helpers for tRPC router testing
 * Task 1.2: ルーターテスト用の共通テストヘルパー
 * Requirements: 1.4, 2.5, 3.6
 * Method: createTestContext, createCallerFactory
 *
 * Provides:
 * - createMockServices: Creates a complete ContextServices object with vi.fn() mocks
 * - createTestContext: Creates a tRPC Context with sensible mock defaults
 * - createTestCaller: Creates a tRPC caller bound to appRouter with mock context
 *
 * Usage:
 *   // Simple - default mocks for all services
 *   const caller = createTestCaller();
 *   const result = await caller.system.healthCheck();
 *
 *   // With service overrides
 *   const caller = createTestCaller({
 *     getCurrentProjectPath: vi.fn().mockReturnValue('/custom/path'),
 *   });
 *
 *   // For context-level assertions
 *   const ctx = createTestContext({ configStore: myMockStore });
 *   expect(ctx.services.configStore).toBe(myMockStore);
 */
import { vi } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { createContext, type ContextServices } from '../context';
import { appRouter } from '../router';
import { createEventBus } from '../services/eventBus';

/**
 * Create a complete mock ContextServices object with sensible defaults.
 * All functions are vi.fn() instances for easy assertion.
 * Service objects (fileService, configStore, etc.) have mock method stubs.
 *
 * @param overrides - Partial overrides to replace specific mock defaults
 * @returns A complete ContextServices object
 */
export function createMockServices(
  overrides?: Partial<ContextServices>,
): ContextServices {
  const defaults: ContextServices = {
    // State Getters/Setters with sensible test defaults
    getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
    setProjectPath: vi.fn().mockResolvedValue(undefined),
    getInitialProjectPath: vi.fn().mockReturnValue('/test/initial-project'),
    setInitialProjectPath: vi.fn(),

    // System Information (Task 2.1)
    getAppVersion: vi.fn().mockReturnValue('1.0.0'),
    getPlatform: vi.fn().mockReturnValue('darwin'),
    getAppPath: vi.fn().mockReturnValue('/test/app'),
    getNodeEnv: vi.fn().mockReturnValue('test'),

    // Service Instances with mock stubs
    fileService: {
      readSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      readSpecJson: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      updateSpecJsonFromPhase: vi.fn().mockResolvedValue(undefined),
      readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '' }),
      writeArtifact: vi.fn().mockResolvedValue(undefined),
      listMarkdownFilesInSpec: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      writeFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      getArtifactPath: vi.fn().mockReturnValue('/test/artifact'),
      readFileContent: vi.fn().mockResolvedValue({ ok: true, value: { content: '', isBase64: false, fileType: 'code' } }),
      resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test' }),
      resolveBugPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/bugs/test' }),
    } as any,

    configStore: {
      getRecentProjects: vi.fn().mockReturnValue([]),
      addRecentProject: vi.fn(),
      removeRecentProject: vi.fn(),
      getHangThreshold: vi.fn().mockReturnValue(30000),
      setHangThreshold: vi.fn(),
      getLayout: vi.fn().mockReturnValue(null),
      setLayout: vi.fn(),
      resetLayout: vi.fn(),
      setToolPath: vi.fn(),
      // Bug Domain (Task 5.2)
      getBugsWorktreeDefault: vi.fn().mockReturnValue(false),
      setBugsWorktreeDefault: vi.fn(),
      // MCP Domain (Task 10.3)
      getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
      setMcpSettings: vi.fn(),
    },

    bugService: {
      readBugs: vi.fn().mockResolvedValue({ ok: true, value: { bugs: [], warnings: [] } }),
      readBugDetail: vi.fn().mockResolvedValue({ ok: true, value: null }),
      updateBugJsonPhase: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      bugExists: vi.fn().mockResolvedValue({ ok: true, value: true }),
      readBugJson: vi.fn().mockResolvedValue({ ok: true, value: null }),
    } as any,

    getSpecManagerService: vi.fn().mockReturnValue({
      readSpecs: vi.fn().mockResolvedValue([]),
      executeSpec: vi.fn().mockResolvedValue(undefined),
      startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test-agent' } }),
    }),

    // Config Domain Services (Task 3.1)
    layoutConfigService: {
      loadSkipPermissions: vi.fn().mockResolvedValue(false),
      saveSkipPermissions: vi.fn().mockResolvedValue(undefined),
      loadProjectDefaults: vi.fn().mockResolvedValue(undefined),
      saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
      loadProfile: vi.fn().mockResolvedValue(null),
      loadRemoteUiAutoStart: vi.fn().mockResolvedValue(false),
      saveRemoteUiAutoStart: vi.fn().mockResolvedValue(undefined),
    },

    engineConfigService: {
      loadEngineConfig: vi.fn().mockResolvedValue({}),
      saveEngineConfig: vi.fn().mockResolvedValue(undefined),
    },

    toolPathResolverService: {
      getAllStatuses: vi.fn().mockReturnValue([]),
      resolveTool: vi.fn().mockResolvedValue({ resolved: false, source: 'not-found' }),
      getStatus: vi.fn().mockReturnValue(undefined),
    },

    settingsFileManager: {
      getVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: 'git' }),
      setVcsScheme: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    },

    getAvailableLlmEngines: vi.fn().mockReturnValue([]),

    // File Domain Services (Task 4.2: project file operations)
    listProjectFiles: vi.fn().mockResolvedValue({ claudeMd: null, steeringFiles: [], docsTree: [], isLoading: false, error: null }),
    readProjectFile: vi.fn().mockResolvedValue(''),
    writeProjectFile: vi.fn().mockResolvedValue(undefined),

    // Project Domain Services (Task 4.1)
    selectProject: vi.fn().mockResolvedValue({
      success: true,
      projectPath: '/test/project',
      kiroValidation: { exists: true, hasSpecs: true, hasSteering: true },
      specs: [],
      bugs: [],
      specJsonMap: {},
    }),
    showOpenDialog: vi.fn().mockResolvedValue(null),
    createNewWindow: vi.fn().mockResolvedValue(undefined),
    getIsE2ETest: vi.fn().mockReturnValue(false),

    // Bug Domain Services (Task 5.2: bug router)
    bugsWatcherStart: vi.fn().mockResolvedValue(undefined),
    bugsWatcherStop: vi.fn().mockResolvedValue(undefined),
    bugWorktreeCreate: vi.fn().mockResolvedValue({ ok: true, value: { path: '/test/worktree', branch: 'bugfix/test' } }),
    bugWorktreeRemove: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    bugWorktreeAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: null }),
    bugConvertToWorktree: vi.fn().mockResolvedValue({ ok: true, value: { path: '/test/worktree', branch: 'bugfix/test' } }),
    validateWorktreeMainBranch: vi.fn().mockResolvedValue({ ok: true }),

    // Agent Domain Services (Task 6.1: agent router)
    agentStop: vi.fn().mockResolvedValue(undefined),
    agentGetLogs: vi.fn().mockResolvedValue([]),
    agentGetRunningCounts: vi.fn().mockResolvedValue({}),
    agentCheckFolderExists: vi.fn().mockResolvedValue(false),
    agentDeleteFolder: vi.fn().mockResolvedValue({ ok: true }),

    // Auto Execution Domain Services (Task 7.1: autoExecution router)
    autoExecutionCoordinator: {
      start: vi.fn().mockResolvedValue({ ok: true, value: { specPath: '/test', specId: 'test', status: 'running', currentPhase: 'requirements', executedPhases: [], errors: [], startTime: Date.now(), lastActivityTime: Date.now() } }),
      stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      getStatus: vi.fn().mockReturnValue(null),
      getAllStatuses: vi.fn().mockReturnValue(new Map()),
      retryFrom: vi.fn().mockResolvedValue({ ok: true, value: { specPath: '/test', specId: 'test', status: 'running', currentPhase: 'design', executedPhases: [], errors: [], startTime: Date.now(), lastActivityTime: Date.now() } }),
      resetAll: vi.fn(),
      resetImplRetryCount: vi.fn(),
    },
    bugAutoExecutionCoordinator: {
      start: vi.fn().mockResolvedValue({ ok: true, value: { bugPath: '/test', bugName: 'test-bug', status: 'running', currentPhase: 'analyze', executedPhases: [], errors: [], startTime: Date.now(), lastActivityTime: Date.now(), retryCount: 0, lastFailedPhase: null } }),
      stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      getStatus: vi.fn().mockReturnValue(null),
      getAllStatuses: vi.fn().mockReturnValue(new Map()),
      retryFrom: vi.fn().mockResolvedValue({ ok: true, value: { bugPath: '/test', bugName: 'test-bug', status: 'running', currentPhase: 'fix', executedPhases: [], errors: [], startTime: Date.now(), lastActivityTime: Date.now(), retryCount: 0, lastFailedPhase: null } }),
      resetAll: vi.fn(),
    },

    // Git Domain Services (Task 8.1: git router)
    gitGetStatus: vi.fn().mockResolvedValue({ success: true, data: { files: [], mode: 'normal' } }),
    gitGetDiff: vi.fn().mockResolvedValue({ success: true, data: '' }),
    gitWatchChanges: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    gitUnwatchChanges: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    worktreeCheckMain: vi.fn().mockResolvedValue({ ok: true, value: { isMain: true, currentBranch: 'main' } }),
    worktreeCreate: vi.fn().mockResolvedValue({ ok: true, value: { path: '.kiro/worktrees/specs/test', absolutePath: '/test/.kiro/worktrees/specs/test', branch: 'feature/test', created_at: new Date().toISOString() } }),
    worktreeRemove: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    worktreeResolvePath: vi.fn().mockResolvedValue({ ok: true, value: { absolutePath: '/test/.kiro/worktrees/specs/test' } }),
    worktreeImplStart: vi.fn().mockResolvedValue({ ok: true, value: { worktreePath: '/test/.kiro/worktrees/specs/test', worktreeConfig: { path: '.kiro/worktrees/specs/test', branch: 'feature/test', created_at: new Date().toISOString() } } }),
    normalModeImplStart: vi.fn().mockResolvedValue({ ok: true, value: { branch: 'main' } }),
    worktreeRebaseFromMain: vi.fn().mockResolvedValue({ ok: true, value: { success: true, alreadyUpToDate: false } }),
    convertCheck: vi.fn().mockResolvedValue({ ok: true, value: true }),
    convertToWorktree: vi.fn().mockResolvedValue({ ok: true, value: { path: '.kiro/worktrees/specs/test', absolutePath: '/test/.kiro/worktrees/specs/test', branch: 'feature/test', created_at: new Date().toISOString() } }),

    // Cloudflare Domain Services (Task 10.1: cloudflare router)
    cloudflareService: {
      getAllSettings: vi.fn().mockReturnValue({
        hasTunnelToken: false,
        tunnelTokenSource: 'none',
        accessToken: null,
        publishToCloudflare: false,
        cloudflaredPath: null,
      }),
      setTunnelToken: vi.fn(),
      refreshAccessToken: vi.fn().mockReturnValue('new-token'),
      ensureAccessToken: vi.fn().mockReturnValue('existing-token'),
      checkBinary: vi.fn().mockResolvedValue({ exists: false }),
      setPublishToCloudflare: vi.fn(),
      setCloudflaredPath: vi.fn(),
      startTunnel: vi.fn().mockResolvedValue({
        ok: true,
        value: { url: 'https://test.trycloudflare.com', pid: 12345 },
      }),
      stopTunnel: vi.fn().mockResolvedValue({ ok: true }),
      getTunnelStatus: vi.fn().mockReturnValue({
        state: 'stopped',
        url: null,
        pid: null,
      }),
    },

    // MCP Domain Services (Task 10.3: mcp router)
    mcpServerService: {
      start: vi.fn().mockResolvedValue({ ok: true, value: { port: 3001, url: 'http://localhost:3001' } }),
      stop: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
    },

    // Schedule Domain Services (Task 10.4: schedule router)
    scheduleTaskService: {
      getAllTasks: vi.fn().mockResolvedValue([]),
      getTask: vi.fn().mockResolvedValue(null),
      createTask: vi.fn().mockResolvedValue({ ok: true, value: { id: 'test-task', name: 'Test' } }),
      updateTask: vi.fn().mockResolvedValue({ ok: true, value: { id: 'test-task', name: 'Updated' } }),
      deleteTask: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    },
    scheduleTaskCoordinator: {
      executeImmediately: vi.fn().mockResolvedValue({ ok: true, value: { taskId: 'test-task', startedAt: Date.now(), agentIds: ['agent-1'] } }),
      getQueuedTasks: vi.fn().mockReturnValue([]),
      getRunningTasks: vi.fn().mockReturnValue([]),
    },
    reportIdleTime: vi.fn(),

    // Install Domain Services (Task 10.2: install router)
    installProjectChecker: {
      checkAll: vi.fn().mockResolvedValue({ allPresent: true, commands: [], settings: [] }),
    },
    installCommandInstallerService: {
      installCommands: vi.fn().mockResolvedValue({ ok: true }),
      installSettings: vi.fn().mockResolvedValue({ ok: true }),
      installAll: vi.fn().mockResolvedValue({ ok: true }),
      forceReinstallAll: vi.fn().mockResolvedValue({ ok: true }),
    },
    installUnifiedCommandsetInstaller: {
      checkAllInstallStatus: vi.fn().mockResolvedValue({ installed: true, profiles: {} }),
      installByProfile: vi.fn().mockResolvedValue({ ok: true, value: { summary: { totalInstalled: 0, totalSkipped: 0, totalFailed: 0 } } }),
    },
    installExperimentalToolsInstaller: {
      installDebugAgent: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
      checkTargetExists: vi.fn().mockResolvedValue({ exists: false }),
      installGeminiDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
      checkGeminiDocumentReviewExists: vi.fn().mockResolvedValue({ exists: false }),
    },
    installCommandsetVersionService: {
      checkVersions: vi.fn().mockResolvedValue({ anyUpdateRequired: false, hasCommandsets: false, versions: [] }),
    },
    installGetCliInstallStatus: vi.fn().mockResolvedValue({ installed: false }),
    installInstallCliCommand: vi.fn().mockResolvedValue({ success: true }),
    installGetManualInstallInstructions: vi.fn().mockReturnValue({ title: '', steps: [], command: '', usage: { title: '', examples: [] } }),
    installMigrationService: {
      checkMigrationNeeded: vi.fn().mockResolvedValue(null),
      migrateSpec: vi.fn().mockResolvedValue({ success: true, migratedFiles: 0 }),
      declineMigration: vi.fn(),
    },
    installCheckJjAvailability: vi.fn().mockReturnValue({ name: 'jj', available: false, installGuidance: 'brew install jj' }),
    installInstallJj: vi.fn().mockResolvedValue({ success: false, error: 'Not available' }),
    installIgnoreJjInstall: vi.fn().mockResolvedValue({ success: true }),

    // Misc Domain Services (Task 10.5: misc router)
    openInVscode: vi.fn().mockResolvedValue(undefined),
    copyToClipboard: vi.fn(),
    logRenderer: vi.fn(),
    recordHumanSession: vi.fn().mockResolvedValue({ ok: true }),
    getSpecMetrics: vi.fn().mockResolvedValue({ ok: true, value: { specId: 'test', totalAiTimeMs: 0, totalHumanTimeMs: 0, totalElapsedMs: null, phaseMetrics: {}, status: 'in-progress' } }),
    getProjectMetrics: vi.fn().mockResolvedValue({ ok: true, value: { totalAiTimeMs: 0, totalHumanTimeMs: 0, completedSpecCount: 0, inProgressSpecCount: 0 } }),
    getProjectLogPath: vi.fn().mockReturnValue('/test/logs/main.log'),
    openLogInBrowser: vi.fn().mockResolvedValue(undefined),
    addShellPermissions: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    addMissingPermissions: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    checkRequiredPermissions: vi.fn().mockResolvedValue({ allPresent: true, missing: [], present: [] }),
    startRemoteServer: vi.fn().mockResolvedValue({ ok: true, value: { port: 3000, url: 'http://localhost:3000', accessToken: 'test-token' } }),
    stopRemoteServer: vi.fn().mockResolvedValue(undefined),
    getRemoteServerStatus: vi.fn().mockReturnValue({ running: false, port: null, url: null, clientCount: 0, accessToken: null }),
    refreshAccessToken: vi.fn().mockResolvedValue({ ok: true, value: { accessToken: 'new-token' } }),
    sshConnect: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    sshDisconnect: vi.fn().mockResolvedValue(undefined),
    sshGetStatus: vi.fn().mockReturnValue({ connected: false, host: null }),
    sshGetConnectionInfo: vi.fn().mockReturnValue(null),
    sshGetRecentRemoteProjects: vi.fn().mockReturnValue([]),
    sshAddRecentRemoteProject: vi.fn(),
    sshRemoveRecentRemoteProject: vi.fn(),

    // Event Bus (Task 9.1: events router - Subscription)
    eventBus: createEventBus(),
  };

  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * Create a tRPC Context with sensible mock defaults for testing.
 * Wraps createContext() from context.ts but provides mock services
 * instead of null/noop defaults.
 *
 * @param overrides - Partial service overrides (merged with mock defaults)
 * @returns Context object ready for use with tRPC callers
 */
export function createTestContext(
  overrides?: Partial<ContextServices>,
) {
  const mockServices = createMockServices(overrides);
  return createContext(mockServices);
}

/**
 * Factory for tRPC callers.
 * Internal: creates a caller factory bound to appRouter.
 */
const callerFactory = createCallerFactory()(appRouter);

/**
 * Create a tRPC caller bound to appRouter with mock context.
 * This is the primary utility for router tests - eliminates
 * boilerplate of importing createCallerFactory, router, trpc, and context.
 *
 * @param overrides - Partial service overrides for the test context
 * @returns A tRPC caller with all router namespaces (system, config, etc.)
 */
export function createTestCaller(
  overrides?: Partial<ContextServices>,
) {
  const ctx = createTestContext(overrides);
  return callerFactory(ctx);
}
