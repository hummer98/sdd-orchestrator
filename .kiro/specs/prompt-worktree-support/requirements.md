# Requirements: Prompt Worktree Support

## Decision Log

### スクリプト化 vs プロンプト内記述

- **Discussion**: worktree作成処理をプロンプト内に直接記述するか、スクリプトに切り出すかを検討
- **Conclusion**: スクリプト化を採用
- **Rationale**: DRY（spec-plan/bug-createで共有）、既存パターンとの一貫性（`.kiro/scripts/`）、プロンプトの簡潔化

### スクリプト構成

- **Discussion**: 1つの汎用スクリプトか、spec用/bug用で分けるか
- **Conclusion**: 2つのスクリプト（`create-spec-worktree.sh`, `create-bug-worktree.sh`）
- **Rationale**: 既存パターン（update-spec/bug-for-deploy.sh）との一貫性、各スクリプトがシンプル、パス/ブランチ規約の違いを明確化

### スクリプト出力方式

- **Discussion**: JSON出力か終了コードのみか
- **Conclusion**: 終了コードのみ、パスは規約から導出
- **Rationale**: 既存スクリプトパターンとの一貫性、シンプルさ

### mainブランチチェック

- **Discussion**: プロンプト側でmainブランチチェックを行うか
- **Conclusion**: 不要
- **Rationale**: 必須ではなくおまけ的な機能、シンプルさ優先

## Introduction

spec-plan.mdとbug-create.mdプロンプトに`--worktree`フラグ処理を追加し、worktreeモードでのSpec/Bug作成を可能にする。worktree作成処理は`.kiro/scripts/`にスクリプト化し、プロンプトから呼び出す形式とする。

## Requirements

### Requirement 1: Worktree作成スクリプト

**Objective:** As a プロンプト開発者, I want worktree作成処理をスクリプト化したい, so that spec-planとbug-createで同一ロジックを共有できる

#### Acceptance Criteria

1. `.kiro/scripts/create-spec-worktree.sh`が存在し、`<feature-name>`引数を受け取る
2. When `create-spec-worktree.sh <feature-name>`が実行されると、the system shall:
   - `feature/<feature-name>`ブランチを作成
   - `.kiro/worktrees/specs/<feature-name>`にworktreeを作成
   - 成功時は終了コード0を返す
3. `.kiro/scripts/create-bug-worktree.sh`が存在し、`<bug-name>`引数を受け取る
4. When `create-bug-worktree.sh <bug-name>`が実行されると、the system shall:
   - `bugfix/<bug-name>`ブランチを作成
   - `.kiro/worktrees/bugs/<bug-name>`にworktreeを作成
   - 成功時は終了コード0を返す
5. If ブランチまたはworktreeが既に存在する場合、then the system shall エラーメッセージを出力し終了コード1を返す
6. If 引数が不足している場合、then the system shall 使用方法を出力し終了コード1を返す

### Requirement 2: spec-plan.mdのworktree対応

**Objective:** As a 開発者, I want spec-plan実行時に`--worktree`フラグでworktreeモードを選択したい, so that Spec作成時点からworktree上で作業できる

#### Acceptance Criteria

1. spec-plan.mdが`$ARGUMENTS`から`--worktree`フラグを検出できる
2. When `--worktree`フラグが指定されている場合、Phase 4（Spec Directory Creation）で:
   - `.kiro/scripts/create-spec-worktree.sh <feature-name>`を実行してworktreeを作成
   - spec.jsonに`worktree`フィールドを追加（`enabled: true`, `path`, `branch`, `created_at`）
3. When `--worktree`フラグが指定されていない場合、the system shall 従来通りworktreeなしでSpecを作成
4. If worktree作成スクリプトが失敗した場合、then the system shall エラーを表示しSpec作成を中止

### Requirement 3: bug-create.mdのworktree対応

**Objective:** As a 開発者, I want bug-create実行時に`--worktree`フラグでworktreeモードを選択したい, so that Bug作成時点からworktree上で作業できる

#### Acceptance Criteria

1. bug-create.mdが`$ARGUMENTS`から`--worktree`フラグを検出できる
2. When `--worktree`フラグが指定されている場合、bug名確定後に:
   - `.kiro/scripts/create-bug-worktree.sh <bug-name>`を実行してworktreeを作成
   - bug.jsonに`worktree`フィールドを追加（`enabled: true`, `path`, `branch`, `created_at`）
3. When `--worktree`フラグが指定されていない場合、the system shall 従来通りworktreeなしでBugを作成
4. If worktree作成スクリプトが失敗した場合、then the system shall エラーを表示しBug作成を中止

### Requirement 4: テンプレートへのスクリプト配置

**Objective:** As a コマンドセット管理者, I want スクリプトがコマンドセットインストール時に配布されるようにしたい, so that プロジェクトで即座に利用可能になる

#### Acceptance Criteria

1. `electron-sdd-manager/resources/templates/scripts/create-spec-worktree.sh`が存在する
2. `electron-sdd-manager/resources/templates/scripts/create-bug-worktree.sh`が存在する
3. コマンドセットインストール処理がscripts/ディレクトリも対象に含む（既存の仕組みを利用）

## Out of Scope

- mainブランチチェック（handlers.ts側で実施済み、プロンプト側では不要）
- spec-init.mdのworktree対応（spec-planで代替可能）
- worktree作成失敗時のロールバック処理（スクリプトがエラーを返せば十分）
- Remote UI対応（Desktop専用機能）

## Open Questions

- ~~コマンドセットインストーラーが`scripts/`ディレクトリを既にサポートしているか確認が必要~~
  - **解決済み** (Design段階): `ccSddWorkflowInstaller.ts`の`installScripts`メソッドが`templates/scripts/`ディレクトリ内の`.sh`ファイルを自動的にインストールする。スクリプトファイルを配置するだけで配布される。
