/**
 * Test for shared directory structure
 * Validates that the shared directory is correctly structured
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

const sharedDir = resolve(__dirname, '.');

describe('shared directory structure', () => {
  it('should have components directory', () => {
    expect(existsSync(resolve(sharedDir, 'components'))).toBe(true);
  });

  it('should have stores directory', () => {
    expect(existsSync(resolve(sharedDir, 'stores'))).toBe(true);
  });

  it('should have hooks directory', () => {
    expect(existsSync(resolve(sharedDir, 'hooks'))).toBe(true);
  });

  it('should have api directory', () => {
    expect(existsSync(resolve(sharedDir, 'api'))).toBe(true);
  });

  it('should have types directory', () => {
    expect(existsSync(resolve(sharedDir, 'types'))).toBe(true);
  });

  it('should have providers directory', () => {
    expect(existsSync(resolve(sharedDir, 'providers'))).toBe(true);
  });

  it('should have barrel export (index.ts)', () => {
    expect(existsSync(resolve(sharedDir, 'index.ts'))).toBe(true);
  });

  it('should have components barrel export', () => {
    expect(existsSync(resolve(sharedDir, 'components/index.ts'))).toBe(true);
  });
});
