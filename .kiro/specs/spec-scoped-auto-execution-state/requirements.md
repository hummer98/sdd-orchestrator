# Requirements Document

## Introduction

本ドキュメントは、自動実行（Auto Execution）のステータス管理をSpec単位に変更する機能の要件を定義する。現状のグローバルな自動実行状態管理をSpec単位に分離し、各Specのspec.jsonファイルを状態のデータソースとして使用することで、より柔軟で一貫性のある自動実行管理を実現する。

## Requirements

### Requirement 1: Spec単位の自動実行状態管理

**Objective:** As a 開発者, I want 自動実行の状態をSpec単位で管理できること, so that 複数のSpecを同時に操作する際に状態が混乱しない

#### Acceptance Criteria
1. When 自動実行が開始されたとき, the AutoExecutionService shall 対象Specのspec.jsonに自動実行状態を記録する
2. When 自動実行が完了または中断されたとき, the AutoExecutionService shall 対象Specのspec.jsonの状態を更新する
3. While 自動実行が進行中のとき, the AutoExecutionService shall 対象Specのspec.jsonから現在の状態を読み取り可能にする
4. The AutoExecutionService shall 各Specの自動実行状態を独立して追跡する
5. When 異なるSpecが選択されたとき, the UI shall そのSpecの自動実行状態をspec.jsonから読み込んで表示する

### Requirement 2: spec.jsonを単一のデータソースとして使用

**Objective:** As a 開発者, I want spec.jsonファイルを自動実行状態の唯一のデータソースとすること, so that 状態の整合性が保たれ、アプリ再起動後も状態が復元される

#### Acceptance Criteria
1. The SpecManagerService shall spec.jsonに自動実行関連のフィールドを管理する
2. When アプリケーションが起動されたとき, the AutoExecutionService shall spec.jsonから自動実行状態を復元する
3. When 自動実行状態が変更されたとき, the AutoExecutionService shall 即座にspec.jsonに永続化する
4. If spec.jsonに自動実行フィールドが存在しない場合, the AutoExecutionService shall デフォルト値を適用する
5. The spec.json shall 自動実行の以下の情報を保持する：実行中フラグ、現在のフェーズ、許可されたフェーズ設定

### Requirement 3: UI状態の同期

**Objective:** As a ユーザー, I want UIがspec.jsonの状態と常に同期していること, so that 正確な自動実行状態を確認できる

#### Acceptance Criteria
1. When spec.jsonの自動実行状態が変更されたとき, the WorkflowView shall 即座にUIを更新する
2. When Specが選択されたとき, the WorkflowView shall そのSpecの自動実行状態をUIに反映する
3. While 自動実行が進行中のとき, the UI shall 実行中のフェーズを視覚的に表示する
4. When 自動実行が完了したとき, the UI shall 完了状態を反映し、次のアクションを可能にする
5. The AutoExecutionStatusDisplay shall 選択中Specの自動実行状態のみを表示する

### Requirement 4: 複数Spec間の独立性

**Objective:** As a 開発者, I want 複数のSpecの自動実行状態が互いに影響しないこと, so that 並行作業時も各Specの状態が正確に維持される

#### Acceptance Criteria
1. When SpecAの自動実行が開始されたとき, the AutoExecutionService shall SpecBの状態に影響を与えない
2. When Specを切り替えたとき, the UI shall 前のSpecの自動実行状態を保持し、新しいSpecの状態を表示する
3. The executionStore shall Spec単位の自動実行状態を管理する構造に変更する
4. If 複数のSpecで自動実行が同時に要求された場合, the AutoExecutionService shall 各Specの状態を独立して管理する

### Requirement 5: 既存機能との互換性

**Objective:** As a 開発者, I want 既存のワークフロー機能が正常に動作し続けること, so that 既存の機能が壊れない

#### Acceptance Criteria
1. The PhaseExecutionPanel shall 既存のフェーズ実行ボタン機能を維持する
2. The ApprovalPanel shall 既存の承認・却下機能を維持する
3. When 手動フェーズ実行が行われたとき, the AutoExecutionService shall 自動実行状態に適切に反映する
4. The spec.json shall 既存のapprovals、phase、updated_atフィールドとの互換性を維持する
5. If 古い形式のspec.jsonが読み込まれた場合, the SpecManagerService shall 新しい自動実行フィールドをデフォルト値で追加する

### Requirement 6: ファイル監視との連携

**Objective:** As a 開発者, I want 外部からのspec.json変更が検出されUIに反映されること, so that エージェントによる変更が即座に反映される

#### Acceptance Criteria
1. When 外部プロセスがspec.jsonを変更したとき, the FileWatcher shall 変更を検出する
2. When spec.jsonの変更が検出されたとき, the AutoExecutionService shall 状態を再読み込みする
3. When 状態の再読み込みが完了したとき, the UI shall 最新の状態を表示する
4. The FileWatcher shall 自動実行関連のspec.jsonフィールド変更を適切に処理する
