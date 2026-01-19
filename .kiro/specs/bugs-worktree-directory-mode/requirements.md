# Requirements: Bugs Worktree Directory Mode

## Decision Log

### 1. Worktree管理方式の統一
- **Discussion**: 現在BugsはSpecsと異なるフラグ方式（`.kiro/bugs/`内のbug.json.worktreeフィールド）で管理されている。Specsはディレクトリ方式（`.kiro/worktrees/specs/{feature}/.kiro/specs/{feature}/`）を採用している。
- **Conclusion**: BugsもSpecsと同じディレクトリ方式に統一する
- **Rationale**:
  - コードの共通化が容易になる
  - 一貫したアーキテクチャで保守性向上
  - worktreeの実ファイルが物理的に分離され、ブランチ間の混乱を防止

### 2. 後方互換性
- **Discussion**: 既存のフラグ方式（bug.json.worktreeフィールド）を残すかどうか
- **Conclusion**: 後方互換は一切考慮しない。フラグ方式を完全に削除
- **Rationale**:
  - 二重のworktree管理ロジックは複雑性を増す
  - 現時点でフラグ方式を使用している実データは少ない
  - クリーンな実装を優先

### 3. 共通化の範囲
- **Discussion**: WorktreeService、WatcherService、一覧読み込み等のどこまで共通化するか
- **Conclusion**: 最大限の共通化を行う
- **Rationale**:
  - DRY原則に従い重複コードを排除
  - 将来の拡張（新しいエンティティタイプ）にも対応しやすい

### 4. ブランチ命名規則
- **Discussion**: Spec用の`feature/{name}`とBug用の`bugfix/{name}`を統一するか
- **Conclusion**: 維持する（統一しない）
- **Rationale**:
  - 一般的なgit-flow命名規則に準拠
  - ブランチ名から用途を識別しやすい

## Introduction

BugsのWorktree管理方式をSpecsと同じディレクトリ方式に統一し、WorktreeService・WatcherService・一覧読み込み処理を共通化する。これにより、一貫したアーキテクチャと保守性の高いコードベースを実現する。

## Requirements

### Requirement 1: ディレクトリ構造の統一

**Objective:** As a 開発者, I want BugsのWorktreeディレクトリ構造がSpecsと同じパターンになること, so that 一貫したアーキテクチャで管理できる

#### Acceptance Criteria

1.1. Worktree Bugは `.kiro/worktrees/bugs/{bug-name}/.kiro/bugs/{bug-name}/` に配置されること

1.2. Worktree Bug内のbug.jsonにworktreeフィールドが存在すること（Specのspec.jsonと同様）

1.3. メインの`.kiro/bugs/`ディレクトリにはWorktree Bugが存在しないこと

1.4. Worktree作成時にbug.json.worktreeフィールドにpath, branch, created_atが設定されること

### Requirement 2: WorktreeServiceの共通化

**Objective:** As a 開発者, I want WorktreeServiceがSpecs/Bugsの両方を統一的に扱えること, so that 重複コードを排除できる

#### Acceptance Criteria

2.1. `getEntityWorktreePath(type: 'specs' | 'bugs', name: string)` メソッドが提供されること

2.2. `createEntityWorktree(type: 'specs' | 'bugs', name: string)` メソッドが提供されること

2.3. `removeEntityWorktree(type: 'specs' | 'bugs', name: string)` メソッドが提供されること

2.4. 既存の `getWorktreePath`, `createWorktree`, `removeWorktree` は `getEntityWorktreePath('specs', ...)` のエイリアスとして維持されること（後方互換）

2.5. 既存の `getBugWorktreePath`, `createBugWorktree`, `removeBugWorktree` は `getEntityWorktreePath('bugs', ...)` のエイリアスとして維持されること

2.6. ブランチ命名は type='specs' の場合 `feature/{name}`、type='bugs' の場合 `bugfix/{name}` となること

### Requirement 3: BugService.readBugsのWorktreeディレクトリ対応

**Objective:** As a ユーザー, I want Bug一覧にWorktree内のBugも表示されること, so that すべてのBugを確認できる

#### Acceptance Criteria

3.1. BugService.readBugsが `.kiro/bugs/` と `.kiro/worktrees/bugs/{bug-name}/.kiro/bugs/{bug-name}/` の両方からBugを読み込むこと

3.2. メインBugとWorktree Bugで同名のBugが存在する場合、メインBugが優先されること（Specsと同様）

3.3. Worktree Bug読み込み時にbug.json.worktreeフィールドからworktree情報をBugMetadataにマッピングすること

3.4. FileService.readSpecsと同様のworktreeディレクトリスキャンロジックを使用すること（共通化）

### Requirement 4: BugsWatcherServiceのWorktreeパス対応

**Objective:** As a ユーザー, I want Worktree内のBug変更が正しく検出されること, so that リアルタイムに状態が更新される

#### Acceptance Criteria

4.1. BugsWatcherServiceが `.kiro/worktrees/bugs/` ディレクトリも監視対象に含めること

4.2. Worktree内のBugファイル変更時に適切なイベントがディスパッチされること

4.3. SpecsWatcherServiceと同様の監視パターンを使用すること（共通化）

4.4. Worktree Bug追加時（addDirイベント）にBug一覧がリロードされること

4.5. Worktree Bug削除時（unlinkDirイベント）にBug一覧がリロードされること

### Requirement 5: 既存フラグ方式の削除

**Objective:** As a 開発者, I want 旧フラグ方式のコードが完全に削除されること, so that コードベースがクリーンになる

#### Acceptance Criteria

5.1. `.kiro/bugs/{bug-name}/bug.json` のworktreeフィールドによるモード判定ロジックが削除されること

5.2. 旧方式に依存するUIコンポーネント（BugListItem等）がディレクトリ方式に対応すること

5.3. 旧方式に依存するテストが更新または削除されること

### Requirement 6: Bug worktree作成フローの更新

**Objective:** As a ユーザー, I want bug-fix開始時にディレクトリ方式でWorktreeが作成されること, so that Specsと同じワークフローで作業できる

#### Acceptance Criteria

6.1. bug-fix開始時（useWorktree=true）に `.kiro/worktrees/bugs/{bug-name}` ディレクトリが作成されること

6.2. Worktree内に `.kiro/bugs/{bug-name}/` 構造が作成されること

6.3. メインの `.kiro/bugs/{bug-name}/` からBugファイルがWorktreeにコピーされること

6.4. Worktree内のbug.jsonにworktreeフィールドが追加されること

6.5. Symlink作成（logs, runtime）がSpecと同様に行われること

### Requirement 7: Bug-mergeフローの更新

**Objective:** As a ユーザー, I want bug-merge時にディレクトリ方式のWorktreeがクリーンアップされること, so that Specsと同じワークフローで完了できる

#### Acceptance Criteria

7.1. bug-merge成功後に `.kiro/worktrees/bugs/{bug-name}` ディレクトリが削除されること

7.2. bugfix/{bug-name} ブランチが削除されること

7.3. メインの `.kiro/bugs/{bug-name}/bug.json` からworktreeフィールドが削除されること（存在する場合）

### Requirement 8: Worktreeディレクトリスキャン共通ヘルパー

**Objective:** As a 開発者, I want Specs/Bugsのworktreeディレクトリスキャンロジックが共通化されていること, so that コードの重複を避けられる

#### Acceptance Criteria

8.1. `scanWorktreeEntities(projectPath: string, type: 'specs' | 'bugs')` 共通ヘルパーが提供されること

8.2. FileService.readSpecsが共通ヘルパーを使用すること

8.3. BugService.readBugsが共通ヘルパーを使用すること

8.4. 共通ヘルパーは `.kiro/worktrees/{type}/{name}/.kiro/{type}/{name}/` パターンをスキャンすること

## Out of Scope

- Remote UI対応（既存の制限を維持）
- Worktree作成場所のカスタマイズ
- ブランチ命名規則のカスタマイズ
- 旧フラグ方式からの自動マイグレーション

## Open Questions

- なし
