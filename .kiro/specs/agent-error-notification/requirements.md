# Requirements: Agent Error Notification

## Decision Log

### ロガー統合方針
- **Discussion**: `logger.ts`と`projectLogger.ts`が併存しており、`specManagerService.ts`や`agentProcess.ts`は古い`logger`を使用している。プロジェクトログ（`{projectPath}/.kiro/logs/main.log`）に出力されない問題がある。
- **Conclusion**: 古い`logger.ts`を削除し、全て`projectLogger`に統合する
- **Rationale**: `projectLogger`はグローバルログとプロジェクトログ両方に出力する設計。プロジェクト未選択時はグローバルログのみに出力されるため、機能的に上位互換。

### Toast通知の詳細度
- **Discussion**: エラー発生時に「失敗しました」のみ表示するか、詳細なエラー種別を表示するか
- **Conclusion**: 詳細なエラー種別を表示する（例: 「claudeコマンドが見つかりません」「認証エラー」など）
- **Rationale**: ユーザーが問題を自己解決できるよう、具体的な情報を提供する

### Claude CLI固有エラーの検出
- **Discussion**: ENOENT以外のClaude CLI固有エラーも検出するか
- **Conclusion**: 検出可能なエラーは可能な限り検出する
- **Rationale**: 新規インストール環境でのトラブルシューティングを容易にする

## Introduction

Agent（Claude CLI等）の起動時にエラーが発生した場合、現状ではユーザーに何も通知されず、ログも適切な場所に記録されない問題がある。本機能では、ロガーの統合によるログ出力の改善、エラーの適切なキャッチと分類、およびRenderer側でのToast通知を実装する。

## Requirements

### Requirement 1: ロガー統合

**Objective:** As a developer, I want all main process logs to be written to the project logger, so that debugging information is consistently available in project logs.

#### Acceptance Criteria

1.1. When `logger.ts` is removed, the system shall have no compilation errors and all existing functionality shall work correctly.

1.2. When a log is written from `specManagerService.ts`, the log entry shall appear in both the global log (`~/Library/Logs/sdd-orchestrator/main.log`) and the project log (`{projectPath}/.kiro/logs/main.log`).

1.3. When a log is written from `agentProcess.ts`, the log entry shall appear in both the global log and the project log.

1.4. When no project is selected, the system shall write logs only to the global log without errors.

1.5. The system shall update all imports from `logger` to `projectLogger` in the following files:
  - `specManagerService.ts`
  - `agentProcess.ts`
  - その他 `logger.ts` をimportしているファイル

### Requirement 2: Agent起動エラーの検出と分類

**Objective:** As a user, I want the system to detect and classify agent startup errors, so that I can understand what went wrong.

#### Acceptance Criteria

2.1. When the `claude` command is not found (ENOENT), the system shall classify this as `COMMAND_NOT_FOUND` error.

2.2. When the Claude CLI exits immediately with a non-zero exit code, the system shall capture the exit code and stderr output.

2.3. If the stderr contains "not logged in" or similar authentication-related messages, the system shall classify this as `AUTH_REQUIRED` error.

2.4. If the stderr contains "API key" or similar messages, the system shall classify this as `API_KEY_MISSING` error.

2.5. When an unclassified error occurs, the system shall classify this as `UNKNOWN_ERROR` with the original error message preserved.

2.6. The system shall define an `AgentStartError` type with the following structure:
```typescript
type AgentStartErrorType =
  | 'COMMAND_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'API_KEY_MISSING'
  | 'SPAWN_ERROR'
  | 'UNKNOWN_ERROR';

interface AgentStartError {
  type: AgentStartErrorType;
  message: string;
  details?: {
    exitCode?: number;
    stderr?: string;
    command?: string;
  };
}
```

### Requirement 3: エラー情報のRenderer通知

**Objective:** As a user, I want to see a toast notification when an agent fails to start, so that I am immediately aware of the problem.

#### Acceptance Criteria

3.1. When an agent startup error occurs, the system shall send the error information to the Renderer via IPC.

3.2. The IPC channel shall be `AGENT_START_ERROR` and include the `agentId`, `specId`, and `AgentStartError` object.

3.3. The Renderer shall display a toast notification with the error type and a user-friendly message.

3.4. The toast messages shall be localized in Japanese:
  - `COMMAND_NOT_FOUND`: 「claudeコマンドが見つかりません。インストールを確認してください」
  - `AUTH_REQUIRED`: 「Claude CLIの認証が必要です。`claude login`を実行してください」
  - `API_KEY_MISSING`: 「APIキーが設定されていません」
  - `SPAWN_ERROR`: 「プロセスの起動に失敗しました: {message}」
  - `UNKNOWN_ERROR`: 「エージェントの起動に失敗しました: {message}」

3.5. The toast notification shall be of type `error` and auto-dismiss after 8 seconds (longer than default due to actionable content).

### Requirement 4: エラーログ出力

**Objective:** As a developer, I want agent startup errors to be logged with full details, so that I can diagnose issues.

#### Acceptance Criteria

4.1. When an agent startup error occurs, the system shall log the error at `ERROR` level with the following information:
  - agentId
  - specId
  - error type
  - error message
  - command attempted
  - exit code (if available)
  - stderr output (if available)

4.2. The log entry shall be written to both global and project logs (via `projectLogger`).

### Requirement 5: 既存status通知との整合性

**Objective:** As a developer, I want the new error notification to coexist with the existing status change mechanism.

#### Acceptance Criteria

5.1. When an agent startup error occurs, the system shall still call `statusCallbacks` with `'failed'` status.

5.2. The `AGENT_START_ERROR` notification shall be sent in addition to (not instead of) the existing `AGENT_STATUS_CHANGE` notification.

5.3. The Renderer shall handle both notifications: status update in the store, and error toast display.

## Out of Scope

- Claude CLI以外のLLMエンジン（Gemini等）固有のエラー検出
- エラー発生後の自動リトライ機能
- エラー履歴の永続化・UI表示
- Remote UI側でのエラー通知（WebSocket経由）は本仕様のスコープ外だが、将来的に追加可能な設計とする

## Open Questions

- Claude CLIの認証エラー時の具体的なexit codeとstderr出力パターンは実機で確認が必要
- APIキー未設定時のClaude CLIの挙動は実機で確認が必要
