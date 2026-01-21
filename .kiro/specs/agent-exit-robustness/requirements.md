# Requirements: Agent Exit Robustness

## Decision Log

### 1. spec-mergeのcwd問題への対処方針

- **Discussion**: spec-mergeがworktreeCwdで実行されると、自身のcwdを削除することになりプロセスがハングする。例外リスト方式かセマンティック分類方式か検討。
- **Conclusion**: セマンティック分類方式を採用。`WORKTREE_LIFECYCLE_PHASES`という概念を導入し、worktreeのライフサイクルを変更するフェーズはprojectPathで実行する。
- **Rationale**: 「なぜprojectPathなのか」の理由が明確になり、将来の拡張（worktree作成フェーズ等）にも対応可能。デフォルトはworktreeCwdなので、新フェーズ追加時の設定漏れも安全側に倒れる。

### 2. handleAgentExitのエラーハンドリング

- **Discussion**: 現状`recordService.readRecord`がエラーを投げると`.catch(() => {})`で完全に無視され、statusCallbacksが呼ばれずUIが更新されない問題がある。
- **Conclusion**: エラー時も必ずstatusCallbacksを呼び、さらにエラー通知用コールバックを追加してtoast表示を行う。
- **Rationale**: UIが「実行中」のまま残る問題を防ぎ、ユーザーにエラー発生を通知することで問題の早期発見を促す。

### 3. readRecord失敗時のstatus決定

- **Discussion**: `readRecord`が失敗すると`currentRecord?.status === 'interrupted'`のチェックができない。
- **Conclusion**: readRecord失敗時は`code`と`isForcedSuccess`ベースでstatusを決定する。
- **Rationale**: `interrupted`は`stopAgent`で明示的に設定されるため、readRecord失敗時はinterrupted状態でないと推定できる。

## Introduction

Agent終了処理の堅牢性を向上させる。spec-merge実行時にプロセスがハングする問題と、Agent終了時のエラーが無視されてUIが更新されない問題を修正する。

## Requirements

### Requirement 1: Worktree Lifecycle Phasesの導入

**Objective:** As a system, I want phases that modify worktree lifecycle to run in project directory, so that processes don't hang when deleting their own working directory.

#### Acceptance Criteria

1. `WORKTREE_LIFECYCLE_PHASES`定数を定義し、worktreeのライフサイクルを変更するフェーズ（現時点では`spec-merge`のみ）を列挙する。
2. `startAgent`メソッドのcwd自動解決ロジックで、`WORKTREE_LIFECYCLE_PHASES`に含まれるフェーズの場合は`projectPath`を使用する。
3. `WORKTREE_LIFECYCLE_PHASES`に含まれないフェーズは、従来通り`getSpecWorktreeCwd`でworktreeCwdを自動解決する。
4. `WORKTREE_LIFECYCLE_PHASES`の定義にはコメントで「なぜprojectPathが必要か」の理由を記載する。
5. cwd解決結果をログに出力する（既存のログ出力を維持）。

### Requirement 2: handleAgentExitのエラーハンドリング改善

**Objective:** As a developer, I want handleAgentExit to handle errors gracefully, so that UI is always updated even when file operations fail.

#### Acceptance Criteria

1. `recordService.readRecord`がエラーを投げた場合でも、`statusCallbacks`を呼び出してUIを更新する。
2. エラー時のstatusは、`code === 0 || isForcedSuccess`なら`completed`、それ以外は`failed`とする。
3. エラー発生時は`logger.error`でエラー内容を記録する。
4. `this.processes.delete(agentId)`はエラー時も確実に実行する。

### Requirement 3: Agent終了エラーのUI通知

**Objective:** As a user, I want to be notified when agent exit processing fails, so that I can be aware of potential issues.

#### Acceptance Criteria

1. `SpecManagerService`にエラー通知用のコールバック機構を追加する（`onAgentExitError`）。
2. `handleAgentExit`でエラーが発生した場合、エラー通知コールバックを呼び出す。
3. `handlers.ts`でエラー通知コールバックを登録し、IPC経由でRendererに通知する。
4. Renderer側でエラー通知を受け取り、toast（またはnotify）で表示する。
5. toast内容は「Agent終了処理でエラーが発生しました: {agentId}」程度の簡潔なメッセージとする。

## Out of Scope

- `handleAgentError`のエラーハンドリング改善（今回は`handleAgentExit`のみ）
- Agent recordファイル破損時のリカバリ機構
- Claude CLIハング検知の改善（現状5秒タイムアウト）
- エラー詳細をUIに表示する機能（toastは簡潔なメッセージのみ）

## Open Questions

- なし（調査で技術的詳細は確認済み）
