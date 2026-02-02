# Requirements: Remote UI Ask Agent Fix

## Decision Log

### メッセージタイプの不一致問題
- **Discussion**: クライアント側が `EXECUTE_ASK_PROJECT` を送信しているが、サーバー側は `ASK_PROJECT` を期待。どちらを修正すべきか検討。
- **Conclusion**: クライアント側を修正し、サーバー側の既存実装に合わせる
- **Rationale**: サーバー側の `handleAskProject` ハンドラは正しく実装されており、design.md にも `ASK_PROJECT` と記載されている。クライアント側の実装ミスと判断。

### Spec-Ask UI の追加場所
- **Discussion**: Remote UI に Spec-Ask ボタンを追加する場所について、Desktop 版との共通化可能性を検討。
- **Conclusion**: `SpecDetailPage` の Agent 一覧ヘッダに Ask ボタンを追加する（Option B）
- **Rationale**: `AgentListPanel` 全体を shared 化すると大規模なリファクタリングが必要。既存構造を維持しつつ必要な機能のみ追加する方針が現実的。

### 共通コンポーネントの活用
- **Discussion**: `AskAgentDialog` を新規作成するか、既存を再利用するか。
- **Conclusion**: `shared/components/project/AskAgentDialog` を再利用
- **Rationale**: 既に `agentType: 'project' | 'spec'` で切り替え可能な設計。Electron Renderer と Remote UI で共有済み。

## Introduction

Remote UI から Ask Agent 機能（project-ask / spec-ask）を実行する際のバグを修正する。現在、Remote UI の project-ask はダイアログは表示されるが Agent が起動しない問題がある。また、spec-ask は Remote UI に UI 自体が存在しない。本仕様では WebSocket API のバグ修正と、Remote UI への Spec-Ask UI 追加を行う。

## Requirements

### Requirement 1: WebSocketApiClient の project-ask 修正

**Objective:** Remote UI ユーザーとして、Project Ask を実行したとき、Agent が正常に起動してほしい。

#### Acceptance Criteria

1.1. `WebSocketApiClient.executeAskProject` メソッドは、メッセージタイプ `ASK_PROJECT` を送信すること

1.2. `WebSocketApiClient.executeAskProject` メソッドは、payload に `projectPath` と `prompt` の両方を含めること

1.3. `projectPath` は `WebSocketApiClient.getProjectPath()` から取得した値を使用すること

1.4. サーバーから `ASK_PROJECT_STARTED` レスポンスを受信した場合、`AgentInfo` を含む成功結果を返すこと

### Requirement 2: WebSocketApiClient の spec-ask 追加

**Objective:** Remote UI 開発者として、Spec Ask を WebSocket 経由で実行するための API メソッドがほしい。

#### Acceptance Criteria

2.1. `WebSocketApiClient` に `executeAskSpec(specId: string, featureName: string, prompt: string)` メソッドを追加すること

2.2. `executeAskSpec` メソッドは、メッセージタイプ `ASK_SPEC` を送信すること

2.3. payload には `specId`、`featureName`、`prompt` を含めること

2.4. サーバーから `ASK_SPEC_STARTED` レスポンスを受信した場合、`AgentInfo` を含む成功結果を返すこと

### Requirement 3: Remote UI Spec-Ask UI 追加

**Objective:** Remote UI ユーザーとして、Spec 詳細画面から Spec Ask を実行したい。

#### Acceptance Criteria

3.1. `SpecDetailPage` の Agent 一覧ヘッダに Spec Ask ボタンを表示すること

3.2. Spec Ask ボタンは `MessageSquare` アイコンを使用し、紫色（`text-purple-600`）で表示すること（Desktop 版と同様）

3.3. Spec Ask ボタンをクリックすると、`AskAgentDialog` が `agentType="spec"` で表示されること

3.4. ダイアログには現在の Spec 名が `specName` prop として渡されること

3.5. ダイアログで「実行」をクリックすると、`WebSocketApiClient.executeAskSpec` が呼び出されること

3.6. Agent 起動成功時、新しい Agent が Agent Store に追加され、自動選択されること

3.7. Agent 起動成功時、ダイアログが閉じること

3.8. エラー発生時、適切なエラー通知が表示されること

### Requirement 4: ApiClient インターフェース更新

**Objective:** 型安全性を確保するため、ApiClient インターフェースに spec-ask メソッドを追加する。

#### Acceptance Criteria

4.1. `ApiClient` インターフェースに `executeAskSpec` メソッドのシグネチャを追加すること

4.2. `executeAskSpec` メソッドは `Result<AgentInfo, ApiError>` を返すこと

### Requirement 5: テスト

**Objective:** 修正内容の品質を担保するため、適切なテストを追加する。

#### Acceptance Criteria

5.1. `WebSocketApiClient.executeAskProject` の修正に対する Unit テストが存在すること

5.2. `WebSocketApiClient.executeAskSpec` の新規メソッドに対する Unit テストが存在すること

5.3. `SpecDetailPage` の Spec Ask ボタン表示・動作に対する Unit テストが存在すること

## Out of Scope

- `AgentListPanel` 全体の shared 化（大規模リファクタリング）
- Desktop Electron 版の修正（既に正常動作）
- Bug 詳細画面への Ask 機能追加（Bug には Ask は不要）
- E2E テストの追加（既存の project-ask E2E テストがあれば動作確認に使用可能）

## Open Questions

- なし（対話で解決済み）
