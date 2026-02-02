# Requirements: WebSocket コマンド実行の汎用化

## Decision Log

### IPC側との一貫性
- **議論**: IPC側は `EXECUTE_PROJECT_COMMAND` で汎用化済み。WebSocket側は `ASK_PROJECT`, `ASK_SPEC`, `CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN` と個別メッセージタイプが乱立し、一部は未実装（WorkflowController側が欠落）で動作しない
- **結論**: WebSocket側もIPC側と同じ汎用コマンド実行パターンに統一する
- **理由**: DRY原則。新しいコマンド追加時に個別ハンドラを追加する必要がなくなる

### 個別ハンドラの扱い
- **議論**: 動作中の `CREATE_SPEC`, `CREATE_BUG` を残すか、壊れている `ASK_PROJECT`, `ASK_SPEC`, `EXECUTE_SPEC_PLAN` のみ修正するか
- **結論**: 全て削除し汎用コマンドに統合する
- **理由**: 中途半端に残すとIPC側と同じ問題（新コマンド毎に個別対応が必要）が再発する

### Spec-levelコマンドの汎用化
- **議論**: Project-levelのみ汎用化するか、Spec-levelも汎用化するか
- **結論**: 両方汎用化する。`EXECUTE_PROJECT_COMMAND` と `EXECUTE_SPEC_COMMAND` の2チャネル
- **理由**: Spec-levelは `specId` と `featureName` が必要であり、Project-levelとは引数が異なるため別チャネルとする

## Introduction

WebSocketHandler経由のコマンド実行を汎用化する。現在、Remote UIからのエージェント起動は機能毎に個別のWebSocketメッセージタイプ・ハンドラ・WorkflowControllerメソッドを必要としており、IPC側で既に完了している汎用化と整合しない。本変更で `EXECUTE_PROJECT_COMMAND`（Project-level）と `EXECUTE_SPEC_COMMAND`（Spec-level）の2つの汎用メッセージタイプに統合し、個別ハンドラを全て削除する。

## Requirements

### Requirement 1: EXECUTE_PROJECT_COMMAND WebSocket実装

**Objective:** Remote UIからProject-levelの任意のコマンド（project-ask, spec-init, bug-create, spec-plan, release等）を汎用的に実行できるようにする

#### Acceptance Criteria
1. When Remote UIが `EXECUTE_PROJECT_COMMAND` WebSocketメッセージを送信した場合、the system shall `specManagerService.startAgent()` を `specId: ''` で呼び出してエージェントを起動する
2. When メッセージペイロードに `command`（コマンド文字列）と `title`（表示名）が含まれている場合、the system shall `command` を `args` に、`title` を `phase` に渡す
3. If `command` または `title` が未指定の場合、then the system shall `INVALID_PAYLOAD` エラーを返却する
4. When エージェント起動が成功した場合、the system shall `EXECUTE_PROJECT_COMMAND_STARTED` レスポンスに `agentId` を含めて返却する
5. If エージェント起動が失敗した場合、then the system shall `ERROR` レスポンスにエラー種別とメッセージを含めて返却する

### Requirement 2: EXECUTE_SPEC_COMMAND WebSocket実装

**Objective:** Remote UIからSpec-levelの任意のコマンド（spec-ask等）を汎用的に実行できるようにする

#### Acceptance Criteria
1. When Remote UIが `EXECUTE_SPEC_COMMAND` WebSocketメッセージを送信した場合、the system shall `specManagerService.startAgent()` を指定された `specId` で呼び出してエージェントを起動する
2. When メッセージペイロードに `specId`, `featureName`, `command`, `title` が含まれている場合、the system shall `command` を `args` に、`title` を `phase` に渡す
3. If 必須フィールド（`specId`, `featureName`, `command`, `title`）のいずれかが未指定の場合、then the system shall `INVALID_PAYLOAD` エラーを返却する
4. When エージェント起動が成功した場合、the system shall `EXECUTE_SPEC_COMMAND_STARTED` レスポンスに `specId` と `agentId` を含めて返却する
5. If エージェント起動が失敗した場合、then the system shall `ERROR` レスポンスにエラー種別とメッセージを含めて返却する

### Requirement 3: WorkflowControllerインターフェースの汎用化

**Objective:** WorkflowControllerに汎用コマンド実行メソッドを追加し、動作していない個別メソッドを削除する

#### Acceptance Criteria
1. The system shall WorkflowControllerインターフェースに `executeProjectCommand(command: string, title: string)` メソッドを定義する
2. The system shall WorkflowControllerインターフェースに `executeSpecCommand(specId: string, featureName: string, command: string, title: string)` メソッドを定義する
3. The system shall WorkflowControllerインターフェースから以下の個別メソッドを削除する: `executeAskProject`, `executeAskSpec`
4. The system shall `createWorkflowController()` で `executeProjectCommand` と `executeSpecCommand` を実装し、`specManagerService.startAgent()` に委譲する

**Note:** `createSpec`, `createBug`, `executeSpecPlan` メソッドは正常に動作しているため維持する（Requirement 6.3, 6.4 参照）。

### Requirement 4: 個別WebSocketハンドラの削除

**Objective:** 汎用コマンドに統合された個別のWebSocketメッセージタイプとハンドラを削除する

#### Acceptance Criteria
1. The system shall 以下のWebSocketメッセージタイプのcase文を削除する: `ASK_PROJECT`, `ASK_SPEC`
2. The system shall 以下のハンドラメソッドを削除する: `handleAskProject`, `handleAskSpec`
3. The system shall 削除されたハンドラに関連するテストを削除する

**Note:** `CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN` メッセージタイプおよび対応するハンドラは、正常に動作しており、本仕様では維持する（Requirement 6.3, 6.4 参照）。

### Requirement 5: WebSocketApiClient の更新

**Objective:** Remote UIクライアントが汎用コマンド実行APIを使用するよう更新する

#### Acceptance Criteria
1. The system shall `WebSocketApiClient.executeProjectCommand()` の NOT_IMPLEMENTED スタブを実際の `EXECUTE_PROJECT_COMMAND` WebSocketリクエストに置き換える
2. The system shall `WebSocketApiClient` に `executeSpecCommand(specId, featureName, command, title)` メソッドを追加し、`EXECUTE_SPEC_COMMAND` WebSocketリクエストを送信する
3. The system shall `WebSocketApiClient` から `executeAskProject` と `executeAskSpec` メソッドを削除する
4. The system shall `ApiClient` インターフェース（types.ts）から `executeAskProject?` と `executeAskSpec?` を削除する
5. The system shall `ApiClient` インターフェースに `executeSpecCommand` メソッドを追加する

### Requirement 6: Remote UI呼び出し側の更新

**Objective:** Remote UIコンポーネントが汎用APIを使用するよう更新する

#### Acceptance Criteria
1. When Remote UIでProject Askを実行する場合、the system shall `executeProjectCommand('/kiro:project-ask "${prompt}"', 'project-ask')` を呼び出す
2. When Remote UIでSpec Askを実行する場合、the system shall `executeSpecCommand(specId, featureName, '/kiro:spec-ask "${prompt}"', 'spec-ask')` を呼び出す
3. When Remote UIでSpec作成（spec-plan）を実行する場合、the system shall 既存の `executeSpecPlan(description, useWorktree)` APIを使用する（`EXECUTE_SPEC_PLAN` WebSocketメッセージタイプは維持）
4. When Remote UIでBug作成を実行する場合、the system shall 既存の `createBug(name, description)` APIを使用する（`CREATE_BUG` WebSocketメッセージタイプは維持）
5. When Remote UIでSpec Plan実行する場合、the system shall 既存の `executeSpecPlan(description, useWorktree)` APIを使用する（受入基準6.3と同一）

**Note:** 受入基準 6.3, 6.4 については、既存の専用API（`executeSpecPlan`, `createBug`）が正常に動作しており、これらを汎用コマンドに統合することは本仕様のスコープ外とする。将来的な統合は別途検討する。

### Requirement 7: IpcApiClientとの整合性

**Objective:** IpcApiClientにもSpec-level汎用コマンドメソッドを追加し、APIインターフェースを統一する

#### Acceptance Criteria
1. The system shall `IpcApiClient` に `executeSpecCommand(specId, featureName, command, title)` メソッドを実装する
2. When `executeSpecCommand` が呼ばれた場合、the system shall IPC `EXECUTE_PROJECT_COMMAND` チャネルを使用して（specIdをコマンドに含めて）エージェントを起動する、または新規IPCチャネルを追加する

## Out of Scope

- `EXECUTE_PHASE`, `EXECUTE`, `EXECUTE_BUG_PHASE`, `EXECUTE_DOCUMENT_REVIEW` 等の既存の構造化されたSpec実行ハンドラの統合（これらは `ExecuteOptions` discriminated unionで型安全に管理されており、別の設計判断が必要）
- `INSPECTION_START`, `INSPECTION_FIX` ハンドラの統合
- IPC側の `EXECUTE_PROJECT_COMMAND` の変更（既に動作中）
- Auto Execution関連ハンドラの変更

## Open Questions

- Requirement 7: IpcApiClient側の `executeSpecCommand` 実装で、既存の IPC `EXECUTE_PROJECT_COMMAND` チャネルを再利用するか、新規 `EXECUTE_SPEC_COMMAND` IPCチャネルを追加するか（設計フェーズで決定）
