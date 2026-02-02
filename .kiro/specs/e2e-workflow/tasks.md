# Implementation Plan

## Task Overview

E2E Workflow Integrationの実装タスク。design.mdにVerification Contractセクションを追加し、spec-tasks-agentでE2Eタスクを自動生成、integration-checker v2としてE2Eパイプラインを統合する。

---

## Tasks

- [x] 1. design.mdテンプレート拡張
- [x] 1.1 (P) Verification Contractセクションをテンプレートに追加する
  - `.kiro/settings/templates/specs/design.md`にVerification Contractセクションを追加
  - User Journey Definitionサブセクション（テーブル形式）を定義
  - Impact Analysis Contractサブセクションを定義
  - Journey ID形式（`UJ-{NNN}`）、E2E必須フラグを含む
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 (P) spec-design-agentにVerification Contract生成ロジックを追加する
  - `.claude/agents/kiro/spec-design.md`を改修
  - requirements.mdからUser Journey候補を抽出するロジックを追加
  - 既存の「Integration & Deprecation Strategy」セクションをImpact Analysis Contractに統合
  - Step 3でVerification Contractセクションを生成するよう指示を追加
  - _Requirements: 1.4_

- [x] 2. spec-tasks-agent E2Eタスク自動生成
- [x] 2.1 spec-tasks-agentにUser Journey読み取りロジックを追加する
  - `.claude/agents/kiro/spec-tasks.md`を改修
  - design.mdからUser Journey Definitionセクションを抽出する処理を追加
  - E2E必須フラグの判定ロジックを実装
  - Task 1完了後に実施（design.md形式に依存）
  - _Requirements: 2.1, 2.2_

- [x] 2.2 E2Eタスク自動生成フォーマットを実装する
  - E2Eタスク形式（`X.1 (P) UJ-{id} のE2Eテスト作成`）を定義
  - 生成されるE2Eタスクをテストタスクセクションに配置
  - 操作フローと_Requirements参照を含める
  - Task 2.1完了後に実施（User Journey読み取りに依存）
  - _Requirements: 2.3, 2.4_

- [x] 3. E2Eサブエージェント基盤作成
- [x] 3.1 (P) e2e-planner-agent.mdを作成する
  - `.claude/agents/kiro/e2e-planner.md`を新規作成
  - design.mdからUser Journey Definition抽出ロジックを定義
  - steering/inspection-e2e.mdまたはe2e-testing.mdとの照合ロジックを定義
  - 実行スコープ決定（Create/Execute/Defer）のアルゴリズムを記述
  - e2e-plan.json出力フォーマットを定義
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Method: extractUserJourneys, analyzeExistingCoverage, determineScopeDecision, generatePlan_
  - _Verify: Grep "extractUserJourneys|analyzeExistingCoverage|determineScopeDecision|generatePlan" in e2e-planner.md_

- [x] 3.2 (P) e2e-creator-agent.mdを作成する
  - `.claude/agents/kiro/e2e-creator.md`を新規作成
  - e2e-plan.jsonからCreate判定されたJourneyのテスト生成ロジックを定義
  - steering/inspection-e2e.mdのフレームワーク情報参照を定義
  - 既存helper関数、fixture、data-testidパターン活用の指示を記述
  - 生成テストの配置先（`e2e-wdio/generated/`）と命名規則を定義
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Method: loadPlan, loadFrameworkInfo, analyzeExistingHelpers, generateTest, writeTests_
  - _Verify: Grep "loadPlan|loadFrameworkInfo|analyzeExistingHelpers|generateTest|writeTests" in e2e-creator.md_

- [x] 3.3 (P) e2e-validator-agent.mdを作成する
  - `.claude/agents/kiro/e2e-validator.md`を新規作成
  - 新規生成テストのみを対象とする条件を定義
  - 3回実行による安定性検証ロジックを記述
  - STABLE/FLAKY/EXCLUDED判定基準を定義
  - FLAKYテストの修正試行（1回まで）と除外ロジックを記述
  - e2e-plan.jsonへの検証結果追記フォーマットを定義
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Method: loadGeneratedTests, runTestMultipleTimes, analyzeStability, attemptFix, updatePlanWithValidation_
  - _Verify: Grep "loadGeneratedTests|runTestMultipleTimes|analyzeStability|attemptFix|updatePlanWithValidation" in e2e-validator.md_

- [x] 3.4 (P) e2e-runner-agent.mdを作成する
  - `.claude/agents/kiro/e2e-runner.md`を新規作成
  - 環境確認ロジック（Electron停止、ポート9222、ビルド完了）を定義
  - **排他制御**: 複数Spec同時実行時の待機/スキップ、スキップ時はWarningとして記録
  - **タイムアウト**: サブエージェント実行に2分タイムアウトを設定
  - e2e-plan.jsonに基づくテスト実行指示を記述
  - 失敗時の証拠収集（スクリーンショット、DOMスナップショット、コンソールログ）を定義
  - 失敗タイプ分類（Critical/Warning/Info）のアルゴリズムを記述
  - e2e-result.json出力フォーマットを定義
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 3.4_
  - _Method: checkEnvironment, loadExecutionPlan, runTests, collectEvidence, classifyFailure, generateE2EResult_
  - _Verify: Grep "checkEnvironment|loadExecutionPlan|runTests|collectEvidence|classifyFailure|generateE2EResult" in e2e-runner.md_

- [x] 4. e2e-report-{n}.md生成
- [x] 4.1 e2e-runner-agentにレポート生成ロジックを追加する
  - e2e-report-{n}.mdのフォーマットを定義（Summary, Test Plan, Executed Tests, New Tests Created, Failure Analysis, Evidence, Coverage Analysis）
  - 配置先（`.kiro/specs/{feature}/e2e-report-{n}.md`）を指定
  - Task 3.4完了後に実施（e2e-runner基盤に依存）
  - _Requirements: 7.5, 8.1, 8.2_
  - _Method: generateReport_
  - _Verify: Grep "generateReport" in e2e-runner.md_

- [x] 5. spec-inspection-agent Full Mode対応
- [x] 5.1 spec-inspection-agentに--fullオプションを追加する
  - `.claude/agents/kiro/spec-inspection.md`を改修
  - --fullオプションでFull Modeを有効化
  - Modeフィールド（Quick/Full）をinspection-{n}.mdに記録
  - Task 3完了後に実施（E2Eサブエージェント呼び出しに依存）
  - _Requirements: 9.1, 9.3_

- [x] 5.2 E2Eパイプライン呼び出しを統合する
  - Full Mode時にe2e-planner → e2e-creator（必要時）→ e2e-validator（新規テスト時）→ e2e-runnerを順次呼び出し
  - 静的検査（Quick Mode）の全機能を維持
  - Task toolを使用したサブエージェント呼び出しパターンを記述
  - _Requirements: 3.2, 3.3_

- [x] 5.3 inspection-{n}.mdからe2e-report-{n}.mdへの参照を追加する
  - inspection-{n}.mdのレポートフォーマットにE2E Results参照セクションを追加
  - e2e-report-{n}.mdへのリンクを生成
  - Task 4.1完了後に実施（e2e-report生成に依存）
  - _Requirements: 8.3, 3.5_

- [x] 5.4 E2E失敗時の判定ロジックを実装する
  - User Journey Fail→Critical扱い
  - 無関係な既存テストFail→Warning扱い（GO維持）
  - Judgment Rationaleにe2e結果を含むセマンティック説明を追加
  - Task 5.2完了後に実施（E2Eパイプライン統合に依存）
  - _Requirements: 9.4, 9.5, 11.1, 11.2_

- [x] 6. generate-inspection-e2eコマンド作成
- [x] 6.1 (P) generate-inspection-e2e-agent.mdを作成する
  - `.claude/agents/kiro/generate-inspection-e2e.md`を新規作成
  - E2Eフレームワーク自動検出（WebdriverIO/Playwright/その他）ロジックを定義
  - 設定ファイル、テストディレクトリ、fixture、helper解析を記述
  - カバレッジサマリー生成アルゴリズムを定義
  - steering/inspection-e2e.md生成フォーマットを定義
  - 既存e2e-testing.mdとの統合/参照関係設定を記述
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - _Method: detectFramework, analyzeTestStructure, extractHelpers, extractFixtures, generateCoverageSummary, generateSteeringDoc_
  - _Verify: Grep "detectFramework|analyzeTestStructure|extractHelpers|extractFixtures|generateCoverageSummary|generateSteeringDoc" in generate-inspection-e2e.md_

- [x] 7. integration-checker v1機能維持
- [x] 7.1 (P) integration-checker既存機能の動作確認を行う
  - `.claude/agents/kiro/integration-checker.md`の既存静的検査機能を確認
  - Quick Mode（デフォルト）での動作が変更されないことを検証
  - _Requirements: 3.1_

- [x] 8. 生成テスト配置ディレクトリ整備
- [x] 8.1 (P) e2e-wdio/generated/ディレクトリを.gitignoreに追加する
  - `electron-sdd-manager/.gitignore`に`e2e-wdio/generated/`を追加
  - 自動生成E2Eテストがデフォルトでコミット対象外になるよう設定
  - _Requirements: 5.4_

- [x] 9. inspection-context拡張
- [x] 9.1 (P) inspection-contextディレクトリ構造を拡張する
  - e2e-plan.json、e2e-result.jsonの配置場所を文書化
  - spec-inspection-agent.mdに拡張されたディレクトリ構造を反映
  - _Requirements: 3.4_

- [x] 10. E2E Pipeline統合テスト
- [x] 10.1 (P) Mock Claude CLIをE2Eパイプライン対応に拡張する
  - `scripts/e2e-mock/mock-claude.sh`を改修
  - `--full`オプション対応を追加
  - e2e-plan.jsonのモック生成を追加
  - e2e-result.jsonのモック生成を追加
  - E2Eサブエージェント（e2e-planner, e2e-creator, e2e-validator, e2e-runner）フェーズのモック応答を追加
  - _Requirements: Integration Test Strategy_
  - _Verify: mock-claude.shが--fullオプションを受け付けること_

- [x] 10.2 (P) E2E Pipeline統合テストを作成する
  - E2E Pipelineの全体フロー検証テストを作成
  - 以下のVerification Pointsを検証:
    - e2e-plan.json生成: User Journeyからの計画抽出
    - 生成テストファイル: e2e-wdio/generated/への配置
    - e2e-result.json生成: テスト結果の構造化
    - e2e-report-{n}.md生成: レポートフォーマット
    - inspection-{n}.md更新: E2E参照の追加
  - Task 10.1完了後に実施（Mock CLI拡張に依存）
  - _Requirements: Integration Test Strategy_
  - _Verify: 統合テストがPASS_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | design.mdにVerification Contract追加 | 1.1 | Infrastructure |
| 1.2 | User Journey Definitionサブセクション | 1.1 | Infrastructure |
| 1.3 | Impact Analysis Contractサブセクション | 1.1 | Infrastructure |
| 1.4 | spec-design-agentのVC生成改修 | 1.2 | Feature |
| 2.1 | User Journey Definition読み取り | 2.1 | Feature |
| 2.2 | E2E必須フラグ判定 | 2.1 | Feature |
| 2.3 | E2Eタスク形式生成 | 2.2 | Feature |
| 2.4 | E2Eタスク配置位置 | 2.2 | Feature |
| 3.1 | v1全機能維持 | 7.1 | Validation |
| 3.2 | Full Mode E2E実行 | 5.2 | Feature |
| 3.3 | E2Eサブエージェント呼び出し | 5.2 | Feature |
| 3.4 | E2E結果をintegration-result.jsonに含む | 3.4, 9.1 | Feature |
| 3.5 | e2e-report-{n}.md生成 | 5.3 | Feature |
| 4.1 | User Journey抽出 | 3.1 | Feature |
| 4.2 | 既存テストカバレッジ確認 | 3.1 | Feature |
| 4.3 | 実行スコープ決定 | 3.1 | Feature |
| 4.4 | テスト計画書出力 | 3.1 | Feature |
| 5.1 | 計画に基づくテスト生成 | 3.2 | Feature |
| 5.2 | フレームワーク情報参照 | 3.2 | Feature |
| 5.3 | 既存helper活用 | 3.2 | Feature |
| 5.4 | 生成テスト配置 | 3.2, 8.1 | Feature |
| 5.5 | 生成テストパス出力 | 3.2 | Feature |
| 6.1 | 新規テストのみ実行 | 3.3 | Feature |
| 6.2 | 3回実行検証 | 3.3 | Feature |
| 6.3 | STABLE判定 | 3.3 | Feature |
| 6.4 | FLAKY判定と修正 | 3.3 | Feature |
| 6.5 | 検証結果出力 | 3.3 | Feature |
| 7.1 | 環境確認 | 3.4 | Feature |
| 7.2 | 計画に基づくテスト実行 | 3.4 | Feature |
| 7.3 | 失敗時証拠収集 | 3.4 | Feature |
| 7.4 | 失敗タイプ分類 | 3.4 | Feature |
| 7.5 | e2e-report-{n}.md生成 | 4.1 | Feature |
| 8.1 | 独立ファイル配置 | 4.1 | Feature |
| 8.2 | レポートセクション構成 | 4.1 | Feature |
| 8.3 | inspection-{n}.mdからの参照 | 5.3 | Feature |
| 9.1 | --fullオプション | 5.1 | Feature |
| 9.2 | Full Mode実行内容 | 5.2 | Feature |
| 9.3 | ModeフィールドFull記録 | 5.1 | Feature |
| 9.4 | User Journey Fail→Critical | 5.4 | Feature |
| 9.5 | 無関係Fail→Warning | 5.4 | Feature |
| 10.1 | E2Eフレームワーク自動検出 | 6.1 | Feature |
| 10.2 | E2E情報解析・抽出 | 6.1 | Feature |
| 10.3 | inspection-e2e.md生成 | 6.1 | Feature |
| 10.4 | 既存e2e-testing.mdとの統合 | 6.1 | Feature |
| 11.1 | Judgment Rationale拡張 | 5.4 | Feature |
| 11.2 | セマンティック判定理由 | 5.4 | Feature |
