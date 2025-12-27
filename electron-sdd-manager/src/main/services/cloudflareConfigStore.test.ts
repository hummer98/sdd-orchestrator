/**
 * CloudflareConfigStore Unit Tests
 * TDD: Testing Cloudflare config persistence
 * Requirements: 2.2, 2.3, 5.1, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron-store for testing
const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('electron-store', () => {
  return {
    default: vi.fn(() => mockStore),
  };
});

describe('CloudflareConfigStore', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockReset();
    mockStore.set.mockReset();
    mockStore.delete.mockReset();
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.CLOUDFLARE_TUNNEL_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Task 1.1: Tunnel Token management
  describe('getTunnelToken', () => {
    it('should return environment variable value when CLOUDFLARE_TUNNEL_TOKEN is set', async () => {
      process.env.CLOUDFLARE_TUNNEL_TOKEN = 'env-token-123';
      mockStore.get.mockReturnValue('stored-token-456');

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const token = store.getTunnelToken();
      expect(token).toBe('env-token-123');
    });

    it('should return stored value when environment variable is not set', async () => {
      mockStore.get.mockReturnValue('stored-token-456');

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const token = store.getTunnelToken();
      expect(token).toBe('stored-token-456');
    });

    it('should return null when neither environment variable nor stored value exists', async () => {
      mockStore.get.mockReturnValue(null);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const token = store.getTunnelToken();
      expect(token).toBeNull();
    });
  });

  describe('setTunnelToken', () => {
    it('should store tunnel token', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      store.setTunnelToken('new-token-789');

      expect(mockStore.set).toHaveBeenCalledWith('tunnelToken', 'new-token-789');
    });
  });

  // Task 1.1: Access Token management
  describe('getAccessToken', () => {
    it('should return stored access token', async () => {
      mockStore.get.mockReturnValue('access-token-abc');

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const token = store.getAccessToken();
      expect(token).toBe('access-token-abc');
    });

    it('should return null when no access token is stored', async () => {
      mockStore.get.mockReturnValue(null);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const token = store.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('setAccessToken', () => {
    it('should store access token', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      store.setAccessToken('new-access-token');

      expect(mockStore.set).toHaveBeenCalledWith('accessToken', 'new-access-token');
    });
  });

  // Task 1.1: Publish to Cloudflare setting
  describe('getPublishToCloudflare', () => {
    it('should return stored publish setting', async () => {
      mockStore.get.mockReturnValue(true);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const enabled = store.getPublishToCloudflare();
      expect(enabled).toBe(true);
    });

    it('should return false by default when not set', async () => {
      mockStore.get.mockReturnValue(undefined);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const enabled = store.getPublishToCloudflare();
      expect(enabled).toBe(false);
    });
  });

  describe('setPublishToCloudflare', () => {
    it('should store publish to Cloudflare setting', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      store.setPublishToCloudflare(true);

      expect(mockStore.set).toHaveBeenCalledWith('publishToCloudflare', true);
    });
  });

  // Task 1.1: Custom cloudflared path
  describe('getCloudflaredPath', () => {
    it('should return stored cloudflared path', async () => {
      mockStore.get.mockReturnValue('/custom/path/to/cloudflared');

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const path = store.getCloudflaredPath();
      expect(path).toBe('/custom/path/to/cloudflared');
    });

    it('should return null when no custom path is stored', async () => {
      mockStore.get.mockReturnValue(null);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const path = store.getCloudflaredPath();
      expect(path).toBeNull();
    });
  });

  describe('setCloudflaredPath', () => {
    it('should store custom cloudflared path', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      store.setCloudflaredPath('/my/custom/cloudflared');

      expect(mockStore.set).toHaveBeenCalledWith('cloudflaredPath', '/my/custom/cloudflared');
    });

    it('should delete cloudflared path when set to null', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      store.setCloudflaredPath(null);

      expect(mockStore.delete).toHaveBeenCalledWith('cloudflaredPath');
    });
  });

  // Task 1.1: Reset settings (except Tunnel Token)
  describe('resetCloudflareSettings', () => {
    it('should reset all settings except Tunnel Token', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      store.resetCloudflareSettings();

      // Should delete these settings
      expect(mockStore.delete).toHaveBeenCalledWith('accessToken');
      expect(mockStore.delete).toHaveBeenCalledWith('publishToCloudflare');
      expect(mockStore.delete).toHaveBeenCalledWith('cloudflaredPath');
      // Should NOT delete tunnelToken
      expect(mockStore.delete).not.toHaveBeenCalledWith('tunnelToken');
    });
  });

  // Task 1.1: Token masking for logs
  describe('getMaskedTunnelToken', () => {
    it('should return masked token when token exists', async () => {
      process.env.CLOUDFLARE_TUNNEL_TOKEN = 'my-secret-tunnel-token';

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const masked = store.getMaskedTunnelToken();
      expect(masked).toBe('my-s***en');
    });

    it('should return null when no token exists', async () => {
      mockStore.get.mockReturnValue(null);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const masked = store.getMaskedTunnelToken();
      expect(masked).toBeNull();
    });

    it('should handle short tokens gracefully', async () => {
      process.env.CLOUDFLARE_TUNNEL_TOKEN = 'abc';

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const masked = store.getMaskedTunnelToken();
      expect(masked).toBe('***');
    });
  });

  // Task 1.1: Check if tunnel token is from environment
  describe('isTunnelTokenFromEnv', () => {
    it('should return true when CLOUDFLARE_TUNNEL_TOKEN is set', async () => {
      process.env.CLOUDFLARE_TUNNEL_TOKEN = 'env-token';

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      expect(store.isTunnelTokenFromEnv()).toBe(true);
    });

    it('should return false when CLOUDFLARE_TUNNEL_TOKEN is not set', async () => {
      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      expect(store.isTunnelTokenFromEnv()).toBe(false);
    });
  });

  // Task 1.1: Get all settings at once
  describe('getAllSettings', () => {
    it('should return all Cloudflare settings', async () => {
      process.env.CLOUDFLARE_TUNNEL_TOKEN = 'env-token';
      mockStore.get
        .mockReturnValueOnce('stored-token') // tunnelToken (won't be used due to env)
        .mockReturnValueOnce('access-token') // accessToken
        .mockReturnValueOnce(true) // publishToCloudflare
        .mockReturnValueOnce('/custom/path'); // cloudflaredPath

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const settings = store.getAllSettings();

      expect(settings).toEqual({
        hasTunnelToken: true,
        tunnelTokenSource: 'env',
        accessToken: 'access-token',
        publishToCloudflare: true,
        cloudflaredPath: '/custom/path',
      });
    });

    it('should indicate stored token source when env is not set', async () => {
      mockStore.get
        .mockReturnValueOnce('stored-token') // tunnelToken
        .mockReturnValueOnce('access-token') // accessToken
        .mockReturnValueOnce(false) // publishToCloudflare
        .mockReturnValueOnce(null); // cloudflaredPath

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const settings = store.getAllSettings();

      expect(settings).toEqual({
        hasTunnelToken: true,
        tunnelTokenSource: 'stored',
        accessToken: 'access-token',
        publishToCloudflare: false,
        cloudflaredPath: null,
      });
    });

    it('should indicate no token when neither env nor stored exists', async () => {
      mockStore.get.mockReturnValue(null);

      const { CloudflareConfigStore } = await import('./cloudflareConfigStore');
      const store = new CloudflareConfigStore(mockStore as any);

      const settings = store.getAllSettings();

      expect(settings.hasTunnelToken).toBe(false);
      expect(settings.tunnelTokenSource).toBe('none');
    });
  });
});
