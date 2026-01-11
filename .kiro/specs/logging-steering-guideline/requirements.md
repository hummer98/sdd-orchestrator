# Requirements: Logging Steering Guideline

## Decision Log

### ログ観点の適用範囲
- **Discussion**: 全プロジェクト共通とすべきか、プロジェクト種別（CLI/Webアプリ/ライブラリ等）によって異なるべきか
- **Conclusion**: 全プロジェクト共通とし、該当しない項目はN/A（適用外）として扱う
- **Rationale**: 共通観点として定義することで一貫性を保ちつつ、プロジェクト種別による柔軟な適用が可能

### logging.mdとdebugging.mdの棲み分け
- **Discussion**: 新規のlogging.mdと既存のdebugging.mdの役割をどう分けるか
- **Conclusion**: 案A採用 - logging.mdは設計/実装の観点・ガイドライン、debugging.mdはプロジェクト固有の場所・手順
- **Rationale**: 関心の分離（観点と手順の分離）、再利用性（logging.mdは全プロジェクト共通テンプレート）、既存構造との整合性

### 必須/推奨の区別
- **Discussion**: どの観点を必須（Critical）、どの観点を推奨（Warning）とすべきか
- **Conclusion**:
  - 必須: ログレベル対応、ログフォーマット、ログ場所の言及、過剰なログ実装の回避
  - 推奨: 開発/本番でのログ出力先分離、ログレベル指定手段、調査に必要な変数のログ出力
- **Rationale**: 必須項目はAIアシスタントによる調査の前提条件、推奨項目は運用上望ましいが状況により不要な場合もある

### 開発/本番でのログ出力先分離の意図
- **Discussion**: 「本番/デバッグ用ログファイル分離」の具体的な意味
- **Conclusion**: 開発中のログはプロジェクト配下のディレクトリに出力し、本番ログ（$HOME等）と混在させない
- **Rationale**: 開発中のログが本番用ログに混ざることを避け、調査時の混乱を防止

### ログフォーマット例
- **Discussion**: 具体的な推奨フォーマットを記載するか、抽象的な記述に留めるか
- **Conclusion**: 推奨フォーマット例を記載し、JSON lines等の構造化フォーマットも選択肢として併記
- **Rationale**: AIが誤解せずにログを解析できることが最も重要

### ログライブラリの推奨
- **Discussion**: 特定のログライブラリを推奨として記載するか
- **Conclusion**: 言語/フレームワーク非依存の観点のみとし、具体的なライブラリ選定はプロジェクトに委ねる
- **Rationale**: フレームワークによって最適なライブラリが異なる

### document-review / spec-inspectionへの反映方法
- **Discussion**: logging.mdをsteeringに追加するだけで十分か、明示的なチェック項目として組み込むか
- **Conclusion**: B・C両方採用 - document-reviewの「Technical Considerations」に「Logging」観点を追加、spec-inspectionに「LoggingChecker」カテゴリを新設
- **Rationale**: 明示的なチェック項目として組み込むことで、観点の見落としを防止

### debugging.mdへの原則追加
- **Discussion**: 「推測ではなくログを参照してデバッグせよ」という指示を追加すべきか
- **Conclusion**: 追加する
- **Rationale**: AIアシスタントは推測で原因を特定しようとしがちであり、明示的な指示がデバッグ品質を向上させる

## Introduction

document-reviewおよびspec-inspectionにおいて「適切なロギング設計/実装」をチェックできるよう、ロギング観点のsteeringファイル（logging.md）を追加する。これにより、AIアシスタントがログから効果的に調査を行える環境が整備されているかを検証可能とする。

## Requirements

### Requirement 1: ロギングガイドラインファイルの作成

**Objective:** 開発者として、ロギングに関する設計/実装の観点・ガイドラインを一箇所で参照したい。仕様レビューや実装検査時にロギング観点が漏れなくチェックされるようにするため。

#### Acceptance Criteria

1. `.kiro/steering/logging.md`ファイルが存在すること
2. logging.mdには以下の必須観点が含まれていること:
   - ログレベル対応（debug/info/warning/error）
   - ログフォーマット（日時、ログレベル、内容）
   - ログ場所のsteering/CLAUDE.md言及
   - 過剰なログ実装の回避
3. logging.mdには以下の推奨観点が含まれていること:
   - 開発/本番でのログ出力先分離（開発中はプロジェクト配下）
   - ログレベル指定手段（CLI/環境変数/設定ファイルのいずれか）
   - 調査に必要な変数のログ出力
4. logging.mdには推奨ログフォーマット例が含まれていること
5. logging.mdには構造化ログ（JSON lines等）の選択肢が併記されていること
6. logging.mdは言語/フレームワーク非依存の観点のみを記載すること

### Requirement 2: インストーラー配布用テンプレートの作成

**Objective:** コマンドセットインストーラーの管理者として、新規プロジェクトにロギングガイドラインを自動配布したい。インストール時に手動でファイルを追加する手間を省くため。

#### Acceptance Criteria

1. `electron-sdd-manager/resources/templates/settings/templates/steering/logging.md`が存在すること
2. テンプレートの内容は`.kiro/steering/logging.md`と同一であること
3. `CC_SDD_SETTINGS`（ccSddWorkflowInstaller.ts）に`templates/steering/logging.md`が追加され、コマンドセットインストール時に`.kiro/settings/templates/steering/`にコピーされること

### Requirement 3: CLAUDE.mdへのlogging.md説明追加

**Objective:** AIアシスタントとして、steeringファイルの役割を把握したい。logging.mdの存在と目的を認識し、適切に参照できるようにするため。

#### Acceptance Criteria

1. `electron-sdd-manager/resources/templates/CLAUDE.md`のSteering Configurationセクションにlogging.mdの説明が追加されていること
2. 説明には「ロギング設計/実装の観点・ガイドライン」という役割が記載されていること
3. セマンティックマージにより、既存プロジェクトのCLAUDE.mdにも反映されること

### Requirement 4: document-reviewへのLogging観点追加

**Objective:** レビュー担当者として、仕様レビュー時にロギング観点を明示的にチェックしたい。ロギング設計の不備を早期に発見するため。

#### Acceptance Criteria

1. `.claude/commands/kiro/document-review.md`の「Technical Considerations」セクションに「Logging (see steering/logging.md)」が追加されていること
2. 各プロファイル用テンプレート（cc-sdd, cc-sdd-agent, spec-manager等）のdocument-review.mdも同様に更新されていること

### Requirement 5: spec-inspectionへのLoggingCheckerカテゴリ追加

**Objective:** 検査担当者として、実装検査時にロギング実装の品質をチェックしたい。ロギングガイドラインへの準拠を検証するため。

#### Acceptance Criteria

1. `.claude/agents/kiro/spec-inspection.md`に「LoggingChecker」カテゴリが追加されていること
2. LoggingCheckerは以下を検証すること:
   - 必須観点の準拠（違反はCritical/Major）
   - 推奨観点の準拠（違反はMinor/Info）
3. LoggingCheckerはsteering/logging.mdを参照して検証を行うこと
4. 各プロファイル用テンプレートのspec-inspection.md/agents/も同様に更新されていること

### Requirement 6: debugging.mdへのデバッグ原則追加

**Objective:** AIアシスタントとして、デバッグ時の行動指針を明確にしたい。推測ではなくログを参照して問題を診断するため。

#### Acceptance Criteria

1. `.kiro/steering/debugging.md`に「デバッグの原則」セクションが追加されていること
2. 「推測ではなくログを確認する」原則が明記されていること
3. logging.mdへの参照が含まれていること
4. `electron-sdd-manager/resources/templates/steering/debugging.md`も同様に更新されていること

### Requirement 7: プロジェクトバリデーションへのsteering追加

**Objective:** コマンドセットインストーラーの管理者として、プロジェクトバリデーション時にlogging.mdとdebugging.mdの存在を確認したい。インストール漏れを検出するため。

#### Acceptance Criteria

1. `electron-sdd-manager/src/main/services/projectChecker.ts`の`REQUIRED_SETTINGS`に以下が追加されていること:
   - `templates/steering/logging.md`
   - `templates/steering/debugging.md`
2. プロジェクトバリデーション実行時に上記ファイルの存在がチェックされること
3. 上記ファイルが不足している場合、missing項目として報告されること
4. `electron-sdd-manager/resources/templates/settings/templates/steering/`に両ファイルのテンプレートが存在すること

## Out of Scope

- ログローテーション・保持期間の観点（プロジェクト固有の判断に委ねる）
- セキュリティ観点（機密情報のマスキング等）（プロジェクト固有の判断に委ねる）
- 特定のログライブラリの推奨

## Open Questions

- なし（対話を通じて全ての疑問点が解消済み）
