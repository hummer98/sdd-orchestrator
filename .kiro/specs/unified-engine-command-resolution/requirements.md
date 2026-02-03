# Requirements: Unified Engine Command Resolution

## Decision Log

### スコープの決定
- **Discussion**: 最小修正（`handlers.ts`の1箇所のみ）か、統一的なリファクタリング（`startAgent`内部でのコマンド解決）かを検討
- **Conclusion**: 統一的なリファクタリングを採用
- **Rationale**: 同じ問題が複数箇所で発生しており、根本的な解決が必要。呼び出し側で`getClaudeCommand()`を呼ぶ責任を持たせる設計では漏れが生じやすい

### 将来の拡張性
- **Discussion**: Claude以外のLLMエンジン（Gemini CLI等）をサポートする可能性について確認
- **Conclusion**: 将来的なマルチエンジン対応を視野に入れた設計とする
- **Rationale**: 現時点で汎用的な設計にしておくことで、将来の拡張コストを削減

### 既存抽象化との関係
- **Discussion**: 既存の`LLMEngineId`型（`@shared/registry`）との統合方針を検討
- **Conclusion**: 段階的に統合する方向で設計
- **Rationale**: 既にエンジン識別の仕組みがあり、パス解決も「エンジンごとの設定」の一部と考えるのが自然

### APIデザイン
- **Discussion**: `command`パラメータを維持するか、`engineId`パラメータに変更するかを検討
- **Conclusion**: `engineId`パラメータ方式を採用
- **Rationale**: セマンティクスが明確（「claudeコマンドを使う」ではなく「claudeエンジンを使う」）で、将来的なエンジン切り替えに対応しやすい

### 後方互換性
- **Discussion**: 現在の`command`パラメータとの後方互換性を維持するか検討。調査の結果、すべての呼び出しで`'claude'`が使用されており、カスタムコマンドを渡しているケースはなかった
- **Conclusion**: 後方互換性は維持しない（`engineId`に統一）
- **Rationale**: `command`パラメータを残すと混乱が生じる。影響範囲はすべて内部コードなので破壊的変更でも問題なし

## Introduction

`startAgent`およびエージェント起動に関わる各ハンドラーにおいて、LLMエンジンのコマンドパス解決を統一する。現状、`'claude'`がハードコードされている箇所と`getClaudeCommand()`を呼び出している箇所が混在しており、GUIアプリ起動時にシェルプロファイルが読み込まれない環境でProject Agentの起動に失敗する問題が発生している。

本機能では、`startAgent`のAPIを`command`パラメータから`engineId`パラメータに変更し、コマンドパス解決を内部で統一的に行う仕組みに改善する。

## Requirements

### Requirement 1: startAgent APIの変更

**Objective:** 開発者として、エージェント起動時にエンジンIDを指定するだけでコマンドパス解決が自動的に行われるようにしたい。これにより、呼び出し側での`getClaudeCommand()`呼び出し漏れを防止できる。

#### Acceptance Criteria
1. `SpecManagerService.startAgent`の引数から`command: string`を削除し、`engineId: LLMEngineId`を追加する
2. `engineId`のデフォルト値は`'claude'`とする
3. `startAgent`内部で`engineId`に基づいてコマンドパスを解決する
4. 既存の`ClaudePathResolverService`を活用してパス解決を行う

### Requirement 2: エンジンコマンド解決サービスの拡張

**Objective:** 開発者として、将来的に複数のLLMエンジンをサポートできる拡張可能な設計にしたい。

#### Acceptance Criteria
1. `EngineCommandResolverService`（または既存サービスの拡張）を作成し、`engineId`からコマンドパスを解決する機能を提供する
2. 現時点では`'claude'`のみをサポートし、`ClaudePathResolverService`に委譲する
3. 将来的に他のエンジン（`'gemini'`等）を追加できる拡張ポイントを設ける
4. E2Eテスト用の`E2E_MOCK_CLAUDE_COMMAND`環境変数は引き続きサポートする

### Requirement 3: 全ハンドラーの統一

**Objective:** 開発者として、すべてのエージェント起動パスで一貫したコマンド解決が行われることを保証したい。

#### Acceptance Criteria
1. 以下のハンドラーを`engineId`方式に移行する：
   - `handlers.ts`: EXECUTE_PROJECT_COMMAND, STEERING_VERIFICATION, GENERATE_RELEASE, BUG_WORKFLOW
   - `agentHandlers.ts`: START_AGENT
   - `bugHandlers.ts`: バグワークフロー関連
   - `specHandlers.ts`: Spec実行関連
   - `installHandlers.ts`: インストール関連
   - `remoteAccessHandlers.ts`: Remote UI関連
   - `scheduleTaskHandlers.ts`: スケジュール実行関連
2. `specManagerService.ts`内の`getClaudeCommand()`呼び出しを削除し、内部解決に統一する
3. `'claude'`ハードコードをすべて`engineId: 'claude'`（またはデフォルト値使用）に置き換える

### Requirement 4: IPCおよびpreload APIの更新

**Objective:** フロントエンドからのエージェント起動リクエストで`engineId`を指定できるようにしたい。

#### Acceptance Criteria
1. `electronAPI.startAgent`のシグネチャを更新し、`command`パラメータを`engineId`に変更する
2. `preload/index.ts`のAPI定義を更新する
3. `renderer/types/electron.d.ts`の型定義を更新する
4. `IpcApiClient`および`WebSocketApiClient`のAPIを更新する

### Requirement 5: フロントエンドの更新

**Objective:** フロントエンドコンポーネントが新しいAPIに対応し、エンジン指定でエージェントを起動できるようにしたい。

#### Acceptance Criteria
1. `agentStoreAdapter.ts`の`startAgent`メソッドを更新する
2. `BugWorkflowView.tsx`の`electronAPI.startAgent`呼び出しを更新する
3. その他のフロントエンドからの`startAgent`呼び出しを更新する
4. `engineId`のデフォルト値を使用し、明示的な指定が不要な場合は省略可能とする

### Requirement 6: テストの更新

**Objective:** すべてのテストが新しいAPIシグネチャに対応し、コマンド解決ロジックが正しく動作することを検証できるようにしたい。

#### Acceptance Criteria
1. `command: 'claude'`を使用しているテストを`engineId: 'claude'`に更新する
2. `EngineCommandResolverService`のユニットテストを追加する
3. `startAgent`内部でのコマンド解決をテストするケースを追加する
4. E2Eテストでモックコマンドが正しく適用されることを検証する

### Requirement 7: Remote UI対応

**Objective:** Remote UI（WebSocket経由）からのエージェント起動でも同様にコマンド解決が行われるようにしたい。

#### Acceptance Criteria
1. `webSocketHandler.ts`のエージェント起動処理を更新する
2. `remoteAccessHandlers.ts`の`WorkflowController`を更新する
3. WebSocket経由のリクエストでも`engineId`を受け取り、内部でコマンド解決する

## Out of Scope

- Gemini CLI等の他エンジンの実際のサポート実装（拡張ポイントのみ提供）
- `LLMEngineRegistry`との完全統合（段階的に行う）
- エンジン選択UIの追加
- エンジンごとの設定画面

## Open Questions

- 将来的に`LLMEngineRegistry`にコマンドパス解決機能を統合する際の具体的な設計は、次のフェーズで検討する
