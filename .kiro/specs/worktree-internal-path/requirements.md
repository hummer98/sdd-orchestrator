# Requirements: Worktree Internal Path

## Decision Log

### 配置場所の選定
- **Discussion**: 3つのオプションを検討
  - A: `.kiro/worktrees/{type}/{name}/` - .kiro配下に集約
  - B: `.worktrees/{type}/{name}/` - トップレベルに独立配置
  - C: `.kiro/specs/{name}/worktree/` - 各specフォルダ内に配置
- **Conclusion**: オプションA（`.kiro/worktrees/`）を採用
- **Rationale**:
  - SSOT原則に合致（.kiro配下にSDD成果物を集約）
  - Auto-Claudeの`.auto-claude/worktrees/`と同様の構造で直感的
  - `.gitignore`に1行追加で対応可能
  - メタデータ（specs/bugs）と作業ディレクトリ（worktrees）の適切な分離

### プロジェクト外配置の懸念検証
- **Discussion**: 当初「プロジェクト内配置はgit管理と干渉する」という懸念があった
- **Conclusion**: 懸念は過剰であり、プロジェクト内配置でも技術的に問題なし
- **Rationale**:
  - `.gitignore`で除外すればgit管理対象外になる
  - gitはworktreeがリポジトリ内にあっても正常に動作する
  - Auto-Claudeが同様のアプローチで実績あり

### 後方互換性
- **Discussion**: 既存の`../{project}-worktrees/`方式との互換性
- **Conclusion**: 後方互換性は不要
- **Rationale**: 移行コストより設計のシンプルさを優先

### セキュリティバリデーション
- **Discussion**: 現行は「親ディレクトリ内」を検証
- **Conclusion**: 「プロジェクトディレクトリ内」に変更
- **Rationale**: worktreeがプロジェクト内に配置されるため

### パス形式
- **Discussion**: 絶対パス vs 相対パス
- **Conclusion**: 相対パス形式を維持
- **Rationale**: プロジェクトの移植性を確保

### ブランチ命名規則
- **Discussion**: 現行の`feature/`・`bugfix/`を維持するか
- **Conclusion**: 現行維持
- **Rationale**: gitの一般的な慣例に沿っており変更不要

## Introduction

Worktree作成場所をプロジェクト外（`../{project}-worktrees/`）からプロジェクト内（`.kiro/worktrees/`）に変更する。これにより、SDD成果物の一元管理、ポータビリティ向上、直感的なフォルダ構造を実現する。

## Requirements

### Requirement 1: Worktreeパス構造の変更

**Objective:** As a 開発者, I want worktreeがプロジェクト内の`.kiro/worktrees/`に作成される, so that SDD関連ファイルが一箇所に集約され管理しやすくなる

#### Acceptance Criteria
1. When Spec用worktreeを作成する, the system shall `.kiro/worktrees/specs/{feature-name}/`にworktreeを配置する
2. When Bug用worktreeを作成する, the system shall `.kiro/worktrees/bugs/{bug-name}/`にworktreeを配置する
3. The system shall spec.json/bug.jsonのworktree.pathフィールドに相対パス（例: `.kiro/worktrees/specs/my-feature`）を格納する
4. The system shall ブランチ命名規則を維持する（Spec: `feature/{name}`, Bug: `bugfix/{name}`）

### Requirement 2: .gitignore設定

**Objective:** As a 開発者, I want worktreeフォルダがgit管理対象外になる, so that リポジトリが肥大化せず、コミット対象にならない

#### Acceptance Criteria
1. The system shall `.kiro/worktrees/`を`.gitignore`に追加する
2. When worktreeが作成される, the system shall worktree内のファイルがgit status（メインリポジトリ）に表示されない

### Requirement 3: セキュリティバリデーションの更新

**Objective:** As a システム, I want worktreeパスがプロジェクト内であることを検証する, so that パストラバーサル攻撃を防止できる

#### Acceptance Criteria
1. When worktreeパスを解決する, the system shall パスがプロジェクトディレクトリ内であることを検証する
2. If パスがプロジェクト外を指す, then the system shall エラーを返却する
3. The system shall `..`等を含む相対パスでもプロジェクト内に解決される場合は許可する

### Requirement 4: WorktreeService実装変更

**Objective:** As a 開発者, I want WorktreeServiceが新しいパス構造を使用する, so that 既存の機能が新パスで動作する

#### Acceptance Criteria
1. When `getWorktreePath(featureName)`を呼び出す, the system shall `{ relative: '.kiro/worktrees/specs/{featureName}', absolute: '{projectPath}/.kiro/worktrees/specs/{featureName}' }`を返却する
2. When `getBugWorktreePath(bugName)`を呼び出す, the system shall `{ relative: '.kiro/worktrees/bugs/{bugName}', absolute: '{projectPath}/.kiro/worktrees/bugs/{bugName}' }`を返却する
3. When `createWorktree(featureName)`を呼び出す, the system shall 新パスにworktreeを作成する
4. When `createBugWorktree(bugName)`を呼び出す, the system shall 新パスにworktreeを作成する
5. When `removeWorktree(featureName)`を呼び出す, the system shall 新パスのworktreeを削除する
6. When `removeBugWorktree(bugName)`を呼び出す, the system shall 新パスのworktreeを削除する

### Requirement 5: 関連ドキュメント・スキルの更新

**Objective:** As a 開発者, I want ドキュメントとスキルが新しいパス構造を反映する, so that 一貫性のある情報が提供される

#### Acceptance Criteria
1. The system shall `.kiro/steering/skill-reference.md`のworktreeパス記述を更新する
2. The system shall `git-worktree-support`仕様書のパス記述を更新する
3. The system shall `bugs-worktree-support`仕様書のパス記述を更新する

## Out of Scope

- 後方互換性（既存の`../{project}-worktrees/`からの移行機能）
- worktree作成場所のカスタマイズ機能
- レガシーパス検出機能

## Open Questions

- なし（設計フェーズで詳細を決定）
