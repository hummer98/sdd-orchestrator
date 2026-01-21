# Requirements: Common Commands Installer

## Decision Log

### インストールタイミング
- **Discussion**: commit.mdが現在プロジェクト選択時に暗黙的にインストールされる仕様は好ましくない
- **Conclusion**: コマンドセットインストール時にプロファイルに関係なくインストールする
- **Rationale**: 明示的なインストールフローに統合することで、ユーザーの予測可能性を向上させる

### スコープ
- **Discussion**: commit.mdのみを対象とするか、将来的に拡張可能な設計にするか
- **Conclusion**: 将来的に拡張可能な設計（commonコマンド全般を扱う仕組み）
- **Rationale**: 今後同様のプロファイル非依存コマンドが増える可能性があるため

### 失敗時の挙動
- **Discussion**: commit.mdのインストール失敗時にコマンドセット全体を失敗させるか
- **Conclusion**: 警告ログを出してコマンドセットインストールは続行（ベストエフォート）
- **Rationale**: commonコマンドはワークフローの補助的な位置づけであり、メインのコマンドセットインストールを阻害すべきでない

### 既存ファイルの扱い
- **Discussion**: 既存のcommonコマンドファイルがある場合の挙動
- **Conclusion**: ダイアログでファイルごとに上書き/スキップを選択可能にする
- **Rationale**: ユーザーがカスタマイズしたファイルを誤って上書きすることを防ぎつつ、更新も可能にする

### ダイアログUI
- **Discussion**: 確認ダイアログの表示場所と粒度
- **Conclusion**: 既存のコマンドセットインストールUIに統合し、ファイルごとに確認
- **Rationale**: 既存のインストールフローとの一貫性を保つ

## Introduction

コマンドセットインストール時に、プロファイル（cc-sdd, cc-sdd-agent, spec-manager）に依存しない共通コマンド（commit.md等）をインストールする機能。現在のプロジェクト選択時の暗黙的インストールを廃止し、明示的なコマンドセットインストールフローに統合する。

## Requirements

### Requirement 1: 暗黙的インストールの廃止

**Objective:** As a developer, I want commit.md to not be installed implicitly on project selection, so that I have predictable control over what gets installed.

#### Acceptance Criteria
1. When a project is selected, the system shall NOT automatically install commit.md
2. The `setProjectPath()` function shall not contain commit command installation logic

### Requirement 2: コマンドセットインストール時のcommonコマンドインストール

**Objective:** As a developer, I want common commands to be installed when I install a commandset, so that all necessary commands are available after explicit installation.

#### Acceptance Criteria
1. When any profile (cc-sdd, cc-sdd-agent, spec-manager) is installed, the system shall install all common commands
2. The common commands shall be installed to `.claude/commands/` directory
3. If common command installation fails, the system shall log a warning and continue with commandset installation

### Requirement 3: 既存ファイルの上書き確認

**Objective:** As a developer, I want to be prompted before overwriting existing common command files, so that my customizations are protected.

#### Acceptance Criteria
1. When a common command file already exists, the system shall display a confirmation dialog
2. The dialog shall be displayed for each existing file individually
3. The dialog shall offer options to overwrite or skip the file
4. If the user chooses to skip, the system shall not modify the existing file
5. If the user chooses to overwrite, the system shall replace the file with the template

### Requirement 4: 拡張可能な設計

**Objective:** As a maintainer, I want the common commands installation to be extensible, so that new common commands can be added easily in the future.

#### Acceptance Criteria
1. The system shall support a list of common commands (not hardcoded to commit.md only)
2. Common commands shall be defined in a central location (e.g., `resources/templates/commands/common/`)
3. Adding a new common command shall only require adding the file to the common directory

## Out of Scope

- CLIでのコマンドセットインストール（Electron UIのみ対象）
- commonコマンドの個別インストール/アンインストール機能
- commonコマンドのバージョン管理

## Open Questions

- commonコマンドが複数になった場合、ダイアログを「すべて上書き」「すべてスキップ」のオプション付きにするか？（将来的な検討事項）
