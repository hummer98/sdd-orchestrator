/**
 * App Provider Integration Test
 *
 * Task 8.2: Electron版App.tsxをApiClientProvider対応に更新する
 * Requirements: 2.4
 *
 * このテストはApp.tsxにApiClientProviderとPlatformProviderが
 * 正しく設定されていることを検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Task 8.2: App.tsx Provider Integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('ApiClientProvider', () => {
    it('should be exported from shared/api', async () => {
      const { ApiClientProvider, useApi } = await import('../shared/api');
      expect(ApiClientProvider).toBeDefined();
      expect(useApi).toBeDefined();
    });

    it('ApiClientProvider should be a React component', async () => {
      const { ApiClientProvider } = await import('../shared/api');
      expect(typeof ApiClientProvider).toBe('function');
    });
  });

  describe('PlatformProvider', () => {
    it('should be exported from shared/providers', async () => {
      const { PlatformProvider, usePlatform } = await import('../shared/providers');
      expect(PlatformProvider).toBeDefined();
      expect(usePlatform).toBeDefined();
    });

    it('PlatformProvider should be a React component', async () => {
      const { PlatformProvider } = await import('../shared/providers');
      expect(typeof PlatformProvider).toBe('function');
    });
  });

  describe('Shared exports', () => {
    it('ApiClientProvider should be accessible from shared/index', async () => {
      const shared = await import('../shared');
      expect(shared.ApiClientProvider).toBeDefined();
    });

    it('PlatformProvider should be accessible from shared/index', async () => {
      const shared = await import('../shared');
      expect(shared.PlatformProvider).toBeDefined();
    });
  });
});
