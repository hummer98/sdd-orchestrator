/**
 * Test for layout components
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const layoutsDir = __dirname;

describe('MobileLayout', () => {
  const mobilePath = resolve(layoutsDir, 'MobileLayout.tsx');

  it('should exist', () => {
    expect(existsSync(mobilePath)).toBe(true);
  });

  it('should export MobileLayout component', () => {
    const content = readFileSync(mobilePath, 'utf-8');
    expect(content).toContain('export function MobileLayout');
  });

  it('should have tab-based navigation', () => {
    const content = readFileSync(mobilePath, 'utf-8');
    expect(content).toContain('MobileTabBar');
  });

  it('should use touch-target class for touch optimization', () => {
    const content = readFileSync(mobilePath, 'utf-8');
    expect(content).toContain('touch-target');
  });

  it('should have vertical scrolling layout', () => {
    const content = readFileSync(mobilePath, 'utf-8');
    expect(content).toContain('overflow-y-auto');
  });
});

describe('DesktopLayout', () => {
  const desktopPath = resolve(layoutsDir, 'DesktopLayout.tsx');

  it('should exist', () => {
    expect(existsSync(desktopPath)).toBe(true);
  });

  it('should export DesktopLayout component', () => {
    const content = readFileSync(desktopPath, 'utf-8');
    expect(content).toContain('export function DesktopLayout');
  });

  it('should have sidebar support', () => {
    const content = readFileSync(desktopPath, 'utf-8');
    expect(content).toContain('sidebar');
  });

  it('should have log panel support', () => {
    const content = readFileSync(desktopPath, 'utf-8');
    expect(content).toContain('logPanel');
  });

  it('should support multi-pane layout', () => {
    const content = readFileSync(desktopPath, 'utf-8');
    expect(content).toContain('flex');
    expect(content).toContain('min-w-0');
  });
});
