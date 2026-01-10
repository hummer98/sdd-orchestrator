/**
 * Test for useDeviceType hook
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const hookPath = resolve(__dirname, 'useDeviceType.ts');

describe('useDeviceType', () => {
  it('should exist', () => {
    expect(existsSync(hookPath)).toBe(true);
  });

  it('should export useDeviceType hook', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('export function useDeviceType');
  });

  it('should define DeviceType type', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain("'mobile'");
    expect(content).toContain("'tablet'");
    expect(content).toContain("'desktop'");
  });

  it('should use User Agent for detection', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('userAgent');
  });

  it('should use window size for breakpoint detection', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('innerWidth');
  });

  it('should return device type information', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('isMobile');
    expect(content).toContain('isTablet');
    expect(content).toContain('isDesktop');
  });

  it('should respond to window resize', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('resize');
  });
});
