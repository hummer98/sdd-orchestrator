# Requirements: Steering Release Integration

## Decision Log

### 生成するファイルの配置先
- **Discussion**: `.kiro/steering/release.md` vs `.claude/commands/release.md`
- **Conclusion**: `.claude/commands/release.md`
- **Rationale**: Slash Commandとして直接実行可能にするため。`/release`で呼び出せる形式が望ましい

### 分析対象
- **Discussion**: テンプレートコピーのみ vs プロジェクト分析
- **Conclusion**: プロジェクト分析（package.json, CI設定, ビルドスクリプト等）
- **Rationale**: プロジェクト固有のリリース手順を推測して生成することで、手動編集の手間を削減

### UIの配置
- **Discussion**: どこにボタンを配置するか
- **Conclusion**: ProjectValidationPanelに「Release」セクションを追加（steering-verification-integrationと同パターン）
- **Rationale**: 既存パターンとの一貫性、不足時のみ表示で導線を確保

## Introduction

プロジェクト固有のリリース手順を `.claude/commands/release.md` として自動生成する `kiro:steering-release` コマンド/エージェントを導入する。これにより、プロジェクトのビルド設定やCI構成を分析して適切なリリースワークフローを持つSlash Commandを生成できる。

## Requirements

### Requirement 1: steering-release コマンド/エージェント

**Objective:** AIエージェントとして、プロジェクトを分析して適切なリリース手順を含む `release.md` を生成したい。これにより、手動でリリース手順を記述する手間を省ける。

#### Acceptance Criteria

1.1. `kiro:steering-release` コマンドを実行すると、steering-release-agent が起動すること

1.2. エージェントは以下を分析してリリース手順を推測すること:
  - `package.json`（バージョン管理、scripts）
  - `electron-builder.yml` / `electron-builder.json`（Electronアプリの場合）
  - `.github/workflows/`（CI/CDパイプライン）
  - `Makefile`, `Taskfile.yml`等のビルド設定
  - `CHANGELOG.md`の存在と形式

1.3. エージェントは `.claude/commands/release.md` を生成すること

1.4. テンプレート `.kiro/settings/templates/commands/release.md` が存在し、エージェントが参照できること

1.5. コマンド/エージェントファイルがコマンドプリセット（cc-sdd, cc-sdd-agent）に同梱されること

### Requirement 2: release.md フォーマット

**Objective:** `/release` Slash Commandとして実行可能な形式でリリース手順を定義したい。

#### Acceptance Criteria

2.1. release.md は以下のセクションを含むこと:
  - 前提条件チェック（未コミット変更、ブランチ確認）
  - バージョン決定（semantic versioning）
  - CHANGELOG更新
  - ビルド/パッケージング
  - コミット/タグ作成
  - リリース公開（GitHub Release等）

2.2. 各ステップは実行可能なコマンド例を含むこと

2.3. プロジェクト固有の情報（パッケージ名、ビルドコマンド等）が反映されること

### Requirement 3: プロジェクトバリデーション拡張

**Objective:** UIユーザーとして、`release.md` が不足していることに気づき、簡単に生成を開始したい。

#### Acceptance Criteria

3.1. ProjectValidationPanel に「Release」セクションを追加すること

3.2. `.claude/commands/release.md` の存在をチェックすること

3.3. 不足している場合、「release.md を生成」ボタンを表示すること

3.4. ボタンをクリックすると、プロジェクトエージェントとして `/kiro:steering-release` を起動すること

3.5. Remote UI対応: 要（ReleaseSectionは`shared/components`として実装し、Remote UIでも利用可能とすること）

### Requirement 4: skill-reference.md 更新

**Objective:** steering-releaseコマンドをskill-referenceに追記し、コマンド体系を明確化したい。

#### Acceptance Criteria

4.1. `.kiro/steering/skill-reference.md` に steering-release を追加すること

4.2. cc-sdd, cc-sdd-agent 両プロファイルの「その他のコマンド」テーブルに追記すること

## Out of Scope

- release.md の必須化（オプショナルな拡張として扱う）
- 実際のリリース実行の自動化（release.md生成のみ）
- CI/CDパイプラインとの直接統合
- 複数プラットフォーム向けリリースの同時実行

## Open Questions

- なし（設計フェーズで詳細を決定）
