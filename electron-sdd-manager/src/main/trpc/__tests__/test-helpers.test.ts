/**
 * Test Helpers tests
 * Task 1.2: ルーターテスト用の共通テストヘルパーを作成する
 * Requirements: 1.4, 2.5, 3.6
 * Method: createTestContext, createCallerFactory
 * Verify: Grep "createTestContext" in __tests__/
 *
 * Verifies:
 * - createTestContext provides sensible mock defaults for all services
 * - createTestContext accepts partial overrides
 * - createTestCaller creates a tRPC caller with mock context
 * - createTestCaller accepts service overrides
 * - Mock defaults are functional (no runtime errors when called)
 * - Helpers eliminate boilerplate from router tests
 */
import { describe, it, expect, vi } from 'vitest';

describe('Test Helpers - createTestContext', () => {
  it('should export createTestContext function', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    expect(createTestContext).toBeDefined();
    expect(typeof createTestContext).toBe('function');
  });

  it('should return a Context object with services property', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(ctx).toHaveProperty('services');
    expect(ctx.services).toBeDefined();
  });

  it('should provide mock getCurrentProjectPath returning a test path', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    // Default mock should return a sensible test path (not null like production defaults)
    const result = ctx.services.getCurrentProjectPath();
    expect(typeof result).toBe('string');
    expect(result).toBeTruthy();
  });

  it('should provide mock setProjectPath as a vi.fn()', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(typeof ctx.services.setProjectPath).toBe('function');
    // Should be callable without error
    await ctx.services.setProjectPath('/some/path');
  });

  it('should provide mock getInitialProjectPath returning a test path', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(typeof ctx.services.getInitialProjectPath).toBe('function');
    // Should return a sensible default (not null)
    const result = ctx.services.getInitialProjectPath();
    expect(typeof result).toBe('string');
  });

  it('should provide mock setInitialProjectPath as a vi.fn()', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(typeof ctx.services.setInitialProjectPath).toBe('function');
    // Should be callable without error
    ctx.services.setInitialProjectPath('/test');
  });

  it('should provide mock fileService with common methods', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(ctx.services.fileService).toBeDefined();
    expect(ctx.services.fileService).not.toBeNull();
  });

  it('should provide mock configStore with common methods', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(ctx.services.configStore).toBeDefined();
    expect(ctx.services.configStore).not.toBeNull();
    // Verify configStore methods exist
    expect(typeof ctx.services.configStore!.getRecentProjects).toBe('function');
    expect(typeof ctx.services.configStore!.addRecentProject).toBe('function');
    expect(typeof ctx.services.configStore!.removeRecentProject).toBe('function');
    expect(typeof ctx.services.configStore!.getHangThreshold).toBe('function');
    expect(typeof ctx.services.configStore!.setHangThreshold).toBe('function');
  });

  // bugService removed (github-issue-integration)

  it('should provide mock getSpecManagerService that returns a mock', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const ctx = createTestContext();
    expect(typeof ctx.services.getSpecManagerService).toBe('function');
    // Should NOT throw (unlike production default which throws if not initialized)
    const specManager = ctx.services.getSpecManagerService();
    expect(specManager).toBeDefined();
  });

  it('should accept partial overrides that take precedence over defaults', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const customGetPath = vi.fn().mockReturnValue('/custom/path');
    const ctx = createTestContext({
      getCurrentProjectPath: customGetPath,
    });
    expect(ctx.services.getCurrentProjectPath()).toBe('/custom/path');
    expect(customGetPath).toHaveBeenCalledTimes(1);
    // Other services should still be mock defaults
    expect(ctx.services.fileService).not.toBeNull();
    expect(ctx.services.configStore).not.toBeNull();
  });

  it('should allow overriding fileService with a custom mock', async () => {
    const { createTestContext } = await import('../helpers/test-helpers');
    const customFileService = { readSpecs: vi.fn() } as any;
    const ctx = createTestContext({
      fileService: customFileService,
    });
    expect(ctx.services.fileService).toBe(customFileService);
  });
});

describe('Test Helpers - createTestCaller', () => {
  it('should export createTestCaller function', async () => {
    const { createTestCaller } = await import('../helpers/test-helpers');
    expect(createTestCaller).toBeDefined();
    expect(typeof createTestCaller).toBe('function');
  });

  it('should return a tRPC caller that can invoke procedures', async () => {
    const { createTestCaller } = await import('../helpers/test-helpers');
    const caller = createTestCaller();
    // Should be able to call system.healthCheck
    const result = await caller.system.healthCheck();
    expect(result.status).toBe('ok');
  });

  it('should accept service overrides for the caller context', async () => {
    const { createTestCaller } = await import('../helpers/test-helpers');
    const mockGetPath = vi.fn().mockReturnValue('/caller/test');
    const caller = createTestCaller({
      getCurrentProjectPath: mockGetPath,
    });
    // Caller should work
    const result = await caller.system.healthCheck();
    expect(result.status).toBe('ok');
  });

  it('should return a caller with the full appRouter namespace', async () => {
    const { createTestCaller } = await import('../helpers/test-helpers');
    const caller = createTestCaller();
    // Verify system namespace is accessible
    expect(caller.system).toBeDefined();
    expect(typeof caller.system.healthCheck).toBe('function');
  });
});

describe('Test Helpers - createMockServices', () => {
  it('should export createMockServices function', async () => {
    const { createMockServices } = await import('../helpers/test-helpers');
    expect(createMockServices).toBeDefined();
    expect(typeof createMockServices).toBe('function');
  });

  it('should return a complete ContextServices object with mock implementations', async () => {
    const { createMockServices } = await import('../helpers/test-helpers');
    const services = createMockServices();
    expect(services).toHaveProperty('getCurrentProjectPath');
    expect(services).toHaveProperty('setProjectPath');
    expect(services).toHaveProperty('getInitialProjectPath');
    expect(services).toHaveProperty('setInitialProjectPath');
    expect(services).toHaveProperty('fileService');
    expect(services).toHaveProperty('configStore');
    // bugService removed (github-issue-integration)
    expect(services).toHaveProperty('getSpecManagerService');
  });

  it('should accept partial overrides', async () => {
    const { createMockServices } = await import('../helpers/test-helpers');
    const customGetPath = vi.fn().mockReturnValue('/override');
    const services = createMockServices({
      getCurrentProjectPath: customGetPath,
    });
    expect(services.getCurrentProjectPath()).toBe('/override');
    // Non-overridden should still have defaults
    expect(services.fileService).not.toBeNull();
  });
});
