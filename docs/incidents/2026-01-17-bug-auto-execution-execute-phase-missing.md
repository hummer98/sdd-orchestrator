# インシデントレポート: Bug自動実行のAgent起動イベントハンドラ欠落

## 概要

| 項目 | 内容 |
|------|------|
| 発生日 | 2026-01-17 |
| 発見方法 | ユーザー報告（自動実行中と表示されるがagent一覧が空） |
| 影響範囲 | Bug自動実行機能が完全に動作しない |
| 重大度 | Critical |
| 原因Spec | `bug-auto-execution-per-bug-state` |
| 原因コミット | `40a9953` (feat(bug-auto-execution): Bug毎の自動実行状態管理を実装) |

## 症状

- Bug自動実行ボタンを押すと「自動実行中」と表示される
- しかし、Agent一覧には何も表示されない
- 実際にはClaude agentが起動されていない

## 根本原因

### 技術的原因

`BugAutoExecutionService` を削除し `bugAutoExecutionStore` に移行した際、`onBugAutoExecutionExecutePhase` イベントのリスナー（実際にagentを起動する処理）が移行されなかった。

**削除前のコード** (`BugAutoExecutionService.ts`):
```typescript
// 5種類のIPCイベントリスナーを登録
const cleanupExecutePhase = window.electronAPI.onBugAutoExecutionExecutePhase(
  (data: { bugPath: string; phase: string; bugName: string }) => {
    this.handleExecutePhase(data.bugPath, data.phase, data.bugName);
  }
);
```

```typescript
private async handleExecutePhase(bugPath: string, phase: BugWorkflowPhase, bugName: string): Promise<void> {
  // 実際にwindow.electronAPI.startAgentを呼び出してagentを起動
  await window.electronAPI.startAgent(`bug:${bugName}`, phase, 'claude', [fullCommand], ...);
}
```

**移行後のコード** (`bugAutoExecutionStore.ts`):
```typescript
// 4種類のIPCイベントリスナーのみ登録（onBugAutoExecutionExecutePhaseが欠落）
const unsubscribeStatus = window.electronAPI.onBugAutoExecutionStatusChanged(...);
const unsubscribePhase = window.electronAPI.onBugAutoExecutionPhaseCompleted(...);
const unsubscribeCompleted = window.electronAPI.onBugAutoExecutionCompleted(...);
const unsubscribeError = window.electronAPI.onBugAutoExecutionError(...);
// ❌ onBugAutoExecutionExecutePhase が存在しない
```

### プロセス上の原因

1. **Spec設計時の調査不足**: 削除対象の `BugAutoExecutionService` が5種類のIPCイベントを処理していたが、Spec作成時に4種類しか把握されなかった

2. **要件定義の焦点が狭すぎた**: Requirement 2 が「状態更新（push）」に限定されており、「フェーズ実行トリガー」という別の責務が見落とされた

3. **検査時のカバレッジ不足**: 検査が設計文書ベースで行われたため、設計文書に記載されていない機能は検出できなかった

## 影響を受けたファイル

| ファイル | 変更内容 |
|----------|----------|
| `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts` | 削除（5種類のIPCリスナー含む） |
| `electron-sdd-manager/src/shared/stores/bugAutoExecutionStore.ts` | 新規作成（4種類のIPCリスナーのみ） |

## Spec文書の問題箇所

### requirements.md

```markdown
### Requirement 2: IPCイベントによる状態更新（push）

1. When `onBugAutoExecutionStatusChanged` イベントを受信する...
2. When `onBugAutoExecutionPhaseCompleted` イベントを受信する...
3. When `onBugAutoExecutionCompleted` イベントを受信する...
4. When `onBugAutoExecutionError` イベントを受信する...
# ❌ onBugAutoExecutionExecutePhase が記載されていない
```

### design.md

```markdown
| 2.1 | onBugAutoExecutionStatusChangedでstore更新 |
| 2.2 | onBugAutoExecutionPhaseCompletedでログ出力 |
| 2.3 | onBugAutoExecutionCompletedで状態更新 |
| 2.4 | onBugAutoExecutionErrorで状態更新 |
# ❌ onBugAutoExecutionExecutePhase が記載されていない
```

### tasks.md

```markdown
- [x] 2.2 ステータス変更イベントのハンドリング
- [x] 2.3 フェーズ完了・自動実行完了・エラーイベントのハンドリング
# ❌ フェーズ実行イベントのハンドリングタスクが存在しない
```

### inspection-1.md

```markdown
| 2.1 | PASS | - | onBugAutoExecutionStatusChanged リスナー登録済み |
| 2.2 | PASS | - | onBugAutoExecutionPhaseCompleted でログ出力を実装 |
| 2.3 | PASS | - | onBugAutoExecutionCompleted で setCompletedState() を呼び出し |
| 2.4 | PASS | - | onBugAutoExecutionError で setErrorState() を呼び出し |
# ❌ onBugAutoExecutionExecutePhase は検査対象外
```

## 修正方針

`bugAutoExecutionStore.ts` の `initBugAutoExecutionIpcListeners` 関数に以下を追加:

1. `onBugAutoExecutionExecutePhase` イベントリスナーの登録
2. 削除前の `handleExecutePhase` ロジックの移植（agent起動処理）

## 教訓と再発防止策

### 1. 削除対象コードの網羅的調査

既存コードを削除・移行する際は、以下を実施する:
- 削除対象の全メソッド・イベントハンドラをリストアップ
- 各機能の責務を明確化し、移行先を決定
- チェックリストを作成して移行漏れを防止

### 2. 要件定義の責務分離

「状態更新」と「アクション実行」は異なる責務であり、別々の要件として定義すべき:
- Requirement 2: 状態更新イベント（4種類）
- Requirement X: フェーズ実行イベント（1種類）← **これが欠落していた**

### 3. 検査時の既存コード比較

リファクタリング系のSpecでは、検査時に:
- 削除前のコードと移行後のコードを比較
- 機能の網羅性を検証
- 設計文書に記載されていない機能も検出

### 4. E2Eテストの早期実行

ユニットテストだけでなく、実際の機能フローを検証するE2Eテストを実装・実行し、統合的な動作確認を行う。

## タイムライン

| 日時 | イベント |
|------|----------|
| 2026-01-16 | Spec `bug-auto-execution-per-bug-state` 作成 |
| 2026-01-16 | 実装完了、inspection GO判定 |
| 2026-01-17 01:40 | コミット `40a9953` マージ |
| 2026-01-17 | ユーザー報告により問題発覚 |
| 2026-01-17 | 原因調査完了、本レポート作成 |

## 関連リンク

- Spec: `.kiro/specs/bug-auto-execution-per-bug-state/`
- コミット: `40a9953` (feat(bug-auto-execution): Bug毎の自動実行状態管理を実装)
