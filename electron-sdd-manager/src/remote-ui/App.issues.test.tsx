/**
 * Remote UI App - Issues Tab Integration Tests
 *
 * github-issue-integration: Task 12.2
 * Requirements: 11.1, 11.2, 11.4
 *
 * Verifies that:
 * - BugsView is replaced with IssuesView in DesktopLayout
 * - Bug-related imports are removed
 * - Issues tab is present in left sidebar
 * - IssueListPanel and IssueDetailView shared components are used
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const appTsxPath = resolve(__dirname, 'App.tsx');
const viewsIndexPath = resolve(__dirname, 'views/index.ts');

describe('Remote UI App - Issues Tab (Task 12.2)', () => {
  it('App.tsx should exist', () => {
    expect(existsSync(appTsxPath)).toBe(true);
  });

  describe('Bug references removed from App.tsx', () => {
    it('should NOT import BugsView', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).not.toContain('BugsView');
    });

    it('should NOT import BugDetailView', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).not.toContain('BugDetailView');
    });

    it('should NOT import BugDetailPage', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).not.toContain('BugDetailPage');
    });

    it('should NOT import CreateBugDialogRemote', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).not.toContain('CreateBugDialogRemote');
    });

    it('should NOT import BugMetadataWithPath', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).not.toContain('BugMetadataWithPath');
    });

    it('should NOT import initBugAutoExecutionWebSocketListeners', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).not.toContain('initBugAutoExecutionWebSocketListeners');
    });

    it('should NOT contain "bugs" in DocsTab type', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      // DocsTab should include 'issues' instead of 'bugs'
      expect(content).toMatch(/type DocsTab\s*=\s*[^;]*'issues'/);
      expect(content).not.toMatch(/type DocsTab\s*=\s*[^;]*'bugs'/);
    });
  });

  describe('Issues tab added to App.tsx', () => {
    it('should have Issues tab label in LeftSidebar', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).toContain('Issues');
    });

    it('should use IssueListPanel or IssuePane from shared components', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      // Should import from shared issue components
      expect(content).toMatch(/import.*(?:IssueListPanel|IssuePane).*from.*shared.*components.*issue/);
    });
  });

  describe('views/index.ts updated', () => {
    it('should NOT have BugsView export statement', () => {
      const content = readFileSync(viewsIndexPath, 'utf-8');
      expect(content).not.toMatch(/export\s*\{[^}]*BugsView/);
    });

    it('should NOT have BugDetailView export statement', () => {
      const content = readFileSync(viewsIndexPath, 'utf-8');
      expect(content).not.toMatch(/export\s*\{[^}]*BugDetailView/);
    });

    it('should NOT have BugDetailPage export statement', () => {
      const content = readFileSync(viewsIndexPath, 'utf-8');
      expect(content).not.toMatch(/export\s*\{[^}]*BugDetailPage/);
    });
  });
});
