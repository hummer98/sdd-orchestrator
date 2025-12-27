/**
 * Cloudflare IPC Handlers Unit Tests
 * TDD: Testing IPC handlers for Cloudflare Tunnel integration
 * Requirements: 1.2, 2.1, 2.2, 2.3, 3.1, 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

// Mock CloudflareConfigStore
const mockConfigStore = {
  getTunnelToken: vi.fn(),
  setTunnelToken: vi.fn(),
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  getPublishToCloudflare: vi.fn(),
  setPublishToCloudflare: vi.fn(),
  getCloudflaredPath: vi.fn(),
  setCloudflaredPath: vi.fn(),
  getAllSettings: vi.fn(),
  getMaskedTunnelToken: vi.fn(),
  isTunnelTokenFromEnv: vi.fn(),
  resetCloudflareSettings: vi.fn(),
};

vi.mock('../services/cloudflareConfigStore', () => ({
  getCloudflareConfigStore: () => mockConfigStore,
}));

// Mock AccessTokenService
const mockAccessTokenService = {
  generateToken: vi.fn(),
  validateToken: vi.fn(),
  refreshToken: vi.fn(),
  getToken: vi.fn(),
  ensureToken: vi.fn(),
};

vi.mock('../services/accessTokenService', () => ({
  getAccessTokenService: () => mockAccessTokenService,
}));

// Mock CloudflaredBinaryChecker
const mockBinaryChecker = {
  checkBinaryExists: vi.fn(),
  isExecutable: vi.fn(),
  getInstallInstructions: vi.fn(),
};

vi.mock('../services/cloudflaredBinaryChecker', () => ({
  getCloudflaredBinaryChecker: () => mockBinaryChecker,
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CloudflareHandlers', () => {
  const mockHandle = vi.mocked(ipcMain.handle);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    const { cleanupCloudflareHandlers } = await import('./cloudflareHandlers');
    cleanupCloudflareHandlers();
  });

  describe('registerCloudflareHandlers', () => {
    it('should register all Cloudflare IPC handlers', async () => {
      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      // Verify handlers are registered
      expect(mockHandle).toHaveBeenCalledWith(
        'cloudflare:get-settings',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'cloudflare:set-tunnel-token',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'cloudflare:refresh-access-token',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'cloudflare:check-binary',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'cloudflare:set-publish-to-cloudflare',
        expect.any(Function)
      );
    });
  });

  describe('cloudflare:get-settings handler', () => {
    it('should return all Cloudflare settings', async () => {
      const expectedSettings = {
        hasTunnelToken: true,
        tunnelTokenSource: 'env' as const,
        accessToken: 'abc123',
        publishToCloudflare: false,
        cloudflaredPath: null,
      };
      mockConfigStore.getAllSettings.mockReturnValue(expectedSettings);

      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      // Get the handler function
      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:get-settings'
      )?.[1];

      expect(handler).toBeDefined();
      const result = await handler!({} as any);

      expect(result).toEqual(expectedSettings);
    });
  });

  describe('cloudflare:set-tunnel-token handler', () => {
    it('should set tunnel token', async () => {
      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:set-tunnel-token'
      )?.[1];

      expect(handler).toBeDefined();
      await handler!({} as any, 'new-token');

      expect(mockConfigStore.setTunnelToken).toHaveBeenCalledWith('new-token');
    });
  });

  describe('cloudflare:refresh-access-token handler', () => {
    it('should refresh access token and return new token', async () => {
      const newToken = 'newtoken99';
      mockAccessTokenService.refreshToken.mockReturnValue(newToken);

      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:refresh-access-token'
      )?.[1];

      expect(handler).toBeDefined();
      const result = await handler!({} as any);

      expect(result).toBe(newToken);
      expect(mockAccessTokenService.refreshToken).toHaveBeenCalled();
    });
  });

  describe('cloudflare:check-binary handler', () => {
    it('should return binary check result with path when found', async () => {
      mockBinaryChecker.checkBinaryExists.mockResolvedValue({
        exists: true,
        path: '/usr/local/bin/cloudflared',
      });

      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:check-binary'
      )?.[1];

      expect(handler).toBeDefined();
      const result = await handler!({} as any);

      expect(result).toEqual({
        exists: true,
        path: '/usr/local/bin/cloudflared',
      });
    });

    it('should return install instructions when binary not found', async () => {
      mockBinaryChecker.checkBinaryExists.mockResolvedValue({ exists: false });
      mockBinaryChecker.getInstallInstructions.mockReturnValue({
        homebrew: 'brew install cloudflared',
        macports: 'sudo port install cloudflared',
        downloadUrl: 'https://cloudflare.com/...',
      });

      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:check-binary'
      )?.[1];

      expect(handler).toBeDefined();
      const result = await handler!({} as any);

      expect(result).toEqual({
        exists: false,
        installInstructions: {
          homebrew: 'brew install cloudflared',
          macports: 'sudo port install cloudflared',
          downloadUrl: 'https://cloudflare.com/...',
        },
      });
    });
  });

  describe('cloudflare:set-publish-to-cloudflare handler', () => {
    it('should set publish to cloudflare setting', async () => {
      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:set-publish-to-cloudflare'
      )?.[1];

      expect(handler).toBeDefined();
      await handler!({} as any, true);

      expect(mockConfigStore.setPublishToCloudflare).toHaveBeenCalledWith(true);
    });
  });

  describe('cloudflare:ensure-access-token handler', () => {
    it('should ensure access token exists', async () => {
      mockAccessTokenService.ensureToken.mockReturnValue('existing-token');

      const { registerCloudflareHandlers } = await import('./cloudflareHandlers');
      registerCloudflareHandlers();

      const handler = mockHandle.mock.calls.find(
        (call) => call[0] === 'cloudflare:ensure-access-token'
      )?.[1];

      expect(handler).toBeDefined();
      const result = await handler!({} as any);

      expect(result).toBe('existing-token');
      expect(mockAccessTokenService.ensureToken).toHaveBeenCalled();
    });
  });
});
