/**
 * Test for views barrel exports
 *
 * Task 10.2: remote-ui/views/index.tsを更新する
 * - 新規コンポーネント（SpecDetailPage、BugDetailPage、AgentsTabView、AgentDetailDrawer、SubTabBar）のエクスポート追加
 * - Requirements: 3.1, 4.1, 5.1, 6.1
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const viewsDir = __dirname;

/**
 * Barrel Export Tests - Task 10.2
 *
 * Verifies that views/index.ts re-exports all necessary mobile components
 * from components/ for convenient import paths.
 *
 * These components are implemented in remote-ui/components/ and should be
 * re-exported from views/index.ts for consumers who prefer importing from views.
 *
 * Requirements:
 * - 3.1: SpecDetailPage下部にサブタブ (SubTabBar)
 * - 4.1: BugDetailPage下部にサブタブ (SubTabBar)
 * - 5.1: Agentsタブに一覧表示 (AgentsTabView)
 * - 6.1: Drawer下からスライドアップ (AgentDetailDrawer)
 */
describe('views/index.ts barrel exports (Task 10.2)', () => {
  const indexPath = resolve(viewsDir, 'index.ts');
  let content: string;

  beforeAll(() => {
    content = readFileSync(indexPath, 'utf-8');
  });

  describe('SpecDetailPage exports (Req 3.1)', () => {
    it('should export SpecDetailPage component', () => {
      expect(content).toContain('SpecDetailPage');
    });

    it('should export SpecDetailPageProps type', () => {
      expect(content).toContain('SpecDetailPageProps');
    });

    it('should export SpecSubTab type for sub-tab navigation', () => {
      expect(content).toContain('SpecSubTab');
    });
  });

  describe('BugDetailPage exports (Req 4.1)', () => {
    it('should export BugDetailPage component', () => {
      expect(content).toContain('BugDetailPage');
    });

    it('should export BugDetailPageProps type', () => {
      expect(content).toContain('BugDetailPageProps');
    });

    it('should export BugSubTab type for sub-tab navigation', () => {
      expect(content).toContain('BugSubTab');
    });
  });

  describe('AgentsTabView exports (Req 5.1)', () => {
    it('should export AgentsTabView component', () => {
      expect(content).toContain('AgentsTabView');
    });

    it('should export AgentsTabViewProps type', () => {
      expect(content).toContain('AgentsTabViewProps');
    });
  });

  describe('AgentDetailDrawer exports (Req 6.1)', () => {
    it('should export AgentDetailDrawer component', () => {
      expect(content).toContain('AgentDetailDrawer');
    });

    it('should export AgentDetailDrawerProps type', () => {
      expect(content).toContain('AgentDetailDrawerProps');
    });
  });

  describe('SubTabBar exports (Req 3.1, 4.1)', () => {
    it('should export SubTabBar component', () => {
      expect(content).toContain('SubTabBar');
    });

    it('should export SubTabBarProps type', () => {
      expect(content).toContain('SubTabBarProps');
    });
  });

  describe('Re-export from components/', () => {
    it('should re-export from components index', () => {
      // The exports should come from the components directory
      expect(content).toContain("from '../components'");
    });
  });
});
