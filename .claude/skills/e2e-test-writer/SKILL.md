---
name: e2e-test-writer
description: >
  E2Eテストの記述を支援します。
  「E2Eテストを書いて」「E2Eテストを追加」「テストシナリオを作成」
  「Electron E2E」「Web E2E」「Playwright」「WebdriverIO」などのキーワードで自動実行します。
argument-hint: "[feature-description]"
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# E2E Test Writer

E2Eテスト記述支援Skill。Electron E2E（WebdriverIO）とWeb E2E（Playwright）の両方に対応。

---

## フレームワーク選択

| テスト対象 | フレームワーク | ディレクトリ |
|-----------|--------------|-------------|
| Electronアプリ本体 | WebdriverIO | `electron-sdd-manager/e2e-wdio/` |
| Remote UI（ブラウザ経由） | Playwright | `electron-sdd-manager/e2e-playwright/` |

### 使い分け

**WebdriverIO（Electron E2E）を使う場合**:
- Electronメニュー操作
- IPC通信テスト
- ネイティブダイアログ
- セキュリティ設定確認（contextIsolation, nodeIntegration）

**Playwright（Web E2E）を使う場合**:
- Remote UI固有機能
- WebSocket接続・再接続
- モバイルUI表示
- CI/CDでの軽量テスト

---

## テスト記述フロー

### 1. 既存テストの確認

```bash
# Electron E2E
ls electron-sdd-manager/e2e-wdio/*.spec.ts

# Web E2E
ls electron-sdd-manager/e2e-playwright/*.spec.ts
```

### 2. 関連するステアリングを参照

詳細なガイドラインは以下を参照：
- **Electron E2E**: `.kiro/steering/e2e-testing.md`
- **Web E2E**: `.kiro/steering/web-e2e-testing.md`

### 3. テスト実装

---

## Electron E2E（WebdriverIO）パターン

### 基本構造

```typescript
import path from 'node:path';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

describe('Feature Name', () => {
  // Note: 基本的なアプリ起動・セキュリティ・安定性テストは app-launch.spec.ts に統合

  describe('機能固有のテスト', () => {
    before(async () => {
      // プロジェクト選択（Zustand store経由推奨）
      await browser.execute((projectPath) => {
        const stores = (window as any).__STORES__;
        return stores.project.getState().selectProject(projectPath);
      }, FIXTURE_PROJECT_PATH);
    });

    it('should do something', async () => {
      const element = await $('[data-testid="target-element"]');
      await element.waitForExist({ timeout: 3000 });
      expect(await element.isExisting()).toBe(true);
    });
  });
});
```

### 共通ヘルパー関数

```typescript
import {
  selectProjectViaStore,
  selectSpecViaStore,
  setAutoExecutionPermissions,
  waitForCondition,
  resetAutoExecutionService,
} from './helpers/auto-execution.helpers';
```

| 関数 | 説明 |
|-----|------|
| `selectProjectViaStore(path)` | Store経由でプロジェクト選択（推奨） |
| `selectSpecViaStore(specId)` | Store経由でSpec選択 |
| `setAutoExecutionPermissions(perms)` | 自動実行許可設定 |
| `waitForCondition(fn, timeout, interval, label)` | 条件待機 |

### セレクタリファレンス

主要なdata-testid（詳細は `.kiro/steering/e2e-testing.md` のセレクタリファレンス参照）：

| コンポーネント | data-testid |
|--------------|-------------|
| Specリスト | `spec-list`, `spec-item-{name}` |
| フェーズボタン | `phase-button-{phase}` |
| 自動実行 | `auto-execute-button` |
| レビューパネル | `document-review-panel` |

### Electron APIアクセス

```typescript
// メインプロセスで実行
const isPackaged = await browser.electron.execute((electron) => {
  return electron.app.isPackaged;
});

// Rendererプロセスで実行
const hasAPI = await browser.execute(() => {
  return typeof window.electronAPI !== 'undefined';
});
```

---

## Web E2E（Playwright）パターン

### 基本構造

```typescript
import { test, expect } from '@playwright/test';
import { waitForConnection, waitForSpecList } from './helpers/remote-ui.helpers';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);
  });

  test('should display spec list', async ({ page }) => {
    await waitForSpecList(page);
    const specItems = page.locator('[data-testid^="remote-spec-item-"]');
    await expect(specItems.first()).toBeVisible();
  });
});
```

### モバイルテスト

```typescript
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

test.describe('Smartphone Tests', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test('should show mobile bottom tabs', async ({ page }) => {
    const bottomTabs = page.locator('[data-testid="mobile-bottom-tabs"]');
    await expect(bottomTabs).toBeVisible();
  });
});
```

### セレクタ注意点

Remote UIでは同じ`data-testid`がDesktop/Mobile両方に存在する場合あり。親要素でスコープを絞る：

```typescript
// ❌ 悪い例
const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');

// ✅ 良い例
const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
```

---

## Mock Claude CLI

実際のClaude APIを呼び出さずにワークフローをテスト。

### 対応フェーズ

- `/kiro:spec-requirements`, `/kiro:spec-design`, `/kiro:spec-tasks`, `/kiro:spec-impl`
- `/kiro:validate-gap`, `/kiro:validate-design`, `/kiro:validate-impl`
- `/kiro:document-review`, `/kiro:document-review-reply`

### 生成されるファイル

| フェーズ | 生成ファイル | spec.json更新 |
|---------|------------|---------------|
| requirements | `requirements.md` | `phase: "requirements-generated"` |
| design | `design.md` | `phase: "design-generated"` |
| tasks | `tasks.md` | `phase: "tasks-generated"` |

---

## ベストプラクティス

### DO ✓

- `data-testid`属性でセレクタ指定
- Zustand store経由でプロジェクト/Spec選択
- 共通ヘルパー関数を使用
- `waitForExist`/`waitForCondition`で非同期待機

### DON'T ✗

- UIダイアログやメニューバー経由のプロジェクト選択（不安定）
- `expect(true).toBe(true)` のような意味のないアサーション
- 各ファイルでセキュリティ/安定性テストを重複定義（`app-launch.spec.ts`に統合済み）

---

## テスト実行

```bash
# Electron E2E
npm run build && task electron:test:e2e

# Web E2E
npm run test:web-e2e

# 特定ファイルのみ
npx wdio run wdio.conf.ts --spec e2e-wdio/feature.spec.ts
npx playwright test smoke.spec.ts
```

---

## 参考資料

- **詳細ガイド（Electron）**: `.kiro/steering/e2e-testing.md`
- **詳細ガイド（Web）**: `.kiro/steering/web-e2e-testing.md`
- **テスト一覧・分析**: `docs/memo/e2e-tests-inventory.md`
- **既存テスト**: `electron-sdd-manager/e2e-wdio/`, `electron-sdd-manager/e2e-playwright/`
