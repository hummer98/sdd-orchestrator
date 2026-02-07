/**
 * Misc Router tests
 * Task 10.5: miscルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Tests all 22 procedures:
 * - Misc 15: openInVscode, copyToClipboard, logRenderer, recordHumanSession,
 *            getSpecMetrics, getProjectMetrics, getProjectLogPath, openLogInBrowser,
 *            addShellPermissions, addMissingPermissions, checkRequiredPermissions,
 *            startRemoteServer, stopRemoteServer, getRemoteServerStatus, refreshAccessToken
 * - SSH 7: sshConnect, sshDisconnect, sshGetStatus, sshGetConnectionInfo,
 *          sshGetRecentRemoteProjects, sshAddRecentRemoteProject, sshRemoveRecentRemoteProject
 *
 * Verifies: miscRouter in router.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

// ============================================================
// Helper to create mock misc services
// ============================================================

function createMiscOverrides(): Partial<ContextServices> {
  return {
    // Misc domain services
    openInVscode: vi.fn().mockResolvedValue(undefined),
    copyToClipboard: vi.fn(),
    logRenderer: vi.fn(),
    recordHumanSession: vi.fn().mockResolvedValue({ ok: true }),
    getSpecMetrics: vi.fn().mockResolvedValue({ ok: true, value: { specId: 'test', totalAiTimeMs: 1000, totalHumanTimeMs: 500, totalElapsedMs: 1500, phaseMetrics: {}, status: 'in-progress' } }),
    getProjectMetrics: vi.fn().mockResolvedValue({ ok: true, value: { totalAiTimeMs: 5000, totalHumanTimeMs: 2000, completedSpecCount: 3, inProgressSpecCount: 1 } }),
    getProjectLogPath: vi.fn().mockReturnValue('/test/logs/main.log'),
    openLogInBrowser: vi.fn().mockResolvedValue(undefined),
    addShellPermissions: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    addMissingPermissions: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    checkRequiredPermissions: vi.fn().mockResolvedValue({ allPresent: true, missing: [], present: ['Bash', 'Read'] }),
    startRemoteServer: vi.fn().mockResolvedValue({ ok: true, value: { port: 3000, url: 'http://localhost:3000', accessToken: 'test-token' } }),
    stopRemoteServer: vi.fn().mockResolvedValue(undefined),
    getRemoteServerStatus: vi.fn().mockReturnValue({ running: false, port: null, url: null, clientCount: 0, accessToken: null }),
    refreshAccessToken: vi.fn().mockResolvedValue({ ok: true, value: { accessToken: 'new-token' } }),
    // SSH domain services
    sshConnect: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    sshDisconnect: vi.fn().mockResolvedValue(undefined),
    sshGetStatus: vi.fn().mockReturnValue({ connected: false, host: null }),
    sshGetConnectionInfo: vi.fn().mockReturnValue(null),
    sshGetRecentRemoteProjects: vi.fn().mockReturnValue([]),
    sshAddRecentRemoteProject: vi.fn(),
    sshRemoveRecentRemoteProject: vi.fn(),
  };
}

describe('Misc Router (misc.ts)', () => {
  // ============================================================
  // Router Registration
  // ============================================================

  describe('router registration', () => {
    it('should export miscRouter', async () => {
      const { miscRouter } = await import('../routers/misc');
      expect(miscRouter).toBeDefined();
    });

    it('miscRouter should be registered in appRouter', async () => {
      const caller = createTestCaller(createMiscOverrides());
      // Verify misc namespace exists on the caller
      expect(caller.misc).toBeDefined();
    });
  });

  // ============================================================
  // openInVscode (mutation)
  // ============================================================

  describe('openInVscode', () => {
    it('should call openInVscode with project path', async () => {
      const mockOpenInVscode = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        ...createMiscOverrides(),
        openInVscode: mockOpenInVscode,
      });

      await caller.misc.openInVscode({ projectPath: '/test/project' });
      expect(mockOpenInVscode).toHaveBeenCalledWith('/test/project');
    });

    it('should reject empty projectPath', async () => {
      const caller = createTestCaller(createMiscOverrides());
      await expect(caller.misc.openInVscode({ projectPath: '' })).rejects.toThrow();
    });
  });

  // ============================================================
  // copyToClipboard (mutation)
  // ============================================================

  describe('copyToClipboard', () => {
    it('should call copyToClipboard with text', async () => {
      const mockCopy = vi.fn();
      const caller = createTestCaller({
        ...createMiscOverrides(),
        copyToClipboard: mockCopy,
      });

      await caller.misc.copyToClipboard({ text: 'hello world' });
      expect(mockCopy).toHaveBeenCalledWith('hello world');
    });
  });

  // ============================================================
  // logRenderer (mutation - fire-and-forget)
  // ============================================================

  describe('logRenderer', () => {
    it('should call logRenderer with level and message', async () => {
      const mockLog = vi.fn();
      const caller = createTestCaller({
        ...createMiscOverrides(),
        logRenderer: mockLog,
      });

      await caller.misc.logRenderer({ level: 'info', message: 'test log' });
      expect(mockLog).toHaveBeenCalledWith('info', 'test log', undefined);
    });

    it('should call logRenderer with optional context', async () => {
      const mockLog = vi.fn();
      const caller = createTestCaller({
        ...createMiscOverrides(),
        logRenderer: mockLog,
      });

      await caller.misc.logRenderer({ level: 'error', message: 'error occurred', context: { code: 500 } });
      expect(mockLog).toHaveBeenCalledWith('error', 'error occurred', { code: 500 });
    });

    it('should validate log level enum', async () => {
      const caller = createTestCaller(createMiscOverrides());
      await expect(
        caller.misc.logRenderer({ level: 'invalid' as any, message: 'test' })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // recordHumanSession (mutation)
  // ============================================================

  describe('recordHumanSession', () => {
    it('should call recordHumanSession with session data', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ ok: true });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        recordHumanSession: mockRecord,
      });

      const session = { specId: 'test-spec', start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z', ms: 3600000 };
      const result = await caller.misc.recordHumanSession(session);
      expect(mockRecord).toHaveBeenCalledWith(session);
      expect(result).toEqual({ ok: true });
    });

    it('should return error on failure', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ ok: false, error: 'No project path set' });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        recordHumanSession: mockRecord,
      });

      const session = { specId: 'test-spec', start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z', ms: 3600000 };
      const result = await caller.misc.recordHumanSession(session);
      expect(result).toEqual({ ok: false, error: 'No project path set' });
    });
  });

  // ============================================================
  // getSpecMetrics (query)
  // ============================================================

  describe('getSpecMetrics', () => {
    it('should return spec metrics', async () => {
      const mockMetrics = { specId: 'test', totalAiTimeMs: 1000, totalHumanTimeMs: 500, totalElapsedMs: 1500, phaseMetrics: {}, status: 'in-progress' };
      const mockGet = vi.fn().mockResolvedValue({ ok: true, value: mockMetrics });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        getSpecMetrics: mockGet,
      });

      const result = await caller.misc.getSpecMetrics({ specId: 'test' });
      expect(result).toEqual({ ok: true, value: mockMetrics });
      expect(mockGet).toHaveBeenCalledWith('test');
    });
  });

  // ============================================================
  // getProjectMetrics (query)
  // ============================================================

  describe('getProjectMetrics', () => {
    it('should return project metrics', async () => {
      const mockMetrics = { totalAiTimeMs: 5000, totalHumanTimeMs: 2000, completedSpecCount: 3, inProgressSpecCount: 1 };
      const mockGet = vi.fn().mockResolvedValue({ ok: true, value: mockMetrics });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        getProjectMetrics: mockGet,
      });

      const result = await caller.misc.getProjectMetrics();
      expect(result).toEqual({ ok: true, value: mockMetrics });
    });
  });

  // ============================================================
  // getProjectLogPath (query)
  // ============================================================

  describe('getProjectLogPath', () => {
    it('should return project log path', async () => {
      const mockGetPath = vi.fn().mockReturnValue('/test/logs/main.log');
      const caller = createTestCaller({
        ...createMiscOverrides(),
        getProjectLogPath: mockGetPath,
      });

      const result = await caller.misc.getProjectLogPath();
      expect(result).toBe('/test/logs/main.log');
    });

    it('should return null when no log path', async () => {
      const caller = createTestCaller({
        ...createMiscOverrides(),
        getProjectLogPath: vi.fn().mockReturnValue(null),
      });

      const result = await caller.misc.getProjectLogPath();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // openLogInBrowser (mutation)
  // ============================================================

  describe('openLogInBrowser', () => {
    it('should call openLogInBrowser', async () => {
      const mockOpen = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        ...createMiscOverrides(),
        openLogInBrowser: mockOpen,
      });

      await caller.misc.openLogInBrowser();
      expect(mockOpen).toHaveBeenCalled();
    });
  });

  // ============================================================
  // addShellPermissions (mutation)
  // ============================================================

  describe('addShellPermissions', () => {
    it('should call addShellPermissions with projectPath', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ ok: true, value: undefined });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        addShellPermissions: mockAdd,
      });

      const result = await caller.misc.addShellPermissions({ projectPath: '/test/project' });
      expect(mockAdd).toHaveBeenCalledWith('/test/project');
      expect(result).toEqual({ ok: true, value: undefined });
    });
  });

  // ============================================================
  // addMissingPermissions (mutation)
  // ============================================================

  describe('addMissingPermissions', () => {
    it('should call addMissingPermissions with projectPath and permissions', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ ok: true, value: undefined });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        addMissingPermissions: mockAdd,
      });

      const result = await caller.misc.addMissingPermissions({
        projectPath: '/test/project',
        permissions: ['Bash', 'Read'],
      });
      expect(mockAdd).toHaveBeenCalledWith('/test/project', ['Bash', 'Read']);
      expect(result).toEqual({ ok: true, value: undefined });
    });
  });

  // ============================================================
  // checkRequiredPermissions (query)
  // ============================================================

  describe('checkRequiredPermissions', () => {
    it('should return permissions check result', async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        allPresent: true,
        missing: [],
        present: ['Bash', 'Read'],
      });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        checkRequiredPermissions: mockCheck,
      });

      const result = await caller.misc.checkRequiredPermissions({ projectPath: '/test/project' });
      expect(result.allPresent).toBe(true);
      expect(result.missing).toEqual([]);
      expect(mockCheck).toHaveBeenCalledWith('/test/project');
    });
  });

  // ============================================================
  // startRemoteServer (mutation)
  // ============================================================

  describe('startRemoteServer', () => {
    it('should start remote server with optional port', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001', accessToken: 'tok' },
      });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        startRemoteServer: mockStart,
      });

      const result = await caller.misc.startRemoteServer({ preferredPort: 3001 });
      expect(result.ok).toBe(true);
      expect(mockStart).toHaveBeenCalledWith(3001);
    });

    it('should start remote server without port', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 3000, url: 'http://localhost:3000', accessToken: 'tok' },
      });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        startRemoteServer: mockStart,
      });

      const result = await caller.misc.startRemoteServer({});
      expect(result.ok).toBe(true);
      expect(mockStart).toHaveBeenCalledWith(undefined);
    });
  });

  // ============================================================
  // stopRemoteServer (mutation)
  // ============================================================

  describe('stopRemoteServer', () => {
    it('should stop remote server', async () => {
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        ...createMiscOverrides(),
        stopRemoteServer: mockStop,
      });

      await caller.misc.stopRemoteServer();
      expect(mockStop).toHaveBeenCalled();
    });
  });

  // ============================================================
  // getRemoteServerStatus (query)
  // ============================================================

  describe('getRemoteServerStatus', () => {
    it('should return server status', async () => {
      const mockStatus = { running: true, port: 3000, url: 'http://localhost:3000', clientCount: 2, accessToken: 'tok' };
      const caller = createTestCaller({
        ...createMiscOverrides(),
        getRemoteServerStatus: vi.fn().mockReturnValue(mockStatus),
      });

      const result = await caller.misc.getRemoteServerStatus();
      expect(result.running).toBe(true);
      expect(result.port).toBe(3000);
    });
  });

  // ============================================================
  // refreshAccessToken (mutation)
  // ============================================================

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ ok: true, value: { accessToken: 'new-token' } });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        refreshAccessToken: mockRefresh,
      });

      const result = await caller.misc.refreshAccessToken();
      expect(result.ok).toBe(true);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  // ============================================================
  // SSH: sshConnect (mutation)
  // ============================================================

  describe('sshConnect', () => {
    it('should call sshConnect with URI', async () => {
      const mockConnect = vi.fn().mockResolvedValue({ ok: true, value: undefined });
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshConnect: mockConnect,
      });

      const result = await caller.misc.sshConnect({ uri: 'ssh://user@host:22/path' });
      expect(mockConnect).toHaveBeenCalledWith('ssh://user@host:22/path');
      expect(result.ok).toBe(true);
    });

    it('should reject empty URI', async () => {
      const caller = createTestCaller(createMiscOverrides());
      await expect(caller.misc.sshConnect({ uri: '' })).rejects.toThrow();
    });
  });

  // ============================================================
  // SSH: sshDisconnect (mutation)
  // ============================================================

  describe('sshDisconnect', () => {
    it('should call sshDisconnect', async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshDisconnect: mockDisconnect,
      });

      await caller.misc.sshDisconnect();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // ============================================================
  // SSH: sshGetStatus (query)
  // ============================================================

  describe('sshGetStatus', () => {
    it('should return SSH status', async () => {
      const mockStatus = { connected: true, host: 'remote.example.com' };
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshGetStatus: vi.fn().mockReturnValue(mockStatus),
      });

      const result = await caller.misc.sshGetStatus();
      expect(result.connected).toBe(true);
    });
  });

  // ============================================================
  // SSH: sshGetConnectionInfo (query)
  // ============================================================

  describe('sshGetConnectionInfo', () => {
    it('should return connection info', async () => {
      const mockInfo = { host: 'remote.example.com', port: 22, username: 'user' };
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshGetConnectionInfo: vi.fn().mockReturnValue(mockInfo),
      });

      const result = await caller.misc.sshGetConnectionInfo();
      expect(result).toEqual(mockInfo);
    });

    it('should return null when not connected', async () => {
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshGetConnectionInfo: vi.fn().mockReturnValue(null),
      });

      const result = await caller.misc.sshGetConnectionInfo();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // SSH: sshGetRecentRemoteProjects (query)
  // ============================================================

  describe('sshGetRecentRemoteProjects', () => {
    it('should return recent remote projects', async () => {
      const projects = [
        { uri: 'ssh://host/path', displayName: 'host', connectionSuccessful: true, lastConnected: '2026-01-01' },
      ];
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshGetRecentRemoteProjects: vi.fn().mockReturnValue(projects),
      });

      const result = await caller.misc.sshGetRecentRemoteProjects();
      expect(result).toEqual(projects);
    });
  });

  // ============================================================
  // SSH: sshAddRecentRemoteProject (mutation)
  // ============================================================

  describe('sshAddRecentRemoteProject', () => {
    it('should call sshAddRecentRemoteProject with params', async () => {
      const mockAdd = vi.fn();
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshAddRecentRemoteProject: mockAdd,
      });

      await caller.misc.sshAddRecentRemoteProject({
        uri: 'ssh://host/path',
        displayName: 'host',
        connectionSuccessful: true,
      });
      expect(mockAdd).toHaveBeenCalledWith('ssh://host/path', 'host', true);
    });
  });

  // ============================================================
  // SSH: sshRemoveRecentRemoteProject (mutation)
  // ============================================================

  describe('sshRemoveRecentRemoteProject', () => {
    it('should call sshRemoveRecentRemoteProject with URI', async () => {
      const mockRemove = vi.fn();
      const caller = createTestCaller({
        ...createMiscOverrides(),
        sshRemoveRecentRemoteProject: mockRemove,
      });

      await caller.misc.sshRemoveRecentRemoteProject({ uri: 'ssh://host/path' });
      expect(mockRemove).toHaveBeenCalledWith('ssh://host/path');
    });
  });
});
