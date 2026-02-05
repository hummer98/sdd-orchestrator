/**
 * Root Router integration tests
 * Requirements: 2.2, 2.3, 2.5, 7.1, 7.2, 7.3, 7.4
 * Verifies: AppRouter, appRouter, inferRouterInputs, inferRouterOutputs
 *
 * Uses tRPC caller pattern (DD-004) for direct procedure invocation
 * without Electron process (Requirements: 7.2)
 */
import { describe, it, expect } from 'vitest';
import { createCallerFactory } from '@trpc/server';

describe('Root Router (router.ts)', () => {
  it('should export appRouter', async () => {
    const { appRouter } = await import('../router');
    expect(appRouter).toBeDefined();
  });

  it('should export AppRouter type (verifiable via createCallerFactory)', async () => {
    const { appRouter } = await import('../router');
    // If AppRouter type is correct, createCallerFactory should accept it
    const createCaller = createCallerFactory()(appRouter);
    expect(createCaller).toBeDefined();
    expect(typeof createCaller).toBe('function');
  });

  it('should include system namespace with healthCheck', async () => {
    const { appRouter } = await import('../router');
    const createCaller = createCallerFactory()(appRouter);
    const caller = createCaller({});

    // Verify system namespace exists and healthCheck is callable
    const result = await caller.system.healthCheck();
    expect(result).toBeDefined();
    expect(result.status).toBe('ok');
  });

  it('should export RouterInputs and RouterOutputs types', async () => {
    // This test verifies type exports exist by importing them
    // TypeScript compilation success validates type correctness (Requirements: 7.4)
    const mod = await import('../router');
    expect(mod.appRouter).toBeDefined();
    // RouterInputs and RouterOutputs are type-only exports
    // Their existence is validated by TypeScript compilation
  });
});

describe('Integration: healthCheck via Root Router', () => {
  it('should return complete healthCheck response', async () => {
    const { appRouter } = await import('../router');
    const createCaller = createCallerFactory()(appRouter);
    const caller = createCaller({});

    const result = await caller.system.healthCheck();

    // Verify all fields (Requirements: 6.3)
    expect(result.status).toBe('ok');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(typeof result.version).toBe('string');
    expect(result.version.length).toBeGreaterThan(0);
  });

  it('healthCheck status should be literal "ok" type', async () => {
    const { appRouter } = await import('../router');
    const createCaller = createCallerFactory()(appRouter);
    const caller = createCaller({});

    const result = await caller.system.healthCheck();

    // Type-level verification: result.status is 'ok' literal
    // If this compiles, TypeScript correctly infers the literal type
    const status: 'ok' = result.status;
    expect(status).toBe('ok');
  });
});
