# Requirements: AutoExecution ProjectPath Fix

## Decision Log

### 修正範囲

- **Discussion**: Main Process内のみの最小限修正か、API境界を含めた正しい修正か
- **Conclusion**: API境界を含めて正しく修正（IPC、preload、renderer側も含む）
- **Rationale**: 逆算によるパス取得は不自然であり、根本原因を解決するため

### BugAutoExecutionCoordinatorの扱い

- **Discussion**: 同様のパターンがBugAutoExecutionCoordinatorにも存在する可能性
- **Conclusion**: 同時に修正する
- **Rationale**: 同じ問題が存在する場合、一貫性のため同時に対応すべき

### 既存worktree内events.jsonlの扱い

- **Discussion**: 既にworktree内に記録されたログのマイグレーション要否
- **Conclusion**: 放置（マージ時に消える）
- **Rationale**: events.jsonlは.gitignoreされており、マイグレーション不要

## Introduction

`AutoExecutionCoordinator`および`BugAutoExecutionCoordinator`が`EventLogService`を呼び出す際、`specPath`から`projectPath`を逆算しているため、worktree環境でイベントログが誤った場所（worktree内）に記録される問題を修正する。`start()`メソッドに`projectPath`パラメータを追加し、状態として保持することで、常にメインリポジトリの正しい場所にログを記録する。

## Requirements

### Requirement 1: AutoExecutionCoordinator の projectPath 保持

**Objective:** 開発者として、AutoExecutionCoordinatorがprojectPathを正しく保持できるようにしたい。これによりworktree環境でも正しい場所にイベントログが記録される。

#### Acceptance Criteria

1. `AutoExecutionState`型に`projectPath: string`フィールドが追加されること
2. `start()`メソッドのシグネチャが`start(projectPath, specPath, specId, options)`に変更されること
3. `start()`呼び出し時に渡された`projectPath`が`AutoExecutionState`に保存されること
4. `logAutoExecutionEvent()`が`state.projectPath`を使用して`EventLogService.logEvent()`を呼び出すこと
5. 既存の`specPath`からの逆算ロジックが削除されること

### Requirement 2: BugAutoExecutionCoordinator の projectPath 保持

**Objective:** 開発者として、BugAutoExecutionCoordinatorも同様にprojectPathを正しく保持できるようにしたい。

#### Acceptance Criteria

1. `BugAutoExecutionState`型に`projectPath: string`フィールドが追加されること（存在しない場合）
2. `start()`メソッドのシグネチャに`projectPath`が追加されること（存在しない場合）
3. イベントログ記録時に正しい`projectPath`が使用されること

### Requirement 3: IPC境界の修正

**Objective:** 開発者として、IPC経由での自動実行開始時もprojectPathが正しく伝播されるようにしたい。

#### Acceptance Criteria

1. `autoExecutionHandlers.ts`の`StartParams`インターフェースに`projectPath: string`が追加されること
2. `bugAutoExecutionHandlers.ts`の対応するパラメータ型にも`projectPath`が追加されること
3. IPCハンドラが受け取った`projectPath`を`coordinator.start()`に渡すこと

### Requirement 4: Preload/Renderer側の修正

**Objective:** 開発者として、UI側から自動実行を開始する際にprojectPathが正しく送信されるようにしたい。

#### Acceptance Criteria

1. `preload/index.ts`のIPC呼び出しが`projectPath`を含むこと
2. `ElectronSpecWorkflowApi.ts`の`startAutoExecution()`が`projectPath`を渡すこと
3. Renderer側のstore/hookが`projectPath`を適切に取得・送信すること

### Requirement 5: MCP経由の呼び出し修正

**Objective:** 開発者として、MCP経由での自動実行開始時もprojectPathが正しく伝播されるようにしたい。

#### Acceptance Criteria

1. `specToolHandlers.ts`の`startAutoExecution()`が`coordinator.start()`に`projectPath`を渡すこと
2. `bugToolHandlers.ts`も同様に修正されること

### Requirement 6: テストの修正

**Objective:** 開発者として、すべてのテストがAPI変更に追従し、パスするようにしたい。

#### Acceptance Criteria

1. `autoExecutionCoordinator.test.ts`の全`start()`呼び出し（約84箇所）が新しいシグネチャに更新されること
2. `autoExecutionHandlers.test.ts`のテストが更新されること
3. `bugAutoExecutionCoordinator.test.ts`のテストが更新されること
4. Renderer側のテストが更新されること
5. すべてのテストがパスすること

## Out of Scope

- 既存のworktree内events.jsonlのマイグレーション
- EventLogService自体のAPI変更（projectPathを受け取る現在の設計を維持）
- 他のサービスでの類似問題の調査・修正

## Open Questions

- `LogFileService`（agentログ）は`SpecManagerService`初期化時にprojectPathを受け取り正しく動作している。同様のDIパターンをAutoExecutionCoordinatorに適用すべきか？（現時点では`start()`の引数追加で対応）
