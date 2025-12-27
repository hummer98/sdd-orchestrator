# Requirements Document

## Introduction

spec-inspectionエージェントにビルド・型チェック・lint・ユニットテスト・E2Eテストの検証機能を追加する。これにより、実装フェーズ完了後の品質検証を自動化し、CI/CDパイプラインとの整合性を確保する。

主な設計方針:
- **Taskfileによる検証コマンド集約**: カレントディレクトリ問題を回避し、プロジェクトルートからの一貫した実行を保証
- **taskコマンドのインストールはユーザー責任**: ドキュメントで案内し、環境依存を最小化
- **フォールバック戦略**: taskがなくても最低限の検証を実行可能

## Requirements

### Requirement 1: Steering Configuration - Verification Commands

**Objective:** As a 開発者, I want steering/tech.mdにVerification Commandsセクションを追加したい, so that プロジェクト共通の検証コマンドを一元管理できる

#### Acceptance Criteria

1. When spec-inspection実行時にsteering/tech.mdを読み込む, the spec-inspectionエージェント shall Verification Commandsセクションから検証コマンド設定を取得する
2. If Verification Commandsセクションが存在しない, the spec-inspectionエージェント shall デフォルトの検証コマンド（verify:*）を使用する
3. The tech.md Verification Commandsセクション shall 以下の検証カテゴリを定義可能にする: build, typecheck, lint, test, e2e
4. Where カスタム検証コマンドが定義されている, the spec-inspectionエージェント shall そのコマンドを優先的に使用する

### Requirement 2: Taskfile Verification Tasks

**Objective:** As a プロジェクト管理者, I want Taskfileにverify:*タスクを標準化したい, so that 一貫したインターフェースで検証を実行できる

#### Acceptance Criteria

1. The verify:*タスク shall 以下の標準タスクを含む: verify:build, verify:typecheck, verify:lint, verify:test, verify:e2e, verify:all
2. When verify:allを実行する, the Taskfile shall build→typecheck→lint→test→e2eの順序で各検証を実行する
3. The 各verify:*タスク shall プロジェクトルートからの相対パスで正しく動作する
4. If 特定の検証が不要な場合, the verify:*タスク shall 該当タスクをスキップまたは空実装として定義可能とする
5. The verify:*タスク雛形 shall SDD Orchestratorからインストール可能とする

### Requirement 3: Build & Test Verification Category in spec-inspection

**Objective:** As a 品質管理担当者, I want spec-inspectionエージェントにBuild & Test Verificationカテゴリを追加したい, so that 実装後の品質検証を自動化できる

#### Acceptance Criteria

1. The spec-inspectionエージェント shall 「Build & Test Verification」カテゴリを検査項目に含める
2. When Build & Test Verification検査を実行する, the spec-inspectionエージェント shall 以下の項目を検証する: ビルド成功、型チェック成功、lint成功、ユニットテスト成功、E2Eテスト成功
3. The 各検証結果 shall PASS/FAIL/SKIP/ERRORのステータスで報告される
4. If いずれかの検証がFAILした場合, the spec-inspectionエージェント shall 詳細なエラー出力を検査レポートに含める
5. While 検証実行中, the spec-inspectionエージェント shall 進捗状況をログ出力する
6. The Build & Test Verification結果 shall inspection-{n}.md内の独立したセクションとして記録される

### Requirement 4: Project Validation Enhancement

**Objective:** As a 開発者, I want プロジェクトバリデーションにtaskコマンド存在確認とverify:*タスク確認を追加したい, so that 検証環境の準備状況を事前に確認できる

#### Acceptance Criteria

1. When プロジェクトバリデーション実行時, the バリデーション shall taskコマンドの存在を確認する
2. When プロジェクトバリデーション実行時, the バリデーション shall Taskfile.ymlの存在を確認する
3. When プロジェクトバリデーション実行時, the バリデーション shall verify:*タスクの定義状況を確認する
4. If taskコマンドが存在しない, the バリデーション shall 警告とインストール方法へのリンクを表示する
5. If verify:*タスクが未定義の場合, the バリデーション shall 雛形インストールを提案する
6. The バリデーション結果 shall kiroValidationオブジェクトに検証環境情報を追加する

### Requirement 5: Verification Task Template Installer

**Objective:** As a プロジェクト管理者, I want verify:*タスクの雛形をインストールする機能がほしい, so that 検証環境を素早くセットアップできる

#### Acceptance Criteria

1. The SDD Orchestrator shall verify:*タスク雛形をTaskfile.ymlに追加するメニュー項目を提供する
2. When 雛形インストールを実行する, the インストーラー shall プロジェクトのpackage.jsonスクリプトを解析して適切なコマンドを設定する
3. If Taskfile.ymlが存在しない, the インストーラー shall 新規Taskfile.ymlを作成する
4. If Taskfile.ymlが既存の場合, the インストーラー shall verify:*タスクのみを追加する（既存タスクを上書きしない）
5. The 雛形インストール shall ユーザーに確認ダイアログを表示してから実行する
6. When インストール完了後, the インストーラー shall 結果をユーザーに通知する

### Requirement 6: Fallback Execution Strategy

**Objective:** As a 開発者, I want taskコマンドが存在しない場合でもフォールバック実行したい, so that 最低限の検証が可能になる

#### Acceptance Criteria

1. If taskコマンドが存在しない, the spec-inspectionエージェント shall package.jsonのスクリプトから検証コマンドを推測する
2. The フォールバック検証 shall 以下の優先順位でコマンドを探索する: npm scripts → yarn scripts → pnpm scripts
3. If npm run buildが存在する, the フォールバック shall それをビルド検証に使用する
4. If npm run typecheckまたはnpm run type-checkが存在する, the フォールバック shall それを型チェック検証に使用する
5. If npm run lintが存在する, the フォールバック shall それをlint検証に使用する
6. If npm run testが存在する, the フォールバック shall それをユニットテスト検証に使用する
7. If npm run test:e2eが存在する, the フォールバック shall それをE2Eテスト検証に使用する
8. When フォールバック実行時, the spec-inspectionエージェント shall 検査レポートにフォールバックモードであることを明記する

### Requirement 7: Inspection Report Enhancement

**Objective:** As a レビュアー, I want 検査レポートにBuild & Test Verification結果を含めたい, so that 品質状況を一目で確認できる

#### Acceptance Criteria

1. The inspection-{n}.md shall Build & Test Verificationセクションを含める
2. The Build & Test Verificationセクション shall 各検証項目のステータスサマリーテーブルを含める
3. If 検証がFAILした場合, the レポート shall エラー詳細を折りたたみ可能な形式で含める
4. The レポート shall 実行された検証コマンドを記録する
5. The レポート shall 検証実行時間を記録する
6. When 全検証がPASSした場合, the レポート shall 「Build & Test Verification: PASSED」と明示する
7. When いずれかの検証がFAILした場合, the レポート shall 「Build & Test Verification: FAILED」と明示し、失敗項目を列挙する
