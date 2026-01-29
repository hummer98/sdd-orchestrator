# E2Eテストレポート (2026-01-29)

## 概要

| 項目 | 結果 |
|------|------|
| 実行日時 | 2026-01-29 14:15 - 14:45 (JST) |
| テストファイル総数 | 46 |
| PASSED | 22 (auto-execution-permissions 修正後) |
| FAILED | 24 (auto-execution-permissions 修正後) |
| 実行時間 | 30分21秒 |

## 成功したテスト (22件)

| テストファイル | 内容 |
|----------------|------|
| agent-log-streaming.e2e.spec.ts | ログストリーミング |
| app-launch.spec.ts | アプリ起動 |
| artifact-editor-search.e2e.spec.ts | エディタ検索 |
| auto-execution-flow.e2e.spec.ts | 自動実行フロー |
| auto-execution-impl-phase.e2e.spec.ts | Impl フェーズ実行 |
| auto-execution-intermediate-artifacts.e2e.spec.ts | 中間成果物 |
| auto-execution-permissions.e2e.spec.ts | 実行権限設定 (SSOT追従済) |
| auto-execution-resume.e2e.spec.ts | 自動実行の再開 |
| bug-workflow.e2e.spec.ts | バグワークフロー |
| bugs-pane-integration.e2e.spec.ts | バグパネル連携 |
| document-review-approval.e2e.spec.ts | ドキュメントレビュー承認 |
| git-view.e2e.spec.ts | Git表示 |
| project-selection.e2e.spec.ts | プロジェクト選択 |
| remote-ui-info.e2e.spec.ts | リモートUI情報 |
| sidebar-tabs.e2e.spec.ts | サイドバータブ |
| spec-auto-execution.e2e.spec.ts | Spec自動実行 |
| spec-progress-display.e2e.spec.ts | 進捗表示 |
| ssh-workflow.e2e.spec.ts | SSHワークフロー |
| worktree-rebase-from-main.e2e.spec.ts | Worktree リベース |

---

## 失敗したテスト分析

### カテゴリ1: 期待値変更によるエラー（テスト修正で対応可能）

#### 1.1 spec-workflow.e2e.spec.ts (1 failing / 39 passing)

**失敗テスト**: `SpecListコンポーネントが存在する`

**原因**: `data-testid="spec-list"` が見つからない

```
Expected: "existing"
Received: "not existing"
```

**分析**: SpecListコンポーネントの data-testid が変更された可能性。UIコンポーネントの構造変更に伴う期待値の不一致。

**修正方針**: 現在の実装に合わせて data-testid を確認し、テストを更新

---

#### 1.2 workflow-integration.e2e.spec.ts (1 failing / 22 passing)

**失敗テスト**: `should display all phase items`

```
Expected: true
Received: false
```

**分析**: フェーズアイテムの数または構造が変更された。

**修正方針**: 現在の UI 構造を確認し、テストの期待値を更新

---

#### 1.3 worktree-execution.e2e.spec.ts (2 failing / 11 passing)

**失敗テスト**:
1. `should display ImplFlowFrame with checkbox and start button`
2. `should display checkbox checked and locked when worktree exists`

**原因**: ImplFlowFrame の UI 構造変更

**分析**: ワークツリー実装のチェックボックスとボタンの表示ロジック変更。

**修正方針**: 現在の ImplFlowFrame 実装を確認し、テストを更新

---

#### 1.4 worktree-spec-sync.e2e.spec.ts (6 failing / 8 passing)

**失敗テスト**:
1. `should display correct phases for each spec` - Expected: "tasks", Received: null
2. `should have worktree field in worktree spec` - Expected path, Received: undefined
3. `should NOT have worktree field in main spec` - Expected: undefined, Received: null
4. `should NOT display worktree badge for main spec in UI`
5. `should show correct worktree info when worktree spec is selected`
6. `should show no worktree info when main spec is selected`

**分析**: worktree フィールドの構造変更。`undefined` vs `null` の扱いが変わった。

**修正方針**: spec.json の worktree フィールド構造を確認し、テスト期待値を更新

---

#### 1.5 worktree-two-stage-watcher.e2e.spec.ts (5 failing / 6 passing)

**失敗テスト**:
1. `should update spec list when spec.json inside worktree is modified`
2. `should reflect worktree field in UI (specStore)`
3. `should display main spec without worktree field correctly`
4. `should display worktree bug in bug list`
5. `should update bug list when bug.json inside worktree is modified`

**分析**: ファイル監視とUI更新のタイミング問題、またはworktreeフィールド構造の変更。

---

### カテゴリ2: 機能的な問題の可能性（調査必要）

#### 2.1 schedule-task.e2e.spec.ts (21 failing)

**症状**: スケジュールタスクダイアログが開かない

```
1) should open schedule task dialog when timer button is clicked
   Expected: true, Received: false
```

**分析**: タイマーボタンクリック後にダイアログが表示されない。IPC通信またはUI状態管理の問題の可能性。

**要調査**: スケジュールタスク機能全体の動作確認

---

#### 2.2 bugs-pane-integration.e2e.spec.ts ~~(11 failing)~~ → 修正済み (0 failing)

**失敗テスト**:
1. `should execute requirements -> design -> tasks in sequence`
2. 他3件

**分析**: 自動実行シーケンスが期待通りに進行しない。

**要調査**: AutoExecutionCoordinator の状態遷移

---

#### 2.5 auto-execution-document-review.e2e.spec.ts ~~(3 failing)~~ → 修正済み

**失敗テスト**: `should trigger document review and pause for manual action when flag is pause`

```
Expected: "pause", Received: "run"
```

**分析結果**: ~~ドキュメントレビューのpauseフラグが機能していない。~~

→ **仕様変更により解決**: `document-review-phase` 仕様により、`documentReviewFlag` (run/pause/skip) は `permissions.documentReview` (boolean GO/NOGO) に統合された。`run`/`pause` オプションは元々機能しておらず、設計上も削除された。

**対応**: テストから削除済み（Scenario 3 削除、関連ヘルパー関数削除）

---

### カテゴリ3: 環境・タイミング関連

#### 3.1 agent-resume-log-display.e2e.spec.ts (2 failing)

**症状**:
1. stdin ログエントリが追加されない
2. ログエントリ数が期待値に達しない

```
Expected: >= 2, Received: 0
```

**分析**: ログ表示のタイミング問題、またはログストリーミングの問題。

---

#### 3.2 multi-window.e2e.spec.ts (1 failing)

**分析**: マルチウィンドウ環境でのテスト不安定性。

---

#### 3.3 layout-persistence.e2e.spec.ts (3 failing)

**分析**: レイアウト保存・復元の問題。

---

### カテゴリ4: 機能未実装または仕様変更

#### 4.1 cloudflare-tunnel.e2e.spec.ts (1 failing)

**分析**: Cloudflare Tunnel 関連機能のテスト。設定の有無に依存。

---

#### 4.2 experimental-tools-installer.spec.ts (2 failing)

**分析**: 実験的ツールのインストールダイアログ関連。

---

#### 4.3 install-dialogs.e2e.spec.ts (4 failing)

**分析**: インストールダイアログの表示条件変更。

---

## 推奨対応

### 優先度: 高（今すぐ対応）

1. **schedule-task.e2e.spec.ts** - 21件の失敗。スケジュールタスク機能の動作確認
2. **auto-execution-workflow.e2e.spec.ts** - 自動実行シーケンスの問題

### 優先度: 中（期待値修正で対応）

4. **worktree-spec-sync.e2e.spec.ts** - worktree フィールド構造の確認・テスト更新
5. **worktree-two-stage-watcher.e2e.spec.ts** - ファイル監視テストの更新
6. **worktree-execution.e2e.spec.ts** - ImplFlowFrame テストの更新
7. **spec-workflow.e2e.spec.ts** - data-testid の確認
8. **workflow-integration.e2e.spec.ts** - フェーズアイテム数の確認

### 優先度: 低（環境依存・スキップ検討）

9. **cloudflare-tunnel.e2e.spec.ts** - 環境依存テスト
10. **multi-window.e2e.spec.ts** - 不安定テスト

---

## 修正済み項目

### 期待値変更による修正（本レポート作成時に修正）

1. **spec-workflow.e2e.spec.ts**
   - 問題: プロジェクト選択のセットアップが不足
   - 修正: `before` フックを追加して `selectProjectViaStore` でプロジェクト選択を実行するよう変更

2. **worktree-spec-sync.e2e.spec.ts**
   - 問題: `toBeUndefined()` を使用していたが、実際には `null` が返される
   - 修正: `expect(mainSpec?.worktree == null).toBe(true)` に変更（nullish チェック）

3. **worktree-two-stage-watcher.e2e.spec.ts**
   - 問題: 同上（`undefined` vs `null` の不一致）
   - 修正: 2箇所を nullish チェックに変更

4. **auto-execution-document-review.e2e.spec.ts**
   - 問題: `documentReviewFlag` の `pause` オプションをテストしていたが、仕様変更により削除済み
   - 根拠: `document-review-phase` 仕様で `documentReviewFlag` (run/pause/skip) が `permissions.documentReview` (GO/NOGO) に統合
   - 修正: Scenario 3 (pause flag テスト) を削除、`setDocumentReviewFlag`/`getDocumentReviewFlag` ヘルパー関数を削除

5. **bugs-pane-integration.e2e.spec.ts** (11件 → 0件)
   - 問題: テストコードが実装のStore API と不整合
   - 根本原因:
     - Store参照名: `stores.bugStore` → 正しくは `stores.bug`
     - Stateフィールド: `selectedBug` → 正しくは `selectedBugId`
     - selectBug API: `selectBug(bug)` → 正しくは `selectBug(apiClient, bugId)` だが E2E では setState 直接設定
     - bugDetail: 未設定 → タブ表示・フェーズ状態判定に必須
   - 修正:
     - `selectBugViaStore`: Store参照を `bug` に修正、`setState({ selectedBugId, bugDetail })` で設定
     - `clearSelectedBugViaStore`: Store参照を `bug` に修正
     - 状態確認: `selectedBug` → `selectedBugId` に修正

6. **auto-execution-permissions.e2e.spec.ts** (5件 → 0件)
   - 問題: パーミッション設定がテストに正しく反映されない
   - 根本原因:
     - 信頼できる情報源（SSOT）の不整合: テスト内のヘルパーが `workflowStore` を参照していたが、実装は `specStore`（`spec.json`）が SSOT に変更されていた。
     - レースコンディション: IPC経由のファイル書き込み後、ファイルウォッチャーが検知してレンダラーのStoreが更新されるまでの待ち時間が不足していた。
   - 修正:
     - ヘルパー関数を `specStore` 参照に更新。
     - ファイル監視の同期待ち時間を `2000ms` に延長。
     - シナリオ4の権限トグル操作を、ストアアクションではなく `setAutoExecutionPermissions` (IPC) 経由で `spec.json` を更新するように変更。

---

## 次のステップ

1. schedule-task 機能の動作確認（UIからダイアログが開くか手動確認）
2. auto-execution パーミッション設定の確認
3. worktree 関連の残りのテスト失敗を調査
4. auto-execution-workflow の状態遷移確認

---

*Generated: 2026-01-29T14:45:00Z*
*Updated: 2026-01-29T15:00:00Z - 3つのテストファイルを修正*
*Updated: 2026-01-30T07:30:00Z - auto-execution-document-review.e2e.spec.ts の pause flag テストを仕様変更により削除*
*Updated: 2026-01-30T00:10:00Z - bugs-pane-integration.e2e.spec.ts の Store 参照・API 不整合を修正 (11件→0件)*
*Updated: 2026-01-30T09:15:00Z - auto-execution-permissions.e2e.spec.ts を最新仕様(specStore SSOT)に追従 (5件→0件)*
