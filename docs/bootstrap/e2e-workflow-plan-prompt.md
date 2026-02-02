# Spec Plan Prompt: E2E Workflow Integration & Inspection Architecture Refactoring

以下の背景、詳細な分析、および技術的アプローチに基づき、AI主導開発（AI-DLC）における品質保証プロセスを根本から変革する `e2e-workflow` specの計画 (`/kiro:spec-plan`) を作成してください。

## 1. Context & Motivation (Why We Do This)

現在のSDDプロセスは「ファイル単位の静的整合性」に偏重しており、「システムとしての動作（Dynamic Behavior）」の検証が個別のSpecやAgentの裁量に委ねられている。これにより、以下の深刻なインシデントが繰り返し発生している。

*   **統合漏れ (Integration Miss)**: コンポーネント単体は正常でも、親画面への配置忘れなどの「配線ミス」が検出できない。
*   **仕様と実装の乖離 (Drift)**: 設計変更がテストに反映されず、古いテストが落ち続ける、またはデッドコードが残る。
*   **Inspectionの限界 (Cognitive Overload)**: 単一Agentが全責任を負うことによる注意力の分散。

本Specの目的は、**「E2Eテストを仕様（Design）の一部として定義し、Inspectionで分業体制による検証を必須化する」**ことである。

## 2. Core Architecture (The "E2E-First" Workflow)

### A. Design as the Source of Truth for Verification
`design.md` を「どう実装するか」だけでなく「どう検証するか」の契約書とする。
*   **User Journey Definition**: ユーザーの操作フローと期待値をDesignフェーズで明文化する。
*   **Impact Analysis Contract**: 削除・置換される機能、廃棄すべきテスト、削除すべきプレースホルダーを明示的に宣言する。

### B. Decoupled Inspection Architecture (Sub-Agent Specialization)
Inspectionを以下の3つの専門エージェントに分担させる。

#### 1. E2E-Planner (The Architect)
*   **指令**: 「Designを読み、今回の変更を証明する最小かつ十分なテストを設計・実装せよ」
*   **核心的思考プロセス**:
    1.  `design.md` のUser Journeyを抽出し、既存テストとの差分を特定する。
    2.  既存テストの失敗を検知した場合、それが `Impact Analysis` に記載された意図的な変更ならテスト側を修正し、未記載ならリグレッションとして実装側を修正する。
    3.  「動くことの証明」に必要なモックデータや環境変数を定義する。

#### 2. E2E-Executor (The Runner)
*   **指令**: 「Plannerの意図を汲み、クリーンな環境でテストを完走させ、反論の余地のない証拠を提出せよ」
*   **核心的思考プロセス**:
    1.  テスト実行前に、ポート競合やDBの状態をチェックし、安定した環境を確保する。
    2.  失敗時は、単なるログだけでなく、その瞬間のDOMツリーやスクリーンショットを取得し、原因特定を容易にする。
    3.  Flaky（不安定）なテストを検知した場合は、Orchestratorに警告を発する。

#### 3. Spec-Inspector (The Judge / Orchestrator)
*   **指令**: 「細部（各Agentの報告）を統合し、システム全体としてユーザーに価値が提供可能か、セマンティックに判定せよ」
*   **判定アルゴリズム**:
    1.  今回の変更に関連するUser JourneyテストのPassは **必須（Non-negotiable）**。
    2.  今回の変更と無関係な既存機能のFailは、致命的でない限り「警告」として記録し、Inspection全体はPassさせることを許容する（スコープの限定）。
    3.  `design.md` で宣言された「削除/クリーンアップ」が実際に行われているかを確認する。

### C. Project-Specific Context Injection (`docs/inspection-e2e.md`)
プロジェクト固有の定石（認証、APIモック、ポート設定）を `generate-inspection-e2e` コマンドで抽出し、サブエージェントが参照する共通知識とする。

## 3. Implementation Scope & Phases
*   **Phase 1**: `design.md` テンプレート改定と、E2Eをタスクに強制する生成ルールの追加。
*   **Phase 2**: E2E-Planner/Executorの具体的なプロンプト（インストラクション）の実装と、Skillの統合。
*   **Phase 3**: `spec-inspection` コマンドのアップデートと、`generate-inspection-e2e` の実装。

## 4. Evaluation Criteria
*   **統合バグの100%検出**: 配線ミスがInspectionで必ず指摘されること。
*   **自律的なメンテナンス**: 破壊的変更時にAIが自律的にテストを更新し、CIをグリーンに保てること。
*   **判断の妥当性**: 「なぜそのFailを許容したか」または「なぜNO-GOとしたか」の理由が、セマンティックに説明されていること。
