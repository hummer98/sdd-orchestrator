# Research & Design Decisions - inspection-build-test-verification

## Summary
- **Feature**: `inspection-build-test-verification`
- **Discovery Scope**: Extension（既存のspec-inspectionエージェントへの機能追加）
- **Key Findings**:
  - Taskfileは検証コマンドの抽象化レイヤーとして最適（プロジェクトルート問題を回避）
  - 既存のprojectChecker.tsをベースにverify:*タスク検証を追加可能
  - spec-inspectionエージェントの既存カテゴリ構造にBuild & Test Verificationを追加

## Research Log

### Taskfile.yml によるビルド・テスト検証の標準化

- **Context**: 検証コマンドをプロジェクト間で一貫させる方法の調査
- **Sources Consulted**:
  - [Taskfile.dev - Getting Started](https://taskfile.dev/docs/getting-started)
  - [Taskfile Schema Reference](https://taskfile.dev/docs/reference/schema)
  - 既存の`/Taskfile.yml`
- **Findings**:
  - Taskfileはsh/bash互換のクロスプラットフォームタスクランナー
  - `preconditions`属性で実行前条件を確認可能（例: `test -f package.json`）
  - `status`属性で成否判定が可能
  - グローバル環境変数のサポートにより、プロジェクト固有の設定を注入可能
  - `dir:`属性でカレントディレクトリを指定可能（プロジェクトルート問題を解決）
- **Implications**: verify:*タスクを標準インターフェースとして定義し、各プロジェクトでカスタマイズ可能にする

### steering/tech.md への Verification Commands セクション追加

- **Context**: プロジェクト固有の検証コマンドをAIエージェントに伝える方法
- **Sources Consulted**:
  - 既存の`.kiro/steering/tech.md`
  - spec-inspectionエージェント定義
- **Findings**:
  - tech.mdは技術スタック定義の標準的な場所
  - Testing/Common Commandsセクションが既存
  - Verification Commandsセクションを追加してverify:*コマンドを定義可能
  - spec-inspectionはsteering/*.mdを既に読み込んでいる
- **Implications**: tech.mdにVerification Commandsセクションを追加し、デフォルトはtask verify:*を使用

### 既存コードベース分析 - spec-inspection エージェント

- **Context**: Build & Test Verificationカテゴリの追加箇所の特定
- **Sources Consulted**:
  - `.claude/agents/kiro/spec-inspection.md`
  - `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md`
- **Findings**:
  - 既存カテゴリ: RequirementsChecker, DesignChecker, TaskChecker, SteeringChecker, PrincipleChecker, DeadCodeChecker, IntegrationChecker
  - 各カテゴリは独立したセクションとして実装
  - レポート形式: `inspection-{n}.md`
  - GO/NOGO判定: Critical/Major/Minor/Info の重大度レベル
  - `Bash`ツールが既にtools属性に含まれている
- **Implications**: BuildTestVerificationCheckerを新カテゴリとして追加、Bashでtask verify:*を実行

### 既存コードベース分析 - プロジェクトバリデーション

- **Context**: taskコマンド存在確認とverify:*タスク確認の追加箇所
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/projectChecker.ts`
  - `electron-sdd-manager/src/renderer/components/ProjectValidationPanel.tsx`
  - `electron-sdd-manager/src/renderer/types/index.ts`
- **Findings**:
  - ProjectCheckerはコマンドとsettings存在確認を担当
  - FileCheckResult型が再利用可能
  - KiroValidation型にverification環境情報を追加可能
  - ProjectValidationPanelは問題がある場合のみ表示（ノイズ削減）
- **Implications**: VerificationEnvironmentCheck型を追加、ProjectCheckerを拡張

### フォールバック戦略 - package.json スクリプト解析

- **Context**: taskコマンドがない場合の代替検証方法
- **Sources Consulted**:
  - `electron-sdd-manager/package.json`
  - 一般的なnpm scriptsパターン
- **Findings**:
  - 標準的なスクリプト名: build, typecheck/type-check, lint, test, test:e2e
  - package.jsonはプロジェクトルートに存在
  - npm/yarn/pnpmいずれかで実行可能
  - 実行時間計測はBashのtimeコマンドまたはNode.jsで実現
- **Implications**: package.json解析によるフォールバック実装、パッケージマネージャー自動検出

### verify:*タスク雛形インストール

- **Context**: SDD OrchestratorからTaskfileへのverify:*タスク追加機能
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/commandInstallerService.ts`
  - `electron-sdd-manager/src/main/ipc/handlers.ts`
  - メニュー経由のインストール機能（experimentalToolsInstallerService）
- **Findings**:
  - CommandInstallerServiceパターンが再利用可能
  - Result型によるエラーハンドリング
  - IPCチャンネル経由でrendererから呼び出し
  - メニュー項目→IPC→Service→ファイル操作の流れ
- **Implications**: TaskfileInstallerServiceを新規作成、既存パターンに従う

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Taskfile統合 | verify:*タスクでビルド・テストを抽象化 | カレントディレクトリ問題回避、プラットフォーム非依存 | taskコマンドのインストールがユーザー責任 | 採用。フォールバック戦略で補完 |
| 直接npm run実行 | spec-inspectionがnpm scriptsを直接実行 | 依存関係なし | cwdの明示的管理が必要、標準化が困難 | フォールバックとして使用 |
| Claude Bashツール経由 | すべてをBashコマンドで実行 | 柔軟性が高い | プロジェクト間の一貫性がない | Taskfile内部で使用 |

## Design Decisions

### Decision: Taskfileによる検証コマンド集約

- **Context**: 各プロジェクトで異なる検証コマンド（npm/yarn/pnpm、異なるスクリプト名）を統一的に扱う必要がある
- **Alternatives Considered**:
  1. 直接package.jsonスクリプトを実行
  2. 設定ファイルで検証コマンドをマッピング
- **Selected Approach**: Taskfile.ymlにverify:*タスクを定義し、spec-inspectionがtask verify:*を実行
- **Rationale**:
  - Taskfileはプロジェクトルートからの相対パス問題を解決
  - クロスプラットフォーム対応
  - 既にSDD OrchestratorがTaskfileを使用
  - preconditionsで事前条件確認が可能
- **Trade-offs**: taskコマンドのインストールがユーザー責任（ドキュメントで案内）
- **Follow-up**: フォールバック戦略でtaskなし環境もサポート

### Decision: steering/tech.mdへのVerification Commands追加

- **Context**: プロジェクト固有の検証コマンドをAIエージェントに伝える必要がある
- **Alternatives Considered**:
  1. 独立した設定ファイル（.kiro/settings/verification.yml）
  2. spec.json内に定義
- **Selected Approach**: tech.mdにVerification Commandsセクションを追加
- **Rationale**:
  - tech.mdは技術スタック定義の標準的な場所
  - 既にTesting/Common Commandsセクションがある
  - spec-inspectionは既にsteering/*.mdを読み込む
  - 人間が読みやすいMarkdown形式
- **Trade-offs**: 構造化されたデータより解析が若干難しい
- **Follow-up**: パースロジックをspec-inspectionエージェントに追加

### Decision: spec-inspection への Build & Test Verification カテゴリ追加

- **Context**: ビルド・テスト検証結果をinspectionレポートに含める必要がある
- **Alternatives Considered**:
  1. 独立したvalidate-buildコマンド
  2. 既存のIntegrationCheckerを拡張
- **Selected Approach**: 新規カテゴリ「Build & Test Verification」として追加
- **Rationale**:
  - 既存カテゴリと同列の独立した検証観点
  - inspection-{n}.mdに統一されたレポート形式で出力
  - GO/NOGO判定ロジックと整合
- **Trade-offs**: spec-inspectionエージェントの複雑化
- **Follow-up**: 実行時間計測とエラー詳細の出力形式を定義

### Decision: kiroValidationオブジェクト拡張

- **Context**: プロジェクトバリデーションにverify環境情報を追加
- **Alternatives Considered**:
  1. 別のverificationCheck型を作成
  2. 既存のspecManagerCheckを拡張
- **Selected Approach**: KiroValidation型を拡張し、verification環境情報を追加
- **Rationale**:
  - プロジェクト構造に関連する情報として一貫性がある
  - ProjectValidationPanelで統一的に表示可能
- **Trade-offs**: 型の後方互換性管理が必要
- **Follow-up**: オプショナルフィールドとして追加

## Risks & Mitigations

- **taskコマンドが未インストール** — フォールバック戦略でnpm scripts直接実行、警告とインストール案内表示
- **verify:*タスクが未定義** — 雛形インストール機能を提供、package.json解析で自動設定
- **検証コマンドの実行時間が長い** — 進捗ログ出力、タイムアウト設定（オプション）
- **Taskfile.yml形式の互換性** — YAML解析はgo-task準拠、エラー時は明確なメッセージ
- **プロジェクトごとの検証コマンド差異** — steering/tech.mdでカスタマイズ可能

## References

- [Taskfile.dev - Getting Started](https://taskfile.dev/docs/getting-started) - Taskfile基本構文
- [Taskfile Schema Reference](https://taskfile.dev/docs/reference/schema) - 完全なスキーマ定義
- [Medium - Why you should be using Go-Task](https://medium.com/@lorique/why-you-should-be-using-go-task-3cd30897f8d8) - Taskfile採用事例
