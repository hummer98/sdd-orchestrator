# Implementation Plan

## 1. 型定義の拡張

- [x] 1.1 (P) WorkflowPhase 型に 'document-review' を追加
  - Renderer側とMain側の両方の WorkflowPhase 型定義を更新
  - 型の一貫性を確保（両方の定義が同一であること）
  - _Requirements: 1.2_

- [x] 1.2 (P) AutoExecutionPermissions インタフェースに documentReview を追加
  - `'document-review': boolean` プロパティを追加
  - デフォルト値 `true` を DEFAULT_SPEC_AUTO_EXECUTION_STATE に設定
  - _Requirements: 2.1, 2.3_

- [x] 1.3 (P) SpecAutoExecutionState から documentReviewFlag を削除
  - `documentReviewFlag` フィールドを削除
  - `DocumentReviewFlag` 型定義を削除
  - 関連する型参照を更新
  - _Requirements: 2.2_

## 2. フェーズ順序とコーディネーターの変更

- [x] 2.1 PHASE_ORDER に 'document-review' を追加
  - `tasks` と `impl` の間に `'document-review'` を配置
  - 配列: `['requirements', 'design', 'tasks', 'document-review', 'impl', 'inspection']`
  - _Requirements: 1.1_
  - _Verify: Grep "document-review" in autoExecutionCoordinator.ts_

- [x] 2.2 execute-document-review イベントの廃止
  - AutoExecutionCoordinator から `execute-document-review` イベント定義を削除
  - 関連する handleAgentCompleted の tasks 完了時特殊分岐を削除
  - _Requirements: 3.1_
  - _Depends on: 3.1 (execute-next-phase への統合が先)_

- [x] 2.3 execute-inspection イベントの廃止
  - AutoExecutionCoordinator から `execute-inspection` イベント定義を削除
  - _Requirements: 5.1_
  - _Depends on: 3.1 (execute-next-phase への統合が先)_

## 3. イベントハンドラの統一

- [x] 3.1 execute-next-phase ハンドラに Document Review 処理を統合
  - 既存の `execute-document-review` ハンドラのロジックを移動
  - `phase === 'document-review'` の分岐を追加
  - Document Review ループ処理を維持
  - _Requirements: 3.2, 3.3, 3.4_
  - _Method: service.execute({ type: 'document-review' })_
  - _Verify: Grep "phase === 'document-review'" in handlers.ts_

- [x] 3.2 execute-next-phase ハンドラに inspection 処理を統合
  - 既存の `execute-inspection` ハンドラのロジックを移動
  - `phase === 'inspection'` の分岐を追加
  - autofix 等の固有処理を維持
  - _Requirements: 5.2, 5.3_
  - _Method: service.execute({ type: 'inspection' })_
  - _Verify: Grep "phase === 'inspection'" in handlers.ts_

- [x] 3.3 廃止イベントリスナーの削除
  - `coordinator.on('execute-document-review', ...)` リスナーを削除
  - `coordinator.on('execute-inspection', ...)` リスナーを削除
  - _Requirements: 3.1, 5.1_
  - _Depends on: 3.1, 3.2_

## 4. フェーズ完了判定ロジック

- [x] 4.1 Document Review フェーズの完了判定を実装
  - `documentReview.status === 'approved'` で完了とみなす
  - 完了後、次フェーズ（impl）への遷移をトリガー
  - 最大7ラウンドで approved にならない場合は paused 状態に
  - _Requirements: 4.1, 4.2, 4.3_
  - _Method: handleAgentCompleted, getImmediateNextPhase_

- [x] 4.2 NOGO 時の停止動作を確認
  - `permissions.documentReview === false` の場合に実行停止（スキップではない）
  - 既存の getImmediateNextPhase のNOGO処理パターンを再利用
  - _Requirements: 2.4_

## 5. マイグレーション処理

- [x] 5.1 FileService に documentReviewFlag マイグレーションロジックを追加
  - `readSpecJson` 時に `documentReviewFlag` を検出
  - `'run'` も `'pause'` も `permissions.documentReview: true` に変換
  - 変換後、メモリ上の値から `documentReviewFlag` を削除
  - 自動保存は行わず、次回 updateSpecJson 時に反映
  - _Requirements: 7.1, 7.2, 7.3_
  - _Verify: Grep "documentReviewFlag" in fileService.ts_

- [x] 5.2 spec.json autoExecution 構造から documentReviewFlag を削除
  - 新規作成時のデフォルト構造から documentReviewFlag を除外
  - 既存の spec.json 更新時にフィールドが削除されることを確認
  - _Requirements: 2.5_

## 6. Renderer ストアの更新

- [x] 6.1 workflowStore から documentReviewOptions を削除
  - `documentReviewOptions` フィールドを削除
  - `setDocumentReviewFlag` メソッドを削除
  - _Requirements: 6.1_

- [x] 6.2 persistSettingsToSpec から documentReviewFlag 関連コードを削除
  - `documentReviewFlag` の永続化コードを削除
  - permissions.documentReview の永続化が正しく動作することを確認
  - _Requirements: 6.1, 6.2_
  - _Depends on: 6.1_

## 7. UI コンポーネントの更新

- [x] 7.1 (P) documentReviewFlag トグル UI を削除
  - 設定 UI から documentReviewFlag のトグルを削除
  - 関連するコンポーネント参照を削除
  - **変更対象ファイル**:
    - `renderer/stores/workflowStore.ts` - `documentReviewOptions`, `setDocumentReviewAutoExecutionFlag` 削除
    - `renderer/hooks/useElectronWorkflowState.ts` - `documentReviewFlag` 参照削除
    - `renderer/stores/spec/specDetailStore.ts` - `documentReviewFlag` 参照削除
  - _Requirements: 6.1_

- [x] 7.2 (P) permissions.documentReview トグルを追加
  - 既存の permissions トグル UI パターンに従って追加
  - 他のフェーズと同様の GO/NOGO トグルを表示
  - **参照すべきパターン**:
    - `renderer/stores/workflowStore.ts` の `toggleAutoPermission` メソッド
    - `renderer/stores/workflowStore.ts` の `DEFAULT_AUTO_EXECUTION_PERMISSIONS`
    - `permissions.inspection` の実装パターンと同一
  - _Requirements: 6.2_

- [x] 7.3 フェーズ一覧表示に Document Review を追加
  - フェーズ表示ロジックを更新
  - PHASE_ORDER の変更が UI に反映されることを確認
  - _Requirements: 6.3_
  - _Depends on: 2.1_

## 8. Shared API 型の更新

- [x] 8.1 (P) AutoExecutionOptions から documentReviewFlag を削除
  - `shared/api/types.ts` の型定義を更新
  - IpcApiClient の関連コードを更新
  - _Requirements: 2.2, 2.5_

## 9. テストとバリデーション

- [x] 9.1 フェーズ遷移フローのテスト
  - `tasks` -> `document-review` -> `impl` の遷移を確認
  - NOGO 時の停止動作を確認
  - Document Review ループの動作を確認
  - _Requirements: 1.3, 2.4, 3.4, 4.1, 4.2, 4.3_

- [x] 9.2 マイグレーションのテスト
  - `documentReviewFlag: 'run'` → `permissions.documentReview: true` の変換
  - `documentReviewFlag: 'pause'` → `permissions.documentReview: true` の変換
  - マイグレーション後の spec.json 構造の確認
  - _Requirements: 7.1, 7.2, 7.3_
  - _Depends on: 5.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | PHASE_ORDER の順序変更 | 2.1 | Infrastructure |
| 1.2 | WorkflowPhase 型に 'document-review' 追加 | 1.1 | Infrastructure |
| 1.3 | フェーズ遷移ロジックの正しい処理 | 9.1 | Feature |
| 2.1 | AutoExecutionPermissions に documentReview 追加 | 1.2 | Infrastructure |
| 2.2 | documentReviewFlag フィールドの削除 | 1.3, 8.1 | Infrastructure |
| 2.3 | permissions.documentReview のデフォルト値 true | 1.2 | Infrastructure |
| 2.4 | NOGO 時の停止動作 | 4.2, 9.1 | Feature |
| 2.5 | spec.json から documentReviewFlag 削除 | 5.2, 8.1 | Infrastructure |
| 3.1 | execute-document-review イベント廃止 | 2.2, 3.3 | Infrastructure |
| 3.2 | execute-next-phase で Document Review 実行 | 3.1 | Feature |
| 3.3 | Document Review 固有処理の統合 | 3.1 | Feature |
| 3.4 | ループ処理の動作維持 | 3.1, 9.1 | Feature |
| 4.1 | documentReview.status === 'approved' で完了判定 | 4.1 | Feature |
| 4.2 | impl への遷移 | 4.1 | Feature |
| 4.3 | 最大7ラウンドで paused 状態 | 4.1, 9.1 | Feature |
| 5.1 | execute-inspection イベント廃止 | 2.3, 3.3 | Infrastructure |
| 5.2 | execute-next-phase で inspection 実行 | 3.2 | Feature |
| 5.3 | autofix 等の固有処理の維持 | 3.2 | Feature |
| 6.1 | documentReviewFlag トグル UI 削除 | 6.1, 6.2, 7.1 | Feature |
| 6.2 | permissions.documentReview トグル追加 | 7.2 | Feature |
| 6.3 | フェーズ一覧への Document Review 追加 | 7.3 | Feature |
| 7.1 | 既存 documentReviewFlag の読み込み | 5.1 | Feature |
| 7.2 | 'run' -> permissions.documentReview: true | 5.1, 9.2 | Feature |
| 7.3 | 'pause' -> permissions.documentReview: true | 5.1, 9.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 3.1), not container tasks (e.g., 3)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
