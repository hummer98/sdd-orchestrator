# Requirements: Execute Method Unification

## Decision Log

### execute*メソッドの統一方針

- **Discussion**: 現状8-9個の`execute*`メソッドがほぼ同じパターンで分散しており、worktreeCwd解決漏れ等のバグが発生。個別メソッドを維持するか、統一するか検討。
- **Conclusion**: Union型で各フェーズの引数を定義し、`execute`メソッドに一本化する
- **Rationale**: コード重複の排除、横断的機能追加時の漏れ防止、SSOTの原則

### worktreeCwd解決の責務

- **Discussion**: worktreeCwdを呼び出し元で解決するか、`startAgent`で自動解決するか
- **Conclusion**: `startAgent`内で`group === 'impl'`の場合に自動解決
- **Rationale**: worktreeモードの管理責務はMain Process。呼び出し元が意識する必要をなくすことで漏れを防止

### IPCチャンネルの統一

- **Discussion**: 現状`EXECUTE_PHASE`と`EXECUTE_TASK_IMPL`が別チャンネル。統一するか維持するか
- **Conclusion**: `EXECUTE`一本に統一、後方互換は考慮しない
- **Rationale**: Renderer側からUnion型のOptionsを渡す方がシンプル。分岐の複雑さを排除

### 既存メソッドの扱い

- **Discussion**: 統一後、既存の`executeTaskImpl`等をラッパーとして残すか削除するか
- **Conclusion**: 削除して`execute`に一本化
- **Rationale**: ラッパーを残すと「どちらを呼ぶべきか」の混乱が残る。SSOTで一本化すべき

### engine切り替え（document-review）

- **Discussion**: `executeDocumentReview`は外部コマンド（gemini, debatex）を起動する特殊ケース。別メソッドとして残すか統一するか
- **Conclusion**: `execute`メソッド内で分岐させる
- **Rationale**: 「フェーズを実行する」という責務は同じ。schemeはオプションの一つに過ぎない

## Introduction

`specManagerService.ts`の`execute*`メソッド群（8-9個）を統一し、コード重複を排除する。Union型で各フェーズの引数を定義し、単一の`execute`メソッドで処理する。また、`startAgent`内でworktreeCwdを自動解決することで、呼び出し元での渡し忘れを防止する。

## Requirements

### Requirement 1: Union型による引数定義

**Objective:** As a developer, I want phase-specific options defined as Union type, so that type safety is ensured while maintaining a single entry point.

#### Acceptance Criteria

1. 各フェーズの引数を個別のinterfaceで定義する（`ExecuteRequirements`, `ExecuteDesign`, `ExecuteTasks`, `ExecuteImpl`, `ExecuteDocumentReview`, `ExecuteDocumentReviewReply`, `ExecuteInspection`, `ExecuteInspectionFix`, `ExecuteSpecMerge`等）
2. 共通フィールド（`specId`, `featureName`, `commandPrefix`）は`ExecutePhaseBase`として抽出する
3. `type`フィールド（discriminant）で各フェーズを区別する
4. 全てのinterfaceを`ExecuteOptions`としてUnion型にまとめる
5. 型定義は`types/`ディレクトリに配置する

### Requirement 2: executeメソッドの統一

**Objective:** As a developer, I want a single execute method that handles all phases, so that code duplication is eliminated.

#### Acceptance Criteria

1. `specManagerService.ts`に`execute(options: ExecuteOptions)`メソッドを実装する
2. `options.type`で分岐し、各フェーズのslashCommand、phase名、groupを解決する
3. document-reviewの場合は`scheme`オプションでengine（claude/gemini/debatex）を切り替える
4. 既存の`executePhase`, `executeTaskImpl`, `executeDocumentReview`, `executeDocumentReviewReply`, `executeDocumentReviewFix`, `executeInspection`, `executeInspectionFix`, `executeSpecMerge`メソッドを削除する
5. `execute`メソッドは`startAgent`を呼び出す（worktreeCwd解決は`startAgent`に委譲）

### Requirement 3: startAgentでのworktreeCwd自動解決

**Objective:** As a developer, I want worktreeCwd to be automatically resolved in startAgent, so that callers don't need to remember to pass it.

#### Acceptance Criteria

1. `startAgent`メソッド内で、`group === 'impl'`かつ`worktreeCwd`が渡されていない場合、`getSpecWorktreeCwd(specId)`を呼び出して自動解決する
2. 明示的に`worktreeCwd`が渡された場合はそれを優先する（オーバーライド可能）
3. `doc`グループの場合はworktreeCwd解決をスキップする（projectPathを使用）
4. 自動解決されたworktreeCwdをログに出力する

### Requirement 4: IPCチャンネルの統一

**Objective:** As a developer, I want a single IPC channel for phase execution, so that the API is simplified.

#### Acceptance Criteria

1. 新しいIPCチャンネル`EXECUTE`を定義する
2. `handlers.ts`に`EXECUTE`ハンドラを実装し、`ExecuteOptions`を受け取る
3. 既存の`EXECUTE_PHASE`と`EXECUTE_TASK_IMPL`チャンネルを削除する
4. `preload/index.ts`の`electronAPI`を更新し、`execute(options: ExecuteOptions)`を公開する
5. 既存の`executePhase`と`executeTaskImpl`をelectronAPIから削除する

### Requirement 5: Renderer側の更新

**Objective:** As a developer, I want Renderer code to use the new unified execute API, so that consistency is maintained.

#### Acceptance Criteria

1. `specStoreFacade.ts`の`executeSpecManagerGeneration`を更新し、新しい`execute` APIを呼び出す
2. `WorkflowView.tsx`の各フェーズ実行ボタンを更新し、適切な`ExecuteOptions`を構築して`execute`を呼び出す
3. 型定義ファイル`electron.d.ts`を更新し、新しいAPIシグネチャを反映する
4. 既存の`executePhase`、`executeTaskImpl`呼び出しを全て`execute`に置き換える

### Requirement 6: WebSocket/Remote UI対応

**Objective:** As a developer, I want Remote UI to use the new unified execute API, so that consistency is maintained across access methods.

#### Acceptance Criteria

1. `webSocketHandler.ts`の`EXECUTE_PHASE`メッセージハンドラを`EXECUTE`に更新する
2. `WebSocketApiClient.ts`を更新し、新しい`execute` APIを公開する
3. Remote UIからのphase実行が統一されたAPIで動作することを確認する

### Requirement 7: テストの更新

**Objective:** As a developer, I want tests to cover the new unified execute method, so that quality is maintained.

#### Acceptance Criteria

1. `specManagerService.test.ts`の既存`execute*`テストを`execute`メソッドのテストに統合する
2. 各フェーズタイプに対するテストケースを作成する
3. worktreeCwd自動解決のテストケースを追加する（implグループで自動解決、docグループでスキップ）
4. IPCハンドラのテストを更新する
5. Renderer側のテストを更新する

## Out of Scope

- `retryWithContinue`メソッドのリファクタリング（別途検討）
- Bug Workflow関連のexecuteメソッド（bugServiceに存在する場合は別スコープ）
- `executeSpecManagerPhase`メソッド: spec-managerプロファイル専用のメソッドであり、今回の統一対象外。理由：
  - `SPEC_MANAGER_COMMANDS`マッピングを使用し、kiroコマンドとは異なるslashCommand体系
  - 独自のロック機構（`acquireSpecManagerLock`/`releaseSpecManagerLock`）を持つ
  - 主にElectron UI（spec-manager profile）から使用され、kiroプロファイルの`execute`メソッドとは呼び出し元が異なる
  - 将来的な統一を検討する場合はプロファイル間の差異を考慮した別Specで対応

## Open Questions

- `retryWithContinue`はsessionIdベースの再開なので、統一execute APIに含めるか別メソッドとするか
