# Requirements: Remove Inspection Phase Auto-Update

## Decision Log

### Decision 1: 削除範囲の選択
- **Discussion**: specsWatcherServiceには3つの自動更新がある：(A) 全削除、(B) inspection-complete自動更新のみ削除、(C) 条件付き削除
- **Conclusion**: (B) inspection-complete自動更新のみ削除
- **Rationale**:
  - 今回の問題はinspection-complete vs deploy-completeの競合
  - implementation-complete自動更新は問題を起こしていない
  - 段階的移行で変更範囲を最小化

### Decision 2: コマンド側の責務配分
- **Discussion**: phase更新の責務をどのコマンドに持たせるか
- **Conclusion**:
  - spec-inspectionが`inspection-complete`に更新（新規追加）
  - spec-mergeは`deploy-complete`に更新（既存維持）
  - implementation-complete自動更新は維持（別specで対応）
- **Rationale**:
  - コマンドが明示的にspec.jsonを更新することで予測可能性が向上
  - Git履歴に残る
  - 競合状態を回避

### Decision 3: UI更新メカニズム
- **Discussion**: 自動更新削除後のUI更新方法
- **Conclusion**: chokidarのファイル監視は維持し、コマンドのspec.json更新をトリガーとする
- **Rationale**:
  - specsWatcherServiceの本来の責務（ファイル監視）は保持
  - コマンド更新 → chokidar検知 → UI更新のフローは健全

### Decision 4: Phase遷移の順序制約
- **Discussion**: (A) 順序必須型（inspection-complete必須）、(B) 直接遷移型、(C) ハイブリッド型
- **Conclusion**: (C) ハイブリッド型を採用
- **Rationale**:
  - spec-inspectionがGO判定時に`inspection-complete`に更新
  - spec-mergeは`inspection-complete`状態を前提条件としてチェック
  - spec-phase-auto-updateのInvariant（deploy-completeはinspection-complete以降）を維持

### Decision 5: spec-phase-auto-updateとの関係
- **Discussion**: 元のspecをどう扱うか（rollback、deprecation、履歴保持）
- **Conclusion**: specディレクトリは履歴として保持、コードは部分的に修正
- **Rationale**:
  - implementation-complete自動更新は有用なまま
  - 設計判断の履歴を保持
  - 段階的な責務移行の記録

## Introduction

specsWatcherServiceによるinspection-complete phase自動更新を削除し、spec-inspectionコマンドが明示的にphaseを更新する責務を持つように変更する。これにより、spec-mergeとの競合状態を解消し、phase更新の予測可能性を向上させる。

## Requirements

### Requirement 1: specsWatcherServiceからのinspection-complete自動更新削除

**Objective:** 開発者として、inspection-complete phaseへの自動更新による競合状態を解消したい。これにより、spec-mergeが設定したdeploy-completeが上書きされることを防ぐ。

#### Acceptance Criteria
1. When spec.json.inspection field is updated with GO judgment, the specsWatcherService shall NOT automatically update phase to `inspection-complete`
2. The specsWatcherService shall NOT call `fileService.updateSpecJsonFromPhase` with `inspection-complete` parameter
3. The `checkInspectionCompletion` method shall be removed from specsWatcherService
4. When spec.json is manually updated to `inspection-complete` by a command, the specsWatcherService shall detect the file change and emit events normally

### Requirement 2: spec-inspectionコマンドによるphase更新

**Objective:** ユーザーとして、spec-inspectionがGO判定を出したときにspec.json.phaseが`inspection-complete`に更新されてほしい。これにより、phase更新の主体が明確になり、Git履歴に残る。

#### Acceptance Criteria
1. When spec-inspection agent generates an inspection report with GO judgment, the system shall update spec.json.phase to `inspection-complete`
2. When spec-inspection agent generates an inspection report with NOGO judgment, the system shall NOT update spec.json.phase
3. The phase update shall occur within the spec-inspection agent execution, before the agent completes
4. When phase is updated to `inspection-complete`, the system shall also update spec.json.updated_at to current UTC timestamp
5. If spec.json.phase is already `inspection-complete` or `deploy-complete`, the system shall NOT modify the phase

### Requirement 3: spec-mergeによる前提条件チェック

**Objective:** 開発者として、spec-mergeがinspection-complete状態のspecのみをマージできるようにしたい。これにより、Phase遷移の順序制約（Invariant）を維持する。

#### Acceptance Criteria
1. When spec-merge is invoked, the system shall read spec.json.phase from the worktree
2. If phase is NOT `inspection-complete`, the system shall abort merge with error message: "spec-mergeはinspection-complete状態のspecのみマージ可能です。現在のphase: {phase}"
3. If inspection.rounds exists and the latest round result is NOT "go", the system shall abort merge with error message: "Inspection GO判定が必要です"
4. When phase validation passes, spec-merge shall proceed with updating phase to `deploy-complete` as before

### Requirement 4: implementation-complete自動更新の維持

**Objective:** 開発者として、既存のimplementation-complete自動更新は維持したい。これにより、今回の変更範囲を最小化し、別specで対応する準備をする。

#### Acceptance Criteria
1. When all tasks in tasks.md are marked complete, the specsWatcherService shall continue to update phase to `implementation-complete`
2. The `checkTaskCompletion` method shall remain in specsWatcherService unchanged
3. The behavior of implementation-complete auto-update shall be identical to before this change

### Requirement 5: ファイル監視機能の維持

**Objective:** 開発者として、specsWatcherServiceのファイル監視機能は維持したい。これにより、コマンドによるspec.json更新をUIが即座に反映できる。

#### Acceptance Criteria
1. The specsWatcherService shall continue to monitor `.kiro/specs/` directory for file changes
2. When spec.json is modified by any source (command or external edit), the specsWatcherService shall detect the change within 300ms (debounce period)
3. When spec.json phase changes, the specsWatcherService shall emit change events to UI components
4. The chokidar file watcher configuration shall remain unchanged

### Requirement 6: テストの更新

**Objective:** 開発者として、specsWatcherServiceのテストがinspection-complete自動更新を検証しないようにしたい。これにより、削除された機能へのテスト依存を解消する。

#### Acceptance Criteria
1. Tests that verify `checkInspectionCompletion` behavior shall be removed from specsWatcherService.test.ts
2. Tests that verify inspection-complete phase auto-update shall be removed
3. Tests that verify implementation-complete auto-update shall remain unchanged
4. New tests shall NOT be added for inspection-complete auto-update behavior

### Requirement 7: spec-inspectionコマンドのテスト追加

**Objective:** 開発者として、spec-inspectionによるphase更新が正しく動作することを検証したい。これにより、新しい責務が適切に実装されていることを保証する。

#### Acceptance Criteria
1. Tests shall verify that GO judgment updates phase to `inspection-complete`
2. Tests shall verify that NOGO judgment does NOT update phase
3. Tests shall verify that phase update includes updated_at timestamp update
4. Tests shall verify that existing `inspection-complete` or `deploy-complete` phase is not modified

## Out of Scope

- implementation-complete自動更新の削除（別specで対応）
- deploy-complete自動更新の実装（元々未実装）
- spec-phase-auto-updateの完全なロールバック
- phase遷移バリデーションロジックの変更
- Remote UIのphase表示の変更（既存の表示ロジックをそのまま使用）

## Open Questions

- spec-inspectionエージェントからspec.jsonを更新する最適な方法は？（直接Write or IPC経由？）
- phase更新失敗時のエラーハンドリングは？（ログのみ or ユーザー通知？）
- 既存のinspection-*.mdファイルとspec.json.phaseの不整合がある場合の対処は？
