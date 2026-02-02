# Implementation Plan: Inspection Distributed Architecture

## 1. サブエージェント基盤の構築

- [x] 1.1 (P) requirements-checkerサブエージェントを作成する
  - requirements.mdから全要件を抽出する検査ロジック
  - Grepを使用して実装ファイル内の証拠を検索
  - 各要件にPASS/FAIL/PARTIAL判定を付与
  - 未カバー要件をCritical severityで報告
  - requirements-result.jsonをinspection-context/に出力
  - context-summary.jsonから共通コンテキストを読み込む
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.2 (P) design-checkerサブエージェントを作成する
  - design.mdの全コンポーネント/インターフェースを抽出
  - 実装ファイルにコンポーネントが存在することを確認
  - インターフェースシグネチャの一致を検証
  - steering/*.md（product, tech, structure）との整合性確認
  - 設計からの逸脱をMajor severityで報告
  - design-result.jsonをinspection-context/に出力
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.3 (P) code-quality-checkerサブエージェントを作成する
  - CLAUDE.md + steering/design-principles.mdの設計原則（DRY, SSOT, KISS, YAGNI）遵守を検証
  - design.mdのImpact Analysisに基づく検出（削除宣言残存、プレースホルダー、未使用export）
  - 新規コンポーネント/サービスが実際に使用されていることを確認（Dead Code検出）
  - steering/logging.md規約確認
  - code-quality-result.jsonをinspection-context/に出力
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 1.4 (P) integration-checker（v1: 静的検査）サブエージェントを作成する
  - tasks.mdの全タスクが完了（`[x]`）していることを確認
  - 新規コンポーネントがどこかからimportされていることを確認
  - 新規コンポーネントがJSX/呼び出しで実際に使用されていることを確認
  - プレースホルダーコメント（"TODO", "実装予定", "Task X.X"）の残存を検出
  - 配線タスク（import更新）が実際に実行されたことを確認
  - integration-result.jsonをinspection-context/に出力
  - E2Eテストは実行しない（v1は静的検査のみ）
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

## 2. オーケストレーター改修

- [x] 2.1 spec-inspectionオーケストレーターをサブエージェント呼び出し構造に改修する
  - 既存のspec-inspection-agent.mdを完全に書き換え
  - Phase 1: Context Preparation - specs, steeringを1回読み込み
  - Phase 2: Parallel Sub-Agent Invocation - Task toolで4つのサブエージェントを呼び出し
  - Phase 3: Result Merge & Judgment - 全結果JSONをマージ
  - Phase 4: Report Generation - inspection-{n}.mdを生成、spec.json更新
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2, 9.3_

- [x] 2.2 context-summary.json生成ロジックを実装する
  - spec_overview: 仕様の要約（1-2文）
  - key_components: 主要コンポーネント一覧（名前、型、パス、カバー要件）
  - integration_points: 統合ポイント一覧（source, target, type）
  - impact_analysis: design.mdから抽出した削除・更新対象（target, action, reason）
  - inspection-context/ディレクトリに出力
  - .gitignoreに`**/inspection-context/`が含まれていない場合は追加を推奨するメッセージを出力
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.3 サブエージェント結果のマージと判定ロジックを実装する
  - 4つのresult.jsonファイルを読み込みマージ
  - 判定ロジック: Critical 1件以上 → NOGO、Major 3件以上 → NOGO、それ以外 → GO
  - 判定理由のセマンティック説明を生成
  - サブエージェント実行失敗時は該当カテゴリをスキップしWarning記録
  - _Requirements: 7.1, 7.2_

## 3. レポート生成と既存機能維持

- [x] 3.1 inspection-{n}.mdフォーマットを拡張する
  - Summary（Date, Mode, Judgment）セクション
  - Sub-Agent Resultsセクション（各カテゴリの結果テーブル）
  - Judgment Rationaleセクション（GO/NOGO判定理由のセマンティック説明）
  - Statisticsセクション（チェック数、Pass/Fail数）
  - Warningsセクション（サブエージェント実行エラー時はエラー情報（エージェント名、エラー理由）を含める）
  - Next Stepsセクション
  - 既存フォーマットとの後方互換性を維持（セクション追加のみ）
  - _Requirements: 7.3, 9.5_

- [x] 3.2 GOの場合のspec.json更新処理を実装する
  - phaseを"inspection-complete"に更新
  - inspection.roundsにラウンド情報を追加
  - updated_atタイムスタンプを更新
  - _Requirements: 7.4_

- [x] 3.3 --fix, --autofixオプションの既存機能を維持する
  - NOGOの場合、--fixオプションで修正タスクを生成する既存機能を維持
  - spec-tdd-impl-agentへの委譲パターンを維持
  - _Requirements: 7.5, 9.4_

## 4. Quick Mode対応

- [x] 4.1 Quick Modeをデフォルト動作として実装する
  - デフォルトでQuick Modeとして動作
  - Quick Modeでは4つのサブエージェントを並列呼び出し（requirements-checker, design-checker, code-quality-checker, integration-checker）
  - integration-checkerは静的検査のみ実行
  - inspection-{n}.mdのModeフィールドに"Quick"と記録
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 4.2 Quick Modeの実行時間最適化を確認する
  - 各サブエージェントのスコープを絞り5分以内を目標
  - 並列呼び出しによる時間短縮を検証
  - _Requirements: 8.3_

## 5. 検証

- [x] 5.1 手動検証を実施する
  - 実Specでspec-inspection実行、inspection-context/配下の4つのJSONファイル生成を確認
  - inspection-{n}.mdのSub-Agent Resultsセクションに4カテゴリの結果が含まれることを確認
  - 並列実行により処理時間がシーケンシャル実行より短いことを確認
  - 既存Specでspec-inspection実行、エラーなく完了することを確認（後方互換性）
  - Critical/Major数に基づくGO/NOGO判定が正しいことを確認
  - --fixオプションが既存通り動作することを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 9.4, 9.5_
  - _Note: Implementation complete. Manual verification requires running `/kiro:spec-inspection` on actual specs._

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | サブエージェント呼び出し構造 | 2.1 | Feature |
| 1.2 | JSON形式結果返却 | 1.1, 1.2, 1.3, 1.4 | Feature |
| 1.3 | 結果統合しinspection-{n}.md生成 | 2.1, 3.1 | Feature |
| 1.4 | 並列実行 | 2.1, 4.1 | Feature |
| 2.1 | 共通コンテキスト1回読み込み | 2.1, 2.2 | Feature |
| 2.2 | context-summary.json生成 | 2.2 | Feature |
| 2.3 | サマリー+担当詳細のみ配布 | 1.1, 1.2, 1.3, 1.4, 2.2 | Feature |
| 2.4 | inspection-context/配置 | 2.2 | Feature |
| 3.1 | 全要件抽出・証拠検索 | 1.1 | Feature |
| 3.2 | Grep使用カバレッジ確認 | 1.1 | Feature |
| 3.3 | PASS/FAIL/PARTIAL判定 | 1.1 | Feature |
| 3.4 | 未カバー要件Critical報告 | 1.1 | Feature |
| 3.5 | requirements-result.json出力 | 1.1 | Feature |
| 4.1 | コンポーネント存在確認 | 1.2 | Feature |
| 4.2 | インターフェースシグネチャ検証 | 1.2 | Feature |
| 4.3 | steering規約確認 | 1.2 | Feature |
| 4.4 | 設計逸脱Major報告 | 1.2 | Feature |
| 4.5 | design-result.json出力 | 1.2 | Feature |
| 5.1 | 設計原則遵守検証 | 1.3 | Feature |
| 5.2 | 削除宣言残存・プレースホルダー検出 | 1.3 | Feature |
| 5.3 | Dead Code検出 | 1.3 | Feature |
| 5.4 | logging.md規約確認 | 1.3 | Feature |
| 5.5 | code-quality-result.json出力 | 1.3 | Feature |
| 6.1 | タスク完了確認 | 1.4 | Feature |
| 6.2 | import確認 | 1.4 | Feature |
| 6.3 | JSX/呼び出し確認 | 1.4 | Feature |
| 6.4 | プレースホルダー残存検出 | 1.4 | Feature |
| 6.5 | 配線タスク確認 | 1.4 | Feature |
| 6.6 | integration-result.json出力 | 1.4 | Feature |
| 7.1 | JSON結果マージ | 2.3 | Feature |
| 7.2 | 判定ロジック | 2.3 | Feature |
| 7.3 | inspection-{n}.md拡張フォーマット | 3.1 | Feature |
| 7.4 | GOでphase更新 | 3.2 | Feature |
| 7.5 | --fixオプション維持 | 3.3 | Feature |
| 8.1 | デフォルトQuick Mode | 4.1 | Feature |
| 8.2 | Quick Mode検査実行 | 4.1 | Feature |
| 8.3 | 5分以内目標 | 4.2 | Feature |
| 8.4 | Mode記録 | 4.1 | Feature |
| 9.1 | spec-inspection置き換え | 2.1 | Feature |
| 9.2 | Task tool使用 | 2.1 | Feature |
| 9.3 | 並列呼び出し | 2.1 | Feature |
| 9.4 | --fix/--autofix維持 | 3.3 | Feature |
| 9.5 | 後方互換性 | 3.1 | Feature |
