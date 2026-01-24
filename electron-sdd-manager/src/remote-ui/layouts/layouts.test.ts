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

/**
 * MobileTabBar Tests - Task 2.2
 *
 * Verifies the 3-tab configuration (Specs/Bugs/Agents) for mobile navigation.
 *
 * Requirements:
 * - 1.1: Display bottom tab bar with three tabs: Specs, Bugs, and Agents
 * - 1.3: Visual indication of active tab with distinct styling
 * - 1.5: Minimum touch target size of 44x44px for each tab
 */
describe('MobileTabBar 3-tab configuration (Task 2.2)', () => {
  const mobilePath = resolve(layoutsDir, 'MobileLayout.tsx');
  let content: string;

  beforeAll(() => {
    content = readFileSync(mobilePath, 'utf-8');
  });

  it('should have TAB_CONFIG with 3 tabs: specs, bugs, agents (Req 1.1)', () => {
    // TAB_CONFIG should contain all 3 tabs
    expect(content).toContain("id: 'specs'");
    expect(content).toContain("id: 'bugs'");
    expect(content).toContain("id: 'agents'");
    // Verify labels
    expect(content).toContain("label: 'Specs'");
    expect(content).toContain("label: 'Bugs'");
    expect(content).toContain("label: 'Agents'");
  });

  it('should use Lucide icons for each tab (consistent with project)', () => {
    // Verify Lucide icons are imported
    expect(content).toContain("from 'lucide-react'");
    // Verify FileText icon for specs
    expect(content).toContain('FileText');
    // Verify Bug icon for bugs
    expect(content).toContain('Bug');
    // Verify Bot icon for agents
    expect(content).toContain('Bot');
  });

  it('should have visual highlighting for active tab (Req 1.3)', () => {
    // Active tab should have distinct color (blue for active)
    expect(content).toContain('text-blue-600');
    expect(content).toContain('dark:text-blue-400');
    // Inactive tab should have muted color
    expect(content).toContain('text-gray-500');
    expect(content).toContain('dark:text-gray-400');
  });

  it('should ensure 44x44px touch target size (Req 1.5)', () => {
    // touch-target class or explicit min-h-[44px] min-w-[44px]
    expect(content).toContain('touch-target');
  });

  it('should render all 3 tabs using TAB_CONFIG.map', () => {
    // Verify TAB_CONFIG is mapped to render tabs
    expect(content).toContain('TAB_CONFIG.map');
  });

  it('should have data-testid for each tab for E2E testing', () => {
    // Each tab should have data-testid="remote-tab-{id}" pattern
    expect(content).toContain('data-testid={`remote-tab-${tab.id}`}');
  });
});

/**
 * Barrel Export Tests - Task 10.1
 *
 * Verifies that index.ts exports all necessary MobileLayout-related types and constants.
 *
 * Requirements:
 * - 1.4: Support for showTabBar prop in MobileLayout (requires MobileLayoutProps export)
 * - Task 2.2/2.3: TAB_CONFIG for 3-tab configuration
 */
describe('layouts/index.ts barrel exports (Task 10.1)', () => {
  const indexPath = resolve(layoutsDir, 'index.ts');
  let content: string;

  beforeAll(() => {
    content = readFileSync(indexPath, 'utf-8');
  });

  it('should export MobileLayout component', () => {
    expect(content).toContain('MobileLayout');
  });

  it('should export MobileTab type', () => {
    expect(content).toContain('MobileTab');
  });

  it('should export TAB_CONFIG for tab configuration access (Req 1.4, Task 2.2)', () => {
    // TAB_CONFIG should be exported for external consumers
    // who need to know the tab structure (e.g., for navigation logic)
    expect(content).toContain('TAB_CONFIG');
  });

  it('should export MobileLayoutProps type for consumers (Req 1.4)', () => {
    // MobileLayoutProps should be exported so consumers can
    // properly type their MobileLayout usage with showTabBar prop
    expect(content).toContain('MobileLayoutProps');
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
    // footer slot is used for Agent log panel (changed from 'logPanel' to 'footer' prop)
    expect(content).toContain('footer');
    expect(content).toContain('Agent Logs');
  });

  it('should support multi-pane layout', () => {
    const content = readFileSync(desktopPath, 'utf-8');
    expect(content).toContain('flex');
    expect(content).toContain('min-w-0');
  });
});
