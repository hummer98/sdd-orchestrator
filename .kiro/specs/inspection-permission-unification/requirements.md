# Requirements: Inspection Permission Unification

## Decision Log

### 1. UI統一方式の選択
- **Discussion**: Inspection の GO/NOGO 設定について、A) PhaseItem の GO/NOGO トグルで統一、B) InspectionPanel での 'run' | 'pause' スイッチを維持、の2案を検討
- **Conclusion**: Option A - PhaseItem の GO/NOGO トグルで統一
- **Rationale**: 全フェーズで一貫したUIパターンを提供し、コードの複雑性を削減する。`inspectionAutoExecutionFlag` 関連のコードを削除できる

### 2. デフォルト値の決定
- **Discussion**: inspection のデフォルトを GO (true) にするか NOGO (false) にするか
- **Conclusion**: デフォルトは GO (true)
- **Rationale**: impl が完了したら自動的に inspection が実行される動作が期待される。手動で GO に切り替える手間を省く

### 3. スコープの確定
- **Discussion**: 修正範囲の確認
- **Conclusion**: 型定義の統一（4箇所）、デフォルト値の統一、Main Process側の判定ロジック修正、UI側の重複設定の整理
- **Rationale**: 不整合の根本原因をすべて解消し、将来の混乱を防ぐ

## Introduction

自動実行フローにおいて、impl 完了後に Inspection がトリガーされない問題が発生している。原因は `AutoExecutionPermissions` 型の定義とデフォルト値が複数箇所で不整合になっていること、および `permissions.inspection` と `inspectionAutoExecutionFlag` という2つの重複した概念が存在することにある。本機能では、これらを統一し、inspection を必須フィールドとして一貫した動作を実現する。

## Requirements

### Requirement 1: 型定義の統一

**Objective:** As a developer, I want consistent type definitions for `AutoExecutionPermissions` across all modules, so that type safety is guaranteed and confusion is eliminated.

#### Acceptance Criteria

1. `renderer/types/index.ts` の `AutoExecutionPermissions` は `inspection: boolean` を必須フィールドとして定義すること
2. `renderer/stores/workflowStore.ts` の `AutoExecutionPermissions` は `inspection: boolean` を必須フィールドとして定義すること
3. `renderer/hooks/useAutoExecution.ts` の `AutoExecutionPermissions` に `inspection: boolean` を必須フィールドとして追加すること
4. `main/services/autoExecutionCoordinator.ts` の `AutoExecutionPermissions` は `inspection: boolean` を必須フィールドとして定義すること（オプショナルから変更）
5. `deploy: boolean` も同様に必須フィールドとすること

### Requirement 2: デフォルト値の統一

**Objective:** As a user, I want inspection to run automatically after impl completion by default, so that I don't need to manually enable it.

#### Acceptance Criteria

1. `DEFAULT_AUTO_EXECUTION_PERMISSIONS`（workflowStore.ts）の `inspection` は `true` をデフォルト値とすること
2. `DEFAULT_SPEC_AUTO_EXECUTION_STATE.permissions`（types/index.ts）の `inspection` は `true` をデフォルト値とすること（現状維持）
3. 両者のデフォルト値が一致すること

### Requirement 3: 重複概念の廃止

**Objective:** As a developer, I want a single source of truth for inspection auto-execution permission, so that the codebase is maintainable.

#### Acceptance Criteria

1. `inspectionAutoExecutionFlag: 'run' | 'pause'` フィールドを `WorkflowState` から削除すること
2. `InspectionAutoExecutionFlag` 型を廃止すること
3. `setInspectionAutoExecutionFlag` アクションを `WorkflowActions` から削除すること
4. `SpecAutoExecutionState` から `inspectionFlag` フィールドを削除すること
5. `createSpecAutoExecutionState` ファクトリー関数から `inspectionFlag` 関連の処理を削除すること
6. spec.json への永続化から `inspectionFlag` を除外すること

### Requirement 4: UI の統一

**Objective:** As a user, I want to control inspection auto-execution using the same UI pattern as other phases, so that the interface is intuitive.

#### Acceptance Criteria

1. InspectionPanel から 'run' | 'pause' スイッチを削除すること
2. inspection の GO/NOGO は `workflowStore.autoExecutionPermissions.inspection` で管理すること
3. WorkflowView において inspection フェーズのトグル操作が `toggleAutoPermission('inspection')` を呼び出すこと
4. InspectionPanel は `autoExecutionPermissions.inspection` の値を表示のみに使用すること（トグル操作は PhaseItem 側で行う）

### Requirement 5: Main Process の判定ロジック修正

**Objective:** As a system, I want to correctly evaluate inspection permission in the auto-execution flow, so that inspection runs when enabled.

#### Acceptance Criteria

1. `getImmediateNextPhase` メソッドにおいて、`permissions.inspection` が `true` の場合、impl 完了後に inspection フェーズを返すこと
2. `permissions.inspection` が `false` の場合、impl 完了後に自動実行を停止すること
3. `permissions.inspection` が `undefined` の場合、デフォルト値 `true` として扱うこと（後方互換性）

### Requirement 6: 後方互換性

**Objective:** As an existing user, I want my current specs to continue working without manual migration, so that the upgrade is seamless.

#### Acceptance Criteria

1. 既存の spec.json に `autoExecution.permissions.inspection` がない場合、デフォルト値 `true` として動作すること
2. 既存の spec.json に `autoExecution.inspectionFlag` がある場合、無視して動作すること（エラーにならない）
3. `autoExecution.inspectionFlag: 'run'` は `permissions.inspection: true` と同等に解釈すること（移行期間のみ）
4. `autoExecution.inspectionFlag: 'pause'` は `permissions.inspection: false` と同等に解釈すること（移行期間のみ）

### Requirement 7: Remote UI 対応

**Objective:** As a Remote UI user, I want inspection permission changes to be synchronized, so that the behavior is consistent across clients.

#### Acceptance Criteria

1. Remote UI において inspection の GO/NOGO 設定変更が WebSocket 経由で同期されること
2. SpecActionsView での inspection 権限表示が `autoExecutionPermissions.inspection` を参照すること

## Out of Scope

- Inspection 結果（GO/NOGO）の判定ロジック変更
- InspectionPanel の表示内容（結果表示、Fix ボタン等）の変更
- deploy フェーズの自動実行ロジック
- spec.json のマイグレーションスクリプト作成（後方互換性で対応）

## Open Questions

- 移行期間後に `inspectionFlag` のフォールバック処理を削除するタイミング（次メジャーバージョン？）
