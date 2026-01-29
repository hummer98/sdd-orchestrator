# 自動実行E2Eテスト結果レポート

- **実行日時**: 2026-01-28 04:26 JST
- **実行結果**: 3 passed, 7 failed, 10 total
- **実行時間**: 14分57秒

---

## 修正履歴

### 2026-01-29 修正 #2: ファイルI/Oタイミング問題の修正

#### 問題

シーケンス実行（requirements→design、tasks→document-review→impl）が失敗していた根本原因を特定・修正。

**原因**: `updateApproval()` の非同期書き込みがディスクにフラッシュされる前に、`handleAgentCompleted()` 内の `fs.readFileSync()` が古いデータを読み取っていた。

#### 修正内容

1. **autoExecutionCoordinator.ts**
   - `handleAgentCompleted()` に `updatedApprovals?: ApprovalsStatus` パラメータを追加
   - 渡された場合はファイル読み取りをスキップし、直接使用

2. **handlers.ts**
   - `setupAgentCompletionListenerWithApproval()` を修正
   - `updateApproval()` 成功後、`fileService.readSpecJson()` で最新の approvals を取得
   - `handleAgentCompleted()` に approvals を引数として渡す

#### 再テスト結果

| ファイル | Before | After | 改善 |
|---------|--------|-------|------|
| `auto-execution-impl-phase.e2e.spec.ts` | 4/6 passing | **5/6 passing** | **+1** |
| `auto-execution-intermediate-artifacts.e2e.spec.ts` | 3/4 passing | **3/4 passing** | ±0 |

#### 改善されたテスト

| テスト名 | 状態 |
|---------|------|
| `should generate design.md with architecture content after requirements` | ✅ **成功** |
| `should execute tasks then document-review then impl in sequence` | ✅ **成功** |

#### 残存する問題

残りの失敗は別の問題（UIセレクタ、テストの期待値が古い等）:

| テスト名 | 問題 |
|---------|------|
| `should show impl phase in the workflow UI` | `impl-phase-panel` のUI表示問題（シーケンス実行とは無関係） |
| `should update phase icons to generated/approved` | テストアサーションが古い（"pending" を期待するが "approved" が返る） |

---

### 2026-01-29 修正 #1 (commit: 8bf44f0)

#### 修正内容

1. **setAutoExecutionPermissions ヘルパーの修正**
   - `workflowStore.toggleAutoPermission()` から `spec.json` 直接更新に変更
   - `spec-scoped-auto-execution-state` 機能により permissions は `spec.json` が SSOT
   - `documentReview` → `document-review` のキー変換を追加

2. **auto-execution-impl-phase.e2e.spec.ts の修正**
   - テストコメントを正しいフロー（`tasks → document-review → impl`）に修正
   - `setDocumentReviewFlag` 呼び出しを削除（廃止された機能）
   - `documentReview` permission を追加

3. **auto-execution-intermediate-artifacts.e2e.spec.ts の修正**
   - UIセレクタを実装に合わせて修正（`phase-item-impl` → `impl-phase-panel`）

4. **setDocumentReviewFlag の deprecated 化**
   - `documentReviewFlag` は廃止済み、関数を no-op に変更

#### 再テスト結果

| ファイル | Before | After | 改善 |
|---------|--------|-------|------|
| `auto-execution-impl-phase.e2e.spec.ts` | 4/6 passing | 4/6 passing | ±0 |
| `auto-execution-intermediate-artifacts.e2e.spec.ts` | 2/4 passing | **3/4 passing** | **+1** |

#### 改善されたテスト

| テスト名 | 修正内容 |
|---------|---------|
| `should display all phase items and auto-permission toggles` | UIセレクタ修正により成功 |

#### 残存する問題

| テスト名 | 問題 |
|---------|------|
| `should generate design.md with architecture content after requirements` | シーケンス実行（requirements→design）が機能しない |
| `should execute tasks then document-review then impl in sequence` | シーケンス実行（tasks→doc-review→impl）が機能しない |
| `should show impl phase in the workflow UI` | impl-phase-panel のUI表示問題 |

#### 根本原因の分析

**シーケンス実行が失敗する原因**:
- `setAutoExecutionPermissions` の修正で permissions は正しく設定されるようになった
- しかし、自動承認（auto-approve）がフェーズ完了後に機能していない可能性
- Agent完了 → `updateApproval` → `handleAgentCompleted` の順序で処理されるはずだが、
  タイミング問題またはMock CLIの動作に問題がある可能性

---

## 成功したテストファイル (3)

| ファイル | 結果 |
|---------|------|
| `auto-execution-flow.e2e.spec.ts` | 6 passing |
| `auto-execution-permissions.e2e.spec.ts` | 11 passing |
| `simple-auto-execution.e2e.spec.ts` | 10 passing |

---

## 失敗したテストファイル (7)

### 1. auto-execution-document-review.e2e.spec.ts (4 failing / 7 total)

**エラー内容**: Document Reviewフラグが常に `"skip"` になる

```
Expected: "run" / "pause"
Received: "skip"
```

| テスト名 | 行番号 |
|---------|--------|
| `should trigger document review when flag is run and tasks completed` | 441 |
| `should trigger document review and pause for manual action when flag is pause` | 517 |
| `should complete auto-execution and reset UI when impl is NOGO after document-review-reply` | 673 |
| `should NOT set approved after autofix and should trigger next review round` | 797 |

### 2. auto-execution-impl-flow.e2e.spec.ts (1 failing / 4 total)

**エラー内容**: タイムアウト

| テスト名 | 行番号 |
|---------|--------|
| `should execute impl after document-review-reply approves` | - (Timeout) |

### 3. auto-execution-impl-phase.e2e.spec.ts (2 failing / 6 total) 📝 テスト仕様修正済

**エラー内容**: tasks→document-review→impl連続実行の失敗

```
Expected: true
Received: false
```

| テスト名 | 状態 | 行番号 |
|---------|------|--------|
| `should execute tasks then document-review then impl in sequence` | ❌ 失敗 | 492 |
| `should show impl phase in the workflow UI` | ❌ 失敗 | 545 |

**修正による変更**:
- テスト名を `tasks → impl` から `tasks → document-review → impl` に修正
- `setDocumentReviewFlag` 呼び出しを削除（廃止機能）
- `documentReview` permission を追加
- document-review フェーズの存在確認アサーションを追加

### 4. auto-execution-intermediate-artifacts.e2e.spec.ts (1 failing / 4 total) ✅ 改善

**エラー内容**: design.md生成の失敗

```
Expected: true
Received: false
```

| テスト名 | 状態 | 行番号 |
|---------|------|--------|
| `should generate design.md with architecture content after requirements` | ❌ 失敗 | 484 |
| `should display all phase items and auto-permission toggles` | ✅ **修正済** | - |

**修正による改善**: UIセレクタ修正により `should display all phase items...` テストが成功

### 5. auto-execution-resume.e2e.spec.ts (3 failing / 5 total)

**エラー内容**: 既完了フェーズからの再開が機能しない

| テスト名 | エラー | 行番号 |
|---------|--------|--------|
| `should start auto-execution from design phase, NOT requirements` | Expected: true, Received: false | 402 |
| `should not re-execute requirements when only design is permitted` | Expected: true, Received: false | 449 |
| `should start auto-execution from tasks phase, NOT requirements or design` | Expected: "tasks", Received: null | 550 |

### 6. auto-execution-workflow.e2e.spec.ts (4 failing / 9 total)

**エラー内容**: 複数フェーズ連続実行の失敗

```
Expected: true
Received: false
```

| テスト名 | 行番号 |
|---------|--------|
| `should execute requirements -> design -> tasks in sequence` | 263 |
| `should update UI to show completed phases` | 289 |
| `should execute requirements -> design and stop before tasks` | 409 |
| `should show requirements and design as completed, tasks as pending` | 437 |

### 7. bug-auto-execution.e2e.spec.ts (1 failing / 1 total)

**エラー内容**: `beforeEach` フック失敗

| テスト名 | 行番号 |
|---------|--------|
| `"before each" hook for Bug Auto Execution E2E Tests` | 373 |

---

## 問題の傾向分析

### 1. Document Reviewフラグ問題
- 設定値（run/pause）がspec.jsonに保存されず、常に`skip`になる
- Fixtureのspec.jsonで設定している値が読み込まれていない可能性

### 2. 複数フェーズ連続実行
- requirements→design→tasksのシーケンス実行が正しく動作しない
- 単一フェーズ（requirementsのみ）は成功している

### 3. Resume機能
- 既に完了したフェーズをスキップして次から再開する機能が動作しない
- `currentAutoPhase` が `null` になる問題

### 4. Bug自動実行
- Bugワークフローの初期化段階で失敗
- Fixtureの準備または初期状態の問題

---

## 2026-01-29 詳細コード調査結果

### 調査対象ファイル

| ファイル | 役割 |
|---------|------|
| [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) | IPC ハンドラー、Agent完了時の自動承認処理 |
| [autoExecutionCoordinator.ts](electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts) | 自動実行のSSoT、フェーズ遷移ロジック |
| [mock-claude.sh](electron-sdd-manager/scripts/e2e-mock/mock-claude.sh) | E2E用Mock CLI |

### シーケンス実行の詳細フロー分析

```
1. E2E: setAutoExecutionPermissions() → spec.json.autoExecution.permissions に書き込み
2. E2E: Auto-Executeボタンクリック
3. UI: coordinator.start(projectPath, specPath, specId, options) 呼び出し
4. Coordinator: execute-next-phase イベント発火 (phase: 'requirements')
5. handlers.ts: Agent起動 (mock-claude.sh)
6. mock-claude.sh: requirements.md生成、spec.json更新
   - approvals.requirements.generated = true（のみ設定）
7. handlers.ts: setupAgentCompletionListenerWithApproval
   - Agent完了を検知
   - await fileService.updateApproval() → approvals.requirements.approved = true
   - coordinator.handleAgentCompleted() 呼び出し
8. Coordinator: handleAgentCompleted
   - latestApprovals を spec.json から同期読み取り（fs.readFileSync）
   - getImmediateNextPhase() で次フェーズを決定
   - isPreviousPhaseApproved() で前フェーズの承認状態をチェック
9. 次フェーズが許可されていれば execute-next-phase イベント発火
```

### 特定された問題箇所

#### 問題1: `mock-claude.sh` は `generated` のみ設定

```python
# mock-claude.sh:update_spec_json
# 'approved' は設定しない（handlers.tsの責務）
data['approvals'][phase]['generated'] = True
```

これは設計通り。`approved` は handlers.ts の `updateApproval()` で設定される。

#### 問題2: 前フェーズ承認チェック（autoExecutionCoordinator.ts:977-990）

```typescript
private isPreviousPhaseApproved(phase: WorkflowPhase, approvals: ApprovalsStatus): boolean {
  switch (phase) {
    case 'design':
      return approvals.requirements.approved;
    case 'tasks':
      return approvals.design.approved;
    case 'impl':
      return approvals.tasks.approved;
    // ...
  }
}
```

次フェーズに進むには、**前フェーズが approved** である必要がある。

#### 問題3: latestApprovals の同期読み取り（autoExecutionCoordinator.ts:797-807）

```typescript
// handleAgentCompleted内
let latestApprovals = options.approvals;
try {
  const specJsonPath = path.join(specPath, 'spec.json');
  const content = fs.readFileSync(specJsonPath, 'utf-8');  // 同期読み取り
  const specJson = JSON.parse(content);
  latestApprovals = specJson.approvals;
} catch (err) {
  // Use options.approvals as fallback
}
```

**潜在的問題**: `updateApproval()` の非同期書き込みが完了する前に `readFileSync` が実行される可能性。

### 根本原因の仮説

#### 仮説A: ファイルI/Oタイミング問題（最有力）

`setupAgentCompletionListenerWithApproval` の実装:
```typescript
if (status === 'completed' && ['requirements', 'design', 'tasks'].includes(phase)) {
  try {
    const approveResult = await fileService.updateApproval(specPath, phase, true);
    // ...
  } catch { /* ignore */ }
}
// 直後に handleAgentCompleted を呼び出し
coordinator.handleAgentCompleted(agentId, specPath, finalStatus);
```

`await updateApproval()` は完了を待っているが、**ファイルシステムへの書き込みがディスクにフラッシュされる前に `readFileSync` が実行される**可能性がある。

#### 仮説B: E2E テストでの permissions 読み込みタイミング

1. `setAutoExecutionPermissions()` が `spec.json` を更新
2. UI が `spec.json` を読み取り、`coordinator.start()` に渡す
3. `coordinator.start()` が `executionOptions` にキャッシュ
4. 実行中は `executionOptions` からのみ読み取り

**問題**: UIが古い permissions を読み取っている可能性。

#### 仮説C: document-review フラグ問題

`documentReviewFlag` は完全に廃止されたが、一部のE2Eテストがまだ古い仕様を期待している可能性。

### 推奨される修正アプローチ

#### 優先度1: ファイルI/Oタイミング問題の修正

**handlers.ts** の `setupAgentCompletionListenerWithApproval` を修正:

```typescript
// 現在のコード
await fileService.updateApproval(specPath, phase, true);
coordinator.handleAgentCompleted(agentId, specPath, finalStatus);

// 修正案: 少しの遅延を追加、または updateApproval の結果を handleAgentCompleted に渡す
await fileService.updateApproval(specPath, phase, true);
await new Promise(resolve => setTimeout(resolve, 50)); // ファイルシステム同期待ち
coordinator.handleAgentCompleted(agentId, specPath, finalStatus);
```

**または**、`handleAgentCompleted` 内で `updateApproval` の結果を直接使用するように変更。

#### 優先度2: E2E テスト側の待機処理強化

`setAutoExecutionPermissions` 後に `browser.pause()` または spec.json の変更を確認する待機処理を追加。

#### 優先度3: document-review 関連テストの更新

`documentReviewFlag` を使用しているテストを permissions ベースに更新。

---

## 推奨される調査ポイント

### 修正済み ✅

1. **setAutoExecutionPermissions の SSOT 対応**
   - `workflowStore` から `spec.json` 直接更新に変更
   - `documentReview` → `document-review` のキー変換

2. **UIセレクタの修正**
   - `phase-item-impl` → `impl-phase-panel` に修正

### 残存する問題 🔍

1. **ファイルI/Oタイミング問題（最優先）**
   - `updateApproval()` → `readFileSync()` の間で競合状態が発生
   - **修正候補**: handlers.ts:977-992 の `setupAgentCompletionListenerWithApproval`
   - **テスト**: 単純な遅延追加でシーケンス実行が成功するか確認

2. **Document Reviewフラグ問題**
   - `documentReviewFlag` は廃止済み
   - 古いテストが skip を期待している可能性
   - **修正候補**: 該当テストを permissions ベースに更新

3. **Resume機能**
   - 既に完了したフェーズをスキップして次から再開する機能が動作しない
   - `currentAutoPhase` が `null` になる問題

4. **Bug自動実行**
   - Bugワークフローの初期化段階で失敗
   - Fixtureの準備または初期状態の問題
