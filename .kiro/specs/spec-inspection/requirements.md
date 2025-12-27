# Requirements Document

## Introduction
本ドキュメントは「spec-inspection」機能の要件を定義する。この機能は、SDDワークフローの実装完了後に実行する総合検査Skillであり、実装がSpec文書（requirements.md, design.md, tasks.md）、steering、およびCLAUDE.mdのDesign Principlesと整合しているかを検査し、GO/NOGO判定と検査報告書（inspection-{n}.md）を生成する。

## Requirements

### Requirement 1: 検査実行と報告書生成
**Objective:** As a 開発者, I want 実装完了後にSpec文書との整合性を自動検査できる機能, so that 実装品質を保証し、仕様との乖離を早期に発見できる

#### Acceptance Criteria
1. When `/kiro:spec-inspection {feature}` コマンドが実行された場合, the spec-inspection Skill shall 対象featureの実装とSpec文書の整合性検査を開始する
2. When 検査が完了した場合, the spec-inspection Skill shall `.kiro/specs/{feature}/inspection-{n}.md` に検査報告書を生成する（nは連番）
3. When 検査報告書を生成する場合, the spec-inspection Skill shall GO/NOGO判定を明確に記載する
4. If 検査対象のSpec文書（requirements.md, design.md, tasks.md）が存在しない場合, then the spec-inspection Skill shall エラーメッセージを表示し検査を中止する
5. The spec-inspection Skill shall 検査開始時に使用するSpec文書とsteeringファイルの一覧をログに出力する

### Requirement 2: 実装とSpec文書の整合性検査
**Objective:** As a 開発者, I want 実装がrequirements.md、design.md、tasks.mdと整合しているかを検査したい, so that 仕様通りの実装が行われていることを確認できる

#### Acceptance Criteria
1. When 整合性検査を実行する場合, the spec-inspection Skill shall requirements.mdの各受入基準が実装で満たされているかを検証する
2. When 整合性検査を実行する場合, the spec-inspection Skill shall design.mdのアーキテクチャ設計が実装に反映されているかを検証する
3. When 整合性検査を実行する場合, the spec-inspection Skill shall tasks.mdの全タスクが完了しているかを検証する
4. If 受入基準を満たしていない項目がある場合, then the spec-inspection Skill shall 該当項目と不整合の詳細を報告書に記載する
5. If 設計と実装に乖離がある場合, then the spec-inspection Skill shall 乖離箇所と推奨される修正を報告書に記載する

### Requirement 3: steeringとの整合性検査
**Objective:** As a 開発者, I want 実装がsteeringドキュメント（product.md, tech.md, structure.md等）と矛盾していないかを検査したい, so that プロジェクト全体の一貫性を維持できる

#### Acceptance Criteria
1. When steering検査を実行する場合, the spec-inspection Skill shall `.kiro/steering/` 配下の全ファイルを読み込む
2. When steering検査を実行する場合, the spec-inspection Skill shall product.mdとの機能的矛盾を検出する
3. When steering検査を実行する場合, the spec-inspection Skill shall tech.mdとの技術スタック・パターン違反を検出する
4. When steering検査を実行する場合, the spec-inspection Skill shall structure.mdとのディレクトリ構造・命名規則違反を検出する
5. If steeringとの矛盾・不整合がある場合, then the spec-inspection Skill shall 該当箇所と矛盾内容を報告書に記載する
6. If steeringとSpec文書の間に重複記載がある場合, then the spec-inspection Skill shall 重複箇所を報告書に記載し統合を推奨する

### Requirement 4: Design Principles遵守検査
**Objective:** As a 開発者, I want 実装がCLAUDE.mdで定義されたDesign Principles（DRY, SSOT, KISS, YAGNI, 関心の分離）を遵守しているかを検査したい, so that コード品質を維持できる

#### Acceptance Criteria
1. When Design Principles検査を実行する場合, the spec-inspection Skill shall CLAUDE.mdからDesign Principlesセクションを読み込む
2. When Design Principles検査を実行する場合, the spec-inspection Skill shall DRY（Don't Repeat Yourself）違反を検出する
3. When Design Principles検査を実行する場合, the spec-inspection Skill shall SSOT（Single Source of Truth）違反を検出する
4. When Design Principles検査を実行する場合, the spec-inspection Skill shall 関心の分離違反（単一責務原則違反）を検出する
5. If Design Principles違反がある場合, then the spec-inspection Skill shall 違反内容と改善提案を報告書に記載する

### Requirement 5: 孤立コード（Dead Code）検出
**Objective:** As a 開発者, I want 実装に含まれる未使用コードや孤立したモジュールを検出したい, so that コードベースをクリーンに保てる

#### Acceptance Criteria
1. When Dead Code検査を実行する場合, the spec-inspection Skill shall 未使用のexport（関数、クラス、変数）を検出する
2. When Dead Code検査を実行する場合, the spec-inspection Skill shall 到達不能なコードブロックを検出する
3. When Dead Code検査を実行する場合, the spec-inspection Skill shall 今回の機能実装で追加されたがどこからも参照されていないファイルを検出する
4. If Dead Codeが検出された場合, then the spec-inspection Skill shall 該当箇所と削除候補としてのリスク評価を報告書に記載する

### Requirement 6: 既存実装との統合確認
**Objective:** As a 開発者, I want 新規実装が既存のコードベースと適切に統合されているかを確認したい, so that 既存機能への影響を把握できる

#### Acceptance Criteria
1. When 統合検査を実行する場合, the spec-inspection Skill shall 既存のIPC channels、services、storesとの連携を検証する
2. When 統合検査を実行する場合, the spec-inspection Skill shall 既存の型定義との互換性を検証する
3. If 既存実装との統合に問題がある場合, then the spec-inspection Skill shall 問題箇所と推奨される修正を報告書に記載する
4. The spec-inspection Skill shall 新規追加されたpublic APIの一覧を報告書に記載する

### Requirement 7: GO/NOGO判定基準
**Objective:** As a 開発者, I want 明確な基準に基づいたGO/NOGO判定を受けたい, so that 次のステップに進むべきかどうかを判断できる

#### Acceptance Criteria
1. When 全ての検査が完了した場合, the spec-inspection Skill shall 以下の基準でGO/NOGO判定を行う：
   - GO: 全ての受入基準が満たされ、Critical/Majorな問題がない
   - NOGO: いずれかの受入基準が未達、またはCritical/Majorな問題がある
2. The spec-inspection Skill shall 検出された問題をCritical/Major/Minor/Infoの4段階で分類する
3. If NOGO判定の場合, then the spec-inspection Skill shall 改修が必要な項目を優先度順に報告書に記載する
4. When GO判定の場合, the spec-inspection Skill shall spec.jsonに`inspection`フィールドを追加しステータスを記録する

### Requirement 8: 修正オプション（--fix）
**Objective:** As a 開発者, I want 検出された問題を効率的に修正したい, so that 手動での修正作業を削減できる

#### Acceptance Criteria
1. When `--fix` オプションが指定された場合, the spec-inspection Skill shall 仕様書（requirements.md, design.md, tasks.md）の軽微な不整合を直接修正する
2. When `--fix` オプションが指定され、コード修正が必要な場合, the spec-inspection Skill shall tasks.mdに追加タスクとして追記する
3. When tasks.mdに追加タスクを追記した場合, the spec-inspection Skill shall `/kiro:spec-impl {feature}` の再実行を案内するメッセージを表示する
4. If 自動修正が不可能な問題がある場合, then the spec-inspection Skill shall 手動修正が必要な項目を明示する

### Requirement 9: 自動修正オプション（--autofix）
**Objective:** As a 開発者, I want NOGO判定時に自動的に改修を実行したい, so that 修正サイクルを高速化できる

#### Acceptance Criteria
1. When `--autofix` オプションが指定され、NOGO判定となった場合, the spec-inspection Skill shall 自動的に修正処理を開始する
2. When 自動修正を実行する場合, the spec-inspection Skill shall まず仕様書の修正を行い、次にtasks.mdへの追加タスク追記を行う
3. When 追加タスクがtasks.mdに追記された場合, the spec-inspection Skill shall 自動的に `/kiro:spec-impl {feature}` を実行する
4. When 自動修正後に再検査が必要な場合, the spec-inspection Skill shall 再度検査を実行しGO判定になるまで繰り返す
5. If 3回の自動修正サイクルでGO判定に達しない場合, then the spec-inspection Skill shall 自動修正を中止し手動介入を要求する

### Requirement 10: spec.jsonへのinspectionステータス管理
**Objective:** As a 開発者, I want 検査結果をspec.jsonで管理したい, so that 検査履歴と現在のステータスを追跡できる

#### Acceptance Criteria
1. When GO判定となった場合, the spec-inspection Skill shall spec.jsonに`inspection`オブジェクトを追加する
2. The spec-inspection Skill shall `inspection`オブジェクトに以下のフィールドを含める：
   - `passed`: boolean（GO判定かどうか）
   - `inspected_at`: ISO 8601形式のタイムスタンプ
   - `report_file`: 報告書ファイル名（例: `inspection-1.md`）
3. When 再検査を実行した場合, the spec-inspection Skill shall `inspection`オブジェクトを最新の結果で更新する

### Requirement 11: プロファイル配布
**Objective:** As a プロジェクト管理者, I want spec-inspection Skillを複数のプロファイルで利用したい, so that 異なる環境で一貫した検査を実行できる

#### Acceptance Criteria
1. The spec-inspection Skill shall 以下のプロファイルに配布される：
   - cc-sdd（Slash Command形式: `/kiro:spec-inspection`）
   - cc-sdd-agent（Agent Command形式: `/kiro:spec-inspection`）
   - kiro（Slash Command + Agent形式: `/kiro:spec-inspection`）
   - spec-manager（Slash Command形式: `/spec-manager:inspection`）
2. When 各プロファイルにインストールする場合, the spec-inspection Skill shall 適切なコマンドセット形式（slash command/agent）で配置される
3. The spec-inspection Skill shall 全プロファイルで同一の検査ロジックを使用する
4. The spec-inspection Skill shall ccSddWorkflowInstallerのCC_SDD_COMMANDSおよびCC_SDD_AGENTSリストに登録される
5. The spec-inspection Skill shall spec-managerプロファイル用テンプレートが`templates/commands/spec-manager/inspection.md`に配置される

### Requirement 12: 検査報告書のUI表示
**Objective:** As a 開発者, I want 検査報告書（inspection-{n}.md）をSDD Orchestratorのメインパネルでプレビューしたい, so that GUI上で検査結果を確認できる

#### Acceptance Criteria
1. When spec.jsonにinspectionフィールドが存在する場合, the SDD Orchestrator shall ArtifactEditorのタブに検査報告書タブを動的に追加する
2. The SDD Orchestrator shall 検査報告書タブのラベルを「Inspection-{n}」形式で表示する（nはreport_fileから抽出）
3. When 検査報告書タブがクリックされた場合, the SDD Orchestrator shall 対応するinspection-{n}.mdファイルの内容をプレビュー表示する
4. The SDD Orchestrator shall editorStore.tsのArtifactTypeに`inspection-${number}`パターンを追加する
5. The SDD Orchestrator shall specStore.tsのselectSpec関数で検査報告書ファイルを読み込む

### Requirement 13: 検査ボタンからの実行
**Objective:** As a 開発者, I want SDD OrchestratorのWorkflowViewにある検査（inspection）ボタンをクリックしてspec-inspectionを実行したい, so that GUIから直接検査を開始できる

#### Acceptance Criteria
1. The SDD Orchestrator shall specManagerService.tsのPHASE_COMMANDS_BY_PREFIXのinspectionフェーズを`/kiro:spec-inspection`に変更する
2. When 検査ボタンがクリックされた場合, the SDD Orchestrator shall `/kiro:spec-inspection {feature}` コマンドを実行する
3. The SDD Orchestrator shall spec-managerプレフィックス用にinspectionフェーズを`/spec-manager:inspection`に設定する
4. When 自動実行（Auto Execute）でinspectionフェーズに到達した場合, the SDD Orchestrator shall 同様に`/kiro:spec-inspection`を実行する

