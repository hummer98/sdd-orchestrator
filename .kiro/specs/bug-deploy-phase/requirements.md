# Requirements: Bug Deploy Phase

## Decision Log

### 状態管理方式
- **Discussion**: Bugのdeploy完了状態をどう管理するか。選択肢として(1) bug.jsonにphaseフィールド追加、(2) deployed_atフィールド追加、(3) deploy.md artifact追加を検討
- **Conclusion**: bug.jsonにphaseフィールドを追加
- **Rationale**: Specと同様のアプローチで一貫性が高い。phaseフィールドで明示的に状態を管理できる

### 更新タイミング（楽観的更新）
- **Discussion**: deployコマンド実行とphase更新のタイミング
- **Conclusion**: deploy前にphaseを'deployed'に更新し、失敗時にロールバック
- **Rationale**: UIが即時反映され、Agentがdeploy phaseを「実行中」として認識できる

### ロールバック時の通知
- **Discussion**: deploy失敗時のユーザー通知方法
- **Conclusion**: トースト通知で「デプロイ失敗：ロールバックしました」を表示
- **Rationale**: ユーザーに失敗を明確に伝え、状態が戻ったことを認識させる

### deploy検出方式
- **Discussion**: Specのようにマーカーファイルで検出するか
- **Conclusion**: 楽観的更新のみでマーカーファイル不要
- **Rationale**: Bugワークフローはシンプルで、コマンド実行の成否で判定可能

### worktree処理順序
- **Discussion**: worktree merge時のphase更新とworktree削除の順序
- **Conclusion**: phase更新 → merge → 成功時worktree削除（失敗時ロールバック）
- **Rationale**: 楽観的更新パターンと整合。merge失敗時にworktreeが残るので再試行可能

### UI表示方式
- **Discussion**: deploy実行中の表示方法
- **Conclusion**: タグは「デプロイ完了」表示、ワークフローインジケーターで実行中表示
- **Rationale**: 中間状態（deploying）を追加せずシンプルに保つ

## Introduction

BugワークフローにDeploy完了状態を追加し、bugListItemのタグ表示に反映する機能。Specと同様にbug.jsonに`phase`フィールドを追加し、`deployed`状態を管理する。楽観的更新パターンを採用し、deploy/merge実行前にphaseを更新、失敗時はロールバックする。

## Requirements

### Requirement 1: BugPhase型の拡張

**Objective:** 開発者として、Bug のデプロイ完了状態を型安全に管理したい。これにより、Bugワークフローの終了状態を明確に追跡できる。

#### Acceptance Criteria
1. The BugPhase type shall include `deployed` as a valid phase value
2. The BUG_PHASES array shall include `deployed` as the final phase
3. When bug.json is loaded, the system shall validate the phase field against the extended BugPhase type

### Requirement 2: bug.jsonへのphaseフィールド追加

**Objective:** 開発者として、bug.jsonでphase状態を永続化したい。これにより、アプリ再起動後もdeploy完了状態を保持できる。

#### Acceptance Criteria
1. The BugJson interface shall include an optional `phase` field of type BugPhase
2. When phase field is present in bug.json, the system shall use it as the authoritative phase value
3. When phase field is absent in bug.json, the system shall determine phase from artifacts (backward compatibility)
4. When phase is updated, the system shall also update `updated_at` timestamp in bug.json

### Requirement 3: BugListItemでのデプロイ完了表示

**Objective:** ユーザーとして、BugListItemで「デプロイ完了」状態を視覚的に確認したい。これにより、完了したBugを一目で識別できる。

#### Acceptance Criteria
1. When a Bug has phase `deployed`, the BugListItem shall display 「デプロイ完了」 label
2. The `deployed` phase shall have a distinct color (purple: `bg-purple-100 text-purple-700`)
3. When phase changes to `deployed`, the BugListItem shall update without requiring manual refresh

### Requirement 4: 楽観的更新によるphase更新

**Objective:** ユーザーとして、deployコマンド実行開始と同時にUIが「デプロイ完了」に更新されてほしい。これにより、操作のレスポンスが良くなる。

#### Acceptance Criteria
1. When deploy phase is triggered, the system shall update bug.json.phase to `deployed` before executing the deploy command
2. When deploy command succeeds, the system shall keep phase as `deployed`
3. When deploy command fails, the system shall rollback phase to `verified`
4. When rollback occurs, the system shall display a toast notification: 「デプロイ失敗：ロールバックしました」

### Requirement 5: /commit実行時のphase管理

**Objective:** ユーザーとして、/commitコマンド実行時にdeploy phaseが適切に管理されてほしい。これにより、通常モードでのBugデプロイが正しく追跡される。

#### Acceptance Criteria
1. When /commit is triggered for a Bug in `verified` phase, the system shall update phase to `deployed` before executing /commit
2. When /commit command completes successfully, the system shall keep phase as `deployed`
3. When /commit command fails, the system shall rollback phase to `verified` and show error notification
4. While /commit is executing, the BugProgressIndicator shall show deploy phase as executing

### Requirement 6: worktree merge時のphase管理

**Objective:** ユーザーとして、worktree merge実行時にdeploy phaseが適切に管理されてほしい。これにより、worktreeモードでのBugデプロイが正しく追跡される。

#### Acceptance Criteria
1. When merge is triggered for a worktree Bug in `verified` phase, the system shall update phase to `deployed` before executing merge
2. When merge command completes successfully, the system shall proceed with worktree cleanup
3. When merge command fails, the system shall rollback phase to `verified`, keep worktree intact, and show error notification
4. The processing order shall be: phase update → merge → worktree cleanup (on success only)

### Requirement 7: Remote UIでの同期

**Objective:** リモートユーザーとして、Desktop UIと同じ「デプロイ完了」ステータスをRemote UIでも確認したい。これにより、リモートからでもBugワークフローの完了状態を把握できる。

#### Acceptance Criteria
1. When bug.json.phase is updated to `deployed`, the system shall send a WebSocket notification to all connected Remote UI clients
2. When Remote UI receives a phase change notification, the Remote UI shall update the Bug list display
3. The Remote UI shall display the same 「デプロイ完了」 label as the Desktop UI

### Requirement 8: BugWorkflowPhaseとの整合性

**Objective:** 開発者として、BugWorkflowPhase（UI表示用）とBugPhase（データ用）の整合性を保ちたい。これにより、ワークフローインジケーターが正しく動作する。

#### Acceptance Criteria
1. The BugWorkflowPhase `deploy` shall correspond to BugPhase `deployed`
2. When BugPhase is `deployed`, the BugProgressIndicator shall show deploy phase as completed
3. When deploy command is executing with phase `deployed`, the BugProgressIndicator shall show deploy phase as executing
4. The getNextAction function shall return `null` when phase is `deployed` (workflow complete)

## Out of Scope

- マーカーファイルによるdeploy検出（Specとは異なるアプローチ）
- `deploying`のような中間phase状態の追加
- archive/closed などの追加状態

## Open Questions

- なし（対話で全て解決済み）
