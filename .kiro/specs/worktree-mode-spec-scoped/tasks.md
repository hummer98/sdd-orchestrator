# Implementation Plan

## Tasks

- [x] 1. (P) `WorktreeConfig`型に`enabled`フィールドを追加
  - `enabled?: boolean`をoptionalフィールドとして追加し、既存`spec.json`との後方互換性を維持する
  - `isWorktreeConfig`型ガードは`enabled`の有無に関わらず正しく動作することを確認（`branch`と`created_at`のみをチェック）
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. (P) `workflowStore`からworktreeモード関連の状態・アクションを削除
  - `worktreeModeSelection`状態フィールドを削除
  - `setWorktreeModeSelection`アクションを削除
  - `resetWorktreeModeSelection`アクションを削除
  - `WorktreeModeSelection`型定義を削除
  - 関連するテストコードを削除
  - インポート・エクスポートを整理し、削除後もビルドが通ることを確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. `WorkflowView`のworktreeモード状態管理を変更
- [x] 3.1 チェックボックス状態の読み込みロジックを変更
  - `isWorktreeModeSelected`の判定ロジックを`spec.json.worktree.enabled`参照に変更
  - `hasWorktreePath`がtrueの場合は`enabled`に関わらず強制的にworktreeモードとする既存ロジックを維持
  - `worktree.enabled`が`undefined`または`false`の場合はチェックボックスをOffで表示
  - `workflowStore`への依存を削除
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 チェックボックス変更時の永続化ロジックを実装
  - `handleWorktreeModeChange`を修正し、`window.electronAPI.updateSpecJson`を使用して`spec.json`に保存
  - `spec.json`に`worktree`フィールドが存在しない状態でOnにした場合、`{ enabled: true }`で初期化
  - 既存の`worktree`オブジェクトがある場合、`enabled`フィールドのみを更新し、他のフィールド（`path`, `branch`, `created_at`）は保持
  - FileWatcher経由でUI更新されるため、楽観的更新は行わない
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2_

- [x] 4. 統合テストとユニットテストの追加
- [x] 4.1 `WorktreeConfig`型のテストを追加
  - `enabled`フィールドの有無に関わらず`isWorktreeConfig`が正しく動作することをテスト
  - `enabled: true`、`enabled: false`、`enabled: undefined`の各ケースをカバー
  - _Requirements: 1.3_

- [x] 4.2 `WorkflowView`のworktreeモード状態テストを追加
  - `specJson.worktree.enabled`からチェックボックス状態が正しく導出されることをテスト
  - `hasWorktreePath`がtrueの場合のworktreeモード強制動作をテスト
  - チェックボックス変更時に`updateSpecJson`が正しく呼び出されることをテスト
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `WorktreeConfig`に`enabled?: boolean`追加 | 1 | Feature |
| 1.2 | `enabled`はoptionalで後方互換性維持 | 1 | Feature |
| 1.3 | `isWorktreeConfig`型ガード動作維持 | 1, 4.1 | Feature |
| 2.1 | チェックボックス変更時に`spec.json`更新 | 3.2 | Feature |
| 2.2 | `updateSpecJson` IPC使用 | 3.2 | Feature |
| 2.3 | UI即座反映（FileWatcher経由） | 3.2 | Feature |
| 3.1 | `isWorktreeModeSelected`が`spec.json.worktree.enabled`参照 | 3.1 | Feature |
| 3.2 | `hasWorktreePath`がtrueなら強制worktreeモード | 3.1 | Feature |
| 3.3 | `enabled`がundefined/falseならOff表示 | 3.1 | Feature |
| 4.1 | `worktreeModeSelection`状態削除 | 2 | Feature |
| 4.2 | `setWorktreeModeSelection`アクション削除 | 2 | Feature |
| 4.3 | `resetWorktreeModeSelection`アクション削除 | 2 | Feature |
| 4.4 | `WorktreeModeSelection`型削除 | 2 | Feature |
| 4.5 | 関連テストコード削除/更新 | 2 | Feature |
| 5.1 | `worktree`なしでOnで`{enabled: true}`設定 | 3.2 | Feature |
| 5.2 | 既存`worktree`ある場合`enabled`のみ更新 | 3.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 3.1), not container tasks (e.g., 3)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
