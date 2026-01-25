# Implementation Plan

## Tasks

- [x] 1. 型定義と共有インフラストラクチャ
- [x] 1.1 (P) spec.json に ImplMode 型と ImplConfig インターフェースを追加する
  - `ImplMode` 型を `'sequential' | 'parallel'` として定義
  - `ImplConfig` インターフェースに `mode: ImplMode` を定義
  - `SpecJson` インターフェースに `impl?: ImplConfig` を追加
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 (P) WorkflowState に implMode フィールドを追加する
  - 共有の WorkflowState 型に `implMode: ImplMode` を追加
  - デフォルト値として `'sequential'` を設定
  - _Requirements: 1.3_

- [x] 2. IPC チャンネルとハンドラ
- [x] 2.1 UPDATE_IMPL_MODE チャンネルを追加する
  - チャンネル定義を `channels.ts` に追加
  - リクエスト型（specPath, mode）とレスポンス型を定義
  - _Requirements: 2.4_

- [x] 2.2 impl.mode 更新ハンドラを実装する
  - `handlers.ts` に UPDATE_IMPL_MODE ハンドラを追加
  - FileService.updateSpecJson を使用して spec.json を更新
  - 成功/失敗のレスポンスを返す
  - _Requirements: 2.4_
  - _Verify: Grep "UPDATE_IMPL_MODE" in handlers.ts_

- [x] 2.3 execute-next-phase ハンドラで impl.mode を読み取り、実行コマンドを分岐する
  - `impl` フェーズ実行時に spec.json から `impl.mode` を読み取る
  - `'sequential'` の場合は `type: 'impl'` で実行
  - `'parallel'` の場合は `type: 'auto-impl'` で実行
  - フィールド未存在時は `'sequential'` にフォールバック
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Verify: Grep "impl.mode|implMode" in handlers.ts_

- [x] 3. UIコンポーネント更新
- [x] 3.1 ParallelModeToggle の props インターフェースを簡素化する
  - 新規 props: `mode: ImplMode`, `onToggle: () => void`, `className?: string`
  - 既存 props (`hasParallelTasks`, `parallelTaskCount`, `parallelModeEnabled`, `onToggle`) を `@deprecated` マーク
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 3.2 ParallelModeToggle を常時表示に変更し、アイコンを更新する
  - `hasParallelTasks` による条件付きレンダリングを削除
  - アイコンを `User`（Sequential）/ `Users`（Parallel）に変更
  - 状態に応じたアイコン切り替えロジックを実装
  - `parallelTaskCount` の表示ロジックを削除
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.4_

- [x] 3.3 ImplPhasePanel の props と実行ロジックを更新する
  - 新規 props: `implMode`, `onToggleImplMode` を追加
  - 既存 props を `@deprecated` マーク
  - ParallelModeToggle に新 props を渡すよう修正
  - 実行ボタンクリック時、`implMode` に応じた実行処理を呼び出す
  - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.3_

- [x] 4. 状態管理とフック
- [x] 4.1 useElectronWorkflowState で implMode の取得・トグルハンドラを追加する
  - spec.json から `impl.mode` を読み取り、store に反映
  - `toggleImplMode` ハンドラで IPC 経由で更新リクエストを送信
  - デフォルト値 `'sequential'` のフォールバック処理
  - _Requirements: 2.3, 2.4, 3.3_

- [x] 4.2 (P) useRemoteWorkflowState で implMode の取得・トグルハンドラを追加する
  - WebSocket 経由で `impl.mode` を取得
  - `toggleImplMode` ハンドラで WebSocket 経由で更新リクエストを送信
  - _Requirements: 6.1, 6.2_

- [x] 5. 結合と検証
- [x] 5.1 WorkflowViewCore に implMode 関連の props を接続する
  - useElectronWorkflowState / useRemoteWorkflowState から `implMode`, `toggleImplMode` を取得
  - ImplPhasePanel に渡す props を更新
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 6.1_

- [x] 5.2 手動実行フローの動作確認テストを作成する
  - `implMode === 'sequential'` 時に `spec-impl` が実行されることを検証
  - `implMode === 'parallel'` 時に `spec-auto-impl` が実行されることを検証
  - 設定未存在時のデフォルト動作を検証
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.3 自動実行フローの動作確認テストを作成する
  - AutoExecutionCoordinator の `execute-next-phase` で `impl.mode` が参照されることを検証
  - `sequential` / `parallel` による実行コマンドの分岐を検証
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `spec.json` に `impl` オブジェクト追加 | 1.1 | Infrastructure |
| 1.2 | `impl.mode` が `sequential` / `parallel` を持つ | 1.1 | Infrastructure |
| 1.3 | フィールド未存在時のデフォルト `sequential` | 1.1, 1.2 | Infrastructure |
| 2.1 | トグル常時表示 | 3.2, 5.1 | Feature |
| 2.2 | Single / Parallel アイコン | 3.2 | Feature |
| 2.3 | 設定状態の視覚化 | 3.2, 4.1 | Feature |
| 2.4 | トグルで spec.json 更新 | 2.1, 2.2, 3.3, 4.1 | Feature |
| 3.1 | sequential 時 spec-impl 実行 | 3.3, 5.2 | Feature |
| 3.2 | parallel 時 spec-auto-impl 実行 | 3.3, 5.2 | Feature |
| 3.3 | 未設定時のデフォルト動作 | 3.3, 5.2 | Feature |
| 4.1 | 自動実行で impl.mode 読み取り | 2.3, 5.3 | Feature |
| 4.2 | sequential 時 type: impl 実行 | 2.3, 5.3 | Feature |
| 4.3 | parallel 時 type: auto-impl 実行 | 2.3, 5.3 | Feature |
| 4.4 | 未設定時のデフォルト | 2.3, 5.3 | Feature |
| 5.1 | hasParallelTasks 条件削除 | 3.1, 3.2 | Feature |
| 5.2 | アイコン変更 | 3.2 | Feature |
| 5.3 | コンポーネント名維持 | 3.1 | Infrastructure |
| 5.4 | parallelTaskCount props 非表示 | 3.1, 3.2 | Feature |
| 6.1 | Remote UI トグル表示 | 4.2, 5.1 | Feature |
| 6.2 | WebSocket 経由の同期 | 4.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
