/**
 * System Router tests (healthCheck procedure)
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * Verifies: publicProcedure.query, z.object, healthCheckOutputSchema
 */
import { describe, it, expect } from 'vitest';

describe('System Router (system.ts)', () => {
  it('should export systemRouter', async () => {
    const { systemRouter } = await import('../routers/system');
    expect(systemRouter).toBeDefined();
  });

  it('should export healthCheckOutputSchema', async () => {
    const { healthCheckOutputSchema } = await import('../routers/system');
    expect(healthCheckOutputSchema).toBeDefined();
  });

  it('healthCheck should return status "ok"', async () => {
    // Use tRPC caller pattern to invoke the procedure directly
    const { createCallerFactory } = await import('@trpc/server');
    const { systemRouter } = await import('../routers/system');
    const { router } = await import('../trpc');

    // Create a temporary router with system namespace
    const testRouter = router({ system: systemRouter });
    const createCaller = createCallerFactory()(testRouter);
    const caller = createCaller({});

    const result = await caller.system.healthCheck();

    expect(result.status).toBe('ok');
  });

  it('healthCheck should return ISO 8601 timestamp', async () => {
    const { createCallerFactory } = await import('@trpc/server');
    const { systemRouter } = await import('../routers/system');
    const { router } = await import('../trpc');

    const testRouter = router({ system: systemRouter });
    const createCaller = createCallerFactory()(testRouter);
    const caller = createCaller({});

    const result = await caller.system.healthCheck();

    // Verify ISO 8601 format
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Should be a valid date
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('healthCheck should return version as string', async () => {
    const { createCallerFactory } = await import('@trpc/server');
    const { systemRouter } = await import('../routers/system');
    const { router } = await import('../trpc');

    const testRouter = router({ system: systemRouter });
    const createCaller = createCallerFactory()(testRouter);
    const caller = createCaller({});

    const result = await caller.system.healthCheck();

    expect(typeof result.version).toBe('string');
    expect(result.version.length).toBeGreaterThan(0);
  });

  it('healthCheck output should match Zod schema', async () => {
    const { createCallerFactory } = await import('@trpc/server');
    const { systemRouter, healthCheckOutputSchema } = await import('../routers/system');
    const { router } = await import('../trpc');

    const testRouter = router({ system: systemRouter });
    const createCaller = createCallerFactory()(testRouter);
    const caller = createCaller({});

    const result = await caller.system.healthCheck();

    // Validate against Zod schema
    const parsed = healthCheckOutputSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});
