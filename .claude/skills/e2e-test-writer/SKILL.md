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

## テスト設計原則

E2Eテストは**ユーザーが実際に行う操作とその結果を検証する**テスト。

### E2Eテストで行うこと

- UI要素の操作（クリック、テキスト入力、スクロール）
- UI要素の検証（表示されている、テキストが正しい、無効化されている）
- ユーザーフローの通し検証（Spec選択 → フェーズ実行 → 結果表示）

### E2Eテストで行わないこと

- API存在確認（`typeof window.electronAPI.xxx === 'function'`）→ integration test
- API直接呼び出し（`window.electronAPI.xxx()`, `window.__TRPC__.xxx.query()`）→ integration test
- 内部ステートの直接検証を主アサーションにする → デバッグ用途のみ

### セットアップとアサーションの区別

- **セットアップ**: プログラマティックな手段OK（環境変数、fixture、store setState）
- **アサーション**: **UI要素の状態のみ**（表示、テキスト、有効/無効）

---

## フレームワーク選択

| テスト対象 | フレームワーク | ディレクトリ |
|-----------|--------------|-------------|
| Electronアプリ本体 | WebdriverIO | `electron-sdd-manager/e2e-wdio/` |
| Remote UI（ブラウザ経由） | Playwright | `electron-sdd-manager/e2e-playwright/` |

### 使い分け

**WebdriverIO（Electron E2E）を使う場合**:
- Electronメニュー操作
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
import { selectSpecViaUI } from './helpers/auto-execution.helpers';

describe('Feature Name', () => {
  describe('ユーザーフローのテスト', () => {
    before(async () => {
      // プロジェクト選択は SDD_PROJECT_PATH 環境変数で行う（wdio.conf.ts設定済み）
      // Spec選択はUIクリックで行う
      await selectSpecViaUI('test-feature');
    });

    it('should show workflow view after selecting a spec', async () => {
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
      expect(await workflowView.isExisting()).toBe(true);
    });

    it('should display phase buttons', async () => {
      const reqButton = await $('[data-testid="phase-button-requirements"]');
      expect(await reqButton.isExisting()).toBe(true);
      expect(await reqButton.getText()).toContain('Requirements');
    });
  });
});
```

### 共通ヘルパー関数

```typescript
import {
  selectSpecViaUI,
  ensureProjectSelected,
  setAutoExecutionPermissions,
  waitForCondition,
} from './helpers/auto-execution.helpers';
```

| 関数 | 説明 |
|-----|------|
| `ensureProjectSelected(path)` | プロジェクトが選択済みか確認（セットアップ用） |
| `selectSpecViaUI(specName)` | **推奨** - UIクリックでSpec選択 |
| `setAutoExecutionPermissions(perms)` | 自動実行許可設定（セットアップ用） |
| `waitForCondition(fn, timeout, interval, label)` | 条件待機 |

**非推奨**:
| 関数 | 理由 |
|-----|------|
| `selectProjectViaStore(path)` | deprecated - `SDD_PROJECT_PATH` 環境変数を使用 |
| `selectSpecViaStore(specId)` | tRPC IPC完了しない問題あり - `selectSpecViaUI` を使用 |

### Electron固有の検証

```typescript
// セキュリティ設定（browser.electron.execute経由 - これはE2Eとして妥当）
const contextIsolation = await browser.electron.execute((electron) => {
  return electron.BrowserWindow.getAllWindows()[0]?.webContents
    ?.getLastWebPreferences?.()?.contextIsolation;
});
expect(contextIsolation).toBe(true);
```

### セレクタリファレンス

主要なdata-testid（詳細は `.kiro/steering/e2e-testing.md` のセレクタリファレンス参照）：

| コンポーネント | data-testid |
|--------------|-------------|
| Specリスト | `spec-list`, `spec-item-{name}` |
| フェーズボタン | `phase-button-{phase}` |
| 自動実行 | `auto-execute-button` |
| レビューパネル | `document-review-panel` |

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

### 生成されるファイル

| フェーズ | 生成ファイル | spec.json更新 |
|---------|------------|---------------|
| requirements | `requirements.md` | `phase: "requirements-generated"` |
| design | `design.md` | `phase: "design-generated"` |
| tasks | `tasks.md` | `phase: "tasks-generated"` |

---

## ベストプラクティス

### DO

- `data-testid`属性でセレクタ指定
- UI操作でテスト（クリック、入力、待機）
- アサーションはUI要素の状態で行う
- `SDD_PROJECT_PATH` でプロジェクト選択、`selectSpecViaUI` でSpec選択
- 共通ヘルパー関数を使用
- `waitForExist`/`waitForCondition`で非同期待機

### DON'T

- `window.electronAPI.xxx()` や `window.__TRPC__.xxx.query()` でAPI直接呼び出し
- `typeof window.electronAPI.xxx === 'function'` でAPI存在確認
- `expect(true).toBe(true)` のような意味のないアサーション
- 各ファイルでセキュリティ/安定性テストを重複定義（`app-launch.spec.ts`に統合済み）
- UIダイアログやメニューバー経由のプロジェクト選択（不安定）

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
- **既存テスト**: `electron-sdd-manager/e2e-wdio/`, `electron-sdd-manager/e2e-playwright/`
