/**
 * tRPC Instance and Context initialization tests
 * Requirements: 2.1, 2.4
 * Verifies: initTRPC.create, router, publicProcedure, Context
 */
import { describe, it, expect } from 'vitest';

describe('tRPC Instance (trpc.ts)', () => {
  it('should export router function', async () => {
    const { router } = await import('../trpc');
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });

  it('should export publicProcedure', async () => {
    const { publicProcedure } = await import('../trpc');
    expect(publicProcedure).toBeDefined();
    // publicProcedure should have query/mutation methods
    expect(typeof publicProcedure.query).toBe('function');
    expect(typeof publicProcedure.mutation).toBe('function');
  });
});

describe('tRPC Context (context.ts)', () => {
  it('should export Context type and createContext function', async () => {
    const { createContext } = await import('../context');
    expect(createContext).toBeDefined();
    expect(typeof createContext).toBe('function');
  });

  it('should return an empty context object', async () => {
    const { createContext } = await import('../context');
    const ctx = createContext();
    expect(ctx).toEqual({});
  });
});
