/**
 * System Router tests
 * Task 1.1: 既存system-router.test.tsのcreateCallerをモックContext付きに更新
 * Task 2.1: getAppVersion, getPlatform, getAppPath, getNodeEnv プロシージャ追加
 * Task 2.3: 統合テスト追加 - Zodスキーマバリデーション(有効/無効入力)、エラーハンドリング
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2, 6.3, 6.4
 * Verifies: publicProcedure.query, z.object, healthCheckOutputSchema, mock context DI
 * Verifies: getAppVersion, getPlatform, getAppPath, getNodeEnv via ctx.services
 * Verifies: system.getAppVersion in system-router.test.ts (Task 2.3 _Verify)
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller } from '../helpers/test-helpers';
import { createContext } from '../context';

describe('System Router (system.ts)', () => {
  // ============================================================
  // healthCheck procedure tests (Task 1.1)
  // ============================================================

  describe('healthCheck', () => {
    it('should export systemRouter', async () => {
      const { systemRouter } = await import('../routers/system');
      expect(systemRouter).toBeDefined();
    });

    it('should export healthCheckOutputSchema', async () => {
      const { healthCheckOutputSchema } = await import('../routers/system');
      expect(healthCheckOutputSchema).toBeDefined();
    });

    it('healthCheck should return status "ok" with mock context', async () => {
      const caller = createTestCaller();
      const result = await caller.system.healthCheck();
      expect(result.status).toBe('ok');
    });

    it('healthCheck should return ISO 8601 timestamp', async () => {
      const caller = createTestCaller();
      const result = await caller.system.healthCheck();

      // Verify ISO 8601 format
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Should be a valid date
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('healthCheck should return version as string', async () => {
      const caller = createTestCaller();
      const result = await caller.system.healthCheck();

      expect(typeof result.version).toBe('string');
      expect(result.version.length).toBeGreaterThan(0);
    });

    it('healthCheck output should match Zod schema', async () => {
      const { healthCheckOutputSchema } = await import('../routers/system');
      const caller = createTestCaller();
      const result = await caller.system.healthCheck();

      const parsed = healthCheckOutputSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  // ============================================================
  // getAppVersion procedure tests (Task 2.1)
  // ============================================================

  describe('getAppVersion', () => {
    it('should return app version string from ctx.services', async () => {
      const caller = createTestCaller({
        getAppVersion: vi.fn().mockReturnValue('1.2.3'),
      });

      const result = await caller.system.getAppVersion();
      expect(result).toBe('1.2.3');
    });

    it('should call ctx.services.getAppVersion', async () => {
      const mockGetAppVersion = vi.fn().mockReturnValue('0.1.0');
      const caller = createTestCaller({
        getAppVersion: mockGetAppVersion,
      });

      await caller.system.getAppVersion();
      expect(mockGetAppVersion).toHaveBeenCalledOnce();
    });

    it('output should be a non-empty string', async () => {
      const caller = createTestCaller({
        getAppVersion: vi.fn().mockReturnValue('2.0.0-beta'),
      });

      const result = await caller.system.getAppVersion();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('output should match Zod schema', async () => {
      const { appVersionOutputSchema } = await import('../routers/system');
      const caller = createTestCaller({
        getAppVersion: vi.fn().mockReturnValue('1.0.0'),
      });

      const result = await caller.system.getAppVersion();
      const parsed = appVersionOutputSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  // ============================================================
  // getPlatform procedure tests (Task 2.1)
  // ============================================================

  describe('getPlatform', () => {
    it('should return platform string from ctx.services', async () => {
      const caller = createTestCaller({
        getPlatform: vi.fn().mockReturnValue('darwin'),
      });

      const result = await caller.system.getPlatform();
      expect(result).toBe('darwin');
    });

    it('should call ctx.services.getPlatform', async () => {
      const mockGetPlatform = vi.fn().mockReturnValue('linux');
      const caller = createTestCaller({
        getPlatform: mockGetPlatform,
      });

      await caller.system.getPlatform();
      expect(mockGetPlatform).toHaveBeenCalledOnce();
    });

    it('should support all standard NodeJS.Platform values', async () => {
      for (const platform of ['darwin', 'linux', 'win32'] as const) {
        const caller = createTestCaller({
          getPlatform: vi.fn().mockReturnValue(platform),
        });

        const result = await caller.system.getPlatform();
        expect(result).toBe(platform);
      }
    });

    it('output should match Zod schema', async () => {
      const { platformOutputSchema } = await import('../routers/system');
      const caller = createTestCaller({
        getPlatform: vi.fn().mockReturnValue('darwin'),
      });

      const result = await caller.system.getPlatform();
      const parsed = platformOutputSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  // ============================================================
  // getAppPath procedure tests (Task 2.1)
  // ============================================================

  describe('getAppPath', () => {
    it('should return app path string from ctx.services', async () => {
      const caller = createTestCaller({
        getAppPath: vi.fn().mockReturnValue('/Applications/SDD Orchestrator.app'),
      });

      const result = await caller.system.getAppPath();
      expect(result).toBe('/Applications/SDD Orchestrator.app');
    });

    it('should call ctx.services.getAppPath', async () => {
      const mockGetAppPath = vi.fn().mockReturnValue('/usr/local/app');
      const caller = createTestCaller({
        getAppPath: mockGetAppPath,
      });

      await caller.system.getAppPath();
      expect(mockGetAppPath).toHaveBeenCalledOnce();
    });

    it('output should match Zod schema', async () => {
      const { appPathOutputSchema } = await import('../routers/system');
      const caller = createTestCaller({
        getAppPath: vi.fn().mockReturnValue('/path/to/app'),
      });

      const result = await caller.system.getAppPath();
      const parsed = appPathOutputSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  // ============================================================
  // getNodeEnv procedure tests (Task 2.1)
  // ============================================================

  describe('getNodeEnv', () => {
    it('should return NODE_ENV string from ctx.services', async () => {
      const caller = createTestCaller({
        getNodeEnv: vi.fn().mockReturnValue('production'),
      });

      const result = await caller.system.getNodeEnv();
      expect(result).toBe('production');
    });

    it('should call ctx.services.getNodeEnv', async () => {
      const mockGetNodeEnv = vi.fn().mockReturnValue('development');
      const caller = createTestCaller({
        getNodeEnv: mockGetNodeEnv,
      });

      await caller.system.getNodeEnv();
      expect(mockGetNodeEnv).toHaveBeenCalledOnce();
    });

    it('should handle "test" environment', async () => {
      const caller = createTestCaller({
        getNodeEnv: vi.fn().mockReturnValue('test'),
      });

      const result = await caller.system.getNodeEnv();
      expect(result).toBe('test');
    });

    it('output should match Zod schema', async () => {
      const { nodeEnvOutputSchema } = await import('../routers/system');
      const caller = createTestCaller({
        getNodeEnv: vi.fn().mockReturnValue('development'),
      });

      const result = await caller.system.getNodeEnv();
      const parsed = nodeEnvOutputSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  // ============================================================
  // Task 2.3: Zod Schema Validation Tests (valid and invalid inputs)
  // Requirements: 1.2, 1.4
  // ============================================================

  describe('Zod Schema Validation', () => {
    describe('healthCheckOutputSchema', () => {
      it('should accept valid healthCheck output', async () => {
        const { healthCheckOutputSchema } = await import('../routers/system');
        const valid = { status: 'ok' as const, timestamp: '2026-02-06T00:00:00.000Z', version: '1.0.0' };
        expect(healthCheckOutputSchema.safeParse(valid).success).toBe(true);
      });

      it('should reject output with wrong status value', async () => {
        const { healthCheckOutputSchema } = await import('../routers/system');
        const invalid = { status: 'error', timestamp: '2026-02-06T00:00:00.000Z', version: '1.0.0' };
        expect(healthCheckOutputSchema.safeParse(invalid).success).toBe(false);
      });

      it('should reject output with missing fields', async () => {
        const { healthCheckOutputSchema } = await import('../routers/system');
        expect(healthCheckOutputSchema.safeParse({ status: 'ok' }).success).toBe(false);
        expect(healthCheckOutputSchema.safeParse({}).success).toBe(false);
        expect(healthCheckOutputSchema.safeParse(null).success).toBe(false);
        expect(healthCheckOutputSchema.safeParse(undefined).success).toBe(false);
      });

      it('should reject output with non-string timestamp', async () => {
        const { healthCheckOutputSchema } = await import('../routers/system');
        const invalid = { status: 'ok' as const, timestamp: 12345, version: '1.0.0' };
        expect(healthCheckOutputSchema.safeParse(invalid).success).toBe(false);
      });

      it('should reject output with non-string version', async () => {
        const { healthCheckOutputSchema } = await import('../routers/system');
        const invalid = { status: 'ok' as const, timestamp: '2026-02-06T00:00:00.000Z', version: 123 };
        expect(healthCheckOutputSchema.safeParse(invalid).success).toBe(false);
      });
    });

    describe('appVersionOutputSchema', () => {
      it('should accept valid semver strings', async () => {
        const { appVersionOutputSchema } = await import('../routers/system');
        expect(appVersionOutputSchema.safeParse('1.0.0').success).toBe(true);
        expect(appVersionOutputSchema.safeParse('2.3.4-beta').success).toBe(true);
        expect(appVersionOutputSchema.safeParse('0.0.1-alpha.1').success).toBe(true);
      });

      it('should reject empty string', async () => {
        const { appVersionOutputSchema } = await import('../routers/system');
        expect(appVersionOutputSchema.safeParse('').success).toBe(false);
      });

      it('should reject non-string types', async () => {
        const { appVersionOutputSchema } = await import('../routers/system');
        expect(appVersionOutputSchema.safeParse(123).success).toBe(false);
        expect(appVersionOutputSchema.safeParse(null).success).toBe(false);
        expect(appVersionOutputSchema.safeParse(undefined).success).toBe(false);
        expect(appVersionOutputSchema.safeParse({}).success).toBe(false);
      });
    });

    describe('platformOutputSchema', () => {
      it('should accept valid platform strings', async () => {
        const { platformOutputSchema } = await import('../routers/system');
        expect(platformOutputSchema.safeParse('darwin').success).toBe(true);
        expect(platformOutputSchema.safeParse('linux').success).toBe(true);
        expect(platformOutputSchema.safeParse('win32').success).toBe(true);
        expect(platformOutputSchema.safeParse('freebsd').success).toBe(true);
      });

      it('should reject empty string', async () => {
        const { platformOutputSchema } = await import('../routers/system');
        expect(platformOutputSchema.safeParse('').success).toBe(false);
      });

      it('should reject non-string types', async () => {
        const { platformOutputSchema } = await import('../routers/system');
        expect(platformOutputSchema.safeParse(123).success).toBe(false);
        expect(platformOutputSchema.safeParse(null).success).toBe(false);
        expect(platformOutputSchema.safeParse(undefined).success).toBe(false);
      });
    });

    describe('appPathOutputSchema', () => {
      it('should accept valid path strings', async () => {
        const { appPathOutputSchema } = await import('../routers/system');
        expect(appPathOutputSchema.safeParse('/Applications/SDD.app').success).toBe(true);
        expect(appPathOutputSchema.safeParse('C:\\Program Files\\App').success).toBe(true);
        expect(appPathOutputSchema.safeParse('').success).toBe(true); // empty path is valid (app not found scenario)
      });

      it('should reject non-string types', async () => {
        const { appPathOutputSchema } = await import('../routers/system');
        expect(appPathOutputSchema.safeParse(123).success).toBe(false);
        expect(appPathOutputSchema.safeParse(null).success).toBe(false);
        expect(appPathOutputSchema.safeParse(undefined).success).toBe(false);
        expect(appPathOutputSchema.safeParse({}).success).toBe(false);
      });
    });

    describe('nodeEnvOutputSchema', () => {
      it('should accept valid NODE_ENV values', async () => {
        const { nodeEnvOutputSchema } = await import('../routers/system');
        expect(nodeEnvOutputSchema.safeParse('production').success).toBe(true);
        expect(nodeEnvOutputSchema.safeParse('development').success).toBe(true);
        expect(nodeEnvOutputSchema.safeParse('test').success).toBe(true);
        expect(nodeEnvOutputSchema.safeParse('').success).toBe(true); // empty is valid (env not set)
      });

      it('should reject non-string types', async () => {
        const { nodeEnvOutputSchema } = await import('../routers/system');
        expect(nodeEnvOutputSchema.safeParse(123).success).toBe(false);
        expect(nodeEnvOutputSchema.safeParse(null).success).toBe(false);
        expect(nodeEnvOutputSchema.safeParse(undefined).success).toBe(false);
        expect(nodeEnvOutputSchema.safeParse(true).success).toBe(false);
      });
    });
  });

  // ============================================================
  // Task 2.3: Error Handling Tests
  // Requirements: 1.4
  // ============================================================

  describe('Error Handling', () => {
    it('should propagate error when getAppVersion service throws', async () => {
      const caller = createTestCaller({
        getAppVersion: vi.fn().mockImplementation(() => {
          throw new Error('Version unavailable');
        }),
      });

      await expect(caller.system.getAppVersion()).rejects.toThrow();
    });

    it('should propagate error when getPlatform service throws', async () => {
      const caller = createTestCaller({
        getPlatform: vi.fn().mockImplementation(() => {
          throw new Error('Platform detection failed');
        }),
      });

      await expect(caller.system.getPlatform()).rejects.toThrow();
    });

    it('should propagate error when getAppPath service throws', async () => {
      const caller = createTestCaller({
        getAppPath: vi.fn().mockImplementation(() => {
          throw new Error('App path not found');
        }),
      });

      await expect(caller.system.getAppPath()).rejects.toThrow();
    });

    it('should propagate error when getNodeEnv service throws', async () => {
      const caller = createTestCaller({
        getNodeEnv: vi.fn().mockImplementation(() => {
          throw new Error('Environment variable error');
        }),
      });

      await expect(caller.system.getNodeEnv()).rejects.toThrow();
    });
  });

  // ============================================================
  // Task 2.3: Integration Tests - All 5 procedures with shared context
  // Requirements: 1.4
  // ============================================================

  describe('Integration: All system procedures with shared context', () => {
    it('should execute all 5 system procedures with the same caller', async () => {
      const caller = createTestCaller({
        getAppVersion: vi.fn().mockReturnValue('3.0.0'),
        getPlatform: vi.fn().mockReturnValue('darwin'),
        getAppPath: vi.fn().mockReturnValue('/Applications/SDD.app'),
        getNodeEnv: vi.fn().mockReturnValue('production'),
      });

      // Execute all procedures
      const healthResult = await caller.system.healthCheck();
      const versionResult = await caller.system.getAppVersion();
      const platformResult = await caller.system.getPlatform();
      const appPathResult = await caller.system.getAppPath();
      const nodeEnvResult = await caller.system.getNodeEnv();

      // Verify all results
      expect(healthResult.status).toBe('ok');
      expect(versionResult).toBe('3.0.0');
      expect(platformResult).toBe('darwin');
      expect(appPathResult).toBe('/Applications/SDD.app');
      expect(nodeEnvResult).toBe('production');
    });

    it('should use ctx.services for all system info procedures (not direct imports)', async () => {
      const mocks = {
        getAppVersion: vi.fn().mockReturnValue('1.0.0'),
        getPlatform: vi.fn().mockReturnValue('linux'),
        getAppPath: vi.fn().mockReturnValue('/opt/app'),
        getNodeEnv: vi.fn().mockReturnValue('development'),
      };
      const caller = createTestCaller(mocks);

      await caller.system.getAppVersion();
      await caller.system.getPlatform();
      await caller.system.getAppPath();
      await caller.system.getNodeEnv();

      // Verify all services were called exactly once
      expect(mocks.getAppVersion).toHaveBeenCalledOnce();
      expect(mocks.getPlatform).toHaveBeenCalledOnce();
      expect(mocks.getAppPath).toHaveBeenCalledOnce();
      expect(mocks.getNodeEnv).toHaveBeenCalledOnce();
    });

    it('should handle concurrent calls to multiple system procedures', async () => {
      const caller = createTestCaller({
        getAppVersion: vi.fn().mockReturnValue('1.0.0'),
        getPlatform: vi.fn().mockReturnValue('darwin'),
        getAppPath: vi.fn().mockReturnValue('/app'),
        getNodeEnv: vi.fn().mockReturnValue('test'),
      });

      // Execute all concurrently
      const results = await Promise.all([
        caller.system.healthCheck(),
        caller.system.getAppVersion(),
        caller.system.getPlatform(),
        caller.system.getAppPath(),
        caller.system.getNodeEnv(),
      ]);

      expect(results).toHaveLength(5);
      expect(results[0].status).toBe('ok');
      expect(results[1]).toBe('1.0.0');
      expect(results[2]).toBe('darwin');
      expect(results[3]).toBe('/app');
      expect(results[4]).toBe('test');
    });

    it('healthCheck should be independent of service mocks', async () => {
      // healthCheck does NOT use ctx.services for its data; it uses package.json version
      // Verify it works even with minimal mock overrides
      const caller = createTestCaller();
      const result = await caller.system.healthCheck();
      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.version).toBe('string');
    });

    it('all output schemas should validate actual procedure outputs', async () => {
      const {
        healthCheckOutputSchema,
        appVersionOutputSchema,
        platformOutputSchema,
        appPathOutputSchema,
        nodeEnvOutputSchema,
      } = await import('../routers/system');

      const caller = createTestCaller({
        getAppVersion: vi.fn().mockReturnValue('2.1.0'),
        getPlatform: vi.fn().mockReturnValue('win32'),
        getAppPath: vi.fn().mockReturnValue('C:\\Program Files\\App'),
        getNodeEnv: vi.fn().mockReturnValue('staging'),
      });

      const health = await caller.system.healthCheck();
      const version = await caller.system.getAppVersion();
      const platform = await caller.system.getPlatform();
      const appPath = await caller.system.getAppPath();
      const nodeEnv = await caller.system.getNodeEnv();

      expect(healthCheckOutputSchema.safeParse(health).success).toBe(true);
      expect(appVersionOutputSchema.safeParse(version).success).toBe(true);
      expect(platformOutputSchema.safeParse(platform).success).toBe(true);
      expect(appPathOutputSchema.safeParse(appPath).success).toBe(true);
      expect(nodeEnvOutputSchema.safeParse(nodeEnv).success).toBe(true);
    });
  });
});
