# Implementation Plan: spec-auto-impl-command

## 概要

`/kiro:spec-auto-impl` Slash Commandを新規作成し、Task toolによる並列サブエージェント起動とバッチ完了待機により、1回のコマンド実行で全タスク完了まで自律的に並列バッチ実行を継続する機能を実装する。

---

## Tasks

### Phase 1: Slash Commandテンプレート作成

- [x] 1. spec-auto-implコマンドテンプレートの作成
- [x] 1.1 コマンドテンプレートファイルを新規作成する
  - `templates/commands/cc-sdd-agent/spec-auto-impl.md`を新規作成
  - frontmatterで`name: kiro:spec-auto-impl`を設定
  - tasks.md解析とグループ分割のロジックをプロンプトに記述
  - (P)マーク付きタスクを並列実行可能として識別する指示を記述
  - _Requirements: 1.1, 1.2, 1.6_
  - _Method: frontmatter name field_
  - _Verify: Grep "name: kiro:spec-auto-impl" in spec-auto-impl.md_

- [x] 1.2 Task toolによる並列サブエージェント起動指示を追加する
  - 各バッチ内タスクをTask toolで並列起動する指示を記述
  - spec-tdd-impl-agentをサブエージェントとして使用する指示を記述
  - バッチ内の全サブエージェント完了を待ってから次バッチへ進行する指示を記述
  - 全バッチ完了まで自動継続する指示を記述
  - _Requirements: 1.3, 1.4, 1.5_
  - _Method: Task tool parallel invocation_

- [x] 1.3 tasks.md更新責任を親エージェントに集約する指示を追加する
  - サブエージェントがtasks.mdを直接編集しない明示的な禁止指示を記述
  - サブエージェントから完了報告（タスクID・結果）を受け取る指示を記述
  - 親エージェントがバッチ完了時にtasks.mdを一括更新する指示を記述
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.4 SKILL.md仕様を現行spec.json構造に合わせて調整する
  - `approvals.tasks.approved`をチェックする指示を記述（旧`tasksApproved`から変更）
  - TDD必須の指示を維持
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Method: spec.json approvals.tasks.approved field_
  - _Verify: Grep "approvals.tasks.approved" in spec-auto-impl.md_

- [x] 1.5 開発環境用にコマンドをインストールする
  - `.claude/commands/cc-sdd-agent/spec-auto-impl.md`にテンプレートをコピー
  - インストール後にコマンドが使用可能か確認
  - _Requirements: 7.1, 7.2, 7.3_

### Phase 2: 既存コード削除

- [x] 2. 未使用コードの物理削除
- [x] 2.1 (P) parallelImplService関連ファイルを物理削除する
  - `electron-sdd-manager/src/main/services/parallelImplService.ts`を削除
  - `electron-sdd-manager/src/main/services/parallelImplService.test.ts`を削除
  - 関連するインポートや参照を確認・削除
  - _Requirements: 5.1, 5.2_

- [x] 2.2 削除後のビルド・テスト成功を確認する
  - `npm run build`でビルドエラーがないことを確認
  - `npm run test`でテストがパスすることを確認
  - _Requirements: 5.4, 5.5_

### Phase 3: Renderer Hook修正

- [x] 3. useElectronWorkflowState修正
- [x] 3.1 handleParallelExecuteをspec-auto-impl呼び出しに変更する
  - Promise.allによる複数プロセス起動ロジックを削除
  - 並列トグルON時に`/kiro:spec-auto-impl`を呼び出すよう変更
  - execute type: 'auto-impl'を追加（または適切な方式で実装）
  - parallelImplServiceへの依存を削除
  - _Requirements: 3.1, 5.3_
  - _Method: electronAPI.execute type auto-impl_
  - _Verify: Grep "spec-auto-impl" in useElectronWorkflowState.ts_
  - _Note: shared/hooksへの共通化は行わない（理由: useRemoteWorkflowState.tsは現在スタブ実装のため共通化メリットが薄い。将来Remote UIが本実装される際に再検討）_

- [x] 3.2 (P) useRemoteWorkflowState修正（Remote UI対応）
  - handleParallelExecuteをspec-auto-impl呼び出しに変更
  - Electron版と同様の変更を適用
  - _Requirements: 3.1_
  - _Verify: Grep "spec-auto-impl" in useRemoteWorkflowState.ts_
  - _Note: 現在スタブ実装（console.logのみ）。本実装は将来的な対応とし、最低限の型整合性を維持する修正のみ行う_

- [x] 3.3 実行中・完了・エラー表示が既存UIで正しく動作することを確認する
  - 並列トグルOFF時は既存の逐次実装（spec-impl）が呼び出されることを確認
  - 実行中スピナー表示が維持されていることを確認
  - 完了時・エラー時の表示が正しく動作することを確認
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

### Phase 4: 自動実行フロー統合

- [x] 4. autoExecutionHandlers修正
- [x] 4.1 implフェーズ実行時にspec-auto-implを使用するよう変更する
  - autoExecutionCoordinatorがimplフェーズを実行する際のコマンドをspec-auto-implに変更
  - 既存の逐次実行ロジックを並列実装に置換
  - 手動・自動実行で動作を統一
  - _Requirements: 4.1, 4.2_
  - _Method: executePhase impl with spec-auto-impl_
  - _Verify: Grep "spec-auto-impl" in autoExecutionHandlers.ts_

### Phase 5: 統合テスト・検証

- [x] 5. 統合テスト
- [x] 5.1 並列トグルON時のUI連携を確認する
  - ImplPhasePanelの「実装」ボタン押下でspec-auto-implが呼び出されることを確認
  - 実行中のスピナー表示、完了時の表示遷移を確認
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 5.2 自動実行フローとの連携を確認する
  - autoExecutionからimplフェーズが正しく実行されることを確認
  - 全体フローが正常に完了することを確認
  - _Requirements: 4.1, 4.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | コマンド実行でtasks.md解析・グループ化 | 1.1 | Feature |
| 1.2 | (P)マーク付きタスクを並列グループ化 | 1.1 | Feature |
| 1.3 | Task toolで並列サブエージェント起動 | 1.2 | Feature |
| 1.4 | バッチ完了待機から次バッチへ | 1.2 | Feature |
| 1.5 | 全バッチ完了まで自動継続 | 1.2 | Feature |
| 1.6 | コマンド配置場所 | 1.1 | Feature |
| 2.1 | サブエージェントはtasks.md編集しない | 1.3 | Feature |
| 2.2 | サブエージェントが完了報告 | 1.3 | Feature |
| 2.3 | 親エージェントがtasks.md更新 | 1.3 | Feature |
| 2.4 | バッチ完了ごとにtasks.md更新 | 1.3 | Feature |
| 3.1 | 並列トグルON時にauto-impl呼び出し | 3.1, 3.2 | Feature |
| 3.2 | 並列トグルOFF時にspec-impl呼び出し | 3.3 | Feature |
| 3.3 | 実行中スピナー表示 | 3.3, 5.1 | Feature |
| 3.4 | 完了時表示 | 3.3, 5.1 | Feature |
| 3.5 | エラー時ログ表示 | 3.3 | Feature |
| 4.1 | autoExecutionでauto-impl呼び出し | 4.1 | Feature |
| 4.2 | 逐次実行ロジック置換 | 4.1 | Feature |
| 5.1 | parallelImplService.ts削除 | 2.1 | Cleanup |
| 5.2 | parallelImplService.test.ts削除 | 2.1 | Cleanup |
| 5.3 | handleParallelExecute内Promise.all削除 | 3.1 | Cleanup |
| 5.4 | 削除後ビルド成功 | 2.2 | Infrastructure |
| 5.5 | 削除後テスト成功 | 2.2 | Infrastructure |
| 6.1 | SKILL.md: 親エージェント更新指示 | 1.3, 1.4 | Feature |
| 6.2 | SKILL.md: approvals.tasks.approved参照 | 1.4 | Feature |
| 6.3 | SKILL.md: name維持 | 1.1 | Feature |
| 6.4 | SKILL.md: TDD必須維持 | 1.4 | Feature |
| 7.1 | テンプレート存在 | 1.1, 1.5 | Feature |
| 7.2 | プロファイルインストール時にコピー | 1.5 | Feature |
| 7.3 | インストール後使用可能 | 1.5 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
