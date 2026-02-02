# Requirements: E2E Workflow Integration

## Decision Log

### 依存関係
- **Discussion**: 本specをinspection-distributedと同時に実装するか、依存関係を持たせるか検討
- **Conclusion**: inspection-distributedに依存（完了後に実装）
- **Rationale**: integration-checker v2はv1の拡張であり、基盤が必要

### Design as Source of Truth
- **Discussion**: E2Eテストの根拠をどこに定義するか検討
- **Conclusion**: design.mdにUser Journey Definition / Impact Analysis Contractセクションを追加
- **Rationale**: 設計段階で「どう検証するか」を契約として定義することで、E2Eの判断基準が明確になる

### spec-tasks.mdのE2Eタスク自動生成
- **Discussion**: User JourneyからE2Eテストタスクを自動生成する機能の要否
- **Conclusion**: 本specに含める
- **Rationale**: design.mdで定義したUser Journeyがtasks.mdのE2Eタスクに自動反映されることで、一貫性が保たれる

### E2Eパイプラインの分離
- **Discussion**: E2E関連を単一エージェントで処理するか、複数に分離するか検討
- **Conclusion**: 4エージェントに分離（e2e-planner, e2e-creator, e2e-validator, e2e-runner）
- **Rationale**: 計画・作成・検証・実行の責務を分離し、各フェーズの品質を担保

### 既存spec-design.mdとの整合性
- **Discussion**: 既存の「Integration & Deprecation Strategy」セクションとImpact Analysis Contractの関係
- **Conclusion**: 既存セクションを拡張・統合してImpact Analysis Contractとする
- **Rationale**: 重複を避けつつ、フォーマットを揃えて機械的に処理可能にする

## Introduction

E2Eテストを仕様（Design）の一部として定義し、Inspectionで分業体制による検証を必須化する。design.mdにUser Journey / Impact Analysisを追加し、inspection-distributedで実装したintegration-checkerを拡張してE2Eパイプラインを統合する。これにより統合ミスを体系的に検出し、品質保証プロセスを根本から変革する。

## Requirements

### Requirement 1: design.mdテンプレート拡張

**Objective:** 設計者として、design.mdに「どう検証するか」を定義したい。E2Eテストの根拠を設計段階で明確にするため。

#### Acceptance Criteria

1.1. design.mdテンプレートに「Verification Contract」セクションを追加すること

1.2. Verification Contractに「User Journey Definition」サブセクションを含むこと
  - Journey ID、操作フロー、期待結果、E2E必須フラグを定義
  - テーブル形式で記述

1.3. Verification Contractに「Impact Analysis Contract」サブセクションを含むこと
  - 既存の「Integration & Deprecation Strategy」を拡張・統合
  - 削除対象、更新対象、理由を明示
  - プレースホルダー削除も含む

1.4. spec-design-agent.mdがVerification Contractセクションを生成するよう改修すること

### Requirement 2: spec-tasks.md E2Eタスク自動生成

**Objective:** 開発者として、design.mdのUser JourneyからE2Eテストタスクが自動生成されてほしい。手動でE2Eタスクを追加する手間を省き、User Journeyとの一貫性を保つため。

#### Acceptance Criteria

2.1. spec-tasks-agent.mdがdesign.mdのUser Journey Definitionを読み取ること

2.2. E2E必須フラグがYesのUser Journeyに対して、E2Eテストタスクを自動生成すること

2.3. 生成されるE2Eタスクは以下の形式であること
  ```markdown
  - [ ] X.1 (P) UJ-{id} のE2Eテスト作成
    - {操作フロー}の検証テスト
    - _Requirements: UJ-{id}_
  ```

2.4. E2Eタスクは実装タスクの後、テストタスクセクションに配置すること

### Requirement 3: integration-checker v2（E2Eパイプライン統合）

**Objective:** 開発者として、integration-checkerにE2Eパイプラインを統合したい。静的検査とE2E実行を一貫した統合検査として実行するため。

#### Acceptance Criteria

3.1. integration-checker v1（静的検査）の全機能を維持すること

3.2. Full Mode（--full）指定時にE2Eパイプラインを実行すること

3.3. E2Eパイプラインは以下のサブエージェントを順次呼び出すこと
  - e2e-planner
  - e2e-creator（必要時のみ）
  - e2e-validator（新規テストのみ）
  - e2e-runner

3.4. E2E結果をintegration-result.jsonに含めること

3.5. e2e-report-{n}.mdを生成し、inspection-{n}.mdから参照すること

### Requirement 4: e2e-planner サブエージェント

**Objective:** 開発者として、E2Eテストの計画を自動化したい。User Journeyと既存テストのギャップを分析し、実行スコープを決定するため。

#### Acceptance Criteria

4.1. design.mdのUser Journey Definitionを抽出すること

4.2. steering/inspection-e2e.md（または既存のe2e-testing.md）と照合し、既存テストのカバレッジを確認すること

4.3. 以下の実行スコープ決定を行うこと
  - 新規E2Eテスト作成が必要 → e2e-creator呼び出し
  - 既存E2Eテストで十分 → 関連テストのみ実行
  - マージ後E2Eに委譲 → スキップ（理由を記録）

4.4. テスト計画書（JSON）を出力すること
  - User Journey一覧
  - 各Journeyの判定結果（Create/Execute/Defer）
  - 実行対象テストファイル一覧

### Requirement 5: e2e-creator サブエージェント

**Objective:** 開発者として、E2Eテストコードを自動生成したい。User Journeyの定義からテストコードを生成し、手動作成の手間を省くため。

#### Acceptance Criteria

5.1. e2e-plannerの計画に基づき、新規テストコードを生成すること

5.2. steering/inspection-e2e.md（またはe2e-testing.md）のフレームワーク情報を参照すること

5.3. 既存のhelper関数、fixture、data-testidパターンを活用すること

5.4. 生成テストを`e2e-wdio/generated/`（または設定されたディレクトリ）に配置すること

5.5. 生成テストファイルのパスを出力すること

### Requirement 6: e2e-validator サブエージェント

**Objective:** 開発者として、AI生成テストの品質を検証したい。フレイキーなテストを本番実行前に検出・除外するため。

#### Acceptance Criteria

6.1. e2e-creatorが生成した新規テストに対してのみ実行すること

6.2. 各テストを3回実行し、安定性を確認すること

6.3. 3回中3回成功したテストをSTABLEと判定すること

6.4. 失敗が1回でもあったテストをFLAKYと判定し、以下を行うこと
  - 失敗パターンを分析
  - 修正を試みる（1回まで）
  - 修正後も不安定なら除外（理由を記録）

6.5. 検証結果（STABLE/FLAKY/EXCLUDED）を出力すること

### Requirement 7: e2e-runner サブエージェント

**Objective:** 開発者として、E2Eテストを確実に実行したい。クリーンな環境で実行し、失敗時は十分な証拠を収集するため。

#### Acceptance Criteria

7.1. 実行前に環境を確認すること
  - Electronアプリが停止していること
  - ポート9222（Chrome DevTools Protocol）が利用可能であること
  - 必要なビルドが完了していること

7.2. e2e-plannerの計画に基づき、指定されたテストを実行すること

7.3. 失敗時に以下の証拠を収集すること
  - スクリーンショット
  - DOMスナップショット
  - コンソールログ

7.4. 失敗タイプを分類すること
  - テストロジック失敗 → Critical
  - 環境起因（タイムアウト等） → Warning
  - 新規テストのフレイキー → Info

7.5. e2e-report-{n}.mdを生成すること

### Requirement 8: e2e-report-{n}.md フォーマット

**Objective:** 開発者として、E2Eテスト結果を構造化されたレポートで確認したい。テスト計画、実行結果、カバレッジを一目で把握するため。

#### Acceptance Criteria

8.1. 独立したファイルとして`.kiro/specs/{feature}/e2e-report-{n}.md`に配置すること

8.2. 以下のセクションを含むこと
  - Summary（Date, Scope, Result, Mode）
  - Test Plan（User Journeys to Verify, Scope Decision）
  - Executed Tests（テーブル形式）
  - New Tests Created（生成テスト一覧と検証結果）
  - Failure Analysis（失敗時のみ）
  - Evidence（失敗時の証拠リンク）
  - Coverage Analysis（統合ポイントのカバレッジ）

8.3. inspection-{n}.mdからe2e-report-{n}.mdを参照すること

### Requirement 9: Full Mode対応

**Objective:** 開発者として、マージ前の最終確認でE2Eを含む完全な検査を実行したい。静的検査とE2E実行を組み合わせて、統合ミスを確実に検出するため。

#### Acceptance Criteria

9.1. `--full`オプションでFull Modeを有効化すること

9.2. Full Modeでは以下を実行すること
  - Quick Modeの全検査（並列）
  - integration-checker v2（E2Eパイプライン含む）

9.3. inspection-{n}.mdのModeフィールドに"Full"と記録すること

9.4. User JourneyテストのFailはCritical扱いとすること

9.5. 無関係な既存テストのFailはWarning扱いとし、GOを維持すること（スコープ限定）

### Requirement 10: generate-inspection-e2e コマンド

**Objective:** 開発者として、プロジェクト固有のE2E情報をsteering化したい。E2Eサブエージェントが参照する共通知識を自動生成するため。

#### Acceptance Criteria

10.1. プロジェクトのE2Eフレームワークを自動検出すること
  - WebdriverIO（wdio.conf.ts）
  - Playwright（playwright.config.ts）
  - その他

10.2. 以下の情報を解析・抽出すること
  - 設定ファイル
  - テストディレクトリ構造
  - fixture構造
  - helper関数一覧
  - 既存テストのカバレッジサマリー

10.3. `steering/inspection-e2e.md`を生成すること

10.4. 既存のsteering/e2e-testing.mdがある場合、統合または参照関係を設定すること

### Requirement 11: Judgment Rationale拡張

**Objective:** 開発者として、E2E結果を含むセマンティックな判定理由が欲しい。なぜGO/NOGOとしたかを明確に説明するため。

#### Acceptance Criteria

11.1. inspection-{n}.mdのJudgment Rationaleセクションに以下を含むこと
  - User Journey UJ-X, UJ-Y のE2Eテスト結果
  - スコープ外として扱った失敗の理由
  - Impact Analysisで宣言された削除の完了状況

11.2. 判定理由が機械的でなくセマンティック（意味のある説明）であること

## Out of Scope

- Inspection基盤のサブエージェント分散（inspection-distributedで実装済み）
- requirements-checker, design-checker, code-quality-checker（inspection-distributedで実装済み）
- integration-checker v1の静的検査部分（inspection-distributedで実装済み）
- 既存specのマイグレーション（旧形式のまま動作可能）
- E2E Only Mode（将来の拡張として検討）

## Open Questions

**All questions resolved in design.md (Open Questions Resolution section)**

- ~~steering/inspection-e2e.mdと既存のe2e-testing.mdの関係（統合？別ファイル？）~~
  - **Resolved (DD-007)**: inspection-e2e.mdは自動生成されるE2Eメタデータ、e2e-testing.mdは手動管理のガイドライン。両者は参照関係を持つ。
- ~~e2e-wdio/generated/の配置と管理（gitignore？レビュー後に正式採用？）~~
  - **Resolved (Q2)**: 配置は`e2e-wdio/generated/`、.gitignoreに追加（デフォルト）。レビュー後に正式採用する場合は手動でe2e-wdio/本体に移動。
- ~~E2Eテスト実行の排他制御（複数specが同時にE2Eを実行した場合の対処）~~
  - **Resolved (Q3)**: e2e-runner-agentがEnvironmentCheckで排他制御。複数Spec同時実行時は後発が待機またはスキップ、スキップ時はWarningとして記録。
