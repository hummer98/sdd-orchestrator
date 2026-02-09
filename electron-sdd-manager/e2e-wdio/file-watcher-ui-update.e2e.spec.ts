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
 *
 * UI操作ベース検証: store直接チェックをUI要素テキストで検証に変更
 */

import * as path from 'path';
import * as fs from 'fs';
import { ensureProjectSelected, selectSpecViaUI } from './helpers/auto-execution.helpers';

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
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 15000,
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

/**
 * Helper: Get text content of the ArtifactEditor (MDEditor) via DOM
 * This reads what the user actually sees in the editor UI.
 */
async function getEditorTextFromDOM(): Promise<string> {
  return browser.execute(() => {
    // MDEditor renders a textarea for edit mode
    const textarea = document.querySelector('[data-testid="artifact-editor"] textarea');
    if (textarea) {
      return (textarea as HTMLTextAreaElement).value || '';
    }
    // Fallback: preview mode renders markdown content
    const preview = document.querySelector('[data-testid="artifact-editor"] .wmde-markdown');
    if (preview) {
      return preview.textContent || '';
    }
    return '';
  });
}

/**
 * Helper: Get the phase badge text for a specific spec item in the spec list
 */
async function getSpecPhaseBadgeText(specName: string): Promise<string> {
  return browser.execute((name: string) => {
    const specItem = document.querySelector(`[data-testid="spec-item-${name}"]`);
    if (!specItem) return '';
    const badge = specItem.querySelector('[data-testid="phase-badge"]');
    return badge?.textContent || '';
  }, specName);
}

/**
 * Helper: Get the active tab name from ArtifactEditor
 */
async function getActiveTabFromDOM(): Promise<string> {
  return browser.execute(() => {
    const activeTab = document.querySelector('[data-testid="artifact-editor"] [role="tab"][aria-selected="true"]');
    return activeTab?.textContent?.trim() || '';
  });
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
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // ファイル監視がアクティブか確認（storeチェック: セットアップ検証なので許容）
      const isWatching = await browser.execute(() => {
        try {
          const stores = (window as any).__STORES__;
          if (!stores?.spec?.getState) return false;
          return stores.spec.getState().isWatching === true;
        } catch {
          return false;
        }
      });
      expect(isWatching).toBe(true);
    });
  });

  describe('Automatic UI Update via File Watcher (NO refreshSpecStore)', () => {
    it('should update requirements.md content in UI when file changes without manual refresh', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択
      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(1000);

      // 3. 初期状態を確認 - エディタのDOM内容で検証
      const initialEditorText = await getEditorTextFromDOM();
      console.log('[E2E] Initial editor text length:', initialEditorText.length);
      expect(initialEditorText).toContain('Will be generated');

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
      // 余裕を持って最大15秒待機
      const updated = await waitForCondition(async () => {
        const editorText = await getEditorTextFromDOM();
        const hasNewContent = editorText.includes('REQ-001');
        if (!hasNewContent) {
          console.log('[E2E] Waiting for UI update... editor text includes REQ-001:', hasNewContent);
        }
        return hasNewContent;
      }, 15000, 500, 'requirements-ui-update');

      // 6. 結果を検証 - UI要素のテキストで検証
      const finalEditorText = await getEditorTextFromDOM();
      console.log('[E2E] Final editor text (first 200 chars):', finalEditorText.substring(0, 200));

      expect(updated).toBe(true);
      expect(finalEditorText).toContain('REQ-001');
      expect(finalEditorText).toContain('Generated by File Watcher Test');
    });

    it('should update spec.json phase in UI when file changes without manual refresh', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択
      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // 3. 初期状態を確認 - spec-listのphase-badgeで検証
      const initialPhaseBadge = await getSpecPhaseBadgeText(SPEC_NAME);
      console.log('[E2E] Initial phase badge text:', initialPhaseBadge);
      // 'initialized' -> '初期化'
      expect(initialPhaseBadge).toBe('初期化');

      // 4. spec.jsonを直接更新
      const specJsonPath = path.join(SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      specJson.phase = 'requirements-generated';
      specJson.approvals.requirements.generated = true;
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
      console.log('[E2E] spec.json updated directly');

      // 5. ファイル監視による自動更新を待つ - UI要素で確認
      // 'requirements-generated' -> '要件定義済'
      const updated = await waitForCondition(async () => {
        const badgeText = await getSpecPhaseBadgeText(SPEC_NAME);
        return badgeText === '要件定義済';
      }, 15000, 500, 'spec-json-ui-update');

      // 6. 結果を検証 - phase-badgeのテキストで検証
      const finalPhaseBadge = await getSpecPhaseBadgeText(SPEC_NAME);
      console.log('[E2E] Final phase badge text:', finalPhaseBadge);

      expect(updated).toBe(true);
      expect(finalPhaseBadge).toBe('要件定義済');
    });
  });

  /**
   * CRITICAL TEST: Editor Content Update
   *
   * This test verifies that the ACTUAL UI (editor DOM content) is updated
   * when files change, not just specStore.specDetail.
   *
   * Bug discovered: specStore is updated via file watcher, but editorStore
   * is NOT updated - user sees stale content in the editor.
   */
  describe('Editor Content Update (Actual UI Display)', () => {
    it('should update editor content in DOM when requirements.md changes (EXPECTED TO FAIL)', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択（これによりeditorにartifactがロードされる）
      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(1000); // エディタがロードされるまで待機

      // 3. requirementsタブが選択されていることを確認
      // Note: デフォルトでrequirementsが選択されていない場合がある
      const activeTab = await getActiveTabFromDOM();
      console.log('[E2E] Active tab:', activeTab);
      if (!activeTab.includes('requirements') && !activeTab.includes('要件')) {
        console.log('[E2E] Switching to requirements tab via UI click');
        const reqTab = await $('[data-testid="artifact-editor-tab-requirements"]');
        if (await reqTab.isExisting()) {
          await reqTab.click();
          await browser.pause(500);
        }
      }

      // 4. ファイルを直接更新
      const newRequirementsContent = `# Requirements Document

## Project Description (Input)
E2Eテスト用のシンプルな機能を実装します。

## Requirements

### REQ-EDITOR-001: エディタ更新テスト
**When** requirements.mdが更新されたとき
**Then** エディタの表示内容も自動的に更新される

---
Generated by Editor Update Test
`;
      fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), newRequirementsContent);
      console.log('[E2E] requirements.md updated directly');

      // 5. エディタのDOM内容が更新されるか確認
      const editorUpdated = await waitForCondition(async () => {
        const editorText = await getEditorTextFromDOM();
        const hasNewContent = editorText.includes('REQ-EDITOR-001');
        if (!hasNewContent) {
          console.log('[E2E] Waiting for editor DOM update... includes REQ-EDITOR-001:', hasNewContent);
        }
        return hasNewContent;
      }, 15000, 500, 'editor-dom-update');

      // 6. 結果を検証 - DOM内容で検証
      const finalEditorText = await getEditorTextFromDOM();
      console.log('[E2E] Final editor DOM content includes REQ-EDITOR-001:',
        finalEditorText.includes('REQ-EDITOR-001'));

      expect(editorUpdated).toBe(true);
      expect(finalEditorText).toContain('REQ-EDITOR-001');
    });

    /**
     * tasks.md更新時のエディタDOM同期テスト
     * Bug: tasks-md-editor-update-test
     */
    it('should update editor content in DOM when tasks.md changes', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);

      // 2. Spec選択
      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(1000);

      // 3. tasksタブに切り替え（UIクリックで）
      const tasksTab = await $('[data-testid="artifact-editor-tab-tasks"]');
      if (await tasksTab.isExisting()) {
        await tasksTab.click();
        await browser.pause(500);
      }

      // 4. 初期状態を確認 - DOM内容で検証
      const initialEditorText = await getEditorTextFromDOM();
      console.log('[E2E] Initial editor text length:', initialEditorText.length);

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

      // 6. エディタのDOM内容が更新されるか確認
      const editorUpdated = await waitForCondition(async () => {
        const editorText = await getEditorTextFromDOM();
        const hasNewContent = editorText.includes('TASK-001');
        if (!hasNewContent) {
          console.log('[E2E] Waiting for editor DOM update... includes TASK-001:', hasNewContent);
        }
        return hasNewContent;
      }, 15000, 500, 'tasks-editor-dom-update');

      // 7. 結果を検証 - DOM内容で検証
      const finalEditorText = await getEditorTextFromDOM();
      console.log('[E2E] Final editor DOM content includes TASK-001:',
        finalEditorText.includes('TASK-001'));

      expect(editorUpdated).toBe(true);
      expect(finalEditorText).toContain('TASK-001');
      expect(finalEditorText).toContain('Generated by Tasks Update Test');
    });
  });
});
