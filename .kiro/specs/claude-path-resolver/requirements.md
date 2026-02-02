# Requirements: Claude Path Resolver

## Decision Log

### パス解決の方法

- **Discussion**: GUIアプリ起動時はシェルプロファイルが読み込まれないため、`process.env.PATH`に依存したコマンド解決では不十分。単純に`which claude`を実行しても同じ問題が発生する。
- **Conclusion**: ユーザーのデフォルトシェルを`-l`（ログインシェル）オプションで起動し、その中で`which claude`を実行してパスを解決する。
- **Rationale**: ログインシェルとして起動することで、`.zshrc`や`.bash_profile`等のプロファイルが読み込まれ、ユーザー環境と同じPATH設定でコマンドを探索できる。

### パス解決失敗時の動作

- **Discussion**: 自動フォールバック（設定画面での手動指定、よくあるパスへのフォールバック等）を実装するか検討。
- **Conclusion**: 自動フォールバックは実装しない。ワーニング通知のみ。
- **Rationale**: シンプルさを優先。ユーザーが自分の環境でClaude Codeを正しくインストールしていれば問題は発生しない。問題がある場合は明確に通知することで、ユーザー自身が対処できる。

### パス解決のタイミングとキャッシュ

- **Discussion**: Agent実行のたびにパスを解決するか、起動時に一度だけ解決してキャッシュするか。
- **Conclusion**: アプリ起動時に一度解決し、アプリ終了までキャッシュする。
- **Rationale**: Agent実行のたびに`which`を実行するのはオーバーヘッドが大きい。通常、アプリ実行中にPATH設定が変わることは稀。

## Introduction

SDD Orchestratorは、AIエージェント（Claude Code CLI）をサブプロセスとして起動する。現状、`claude`コマンドのパスはハードコード（`/opt/homebrew/bin`、`/usr/local/bin`）に依存しているが、GUIアプリ起動時はシェルプロファイルが読み込まれないため、ユーザー環境によっては`claude`コマンドが見つからない問題がある。

本機能は、アプリ起動時にユーザーのログインシェル経由で`claude`コマンドのフルパスを動的に解決し、見つからない場合はワーニングを表示する。

## Requirements

### Requirement 1: Claude コマンドパスの動的解決

**Objective:** As a developer, I want the application to automatically resolve the full path of the `claude` command at startup, so that agents can be launched regardless of where Claude Code is installed.

#### Acceptance Criteria

1. When the application starts, the system shall execute `which claude` within the user's login shell to resolve the command path.
2. The system shall use the user's default shell (detected via `$SHELL` environment variable) with the `-l` (login) flag to ensure shell profiles are loaded.
3. If the path is successfully resolved, the system shall cache the resolved path for the duration of the application session.
4. When an agent is started, the system shall use the cached full path instead of relying on PATH environment variable.

### Requirement 2: パス解決失敗時のワーニング表示

**Objective:** As a user, I want to be notified when the `claude` command cannot be found, so that I can take corrective action.

#### Acceptance Criteria

1. If `which claude` fails to resolve a path (exit code non-zero or empty output), the system shall display a warning notification to the user.
2. The warning message shall be: 「claudeコマンドが見つかりません。Claude Codeがインストールされているか、PATHが通っているか確認してください」
3. The warning shall be displayed once at application startup (not repeatedly).
4. The system shall NOT implement automatic fallback mechanisms (e.g., hardcoded paths, manual path configuration).

### Requirement 3: 既存のハードコードPATH追加の削除

**Objective:** As a maintainer, I want to remove the hardcoded PATH additions, so that the codebase relies on the proper path resolution mechanism.

#### Acceptance Criteria

1. The system shall remove the hardcoded PATH additions (`/opt/homebrew/bin:/usr/local/bin`) from `agentProcess.ts`.
2. The system shall use only the resolved full path for executing the `claude` command.

## Out of Scope

- 設定画面でのパス手動指定機能
- 複数のパス候補へのフォールバック
- パス解決失敗時の自動リトライ
- `claude`以外のコマンドのパス解決
- Windows環境のサポート（本機能はmacOS/Linuxのみ対象）

## Open Questions

- なし（設計フェーズで詳細を検討）
