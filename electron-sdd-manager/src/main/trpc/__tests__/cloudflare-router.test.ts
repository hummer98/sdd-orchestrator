/**
 * Cloudflare Router tests
 * Task 10.1: cloudflareルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Verifies: cloudflareRouter, cloudflareService
 * Verifies: Grep "cloudflareRouter" in router.ts (Task 10.1 _Verify)
 *
 * Tests cover:
 * - All 10 procedures (getSettings, setTunnelToken, refreshAccessToken,
 *   ensureAccessToken, checkBinary, setPublishToCloudflare,
 *   setCloudflaredPath, startTunnel, stopTunnel, getTunnelStatus)
 * - Zod schema validation (valid/invalid inputs)
 * - ctx.services DI pattern
 * - Error propagation
 * - Edge cases inherited from legacy cloudflareHandlers.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

// ============================================================
// Helper to create a mock cloudflare service for tests
// ============================================================
function createMockCloudflareService() {
  return {
    getAllSettings: vi.fn().mockReturnValue({
      hasTunnelToken: true,
      tunnelTokenSource: 'env' as const,
      accessToken: 'abc123',
      publishToCloudflare: false,
      cloudflaredPath: null,
    }),
    setTunnelToken: vi.fn(),
    refreshAccessToken: vi.fn().mockReturnValue('newtoken99'),
    ensureAccessToken: vi.fn().mockReturnValue('existing-token'),
    checkBinary: vi.fn().mockResolvedValue({
      exists: true,
      path: '/usr/local/bin/cloudflared',
    }),
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
  };
}

describe('Cloudflare Router (cloudflare.ts)', () => {
  // ============================================================
  // getSettings procedure (query)
  // Legacy: CLOUDFLARE_GET_SETTINGS
  // ============================================================

  describe('getSettings', () => {
    it('should return all Cloudflare settings', async () => {
      const mockCloudflareService = createMockCloudflareService();
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.getSettings();
      expect(result).toEqual({
        hasTunnelToken: true,
        tunnelTokenSource: 'env',
        accessToken: 'abc123',
        publishToCloudflare: false,
        cloudflaredPath: null,
      });
      expect(mockCloudflareService.getAllSettings).toHaveBeenCalledOnce();
    });

    it('should return settings with no tunnel token', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.getAllSettings.mockReturnValue({
        hasTunnelToken: false,
        tunnelTokenSource: 'none',
        accessToken: null,
        publishToCloudflare: false,
        cloudflaredPath: null,
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.getSettings();
      expect(result.hasTunnelToken).toBe(false);
      expect(result.tunnelTokenSource).toBe('none');
    });
  });

  // ============================================================
  // setTunnelToken procedure (mutation)
  // Legacy: CLOUDFLARE_SET_TUNNEL_TOKEN
  // ============================================================

  describe('setTunnelToken', () => {
    it('should set tunnel token via cloudflareService', async () => {
      const mockCloudflareService = createMockCloudflareService();
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      await caller.cloudflare.setTunnelToken({ token: 'new-token' });
      expect(mockCloudflareService.setTunnelToken).toHaveBeenCalledWith('new-token');
    });

    it('should reject empty token', async () => {
      const caller = createTestCaller({
        cloudflareService: createMockCloudflareService(),
      } as Partial<ContextServices>);

      await expect(caller.cloudflare.setTunnelToken({ token: '' })).rejects.toThrow();
    });
  });

  // ============================================================
  // refreshAccessToken procedure (mutation)
  // Legacy: CLOUDFLARE_REFRESH_ACCESS_TOKEN
  // ============================================================

  describe('refreshAccessToken', () => {
    it('should refresh access token and return new token', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.refreshAccessToken.mockReturnValue('newtoken99');
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.refreshAccessToken();
      expect(result).toBe('newtoken99');
      expect(mockCloudflareService.refreshAccessToken).toHaveBeenCalledOnce();
    });
  });

  // ============================================================
  // ensureAccessToken procedure (mutation)
  // Legacy: CLOUDFLARE_ENSURE_ACCESS_TOKEN
  // ============================================================

  describe('ensureAccessToken', () => {
    it('should ensure access token exists and return it', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.ensureAccessToken.mockReturnValue('existing-token');
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.ensureAccessToken();
      expect(result).toBe('existing-token');
      expect(mockCloudflareService.ensureAccessToken).toHaveBeenCalledOnce();
    });

    it('should generate new token when none exists', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.ensureAccessToken.mockReturnValue('new-generated');
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.ensureAccessToken();
      expect(result).toBe('new-generated');
    });
  });

  // ============================================================
  // checkBinary procedure (query)
  // Legacy: CLOUDFLARE_CHECK_BINARY
  // ============================================================

  describe('checkBinary', () => {
    it('should return binary check result with path when found', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.checkBinary.mockResolvedValue({
        exists: true,
        path: '/usr/local/bin/cloudflared',
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.checkBinary();
      expect(result).toEqual({
        exists: true,
        path: '/usr/local/bin/cloudflared',
      });
    });

    it('should return install instructions when binary not found', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.checkBinary.mockResolvedValue({
        exists: false,
        installInstructions: {
          homebrew: 'brew install cloudflared',
          macports: 'sudo port install cloudflared',
          downloadUrl: 'https://cloudflare.com/downloads',
        },
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.checkBinary();
      expect(result.exists).toBe(false);
      expect(result.installInstructions).toBeDefined();
      expect(result.installInstructions?.homebrew).toBe('brew install cloudflared');
    });
  });

  // ============================================================
  // setPublishToCloudflare procedure (mutation)
  // Legacy: CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE
  // ============================================================

  describe('setPublishToCloudflare', () => {
    it('should set publish to cloudflare setting to true', async () => {
      const mockCloudflareService = createMockCloudflareService();
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      await caller.cloudflare.setPublishToCloudflare({ enabled: true });
      expect(mockCloudflareService.setPublishToCloudflare).toHaveBeenCalledWith(true);
    });

    it('should set publish to cloudflare setting to false', async () => {
      const mockCloudflareService = createMockCloudflareService();
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      await caller.cloudflare.setPublishToCloudflare({ enabled: false });
      expect(mockCloudflareService.setPublishToCloudflare).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================
  // setCloudflaredPath procedure (mutation)
  // Legacy: CLOUDFLARE_SET_CLOUDFLARED_PATH
  // ============================================================

  describe('setCloudflaredPath', () => {
    it('should set custom cloudflared path', async () => {
      const mockCloudflareService = createMockCloudflareService();
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      await caller.cloudflare.setCloudflaredPath({ path: '/custom/path/cloudflared' });
      expect(mockCloudflareService.setCloudflaredPath).toHaveBeenCalledWith('/custom/path/cloudflared');
    });

    it('should set path to null to clear custom path', async () => {
      const mockCloudflareService = createMockCloudflareService();
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      await caller.cloudflare.setCloudflaredPath({ path: null });
      expect(mockCloudflareService.setCloudflaredPath).toHaveBeenCalledWith(null);
    });
  });

  // ============================================================
  // startTunnel procedure (mutation)
  // Legacy: CLOUDFLARE_START_TUNNEL
  // ============================================================

  describe('startTunnel', () => {
    it('should start tunnel and return success result', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.startTunnel.mockResolvedValue({
        ok: true,
        value: { url: 'https://test.trycloudflare.com', pid: 12345 },
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.startTunnel({ localPort: 8765 });
      expect(result).toEqual({
        ok: true,
        value: { url: 'https://test.trycloudflare.com', pid: 12345 },
      });
      expect(mockCloudflareService.startTunnel).toHaveBeenCalledWith(8765);
    });

    it('should return error when tunnel token not configured', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.startTunnel.mockResolvedValue({
        ok: false,
        error: { type: 'NO_TUNNEL_TOKEN', message: 'Tunnel token is not configured.' },
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.startTunnel({ localPort: 8765 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NO_TUNNEL_TOKEN');
      }
    });

    it('should reject invalid port number (negative)', async () => {
      const caller = createTestCaller({
        cloudflareService: createMockCloudflareService(),
      } as Partial<ContextServices>);

      await expect(caller.cloudflare.startTunnel({ localPort: -1 })).rejects.toThrow();
    });

    it('should reject invalid port number (too large)', async () => {
      const caller = createTestCaller({
        cloudflareService: createMockCloudflareService(),
      } as Partial<ContextServices>);

      await expect(caller.cloudflare.startTunnel({ localPort: 70000 })).rejects.toThrow();
    });
  });

  // ============================================================
  // stopTunnel procedure (mutation)
  // Legacy: CLOUDFLARE_STOP_TUNNEL
  // ============================================================

  describe('stopTunnel', () => {
    it('should stop tunnel and return success', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.stopTunnel.mockResolvedValue({ ok: true });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.stopTunnel();
      expect(result).toEqual({ ok: true });
      expect(mockCloudflareService.stopTunnel).toHaveBeenCalledOnce();
    });

    it('should return error when tunnel is not running', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.stopTunnel.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_RUNNING', message: 'No tunnel is currently running' },
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.stopTunnel();
      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // getTunnelStatus procedure (query)
  // Legacy: CLOUDFLARE_GET_TUNNEL_STATUS
  // ============================================================

  describe('getTunnelStatus', () => {
    it('should return current tunnel status (stopped)', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.getTunnelStatus.mockReturnValue({
        state: 'stopped',
        url: null,
        pid: null,
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.getTunnelStatus();
      expect(result).toEqual({
        state: 'stopped',
        url: null,
        pid: null,
      });
    });

    it('should return current tunnel status (running)', async () => {
      const mockCloudflareService = createMockCloudflareService();
      mockCloudflareService.getTunnelStatus.mockReturnValue({
        state: 'running',
        url: 'https://test.trycloudflare.com',
        pid: 12345,
      });
      const caller = createTestCaller({
        cloudflareService: mockCloudflareService,
      } as Partial<ContextServices>);

      const result = await caller.cloudflare.getTunnelStatus();
      expect(result.state).toBe('running');
      expect(result.url).toBe('https://test.trycloudflare.com');
      expect(result.pid).toBe(12345);
    });
  });

  // ============================================================
  // cloudflareRouter registration in appRouter
  // Task 10.1 _Verify: Grep "cloudflareRouter" in router.ts
  // ============================================================

  describe('Router registration', () => {
    it('should have cloudflare namespace on the caller', async () => {
      const caller = createTestCaller({
        cloudflareService: createMockCloudflareService(),
      } as Partial<ContextServices>);

      expect(caller.cloudflare).toBeDefined();
      expect(typeof caller.cloudflare.getSettings).toBe('function');
      expect(typeof caller.cloudflare.setTunnelToken).toBe('function');
      expect(typeof caller.cloudflare.refreshAccessToken).toBe('function');
      expect(typeof caller.cloudflare.ensureAccessToken).toBe('function');
      expect(typeof caller.cloudflare.checkBinary).toBe('function');
      expect(typeof caller.cloudflare.setPublishToCloudflare).toBe('function');
      expect(typeof caller.cloudflare.setCloudflaredPath).toBe('function');
      expect(typeof caller.cloudflare.startTunnel).toBe('function');
      expect(typeof caller.cloudflare.stopTunnel).toBe('function');
      expect(typeof caller.cloudflare.getTunnelStatus).toBe('function');
    });
  });
});
