/**
 * tRPC Context DI tests
 * Task 1.1: tRPC Contextにサービスインスタンスを注入する仕組み
 * Requirements: 1.1, 1.2, 1.3
 *
 * Verifies:
 * - Context type includes services property
 * - createContext accepts service overrides for DI
 * - Default context provides null/noop services
 * - Test context with mock services works with tRPC caller
 * - Legacy DI patterns (getCurrentProjectPath, setProjectPath) available via ctx.services
 */
import { describe, it, expect, vi } from 'vitest';
import { createCallerFactory } from '@trpc/server';

describe('tRPC Context (context.ts) - Service DI', () => {
  it('should export Context type with services property', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(ctx).toHaveProperty('services');
    expect(ctx.services).toBeDefined();
  });

  it('should provide getCurrentProjectPath via ctx.services', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(typeof ctx.services.getCurrentProjectPath).toBe('function');
  });

  it('should provide setProjectPath via ctx.services', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(typeof ctx.services.setProjectPath).toBe('function');
  });

  it('should return null from default getCurrentProjectPath', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    const result = ctx.services.getCurrentProjectPath();
    expect(result).toBeNull();
  });

  it('should accept service overrides for DI (test mock injection)', async () => {
    const { createContext } = await import('../context');
    const mockGetCurrentProjectPath = vi.fn().mockReturnValue('/mock/project');
    const ctx = createContext({
      getCurrentProjectPath: mockGetCurrentProjectPath,
    });
    expect(ctx.services.getCurrentProjectPath()).toBe('/mock/project');
    expect(mockGetCurrentProjectPath).toHaveBeenCalledTimes(1);
  });

  it('should accept setProjectPath override', async () => {
    const { createContext } = await import('../context');
    const mockSetProjectPath = vi.fn().mockResolvedValue(undefined);
    const ctx = createContext({
      setProjectPath: mockSetProjectPath,
    });
    expect(typeof ctx.services.setProjectPath).toBe('function');
  });

  it('should provide getInitialProjectPath via ctx.services', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(typeof ctx.services.getInitialProjectPath).toBe('function');
    expect(ctx.services.getInitialProjectPath()).toBeNull();
  });

  it('should provide fileService via ctx.services', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(ctx.services).toHaveProperty('fileService');
  });

  it('should provide configStore via ctx.services', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(ctx.services).toHaveProperty('configStore');
  });

  it('should provide specManagerService via ctx.services', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(ctx.services).toHaveProperty('getSpecManagerService');
    expect(typeof ctx.services.getSpecManagerService).toBe('function');
  });

  // bugService removed (github-issue-integration)

  it('should merge partial overrides with defaults', async () => {
    const { createContext } = await import('../context');
    const mockGetCurrentProjectPath = vi.fn().mockReturnValue('/custom/path');
    const ctx = createContext({
      getCurrentProjectPath: mockGetCurrentProjectPath,
    });
    // Overridden service should be custom
    expect(ctx.services.getCurrentProjectPath()).toBe('/custom/path');
    // Non-overridden services should still exist with defaults
    expect(ctx.services).toHaveProperty('fileService');
    expect(ctx.services).toHaveProperty('configStore');
  });
});

/**
 * multi-window-integration Task 2.3: ContextServices windowId support
 * Requirements: 3.1, 3.2, 3.3
 * Verifies:
 * - ContextServices has windowId field
 * - windowId can be provided via overrides
 * - Default windowId is undefined (backward compatibility)
 */
describe('tRPC Context - multi-window Task 2.3: windowId in ContextServices', () => {
  it('should have windowId field in ContextServices', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext({
      windowId: 42,
    });
    expect(ctx.services.windowId).toBe(42);
  });

  it('should default windowId to undefined when not provided', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(ctx.services.windowId).toBeUndefined();
  });

  it('should allow getCurrentProjectPath to be overridden for window-specific path', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext({
      windowId: 1,
      getCurrentProjectPath: vi.fn().mockReturnValue('/project-a'),
    });
    expect(ctx.services.windowId).toBe(1);
    expect(ctx.services.getCurrentProjectPath()).toBe('/project-a');
  });

  it('should allow getSpecManagerService to be overridden for window-specific service', async () => {
    const { createContext } = await import('../context');
    const mockSpecManager = { readSpecs: vi.fn() };
    const ctx = createContext({
      windowId: 2,
      getSpecManagerService: vi.fn().mockReturnValue(mockSpecManager),
    });
    expect(ctx.services.windowId).toBe(2);
    expect(ctx.services.getSpecManagerService()).toBe(mockSpecManager);
  });
});

describe('tRPC Context - Integration with Caller', () => {
  it('should work with createCallerFactory using mock context', async () => {
    const { createContext } = await import('../context');
    const { appRouter } = await import('../router');
    const createCaller = createCallerFactory()(appRouter);

    // Create a mock context with DI
    const mockCtx = createContext({
      getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
    });

    // Caller should work with the context
    const caller = createCaller(mockCtx);
    const result = await caller.system.healthCheck();
    expect(result.status).toBe('ok');
  });
});
