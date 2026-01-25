/**
 * installHandlers.test.ts
 * Unit tests for install-related IPC handlers
 * Task 2.1: TDD - Write tests first
 * Requirements: 1.2, 2.1, 2.2, 2.3, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { ClaudeMdInstallMode } from '../services/commandInstallerService';
import type { ProfileName, UnifiedInstallStatus, UnifiedInstallResult } from '../services/unifiedCommandsetInstaller';
import type {
  InstallOptions as ExperimentalInstallOptions,
  InstallResult as ExperimentalInstallResult,
  InstallError as ExperimentalInstallError,
  CheckResult as ExperimentalCheckResult,
  Result as ExperimentalResult,
} from '../services/experimentalToolsInstallerService';

// Mock electron with app for logger
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}));

// Mock logger to avoid file system operations
vi.mock('../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('installHandlers', () => {
  // Mock services
  let mockCommandInstallerService: {
    checkAll: ReturnType<typeof vi.fn>;
    installCommands: ReturnType<typeof vi.fn>;
    installSettings: ReturnType<typeof vi.fn>;
    installAll: ReturnType<typeof vi.fn>;
    forceReinstallAll: ReturnType<typeof vi.fn>;
    claudeMdExists: ReturnType<typeof vi.fn>;
    installClaudeMd: ReturnType<typeof vi.fn>;
  };

  let mockProjectChecker: {
    checkAll: ReturnType<typeof vi.fn>;
  };

  let mockCcSddWorkflowInstaller: {
    checkInstallStatus: ReturnType<typeof vi.fn>;
    installAll: ReturnType<typeof vi.fn>;
  };

  let mockUnifiedCommandsetInstaller: {
    checkAllInstallStatus: ReturnType<typeof vi.fn>;
    installByProfile: ReturnType<typeof vi.fn>;
    installCommonCommandsWithDecisions: ReturnType<typeof vi.fn>;
  };

  let mockExperimentalToolsInstaller: {
    installDebugAgent: ReturnType<typeof vi.fn>;
    checkTargetExists: ReturnType<typeof vi.fn>;
    installGeminiDocumentReview: ReturnType<typeof vi.fn>;
    checkGeminiDocumentReviewExists: ReturnType<typeof vi.fn>;
  };

  let mockCommandsetVersionService: {
    checkVersions: ReturnType<typeof vi.fn>;
  };

  let mockGetCliInstallStatus: ReturnType<typeof vi.fn>;
  let mockInstallCliCommand: ReturnType<typeof vi.fn>;
  let mockGetManualInstallInstructions: ReturnType<typeof vi.fn>;

  // Store registered handlers for testing
  const registeredHandlers: Map<string, (...args: unknown[]) => Promise<unknown>> = new Map();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset handlers map
    registeredHandlers.clear();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      registeredHandlers.set(channel, handler);
      return undefined as unknown as Electron.IpcMain;
    });

    // Initialize mock services
    mockCommandInstallerService = {
      checkAll: vi.fn(),
      installCommands: vi.fn(),
      installSettings: vi.fn(),
      installAll: vi.fn(),
      forceReinstallAll: vi.fn(),
      claudeMdExists: vi.fn(),
      installClaudeMd: vi.fn(),
    };

    mockProjectChecker = {
      checkAll: vi.fn(),
    };

    mockCcSddWorkflowInstaller = {
      checkInstallStatus: vi.fn(),
      installAll: vi.fn(),
    };

    mockUnifiedCommandsetInstaller = {
      checkAllInstallStatus: vi.fn(),
      installByProfile: vi.fn(),
      installCommonCommandsWithDecisions: vi.fn(),
    };

    mockExperimentalToolsInstaller = {
      installDebugAgent: vi.fn(),
      checkTargetExists: vi.fn(),
      installGeminiDocumentReview: vi.fn(),
      checkGeminiDocumentReviewExists: vi.fn(),
    };

    mockCommandsetVersionService = {
      checkVersions: vi.fn(),
    };

    mockGetCliInstallStatus = vi.fn();
    mockInstallCliCommand = vi.fn();
    mockGetManualInstallInstructions = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerInstallHandlers', () => {
    it('should register all install-related IPC handlers', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      // Verify all install handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_SPEC_MANAGER_FILES, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_SPEC_MANAGER_COMMANDS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_SPEC_MANAGER_SETTINGS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_SPEC_MANAGER_ALL, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.FORCE_REINSTALL_SPEC_MANAGER_ALL, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_CLAUDE_MD_EXISTS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_CLAUDE_MD, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_CC_SDD_WORKFLOW_STATUS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_CC_SDD_WORKFLOW, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_COMMANDSET_STATUS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_COMMANDSET_BY_PROFILE, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_AGENT_FOLDER_EXISTS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.DELETE_AGENT_FOLDER, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_EXPERIMENTAL_DEBUG, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.GET_CLI_INSTALL_STATUS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.INSTALL_CLI_COMMAND, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CHECK_COMMANDSET_VERSIONS, expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.CONFIRM_COMMON_COMMANDS, expect.any(Function));
    });
  });

  describe('CHECK_SPEC_MANAGER_FILES handler', () => {
    it('should check spec manager files via projectChecker', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult = {
        allPresent: true,
        missingCommands: [],
        missingSettings: [],
      };
      mockProjectChecker.checkAll.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_SPEC_MANAGER_FILES);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockResult);
      expect(mockProjectChecker.checkAll).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('INSTALL_SPEC_MANAGER_COMMANDS handler', () => {
    it('should install spec manager commands via commandInstallerService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCommandInstallerService.installCommands.mockResolvedValue({ ok: true });

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_SPEC_MANAGER_COMMANDS);
      expect(handler).toBeDefined();

      const missingCommands = ['command1', 'command2'];
      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', missingCommands);
      expect(mockCommandInstallerService.installCommands).toHaveBeenCalledWith('/path/to/project', missingCommands);
    });
  });

  describe('INSTALL_SPEC_MANAGER_SETTINGS handler', () => {
    it('should install spec manager settings via commandInstallerService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCommandInstallerService.installSettings.mockResolvedValue({ ok: true });

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_SPEC_MANAGER_SETTINGS);
      expect(handler).toBeDefined();

      const missingSettings = ['setting1'];
      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', missingSettings);
      expect(mockCommandInstallerService.installSettings).toHaveBeenCalledWith('/path/to/project', missingSettings);
    });
  });

  describe('INSTALL_SPEC_MANAGER_ALL handler', () => {
    it('should install all spec manager files via commandInstallerService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCommandInstallerService.installAll.mockResolvedValue({ ok: true });

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_SPEC_MANAGER_ALL);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(mockCommandInstallerService.installAll).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('FORCE_REINSTALL_SPEC_MANAGER_ALL handler', () => {
    it('should force reinstall all spec manager files via commandInstallerService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCommandInstallerService.forceReinstallAll.mockResolvedValue({ ok: true });

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.FORCE_REINSTALL_SPEC_MANAGER_ALL);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(mockCommandInstallerService.forceReinstallAll).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('CHECK_CLAUDE_MD_EXISTS handler', () => {
    it('should check if CLAUDE.md exists via commandInstallerService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCommandInstallerService.claudeMdExists.mockResolvedValue(true);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_CLAUDE_MD_EXISTS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toBe(true);
      expect(mockCommandInstallerService.claudeMdExists).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('INSTALL_CLAUDE_MD handler', () => {
    it('should install CLAUDE.md via commandInstallerService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCommandInstallerService.installClaudeMd.mockResolvedValue({ ok: true });

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_CLAUDE_MD);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', 'overwrite');
      expect(mockCommandInstallerService.installClaudeMd).toHaveBeenCalledWith('/path/to/project', 'overwrite');
    });
  });

  describe('CHECK_CC_SDD_WORKFLOW_STATUS handler', () => {
    it('should check cc-sdd workflow status via ccSddWorkflowInstaller', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockStatus = { installed: true, version: '1.0.0' };
      mockCcSddWorkflowInstaller.checkInstallStatus.mockResolvedValue(mockStatus);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_CC_SDD_WORKFLOW_STATUS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockStatus);
      expect(mockCcSddWorkflowInstaller.checkInstallStatus).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('INSTALL_CC_SDD_WORKFLOW handler', () => {
    it('should install cc-sdd workflow via ccSddWorkflowInstaller', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      mockCcSddWorkflowInstaller.installAll.mockResolvedValue({ ok: true });

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_CC_SDD_WORKFLOW);
      expect(handler).toBeDefined();

      await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(mockCcSddWorkflowInstaller.installAll).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('CHECK_COMMANDSET_STATUS handler', () => {
    it('should check commandset status via unifiedCommandsetInstaller', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockStatus: UnifiedInstallStatus = {
        ccSdd: { installed: true, updateRequired: false },
        ccSddAgent: { installed: false, updateRequired: false },
        specManager: { installed: true, updateRequired: false },
      } as unknown as UnifiedInstallStatus;
      mockUnifiedCommandsetInstaller.checkAllInstallStatus.mockResolvedValue(mockStatus);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_COMMANDSET_STATUS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockStatus);
      expect(mockUnifiedCommandsetInstaller.checkAllInstallStatus).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('INSTALL_COMMANDSET_BY_PROFILE handler', () => {
    it('should install commandset by profile via unifiedCommandsetInstaller', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult: { ok: true; value: UnifiedInstallResult } = {
        ok: true,
        value: {
          summary: {
            totalInstalled: 5,
            totalSkipped: 0,
            totalFailed: 0,
          },
          results: [],
        } as unknown as UnifiedInstallResult,
      };
      mockUnifiedCommandsetInstaller.installByProfile.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_COMMANDSET_BY_PROFILE);
      expect(handler).toBeDefined();

      const mockEvent = { sender: {} } as Electron.IpcMainInvokeEvent;
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null);

      const result = await handler!(mockEvent, '/path/to/project', 'cc-sdd' as ProfileName, { force: false });
      expect(result).toEqual(mockResult);
      expect(mockUnifiedCommandsetInstaller.installByProfile).toHaveBeenCalledWith(
        '/path/to/project',
        'cc-sdd',
        { force: false },
        expect.any(Function)
      );
    });

    it('should return error result when installation fails', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockError = {
        ok: false,
        error: { type: 'INSTALL_ERROR', message: 'Installation failed' },
      };
      mockUnifiedCommandsetInstaller.installByProfile.mockResolvedValue(mockError);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_COMMANDSET_BY_PROFILE);

      const mockEvent = { sender: {} } as Electron.IpcMainInvokeEvent;
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null);

      const result = await handler!(mockEvent, '/path/to/project', 'cc-sdd' as ProfileName);
      expect(result).toHaveProperty('ok', false);
    });
  });

  describe('CHECK_AGENT_FOLDER_EXISTS handler', () => {
    it('should return true when agent folder exists', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_AGENT_FOLDER_EXISTS);
      expect(handler).toBeDefined();
      // Note: This handler uses fs/promises.access directly, which would need mocking
      // For now, just verify it's registered
    });
  });

  describe('DELETE_AGENT_FOLDER handler', () => {
    it('should be registered as a handler', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.DELETE_AGENT_FOLDER);
      expect(handler).toBeDefined();
      // Note: This handler uses fs/promises.rm directly, which would need mocking
    });
  });

  describe('INSTALL_EXPERIMENTAL_DEBUG handler', () => {
    it('should install experimental debug agent', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult: ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError> = {
        ok: true,
        value: { installed: ['debug-agent.md'] },
      };
      mockExperimentalToolsInstaller.installDebugAgent.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_EXPERIMENTAL_DEBUG);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', { force: true });
      expect(result).toEqual(mockResult);
      expect(mockExperimentalToolsInstaller.installDebugAgent).toHaveBeenCalledWith('/path/to/project', { force: true });
    });
  });

  describe('CHECK_EXPERIMENTAL_TOOL_EXISTS handler', () => {
    it('should check if experimental tool exists', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult: ExperimentalCheckResult = { exists: true };
      mockExperimentalToolsInstaller.checkTargetExists.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', 'debug');
      expect(result).toEqual(mockResult);
      expect(mockExperimentalToolsInstaller.checkTargetExists).toHaveBeenCalledWith('/path/to/project', 'debug');
    });
  });

  describe('INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW handler', () => {
    it('should install experimental gemini doc review', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult: ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError> = {
        ok: true,
        value: { installed: ['gemini-doc-review.md'] },
      };
      mockExperimentalToolsInstaller.installGeminiDocumentReview.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', { force: false });
      expect(result).toEqual(mockResult);
      expect(mockExperimentalToolsInstaller.installGeminiDocumentReview).toHaveBeenCalledWith('/path/to/project', { force: false });
    });
  });

  describe('CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS handler', () => {
    it('should check if gemini doc review exists', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult: ExperimentalCheckResult = { exists: false };
      mockExperimentalToolsInstaller.checkGeminiDocumentReviewExists.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockResult);
      expect(mockExperimentalToolsInstaller.checkGeminiDocumentReviewExists).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('GET_CLI_INSTALL_STATUS handler', () => {
    it('should return CLI install status', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockStatus = { installed: true, path: '/usr/local/bin/sdd-orchestrator' };
      mockGetCliInstallStatus.mockResolvedValue(mockStatus);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.GET_CLI_INSTALL_STATUS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'user');
      expect(result).toEqual(mockStatus);
      expect(mockGetCliInstallStatus).toHaveBeenCalledWith('user');
    });
  });

  describe('INSTALL_CLI_COMMAND handler', () => {
    it('should install CLI command and return result with instructions', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult = { success: true };
      const mockInstructions = 'Add to PATH...';
      mockInstallCliCommand.mockResolvedValue(mockResult);
      mockGetManualInstallInstructions.mockReturnValue(mockInstructions);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.INSTALL_CLI_COMMAND);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, 'system');
      expect(result).toEqual({ ...mockResult, instructions: mockInstructions });
      expect(mockInstallCliCommand).toHaveBeenCalledWith('system');
      expect(mockGetManualInstallInstructions).toHaveBeenCalledWith('system');
    });
  });

  describe('CHECK_COMMANDSET_VERSIONS handler', () => {
    it('should check commandset versions via commandsetVersionService', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult = { anyUpdateRequired: false, hasCommandsets: true };
      mockCommandsetVersionService.checkVersions.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CHECK_COMMANDSET_VERSIONS);
      expect(handler).toBeDefined();

      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project');
      expect(result).toEqual(mockResult);
      expect(mockCommandsetVersionService.checkVersions).toHaveBeenCalledWith('/path/to/project');
    });
  });

  describe('CONFIRM_COMMON_COMMANDS handler', () => {
    it('should confirm common commands via unifiedCommandsetInstaller', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockResult = {
        ok: true,
        value: {
          totalInstalled: 3,
          totalSkipped: 1,
          totalFailed: 0,
          installedCommands: ['cmd1', 'cmd2', 'cmd3'],
          skippedCommands: ['cmd4'],
          failedCommands: [],
        },
      };
      mockUnifiedCommandsetInstaller.installCommonCommandsWithDecisions.mockResolvedValue(mockResult);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CONFIRM_COMMON_COMMANDS);
      expect(handler).toBeDefined();

      const decisions = [
        { name: 'cmd1', action: 'overwrite' as const },
        { name: 'cmd4', action: 'skip' as const },
      ];
      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', decisions);
      expect(result).toEqual(mockResult);
      expect(mockUnifiedCommandsetInstaller.installCommonCommandsWithDecisions).toHaveBeenCalledWith('/path/to/project', decisions);
    });

    it('should return error result when confirmation fails', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const mockError = {
        ok: false,
        error: { type: 'INSTALL_ERROR', message: 'Failed' },
      };
      mockUnifiedCommandsetInstaller.installCommonCommandsWithDecisions.mockResolvedValue(mockError);

      registerInstallHandlers({
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      });

      const handler = registeredHandlers.get(IPC_CHANNELS.CONFIRM_COMMON_COMMANDS);

      const decisions = [{ name: 'cmd1', action: 'overwrite' as const }];
      const result = await handler!({} as Electron.IpcMainInvokeEvent, '/path/to/project', decisions);
      expect(result).toHaveProperty('ok', false);
    });
  });

  describe('InstallHandlersDependencies interface', () => {
    it('should accept mock dependencies with proper interface', async () => {
      const { registerInstallHandlers } = await import('./installHandlers');

      const dependencies = {
        commandInstallerService: mockCommandInstallerService as any,
        projectChecker: mockProjectChecker as any,
        ccSddWorkflowInstaller: mockCcSddWorkflowInstaller as any,
        unifiedCommandsetInstaller: mockUnifiedCommandsetInstaller as any,
        experimentalToolsInstaller: mockExperimentalToolsInstaller as any,
        commandsetVersionService: mockCommandsetVersionService as any,
        getCliInstallStatus: mockGetCliInstallStatus,
        installCliCommand: mockInstallCliCommand,
        getManualInstallInstructions: mockGetManualInstallInstructions,
      };

      // Should not throw
      expect(() => registerInstallHandlers(dependencies)).not.toThrow();
    });
  });
});
