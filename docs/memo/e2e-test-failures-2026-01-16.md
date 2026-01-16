# E2Eテスト失敗分析 (2026-01-16)

## 概要

E2Eテスト実行結果: **22 passed, 6 failed** (28 total)

前回セッションで以下を修正済み:
- `experimental-tools-installer.spec.ts`: Commitコマンドメニュー関連テスト削除（仕様変更対応）
- `impl-start-worktree.e2e.spec.ts`: `beforeAll`/`afterAll` → `before`/`after`（Mocha構文）
- `BugWorkflowView.tsx`: `handleStartAutoExecution`のasync/await追加

## 残存する失敗テスト

### 1. bug-auto-execution.e2e.spec.ts (10 failing)

**症状**: タイムアウトエラー

**根本原因**: IPC通信の問題
- Main ProcessからRenderer Processへの`execute-next-phase`イベントが正しく処理されていない
- `BugAutoExecutionService`がイベントを受信しているが、`bugPath`の不一致でスキップされている

**調査ログ**:
```
[BugAutoExecutionService] Execute phase requested by Main Process
  bugPath: /path/to/bug
  currentBugPath: null  ← ここが問題
Skipping execute phase - bugPath mismatch
```

**推定原因**:
1. `start()`呼び出し時に`currentBugPath`が正しく設定されていない
2. または、Main Processからのイベントが`start()`完了前に到着している（レースコンディション）

**修正方針**:
- `BugAutoExecutionService.start()`内で`currentBugPath`設定のタイミングを確認
- Main ProcessとRenderer Process間の状態同期メカニズムを見直す
- イベントリスナー登録タイミングの検証

---

### 2. bugs-worktree-support.e2e.spec.ts (5 failing)

**症状**: `element not interactable`エラー

**推定原因**:
- ボタンやUI要素が表示されているが、クリック可能な状態になっていない
- オーバーレイやモーダルが要素を覆っている可能性
- 要素のローディング状態が完了していない

**修正方針**:
- `waitForClickable`や`waitForDisplayed`の追加
- テスト対象要素のz-indexやポジション確認
- アニメーション完了待機の追加

---

### 3. multi-window.e2e.spec.ts (1 failing)

**症状**: フォーカスウィンドウの取得失敗

**推定原因**:
- 複数ウィンドウ環境でのフォーカス管理の問題
- WebdriverIOのウィンドウ切り替えタイミング

**修正方針**:
- ウィンドウハンドル取得後の適切な待機処理
- フォーカス切り替え後の状態確認強化

---

### 4. auto-execution-document-review.e2e.spec.ts (1 failing)

**症状**: タイムアウトエラー

**推定原因**:
- `bug-auto-execution.e2e.spec.ts`と同様のIPC通信問題
- document-reviewフェーズ特有の処理時間超過

**修正方針**:
- bug-auto-executionの修正後に再検証
- タイムアウト値の調整検討

---

## 優先度

| 優先度 | テストファイル | 影響範囲 | 備考 |
|--------|---------------|---------|------|
| 高 | bug-auto-execution.e2e.spec.ts | Bug自動実行全般 | IPC通信の根本修正が必要 |
| 高 | bugs-worktree-support.e2e.spec.ts | Worktree機能 | UI操作の安定化 |
| 中 | auto-execution-document-review.e2e.spec.ts | Document Review | bug-auto-execution修正後に再検証 |
| 低 | multi-window.e2e.spec.ts | マルチウィンドウ | 限定的な機能 |

## 技術的詳細

### IPC通信フロー（Bug自動実行）

```
Renderer                          Main Process
   |                                   |
   |-- start-bug-auto-execution ------>|
   |                                   |-- Claude CLI実行
   |<-- execute-next-phase ------------|
   |                                   |
   |-- phase-completed --------------->|
   |                                   |
```

**問題点**: `execute-next-phase`受信時に`currentBugPath`がnullのため、イベントが無視される

### BugAutoExecutionService状態管理

```typescript
class BugAutoExecutionService {
  private currentBugPath: string | null = null;

  async start(): Promise<boolean> {
    // currentBugPathの設定タイミングが問題
    this.currentBugPath = bugPath;

    // IPC呼び出し
    await window.electronAPI.startBugAutoExecution(...);
  }

  private handleExecutePhase(bugPath: string, phase: string): void {
    // bugPathとcurrentBugPathの不一致で処理がスキップされる
    if (bugPath !== this.currentBugPath) {
      console.warn('Skipping execute phase - bugPath mismatch');
      return;
    }
  }
}
```

## 次のアクション

1. **bug-auto-execution修正**: IPC通信とstate同期の修正
2. **bugs-worktree-support修正**: UI要素の待機処理追加
3. **再テスト**: 上記修正後に全E2Eテスト再実行
4. **CI/CD確認**: 修正がCIパイプラインで安定して通るか確認

## 関連ファイル

- `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts`
- `electron-sdd-manager/src/main/services/bugAutoExecutionService.ts`
- `electron-sdd-manager/e2e-wdio/bug-auto-execution.e2e.spec.ts`
- `electron-sdd-manager/e2e-wdio/bugs-worktree-support.e2e.spec.ts`
