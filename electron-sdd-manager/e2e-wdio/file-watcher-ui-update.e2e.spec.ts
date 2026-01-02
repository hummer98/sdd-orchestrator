/**
 * File Watcher UI Update E2E Test
 *
 * ファイル監視（onSpecsChanged）経由でのUI自動更新を検証するテスト
 *
 * 重要: このテストではrefreshSpecStore()を使用せず、
 * ファイル監視による自動UI更新のみに依存する
 *
 * バグ: e2e-file-watcher-test-bypass
 * 既存のE2EテストではrefreshSpecStore()で手動リフレッシュしており、
 * ファイル監視→自動UI更新の動作が検証されていなかった
 */

import * as path from 'path';
import * as fs from 'fs';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');
const SPEC_NAME = 'simple-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

/**
 * Fixtureを初期状態にリセット
 */
function resetFixture(): void {
  const initialSpecJson = {
    feature_name: 'simple-feature',
    name: 'simple-feature',
    description: 'E2Eテスト用のシンプルな機能',
    phase: 'initialized',
    language: 'ja',
    approvals: {
      requirements: { generated: false, approved: false },
      design: { generated: false, approved: false },
      tasks: { generated: false, approved: false },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(initialSpecJson, null, 2)
  );

  const initialRequirements = `# Requirements Document

## Project Description (Input)
E2Eテスト用のシンプルな機能を実装します。

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->

`;
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), initialRequirements);

  // tasks.mdの初期化
  const initialTasks = `# Implementation Tasks

## Overview
<!-- Will be generated in /kiro:spec-tasks phase -->

## Tasks
<!-- Tasks will be listed here -->

`;
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), initialTasks);

  // runtime/agents ディレクトリをクリーンアップ
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const files = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(RUNTIME_AGENTS_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // logs ディレクトリをクリーンアップ
  const logsDir = path.join(SPEC_DIR, 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Helper: Select project using Zustand store action
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.projectStore?.getState) {
          await stores.projectStore.getState().selectProject(projPath);
          done(true);
        } else {
          console.error('[E2E] __STORES__ not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done(false);
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Select spec using Zustand specStore action
 */
async function selectSpecViaStore(specId: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.specStore?.getState) {
          const specStore = stores.specStore.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            specStore.selectSpec(spec);
            done(true);
          } else {
            console.error('[E2E] Spec not found:', id);
            done(false);
          }
        } else {
          console.error('[E2E] specStore not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectSpec error:', e);
        done(false);
      }
    }, specId).then(resolve);
  });
}

/**
 * Helper: Get spec detail from store (specStore)
 * Note: This gets specStore.specDetail which may differ from editorStore.content
 */
async function getSpecDetail(): Promise<{
  requirements: string | null;
  specJsonPhase: string | null;
}> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.specStore?.getState) {
        return { requirements: null, specJsonPhase: null };
      }
      const specDetail = stores.specStore.getState().specDetail;
      if (!specDetail) {
        return { requirements: null, specJsonPhase: null };
      }
      return {
        requirements: specDetail.artifacts?.requirements?.content || null,
        specJsonPhase: specDetail.specJson?.phase || null,
      };
    } catch (e) {
      return { requirements: null, specJsonPhase: null };
    }
  });
}

/**
 * Helper: Get editor content from editorStore (actual UI display)
 * This is what the user actually sees in the ArtifactEditor
 * BUG: editorStore.content is NOT updated when specStore.specDetail.artifacts changes
 */
async function getEditorContent(): Promise<{
  content: string | null;
  activeTab: string | null;
}> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.editorStore?.getState) {
        return { content: null, activeTab: null };
      }
      const state = stores.editorStore.getState();
      return {
        content: state.content || null,
        activeTab: state.activeTab || null,
      };
    } catch (e) {
      return { content: null, activeTab: null };
    }
  });
}

/**
 * Helper: Check if file watcher is active
 */
async function isFileWatcherActive(): Promise<boolean> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.specStore?.getState) return false;
      return stores.specStore.getState().isWatching === true;
    } catch {
      return false;
    }
  });
}

/**
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500,
  debugLabel: string = 'condition'
): Promise<boolean> {
  const startTime = Date.now();
  let iteration = 0;
  while (Date.now() - startTime < timeout) {
    iteration++;
    const result = await condition();
    if (result) {
      console.log(`[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`);
      return true;
    }
    if (iteration % 4 === 0) {
      console.log(`[E2E] ${debugLabel} iteration ${iteration}: waiting...`);
    }
    await browser.pause(interval);
  }
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations`);
  return false;
}

describe('File Watcher UI Update', () => {
  beforeEach(async () => {
    resetFixture();
    await browser.pause(500);
  });

  afterEach(async () => {
    resetFixture();
  });

  describe('File Watcher Registration', () => {
    it('should have file watcher active after project selection', async () => {
      // プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // ファイル監視がアクティブか確認
      const isWatching = await isFileWatcherActive();
      expect(isWatching).toBe(true);
    });
  });

  describe('Automatic UI Update via File Watcher (NO refreshSpecStore)', () => {
    it('should update requirements.md content in UI when file changes without manual refresh', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択
      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // 3. 初期状態を確認
      const initialDetail = await getSpecDetail();
      console.log('[E2E] Initial requirements content length:', initialDetail.requirements?.length || 0);
      expect(initialDetail.requirements).not.toBeNull();
      expect(initialDetail.requirements).toContain('Will be generated');

      // 4. ファイルを直接更新（mock_claude.shがやることをシミュレート）
      const newRequirementsContent = `# Requirements Document

## Project Description (Input)
E2Eテスト用のシンプルな機能を実装します。

## Requirements

### REQ-001: ファイル監視テスト要件
**When** ファイルが更新されたとき
**Then** UIが自動的に更新される

### REQ-002: 手動リフレッシュ不要
**The system shall** ファイル監視経由で自動的にUIを更新する

---
Generated by File Watcher Test
`;
      fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), newRequirementsContent);
      console.log('[E2E] requirements.md updated directly');

      // 5. refreshSpecStore()を呼ばずに、ファイル監視による自動更新を待つ
      // chokidar: awaitWriteFinish 200ms + debounce 300ms = 約500ms
      // 余裕を持って最大10秒待機
      const updated = await waitForCondition(async () => {
        const detail = await getSpecDetail();
        const hasNewContent = detail.requirements?.includes('REQ-001: ファイル監視テスト要件') ?? false;
        if (!hasNewContent) {
          console.log('[E2E] Waiting for UI update... current content includes REQ-001:', hasNewContent);
        }
        return hasNewContent;
      }, 10000, 500, 'requirements-ui-update');

      // 6. 結果を検証
      const finalDetail = await getSpecDetail();
      console.log('[E2E] Final requirements content (first 200 chars):', finalDetail.requirements?.substring(0, 200));

      // このテストはファイル監視が正しく動作していれば成功する
      // 失敗した場合、ファイル監視→UI更新のパイプラインに問題がある
      expect(updated).toBe(true);
      expect(finalDetail.requirements).toContain('REQ-001: ファイル監視テスト要件');
      expect(finalDetail.requirements).toContain('Generated by File Watcher Test');
    });

    it('should update spec.json phase in UI when file changes without manual refresh', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択
      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // 3. 初期状態を確認
      const initialDetail = await getSpecDetail();
      expect(initialDetail.specJsonPhase).toBe('initialized');

      // 4. spec.jsonを直接更新
      const specJsonPath = path.join(SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      specJson.phase = 'requirements-generated';
      specJson.approvals.requirements.generated = true;
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
      console.log('[E2E] spec.json updated directly');

      // 5. ファイル監視による自動更新を待つ
      const updated = await waitForCondition(async () => {
        const detail = await getSpecDetail();
        return detail.specJsonPhase === 'requirements-generated';
      }, 10000, 500, 'spec-json-ui-update');

      // 6. 結果を検証
      const finalDetail = await getSpecDetail();
      console.log('[E2E] Final phase:', finalDetail.specJsonPhase);

      expect(updated).toBe(true);
      expect(finalDetail.specJsonPhase).toBe('requirements-generated');
    });
  });

  /**
   * CRITICAL TEST: Editor Content Update
   *
   * This test verifies that the ACTUAL UI (editorStore.content) is updated
   * when files change, not just specStore.specDetail.
   *
   * Bug discovered: specStore is updated via file watcher, but editorStore
   * is NOT updated - user sees stale content in the editor.
   */
  describe('Editor Content Update (Actual UI Display)', () => {
    it('should update editorStore.content when requirements.md changes (EXPECTED TO FAIL)', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択（これによりeditorStoreにartifactがロードされる）
      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(1000); // エディタがロードされるまで待機

      // 3. 初期状態を確認 - editorStore（実際のUI表示）
      const initialEditor = await getEditorContent();
      console.log('[E2E] Initial editor activeTab:', initialEditor.activeTab);
      console.log('[E2E] Initial editor content length:', initialEditor.content?.length || 0);
      console.log('[E2E] Initial editor content (first 100 chars):', initialEditor.content?.substring(0, 100));

      // requirementsタブが選択されていることを確認
      // Note: デフォルトでrequirementsが選択されていない場合がある
      if (initialEditor.activeTab !== 'requirements') {
        console.log('[E2E] Switching to requirements tab');
        await browser.execute(() => {
          const stores = (window as any).__STORES__;
          if (stores?.editorStore?.getState) {
            stores.editorStore.getState().setActiveTab('requirements');
          }
        });
        await browser.pause(500);
      }

      // Fixtureがリセットされた後なので、初期コンテンツを確認
      // （前のテストの影響でファイルが更新されている場合がある）
      const beforeUpdate = await getEditorContent();
      console.log('[E2E] Before update - editor content includes "Will be generated":',
        beforeUpdate.content?.includes('Will be generated') ?? false);
      console.log('[E2E] Before update - editor content (first 150 chars):',
        beforeUpdate.content?.substring(0, 150));

      // 初期状態の検証はスキップ - fixtureリセットとeditorStoreの同期タイミングの問題
      // 重要なのは、ファイル更新後にeditorStoreが更新されるかどうか

      // 4. ファイルを直接更新
      const newRequirementsContent = `# Requirements Document

## Project Description (Input)
E2Eテスト用のシンプルな機能を実装します。

## Requirements

### REQ-EDITOR-001: エディタ更新テスト
**When** requirements.mdが更新されたとき
**Then** editorStore.contentも自動的に更新される

---
Generated by Editor Update Test
`;
      fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), newRequirementsContent);
      console.log('[E2E] requirements.md updated directly');

      // 5. specStoreが更新されるのを確認（これは成功するはず）
      const specStoreUpdated = await waitForCondition(async () => {
        const detail = await getSpecDetail();
        return detail.requirements?.includes('REQ-EDITOR-001') ?? false;
      }, 10000, 500, 'specStore-update');
      console.log('[E2E] specStore updated:', specStoreUpdated);

      // 6. editorStore（実際のUI表示）が更新されるか確認
      // BUG: これは失敗するはず - editorStoreはファイル監視で更新されない
      const editorUpdated = await waitForCondition(async () => {
        const editor = await getEditorContent();
        const hasNewContent = editor.content?.includes('REQ-EDITOR-001') ?? false;
        if (!hasNewContent) {
          console.log('[E2E] Waiting for editor update... content includes REQ-EDITOR-001:', hasNewContent);
        }
        return hasNewContent;
      }, 10000, 500, 'editorStore-update');

      // 7. 結果を検証
      const finalEditor = await getEditorContent();
      const finalSpecDetail = await getSpecDetail();

      console.log('[E2E] Final specStore requirements includes REQ-EDITOR-001:',
        finalSpecDetail.requirements?.includes('REQ-EDITOR-001') ?? false);
      console.log('[E2E] Final editorStore content includes REQ-EDITOR-001:',
        finalEditor.content?.includes('REQ-EDITOR-001') ?? false);

      // specStoreは更新されているはず
      expect(specStoreUpdated).toBe(true);
      expect(finalSpecDetail.requirements).toContain('REQ-EDITOR-001');

      // editorStoreも更新されているべき（これが失敗するとバグ確定）
      expect(editorUpdated).toBe(true);
      expect(finalEditor.content).toContain('REQ-EDITOR-001');
    });

    /**
     * tasks.md更新時のeditorStore同期テスト
     * Bug: tasks-md-editor-update-test
     */
    it('should update editorStore.content when tasks.md changes', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択
      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(1000);

      // 3. tasksタブに切り替え
      await browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (stores?.editorStore?.getState) {
          stores.editorStore.getState().setActiveTab('tasks');
        }
      });
      await browser.pause(500);

      // 4. 初期状態を確認
      const initialEditor = await getEditorContent();
      console.log('[E2E] Initial editor activeTab:', initialEditor.activeTab);
      console.log('[E2E] Initial editor content length:', initialEditor.content?.length || 0);
      expect(initialEditor.activeTab).toBe('tasks');

      // 5. tasks.mdを直接更新（implプロセス中のタスク完了をシミュレート）
      const newTasksContent = `# Implementation Tasks

## Overview
タスク実装の進捗を管理します。

## Tasks

### TASK-001: 基本機能の実装
- [x] 完了済みタスク
- [ ] 未完了タスク

### TASK-002: テストの追加
- [ ] ユニットテスト
- [ ] E2Eテスト

---
Generated by Tasks Update Test
`;
      fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), newTasksContent);
      console.log('[E2E] tasks.md updated directly');

      // 6. editorStore（実際のUI表示）が更新されるか確認
      const editorUpdated = await waitForCondition(async () => {
        const editor = await getEditorContent();
        const hasNewContent = editor.content?.includes('TASK-001') ?? false;
        if (!hasNewContent) {
          console.log('[E2E] Waiting for editor update... content includes TASK-001:', hasNewContent);
        }
        return hasNewContent;
      }, 10000, 500, 'tasks-editorStore-update');

      // 7. 結果を検証
      const finalEditor = await getEditorContent();
      console.log('[E2E] Final editorStore content includes TASK-001:',
        finalEditor.content?.includes('TASK-001') ?? false);

      expect(editorUpdated).toBe(true);
      expect(finalEditor.content).toContain('TASK-001');
      expect(finalEditor.content).toContain('Generated by Tasks Update Test');
    });
  });
});
