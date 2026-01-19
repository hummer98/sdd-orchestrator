# Requirements: Spec Worktree Early Creation

## Decision Log

### 1. worktreeモード決定タイミング
- **Discussion**: impl開始時にworktreeを作成する現行方式では、spec-merge時にspecファイルがworktree側にコミットされていない問題が発生
- **Conclusion**: spec-init/spec-plan時点で`--worktree`フラグによりworktreeを作成
- **Rationale**: spec作成時からworktreeで作業することで、全ファイルが自然にgit管理下に入り、merge時の問題が解消される

### 2. symlink方式の廃止
- **Discussion**: 現行のworktree-spec-symlinkでは、worktree側のspecをmain側へのsymlinkにしていた
- **Conclusion**: symlink方式を完全廃止し、worktree側に実ファイルを配置
- **Rationale**: symlinkはClaudeのGlobが動作しないバグがあり、トラブルの原因。実ファイル方式がシンプル

### 3. Electron Watcherの監視対象
- **Discussion**: worktree側のspec変更をどう監視するか（個別追加 vs 常時監視）
- **Conclusion**: `.kiro/worktrees/specs/`を常時監視に追加
- **Rationale**: 個別のworktree追加/削除を追跡する必要がなく、シンプル

### 4. 途中からのworktree化
- **Discussion**: `--worktree`なしで作成したspecを後からworktreeモードに変更できるか
- **Conclusion**: 一切サポートしない
- **Rationale**: 運用の複雑さを避け、spec作成時に決定する方式を徹底

### 5. impl時のworktreeモード選択UI
- **Discussion**: 現行のimpl開始時のworktreeモード選択チェックボックスをどうするか
- **Conclusion**: 完全削除。代わりにspec作成ダイアログにworktreeモード用スライドスイッチを追加
- **Rationale**: worktreeモードはspec作成時に決定済みであり、impl時の選択は不要

## Introduction

worktreeモードでのspec実装において、spec-merge時にspecファイルがworktree側にコミットされない問題を根本的に解決する。現行のsymlink方式を廃止し、spec-init/spec-plan時点で`--worktree`フラグを指定することでworktreeを早期作成し、spec作成から実装・マージまで一貫してworktree上で作業する方式に変更する。

## Requirements

### Requirement 1: CLI `--worktree`フラグの追加

**Objective:** As a developer, I want to specify worktree mode at spec creation time, so that the entire spec workflow runs in a dedicated worktree.

#### Acceptance Criteria
1. When `spec-init {feature-name} --worktree` is executed, the system shall create a git worktree at `.kiro/worktrees/specs/{feature-name}` with branch `feature/{feature-name}`.
2. When `spec-plan --worktree` is executed and spec name is confirmed, the system shall create a git worktree before creating spec.json.
3. The system shall verify that the current branch is main/master before creating worktree; if not, the system shall display an error.
4. If worktree or branch already exists, the system shall display an appropriate error message.

### Requirement 2: spec.jsonへのworktreeフィールド記録

**Objective:** As a developer, I want worktree configuration to be recorded in spec.json, so that the system can track worktree mode throughout the spec lifecycle.

#### Acceptance Criteria
1. When worktree mode is enabled, the system shall record `worktree` field in spec.json with the following structure:
   - `enabled`: true
   - `path`: relative path from main project root (e.g., `.kiro/worktrees/specs/{feature-name}`)
   - `branch`: branch name (e.g., `feature/{feature-name}`)
   - `created_at`: ISO-8601 timestamp
2. When worktree mode is not enabled (`--worktree` not specified), the system shall NOT include `worktree` field in spec.json.
3. The `worktree` field structure shall be compatible with existing `WorktreeConfig` type.

### Requirement 3: Spec作成ダイアログへのworktreeモードスイッチ追加

**Objective:** As a user, I want to select worktree mode when creating a spec via UI, so that I can choose the appropriate mode without using CLI.

#### Acceptance Criteria
1. The spec creation dialog (for spec-init) shall include a slide switch for worktree mode selection.
2. When the slide switch is ON, the system shall create the spec in worktree mode (equivalent to `--worktree` flag).
3. When the slide switch is OFF (default), the system shall create the spec in normal mode.
4. The slide switch shall be clearly labeled (e.g., "Worktreeモードで作成").

### Requirement 4: SpecsWatcherServiceの監視対象追加

**Objective:** As a system, I want to monitor worktree specs directory, so that changes to specs in worktrees are detected and reflected in the UI.

#### Acceptance Criteria
1. The SpecsWatcherService shall monitor `.kiro/worktrees/specs/` directory in addition to `.kiro/specs/`.
2. The monitoring shall start when the project is loaded (not when individual worktrees are created).
3. If `.kiro/worktrees/specs/` directory does not exist, the system shall handle gracefully without errors.
4. Changes to files under `.kiro/worktrees/specs/{feature-name}/` shall trigger the same events as `.kiro/specs/{feature-name}/`.

### Requirement 5: symlink関連コードの完全削除

**Objective:** As a maintainer, I want all symlink-related code removed, so that the codebase is simplified and symlink-related bugs are eliminated.

#### Acceptance Criteria
1. The `createSymlinksForWorktree()` function's spec symlink creation logic shall be removed.
2. The `prepareWorktreeForMerge()` function's symlink deletion, git reset, and git checkout logic shall be removed.
3. All test code related to spec symlinks shall be removed.
4. The worktree-spec-symlink feature's symlink-specific implementation shall be completely removed.

### Requirement 6: impl時worktreeモード選択UIの削除

**Objective:** As a maintainer, I want the impl-time worktree mode selection removed, so that worktree mode is consistently determined at spec creation time only.

#### Acceptance Criteria
1. The worktree mode selection checkbox in impl phase panel shall be removed.
2. The `WorktreeModeCheckbox` component shall be removed or deprecated.
3. The impl start handler shall no longer accept worktree mode as a parameter; it shall read from spec.json's `worktree` field.
4. If spec.json has `worktree.enabled: true`, impl shall execute in the existing worktree; otherwise, impl shall execute in normal mode.

### Requirement 7: spec-mergeの簡素化

**Objective:** As a developer, I want spec-merge to be simplified, so that the merge process is straightforward without symlink cleanup.

#### Acceptance Criteria
1. When spec-merge is executed, the system shall NOT perform symlink deletion (symlinks no longer exist).
2. When spec-merge is executed, the system shall NOT perform `git reset` or `git checkout` on spec directory.
3. When spec-merge is executed, the system shall merge the worktree branch to main using existing merge logic.
4. After successful merge, the system shall remove the worktree directory and delete the feature branch.
5. After successful merge, the system shall remove the `worktree` field from spec.json.

### Requirement 8: cwdの適切な設定

**Objective:** As a system, I want Claude's working directory to be set correctly, so that file operations work in the appropriate context.

#### Acceptance Criteria
1. When executing spec-init/spec-plan with `--worktree`, after worktree creation, Claude's cwd shall be set to the worktree directory.
2. When executing spec-requirements/spec-design/spec-tasks for a worktree spec, Claude's cwd shall be set to the worktree directory.
3. When executing spec-impl for a worktree spec, Claude's cwd shall be set to the worktree directory.
4. The cwd shall be determined by checking spec.json's `worktree.path` field.

## Out of Scope

- Bug worktreeワークフローへの変更（既存のbug-fix --worktreeは影響なし）
- 既存specの移行ツール（既存specは現状のまま、新規specから新方式適用）
- Remote UI対応（デスクトップ専用機能）
- worktreeモードと通常モードの切り替え機能

## Open Questions

- なし（すべての技術的決定は対話で解決済み）
