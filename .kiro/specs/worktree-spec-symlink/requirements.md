# Requirements: Worktree Spec Symlink

## Decision Log

### 1. シンボリックリンクの方向
- **Discussion**: worktree側とメイン側のどちらにspecファイルの実体を置くか
- **Conclusion**: メイン側に実体、worktree側にシンボリックリンク
- **Rationale**: Electronアプリがメイン側のtasks.mdを監視しており、worktree側での変更をリアルタイムで反映するため

### 2. `.kiro/logs/`と`.kiro/runtime/`のシンボリックリンク
- **Discussion**: 既存のログ・ランタイム用シンボリックリンクを残すか削除するか
- **Conclusion**: 残す（現状維持）
- **Rationale**: ログ・ランタイムの共有は有用であり、削除する理由がない

### 3. worktree側にspecディレクトリが既存の場合の処理
- **Discussion**: エラーにする / 上書きする / マージを試みる
- **Conclusion**: 削除してシンボリックリンク作成、マージ前にgit reset
- **Rationale**: worktree側で変更がない状態でマージされるのでコンフリクトが発生しない

### 4. リセット処理のフラグ
- **Discussion**: 条件付きでリセットするか、無条件でリセットするか
- **Conclusion**: 無条件でリセット
- **Rationale**: シンボリックリンク削除後は何もないはずで、`git reset`は空でもエラーにならない

## Introduction

worktreeモードでspec実装を行う際、worktree側のspecファイル（tasks.md等）への変更がメイン側のElectronアプリから監視できない問題を解決する。worktree側の`.kiro/specs/{feature}/`ディレクトリをシンボリックリンクにし、メイン側の実体を参照することで、実装中の進捗をリアルタイムで監視可能にする。

## Requirements

### Requirement 1: worktree作成前のコミット機能の削除

**Objective:** As a developer, I want to remove the automatic commit functionality before worktree creation, so that spec files remain uncommitted and can be shared via symlink.

#### Acceptance Criteria
1. When worktree creation is triggered, the system shall NOT commit uncommitted spec changes automatically.
2. The `checkUncommittedSpecChanges()` function call shall be removed from `handleImplStartWithWorktree()`.
3. The `commitSpecChanges()` function call shall be removed from `handleImplStartWithWorktree()`.

### Requirement 2: spec全体のシンボリックリンク作成

**Objective:** As a developer, I want the worktree to have a symlink to the main repo's spec directory, so that Electron app can monitor tasks.md changes in real-time.

#### Acceptance Criteria
1. When worktree is created, the system shall create a symlink from `{worktree}/.kiro/specs/{feature}/` to `{main}/.kiro/specs/{feature}/`.
2. If the worktree spec directory already exists (from git checkout), the system shall delete it before creating the symlink.
3. The existing symlinks for `.kiro/logs/` and `.kiro/runtime/` shall be preserved (no change).
4. The symlink for `.kiro/specs/{feature}/logs/` shall be removed (replaced by spec directory symlink).

### Requirement 3: spec-merge前のシンボリックリンク削除とリセット

**Objective:** As a developer, I want symlinks to be removed and spec changes reset before merge, so that the merge completes without conflicts.

#### Acceptance Criteria
1. When spec-merge is executed, the system shall verify that the current directory is the main project (not worktree).
2. Before merge, the system shall delete the symlink at `{worktree}/.kiro/specs/{feature}/`.
3. After symlink deletion, the system shall execute `git reset .kiro/specs/{feature}/` in the worktree unconditionally.
4. After reset, the system shall execute `git checkout .kiro/specs/{feature}/` in the worktree to restore HEAD state.
5. The merge shall proceed with no spec file changes in the worktree, avoiding conflicts.

### Requirement 4: WorktreeServiceの関数修正

**Objective:** As a developer, I want the WorktreeService to support the new symlink strategy, so that the implementation is clean and maintainable.

#### Acceptance Criteria
1. The `createSymlinksForWorktree()` function shall be modified to:
   - Create symlink for `.kiro/specs/{feature}/` (entire directory)
   - Remove the individual `.kiro/specs/{feature}/logs/` symlink creation
   - Keep `.kiro/logs/` and `.kiro/runtime/` symlinks unchanged
2. A new function `prepareWorktreeForMerge()` shall be added to:
   - Delete the spec directory symlink
   - Execute `git reset` on the spec directory
   - Execute `git checkout` on the spec directory
3. The `commitSpecChanges()` and `checkUncommittedSpecChanges()` functions may remain in the codebase for potential future use, but shall not be called during worktree creation.

## Out of Scope

- Bug worktreeのシンボリックリンク対応（specと同様の対応が必要な場合は別specで対応）
- Electronアプリ側の監視ロジック変更（既にメイン側を監視しているため変更不要）
- `.kiro/logs/`と`.kiro/runtime/`のシンボリックリンク戦略の変更
- Remote UI対応: 不要（デスクトップ専用機能 - ローカルファイルシステムへのsymlink作成、git worktree操作が必要）

## Open Questions

- なし（すべての技術的決定は対話で解決済み）
