/**
 * MCP Router tests
 * Task 10.3: mcpルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 * Method: mcpRouter, mcpServerService
 * Verify: Grep "mcpRouter" in router.ts
 *
 * Verifies:
 * - All 6 MCP procedures (start, stop, getStatus, getSettings, setEnabled, setPort)
 * - Zod schema validation for inputs/outputs
 * - ctx.services.mcpServerService and ctx.services.configStore integration
 * - Error handling for service failures
 * - setEnabled starts/stops server based on enabled flag
 * - setPort restarts server if running
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller } from '../helpers/test-helpers';

describe('MCP Router (mcp.ts)', () => {
  // ============================================================
  // start procedure tests
  // ============================================================

  describe('start', () => {
    it('should call mcpServerService.start with default port', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });
      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      const result = await caller.mcp.start({});
      expect(mockStart).toHaveBeenCalledOnce();
      expect(result).toEqual({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });
    });

    it('should call mcpServerService.start with preferred port', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 9100, url: 'http://localhost:9100' },
      });
      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      const result = await caller.mcp.start({ preferredPort: 9100 });
      expect(mockStart).toHaveBeenCalledWith(9100);
      expect(result.ok).toBe(true);
    });

    it('should return error result when start fails', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'PORT_IN_USE', port: 3001 },
      });
      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      const result = await caller.mcp.start({});
      expect(result.ok).toBe(false);
    });

    it('should validate input with Zod schema - reject negative port', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn().mockResolvedValue({ ok: true, value: { port: 3001, url: 'http://localhost:3001' } }),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      await expect(caller.mcp.start({ preferredPort: -1 })).rejects.toThrow();
    });
  });

  // ============================================================
  // stop procedure tests
  // ============================================================

  describe('stop', () => {
    it('should call mcpServerService.stop', async () => {
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: mockStop,
          getStatus: vi.fn().mockReturnValue({ isRunning: true, port: 3001, url: 'http://localhost:3001' }),
        },
      });

      await caller.mcp.stop();
      expect(mockStop).toHaveBeenCalledOnce();
    });

    it('should not throw when server is already stopped', async () => {
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: mockStop,
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      await expect(caller.mcp.stop()).resolves.not.toThrow();
    });
  });

  // ============================================================
  // getStatus procedure tests
  // ============================================================

  describe('getStatus', () => {
    it('should return running status', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({
            isRunning: true,
            port: 3001,
            url: 'http://localhost:3001',
          }),
        },
      });

      const result = await caller.mcp.getStatus();
      expect(result).toEqual({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });
    });

    it('should return stopped status', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({
            isRunning: false,
            port: null,
            url: null,
          }),
        },
      });

      const result = await caller.mcp.getStatus();
      expect(result).toEqual({
        isRunning: false,
        port: null,
        url: null,
      });
    });

    it('should call mcpServerService.getStatus', async () => {
      const mockGetStatus = vi.fn().mockReturnValue({
        isRunning: false,
        port: null,
        url: null,
      });
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn(),
          getStatus: mockGetStatus,
        },
      });

      await caller.mcp.getStatus();
      expect(mockGetStatus).toHaveBeenCalledOnce();
    });
  });

  // ============================================================
  // getSettings procedure tests
  // ============================================================

  describe('getSettings', () => {
    it('should return MCP settings from configStore', async () => {
      const caller = createTestCaller({
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
          setMcpSettings: vi.fn(),
        },
      });

      const result = await caller.mcp.getSettings();
      expect(result).toEqual({ enabled: true, port: 3001 });
    });

    it('should return default settings when not configured', async () => {
      const caller = createTestCaller({
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: false, port: 3001 }),
          setMcpSettings: vi.fn(),
        },
      });

      const result = await caller.mcp.getSettings();
      expect(result).toEqual({ enabled: false, port: 3001 });
    });
  });

  // ============================================================
  // setEnabled procedure tests
  // ============================================================

  describe('setEnabled', () => {
    it('should enable MCP and start server', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });
      const mockSetMcpSettings = vi.fn();
      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: false, port: 3001 }),
          setMcpSettings: mockSetMcpSettings,
        },
      });

      await caller.mcp.setEnabled({ enabled: true });
      expect(mockSetMcpSettings).toHaveBeenCalledWith({ enabled: true, port: 3001 });
      expect(mockStart).toHaveBeenCalledWith(3001);
    });

    it('should disable MCP and stop server', async () => {
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const mockSetMcpSettings = vi.fn();
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: mockStop,
          getStatus: vi.fn().mockReturnValue({ isRunning: true, port: 3001, url: 'http://localhost:3001' }),
        },
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
          setMcpSettings: mockSetMcpSettings,
        },
      });

      await caller.mcp.setEnabled({ enabled: false });
      expect(mockSetMcpSettings).toHaveBeenCalledWith({ enabled: false, port: 3001 });
      expect(mockStop).toHaveBeenCalledOnce();
    });

    it('should validate enabled input is boolean', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      // @ts-expect-error: testing invalid input
      await expect(caller.mcp.setEnabled({ enabled: 'true' })).rejects.toThrow();
    });
  });

  // ============================================================
  // setPort procedure tests
  // ============================================================

  describe('setPort', () => {
    it('should update port in settings and restart server if running', async () => {
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 9200, url: 'http://localhost:9200' },
      });
      const mockSetMcpSettings = vi.fn();
      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: mockStop,
          getStatus: vi.fn().mockReturnValue({ isRunning: true, port: 3001, url: 'http://localhost:3001' }),
        },
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
          setMcpSettings: mockSetMcpSettings,
        },
      });

      await caller.mcp.setPort({ port: 9200 });
      expect(mockSetMcpSettings).toHaveBeenCalledWith({ enabled: true, port: 9200 });
      expect(mockStop).toHaveBeenCalledOnce();
      expect(mockStart).toHaveBeenCalledWith(9200);
    });

    it('should update port in settings without restart if server not running', async () => {
      const mockStop = vi.fn();
      const mockStart = vi.fn();
      const mockSetMcpSettings = vi.fn();
      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: mockStop,
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
          setMcpSettings: mockSetMcpSettings,
        },
      });

      await caller.mcp.setPort({ port: 9200 });
      expect(mockSetMcpSettings).toHaveBeenCalledWith({ enabled: true, port: 9200 });
      expect(mockStop).not.toHaveBeenCalled();
      expect(mockStart).not.toHaveBeenCalled();
    });

    it('should validate port is a positive integer', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      await expect(caller.mcp.setPort({ port: -1 })).rejects.toThrow();
      await expect(caller.mcp.setPort({ port: 0 })).rejects.toThrow();
    });

    it('should validate port does not exceed 65535', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      await expect(caller.mcp.setPort({ port: 70000 })).rejects.toThrow();
    });
  });

  // ============================================================
  // Zod Schema Validation Tests
  // Requirements: 9.2
  // ============================================================

  describe('Zod Schema Validation', () => {
    it('mcpStartInputSchema should accept empty object', async () => {
      const { mcpStartInputSchema } = await import('../routers/mcp');
      expect(mcpStartInputSchema.safeParse({}).success).toBe(true);
    });

    it('mcpStartInputSchema should accept object with preferredPort', async () => {
      const { mcpStartInputSchema } = await import('../routers/mcp');
      expect(mcpStartInputSchema.safeParse({ preferredPort: 9100 }).success).toBe(true);
    });

    it('mcpStartInputSchema should reject negative port', async () => {
      const { mcpStartInputSchema } = await import('../routers/mcp');
      expect(mcpStartInputSchema.safeParse({ preferredPort: -1 }).success).toBe(false);
    });

    it('mcpStatusOutputSchema should accept valid running status', async () => {
      const { mcpStatusOutputSchema } = await import('../routers/mcp');
      const valid = { isRunning: true, port: 3001, url: 'http://localhost:3001' };
      expect(mcpStatusOutputSchema.safeParse(valid).success).toBe(true);
    });

    it('mcpStatusOutputSchema should accept valid stopped status', async () => {
      const { mcpStatusOutputSchema } = await import('../routers/mcp');
      const valid = { isRunning: false, port: null, url: null };
      expect(mcpStatusOutputSchema.safeParse(valid).success).toBe(true);
    });

    it('mcpStatusOutputSchema should reject invalid status', async () => {
      const { mcpStatusOutputSchema } = await import('../routers/mcp');
      expect(mcpStatusOutputSchema.safeParse({ isRunning: 'yes' }).success).toBe(false);
      expect(mcpStatusOutputSchema.safeParse({}).success).toBe(false);
    });

    it('mcpSettingsOutputSchema should accept valid settings', async () => {
      const { mcpSettingsOutputSchema } = await import('../routers/mcp');
      expect(mcpSettingsOutputSchema.safeParse({ enabled: true, port: 3001 }).success).toBe(true);
      expect(mcpSettingsOutputSchema.safeParse({ enabled: false, port: 9100 }).success).toBe(true);
    });

    it('mcpSettingsOutputSchema should reject invalid settings', async () => {
      const { mcpSettingsOutputSchema } = await import('../routers/mcp');
      expect(mcpSettingsOutputSchema.safeParse({ enabled: 'true', port: 3001 }).success).toBe(false);
      expect(mcpSettingsOutputSchema.safeParse({ enabled: true }).success).toBe(false);
      expect(mcpSettingsOutputSchema.safeParse({}).success).toBe(false);
    });

    it('mcpSetEnabledInputSchema should accept valid enabled flag', async () => {
      const { mcpSetEnabledInputSchema } = await import('../routers/mcp');
      expect(mcpSetEnabledInputSchema.safeParse({ enabled: true }).success).toBe(true);
      expect(mcpSetEnabledInputSchema.safeParse({ enabled: false }).success).toBe(true);
    });

    it('mcpSetEnabledInputSchema should reject non-boolean', async () => {
      const { mcpSetEnabledInputSchema } = await import('../routers/mcp');
      expect(mcpSetEnabledInputSchema.safeParse({ enabled: 'true' }).success).toBe(false);
      expect(mcpSetEnabledInputSchema.safeParse({ enabled: 1 }).success).toBe(false);
    });

    it('mcpSetPortInputSchema should accept valid port', async () => {
      const { mcpSetPortInputSchema } = await import('../routers/mcp');
      expect(mcpSetPortInputSchema.safeParse({ port: 3001 }).success).toBe(true);
      expect(mcpSetPortInputSchema.safeParse({ port: 1 }).success).toBe(true);
      expect(mcpSetPortInputSchema.safeParse({ port: 65535 }).success).toBe(true);
    });

    it('mcpSetPortInputSchema should reject invalid port', async () => {
      const { mcpSetPortInputSchema } = await import('../routers/mcp');
      expect(mcpSetPortInputSchema.safeParse({ port: 0 }).success).toBe(false);
      expect(mcpSetPortInputSchema.safeParse({ port: -1 }).success).toBe(false);
      expect(mcpSetPortInputSchema.safeParse({ port: 70000 }).success).toBe(false);
      expect(mcpSetPortInputSchema.safeParse({ port: 'abc' }).success).toBe(false);
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should propagate error when mcpServerService.start throws', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn().mockRejectedValue(new Error('Start failed')),
          stop: vi.fn(),
          getStatus: vi.fn().mockReturnValue({ isRunning: false, port: null, url: null }),
        },
      });

      await expect(caller.mcp.start({})).rejects.toThrow();
    });

    it('should propagate error when mcpServerService.stop throws', async () => {
      const caller = createTestCaller({
        mcpServerService: {
          start: vi.fn(),
          stop: vi.fn().mockRejectedValue(new Error('Stop failed')),
          getStatus: vi.fn().mockReturnValue({ isRunning: true, port: 3001, url: 'http://localhost:3001' }),
        },
      });

      await expect(caller.mcp.stop()).rejects.toThrow();
    });

    it('should throw when configStore is null on getSettings', async () => {
      const caller = createTestCaller({
        configStore: null,
      });

      await expect(caller.mcp.getSettings()).rejects.toThrow();
    });

    it('should throw when mcpServerService is not available on start', async () => {
      const caller = createTestCaller({
        mcpServerService: undefined,
      });

      await expect(caller.mcp.start({})).rejects.toThrow();
    });
  });

  // ============================================================
  // Integration: All MCP procedures with shared context
  // ============================================================

  describe('Integration: All MCP procedures with shared context', () => {
    it('should execute all 6 MCP procedures with the same caller', async () => {
      const mockStart = vi.fn().mockResolvedValue({
        ok: true,
        value: { port: 3001, url: 'http://localhost:3001' },
      });
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const mockGetStatus = vi.fn().mockReturnValue({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      const caller = createTestCaller({
        mcpServerService: {
          start: mockStart,
          stop: mockStop,
          getStatus: mockGetStatus,
        },
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
          getMcpSettings: vi.fn().mockReturnValue({ enabled: true, port: 3001 }),
          setMcpSettings: vi.fn(),
        },
      });

      // Execute all procedures
      const startResult = await caller.mcp.start({});
      expect(startResult.ok).toBe(true);

      const status = await caller.mcp.getStatus();
      expect(status.isRunning).toBe(true);

      const settings = await caller.mcp.getSettings();
      expect(settings.enabled).toBe(true);

      await caller.mcp.setEnabled({ enabled: false });
      await caller.mcp.setPort({ port: 9200 });

      await caller.mcp.stop();
      expect(mockStop).toHaveBeenCalled();
    });
  });
});
