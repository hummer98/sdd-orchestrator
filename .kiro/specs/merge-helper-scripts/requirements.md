# Requirements: Merge Helper Scripts

## Decision Log

### スクリプト化の動機
- **Discussion**: spec-mergeでClaudeが`cd`コマンドを省略し、worktree内ではなくprojectPath側でspec.jsonを更新しようとする問題が発生。定型作業をシェルスクリプト化することで確実にworktree内で操作を行わせる。
- **Conclusion**: spec.json/bug.json更新＋コミットをシェルスクリプト化
- **Rationale**: AIの指示解釈のブレを排除し、確実に正しいディレクトリで操作を実行させる

### スクリプト配置場所
- **Discussion**: テンプレートをどこに配置し、どこにインストールするか
- **Conclusion**: `templates/scripts/` → `.kiro/scripts/`
- **Rationale**: コマンドは`.claude/commands/`、スクリプトは`.kiro/scripts/`と分離

### スクリプトの範囲
- **Discussion**: spec-mergeのどのステップをスクリプト化するか（全体 vs Step 2.3のみ）
- **Conclusion**: Step 2.3のみ（spec.json更新＋コミット）
- **Rationale**: 最小限のスコープでリスクを低減、他のステップはAIの柔軟な判断が有用

### スクリプト分割方針
- **Discussion**: specとbugで共通スクリプトにするか、別スクリプトにするか
- **Conclusion**: 別スクリプト（`update-spec-for-deploy.sh`, `update-bug-for-deploy.sh`）
- **Rationale**: パスとファイル名が異なる（`.kiro/specs/` vs `.kiro/bugs/`、`spec.json` vs `bug.json`）ためシンプルに分離

### JSON操作ツール
- **Discussion**: jq、Node.js、純粋shell（sed/awk）のどれを使うか
- **Conclusion**: `jq`を使用
- **Rationale**: JSONの構造化操作に最適、広く普及、シンプルなワンライナーで実現可能

### bug-mergeの設計変更
- **Discussion**: bug-mergeは現在merge後にmain側でbug.jsonを更新する設計。spec-mergeと統一するか
- **Conclusion**: worktree内でコミット→mergeに統一
- **Rationale**: squash mergeで全変更がまとまる、スクリプトの使い方が統一される

## Introduction

spec-merge/bug-mergeのworktree内でのjson更新＋コミット処理をシェルスクリプト化する。これにより、AIがcwdを間違えるリスクを排除し、確実にworktree内で操作を実行させる。コマンドセットインストール時にスクリプトも`.kiro/scripts/`にインストールする。

## Requirements

### Requirement 1: Specデプロイ準備スクリプト

**Objective:** As a developer, I want a script that updates spec.json for deploy and commits it in the worktree, so that spec-merge can reliably squash merge all changes.

#### Acceptance Criteria
1. When `update-spec-for-deploy.sh <feature-name>` is executed in a worktree directory, the system shall:
   - Read `.kiro/specs/<feature-name>/spec.json`
   - Remove the `worktree` field
   - Set `phase` to `"deploy-complete"`
   - Update `updated_at` to current UTC timestamp (ISO 8601)
   - Write the updated spec.json
   - Stage the file with `git add`
   - Commit with message `chore(<feature-name>): update spec.json for deploy-complete`
2. If `jq` is not installed, the script shall exit with error code 1 and display an error message
3. If the spec.json file does not exist, the script shall exit with error code 1 and display an error message
4. If git commit fails, the script shall exit with the git exit code

### Requirement 2: Bugデプロイ準備スクリプト

**Objective:** As a developer, I want a script that updates bug.json for deploy and commits it in the worktree, so that bug-merge can reliably squash merge all changes.

#### Acceptance Criteria
1. When `update-bug-for-deploy.sh <bug-name>` is executed in a worktree directory, the system shall:
   - Read `.kiro/bugs/<bug-name>/bug.json`
   - Remove the `worktree` field
   - Update `updated_at` to current UTC timestamp (ISO 8601)
   - Write the updated bug.json
   - Stage the file with `git add`
   - Commit with message `chore(<bug-name>): update bug.json for deploy-complete`
2. If `jq` is not installed, the script shall exit with error code 1 and display an error message
3. If the bug.json file does not exist, the script shall exit with error code 1 and display an error message
4. If git commit fails, the script shall exit with the git exit code

### Requirement 3: スクリプトインストール機能

**Objective:** As a developer, I want scripts to be installed when commandset is installed, so that spec-merge/bug-merge can use them.

#### Acceptance Criteria
1. When a profile is installed via `unifiedCommandsetInstaller`, the system shall copy scripts from `templates/scripts/` to `<projectPath>/.kiro/scripts/`
2. The system shall set executable permission (chmod +x) on installed scripts
3. If `.kiro/scripts/` directory does not exist, the system shall create it
4. If a script already exists at the destination, the system shall overwrite it (same behavior as commands)

### Requirement 4: spec-merge.md更新

**Objective:** As a developer, I want spec-merge to use the script instead of inline commands, so that the operation is reliable.

#### Acceptance Criteria
1. When spec-merge executes Step 2.3 (Update spec.json in Worktree), the instruction shall be:
   - Change directory to worktree: `cd "${WORKTREE_ABSOLUTE_PATH}"`
   - Execute script: `.kiro/scripts/update-spec-for-deploy.sh <feature-name>`
2. The instruction shall NOT include inline jq commands or manual git add/commit

### Requirement 5: bug-merge.md更新

**Objective:** As a developer, I want bug-merge to update bug.json in worktree before merge (like spec-merge), so that the workflow is consistent.

#### Acceptance Criteria
1. When bug-merge prepares for merge, a new step shall be added before squash merge:
   - Change directory to worktree
   - Execute script: `.kiro/scripts/update-bug-for-deploy.sh <bug-name>`
2. The existing Step 6 (Update bug.json after merge) shall be removed
3. The squash merge shall include the bug.json update commit

### Requirement 6: プロジェクトバリデーションにjqチェック追加

**Objective:** As a developer, I want project validation to check for jq command availability, so that I know if merge scripts will work.

#### Acceptance Criteria
1. When project validation runs, the system shall check if `jq` command is available in PATH
2. If `jq` is not available, the system shall display a warning (not error) with installation guidance
3. The jq check shall be displayed in the validation panel alongside other checks

## Out of Scope

- スクリプトのテスト自動化（手動テストで確認）
- jq以外のJSON操作ツールへの対応
- spec-merge/bug-mergeの他のステップのスクリプト化
- Windowsバッチファイル対応（macOS/Linux向けshellスクリプトのみ）

## Open Questions

- なし（対話で解決済み）
