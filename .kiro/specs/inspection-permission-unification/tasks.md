# Implementation Plan

## Tasks

- [x] 1. 型定義の統一
- [x] 1.1 (P) useAutoExecution.ts に inspection と deploy フィールドを追加
  - `AutoExecutionPermissions` インターフェースに `inspection: boolean` を追加
  - `AutoExecutionPermissions` インターフェースに `deploy: boolean` を追加
  - 全6フェーズが必須フィールドとなる状態にする
  - _Requirements: 1.3, 1.5_
  - _Method: AutoExecutionPermissions interface_
  - _Verify: Grep "inspection: boolean" in useAutoExecution.ts_

- [x] 1.2 (P) autoExecutionCoordinator.ts の型定義をオプショナルから必須に変更
  - `inspection?: boolean` を `inspection: boolean` に変更
  - `deploy?: boolean` を `deploy: boolean` に変更
  - 型安全性を確保
  - _Requirements: 1.4, 1.5_
  - _Method: AutoExecutionPermissions interface_
  - _Verify: Grep "inspection: boolean" in autoExecutionCoordinator.ts_

- [x] 2. デフォルト値の統一
- [x] 2.1 workflowStore.ts の DEFAULT_AUTO_EXECUTION_PERMISSIONS を修正
  - `inspection` のデフォルト値を `false` から `true` に変更
  - types/index.ts の DEFAULT_SPEC_AUTO_EXECUTION_STATE.permissions.inspection: true と一致させる
  - _Requirements: 2.1, 2.3_
  - _Method: DEFAULT_AUTO_EXECUTION_PERMISSIONS_
  - _Verify: Grep "inspection: true" in workflowStore.ts_

- [x] 3. 重複概念の廃止（型定義）
- [x] 3.1 (P) SpecAutoExecutionState から inspectionFlag を削除
  - `types/index.ts` の `SpecAutoExecutionState` インターフェースから `inspectionFlag` フィールドを削除
  - 関連する `InspectionAutoExecutionFlag` 型定義を削除（InspectionPanel で使用していない場合）
  - _Requirements: 3.2, 3.4_
  - _Method: SpecAutoExecutionState interface_
  - _Verify: Grep "inspectionFlag" in types/index.ts returns 0 matches_

- [x] 3.2 (P) createSpecAutoExecutionState ファクトリーから inspectionFlag 処理を削除
  - `createSpecAutoExecutionState` 関数のパラメータ・処理から `inspectionFlag` を除去
  - `types/index.ts` 内の該当コードを修正
  - _Requirements: 3.5_
  - _Method: createSpecAutoExecutionState function_
  - _Verify: Grep "inspectionFlag" in createSpecAutoExecutionState function returns 0 matches_

- [x] 4. 重複概念の廃止（workflowStore）
- [x] 4.1 WorkflowState から inspectionAutoExecutionFlag を削除
  - `inspectionAutoExecutionFlag: InspectionAutoExecutionFlag` フィールドを削除
  - 初期状態から該当フィールドを除去
  - _Requirements: 3.1_
  - _Method: WorkflowState interface_
  - _Verify: Grep "inspectionAutoExecutionFlag" in workflowStore.ts returns 0 matches in state definition_

- [x] 4.2 WorkflowActions から setInspectionAutoExecutionFlag を削除
  - `setInspectionAutoExecutionFlag` アクションを削除
  - 関連するセレクター・派生ステートがあれば削除
  - _Requirements: 3.3_
  - _Method: WorkflowActions interface_
  - _Verify: Grep "setInspectionAutoExecutionFlag" in workflowStore.ts returns 0 matches_

- [x] 4.3 永続化ロジックから inspectionFlag を除外
  - `toSpecAutoExecutionState` ヘルパーから `inspectionFlag` マッピングを削除
  - `partialize` から `inspectionAutoExecutionFlag` を除外
  - spec.json 保存時に `inspectionFlag` を含めない
  - _Requirements: 3.6_
  - _Method: toSpecAutoExecutionState, partialize_
  - _Verify: Grep "inspectionFlag" in workflowStore.ts persistence logic returns 0 matches_

- [x] 5. InspectionPanel の UI 修正
- [x] 5.1 InspectionPanel から run/pause トグル関連の props を削除
  - `autoExecutionFlag` props を削除
  - `onAutoExecutionFlagChange` props を削除
  - `InspectionPanelProps` インターフェースを更新
  - _Requirements: 4.1, 4.4_
  - _Method: InspectionPanelProps interface_
  - _Verify: Grep "autoExecutionFlag|onAutoExecutionFlagChange" in InspectionPanel.tsx returns 0 matches in props_

- [x] 5.2 InspectionPanel から run/pause トグルの UI を削除
  - `getNextAutoExecutionFlag` ヘルパー関数を削除
  - `renderAutoExecutionFlagIcon` ヘルパー関数を削除
  - トグルボタンの JSX を削除
  - 表示専用コンポーネントとして機能するよう整理
  - _Requirements: 4.1_
  - _Method: InspectionPanel component_
  - _Verify: Visual inspection that toggle button is removed_

- [x] 6. WorkflowView の修正
- [x] 6.1 inspection フェーズの GO/NOGO 操作を確認
  - inspection フェーズが `toggleAutoPermission('inspection')` を使用して GO/NOGO を切り替えることを確認
  - 既存の PhaseItem パターンが適用されていることを検証
  - InspectionPanel への props から不要なものを削除
  - _Requirements: 4.2, 4.3_
  - _Method: toggleAutoPermission_
  - _Verify: Grep "toggleAutoPermission.*inspection" in WorkflowView_

- [x] 7. Main Process の後方互換性処理
- [x] 7.1 autoExecutionCoordinator に normalizePermissions を実装
  - `permissions.inspection` が `undefined` の場合、デフォルト `true` として扱う
  - `permissions.deploy` が `undefined` の場合、デフォルト `false` として扱う
  - 他フィールドも適切なデフォルト値を設定
  - _Requirements: 5.3, 6.1_
  - _Method: normalizePermissions helper_
  - _Verify: Grep "normalizePermissions|inspection ?? true" in autoExecutionCoordinator.ts_

- [x] 7.2 inspectionFlag からの互換変換を実装
  - 既存 spec.json に `inspectionFlag` がある場合の処理を実装
  - `inspectionFlag: 'run'` を `permissions.inspection: true` として解釈
  - `inspectionFlag: 'pause'` を `permissions.inspection: false` として解釈
  - 警告ログを出力（廃止予定であることを示す）
  - _Requirements: 6.2, 6.3, 6.4_
  - _Method: spec.json読み込みロジック, logger.warn_
  - _Verify: Grep "inspectionFlag.*run|pause" in autoExecutionCoordinator.ts_

- [x] 8. Remote UI の対応
- [x] 8.1 SpecActionsView の inspectionFlag 参照を削除
  - **事前確認**: `remote-ui/` 配下で `inspectionFlag` を参照している箇所を grep で確認
  - `inspectionFlag` の計算ロジックを `permissions.inspection` 参照に変更
  - InspectionPanel への props から `onAutoExecutionFlagChange` を削除
  - 不要になった変換ロジックを削除
  - _Requirements: 7.1, 7.2_
  - _Method: SpecActionsView component_
  - _Verify: Grep "inspectionFlag" in remote-ui/ returns 0 matches or only read-only reference_

- [x] 9. ユニットテスト
- [x] 9.1 (P) workflowStore のテスト追加
  - `toggleAutoPermission('inspection')` の動作テスト
  - `DEFAULT_AUTO_EXECUTION_PERMISSIONS.inspection === true` の確認テスト
  - `inspectionAutoExecutionFlag` 関連コードが存在しないことの確認
  - _Requirements: 2.1, 3.1, 3.3, 4.2_

- [x] 9.2 (P) createSpecAutoExecutionState のテスト追加
  - `inspectionFlag` なしで正しく動作することのテスト
  - `permissions.inspection` がデフォルトで `true` であることの確認
  - _Requirements: 3.5_

- [x] 9.3 (P) autoExecutionCoordinator の後方互換性テスト追加
  - `permissions.inspection: undefined` → `true` として扱われることのテスト
  - 旧形式 spec.json（`inspectionFlag` あり）の読み込みテスト
  - `inspectionFlag: 'run'` → `permissions.inspection: true` 変換のテスト
  - `inspectionFlag: 'pause'` → `permissions.inspection: false` 変換のテスト
  - _Requirements: 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 10. 統合検証
- [x] 10.1 ビルドと型チェック
  - `npm run build && npm run typecheck` を実行
  - TypeScript コンパイルエラーがないことを確認
  - 型定義の不整合による実行時エラーがないことを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 10.2 自動実行フローの動作確認
  - impl 完了後に inspection がトリガーされることを確認
  - `permissions.inspection: false` で inspection がスキップされることを確認
  - GO/NOGO トグルが正しく動作することを確認
  - _Requirements: 5.1, 5.2, 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | renderer/types/index.ts で inspection 必須 | N/A (既に必須) | N/A |
| 1.2 | workflowStore.ts で inspection 必須 | N/A (既に必須) | N/A |
| 1.3 | useAutoExecution.ts に inspection 追加 | 1.1 | Infrastructure |
| 1.4 | autoExecutionCoordinator.ts で inspection 必須 | 1.2 | Infrastructure |
| 1.5 | deploy も必須フィールド化 | 1.1, 1.2 | Infrastructure |
| 2.1 | workflowStore デフォルト inspection: true | 2.1 | Infrastructure |
| 2.2 | types/index.ts デフォルト inspection: true | N/A (既に true) | N/A |
| 2.3 | 両者のデフォルト値一致 | 2.1 | Infrastructure |
| 3.1 | inspectionAutoExecutionFlag 削除 | 4.1 | Infrastructure |
| 3.2 | InspectionAutoExecutionFlag 型廃止 | 3.1 | Infrastructure |
| 3.3 | setInspectionAutoExecutionFlag 削除 | 4.2 | Infrastructure |
| 3.4 | SpecAutoExecutionState から inspectionFlag 削除 | 3.1 | Infrastructure |
| 3.5 | createSpecAutoExecutionState から inspectionFlag 削除 | 3.2 | Infrastructure |
| 3.6 | spec.json 永続化から inspectionFlag 除外 | 4.3 | Infrastructure |
| 4.1 | InspectionPanel から run/pause スイッチ削除 | 5.1, 5.2 | Feature |
| 4.2 | inspection GO/NOGO を permissions.inspection で管理 | 6.1 | Feature |
| 4.3 | inspection トグルが toggleAutoPermission 呼び出し | 6.1 | Feature |
| 4.4 | InspectionPanel は表示のみ | 5.1 | Feature |
| 5.1 | getImmediateNextPhase で permissions.inspection 判定 | 10.2 | Feature |
| 5.2 | inspection: false で自動実行停止 | 10.2 | Feature |
| 5.3 | inspection: undefined でデフォルト true | 7.1 | Infrastructure |
| 6.1 | 既存 spec.json に inspection がない場合 | 7.1 | Infrastructure |
| 6.2 | inspectionFlag がある場合は無視 | 7.2 | Infrastructure |
| 6.3 | inspectionFlag: 'run' を true と解釈 | 7.2 | Infrastructure |
| 6.4 | inspectionFlag: 'pause' を false と解釈 | 7.2 | Infrastructure |
| 7.1 | Remote UI で inspection 設定変更が同期 | 8.1 | Feature |
| 7.2 | SpecActionsView で permissions.inspection 参照 | 8.1 | Feature |
