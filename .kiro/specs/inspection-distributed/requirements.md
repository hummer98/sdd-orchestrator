# Requirements: Inspection Distributed Architecture

## Decision Log

### スコープ分割
- **Discussion**: 統合計画（e2e-workflow-integrated-plan.md）を一度に実装するか、段階的に分割するか検討
- **Conclusion**: 2つのspecに分割（inspection-distributed / e2e-workflow）
- **Rationale**: 巨大なspecはレビュー困難。段階的に実装・検証することで品質を担保

### サブエージェントの優先順位
- **Discussion**: 8つのサブエージェントのうちMVPとして必須なものを検討
- **Conclusion**: 本specでは静的検査系（requirements-checker, design-checker, code-quality-checker, integration-checker v1）を実装
- **Rationale**: E2E関連（e2e-planner, creator, validator, runner）はSpec 2に分離し、依存関係を明確化

### 既存spec-inspectionとの互換性
- **Discussion**: 新アーキテクチャへの移行方法を検討（オプション追加 vs 置き換え）
- **Conclusion**: 完全置き換え
- **Rationale**: 並行運用は複雑性を増す。新アーキテクチャで既存機能を完全にカバー

### integration-checkerの位置づけ
- **Discussion**: 静的統合検査とE2Eパイプラインの責務分担
- **Conclusion**: 2段階実装（本specでv1：静的検査のみ、Spec 2でv2：E2E追加）
- **Rationale**: 静的統合検査はE2E無しでも価値がある（プレースホルダー検出など）

## Introduction

spec-inspection-agent.mdの責務肥大化問題を解決するため、検査責務を複数のサブエージェントに分散し、spec-inspectionは統合・判定に専念するアーキテクチャを実装する。これにより各カテゴリの検査品質が向上し、コンテキストウィンドウの負荷も軽減される。

## Requirements

### Requirement 1: サブエージェント分散アーキテクチャ

**Objective:** 開発者として、Inspection検査を複数の専門サブエージェントに分散させたい。各カテゴリの検査品質を向上させ、単一エージェントの注意力分散問題を解消するため。

#### Acceptance Criteria

1.1. spec-inspectionが以下のサブエージェントを呼び出す構造となること
  - requirements-checker
  - design-checker
  - code-quality-checker
  - integration-checker

1.2. 各サブエージェントが独立して検査を実行し、JSON形式で結果を返却すること

1.3. spec-inspectionが全サブエージェントの結果を統合してinspection-{n}.mdを生成すること

1.4. サブエージェントの並列実行が可能であること（依存関係がない場合）

### Requirement 2: コンテキスト階層化

**Objective:** 開発者として、サブエージェント間でコンテキストを効率的に共有したい。トークン使用量の爆発を防ぎながら、必要な情報を各エージェントに配布するため。

#### Acceptance Criteria

2.1. spec-inspectionが共通コンテキスト（specs, steering, 実装ファイル）を1回だけ読み込むこと

2.2. context-summary.jsonを生成し、以下の情報を含むこと
  - spec_overview: 仕様の要約
  - key_components: 主要コンポーネント一覧
  - integration_points: 統合ポイント一覧
  - impact_analysis: 削除・更新対象一覧（design.mdから抽出）

2.3. 各サブエージェントに「サマリー + 担当カテゴリの詳細ファイル」のみを配布すること

2.4. サブエージェント間の結果共有のため、inspection-context/ディレクトリに各結果JSONを配置すること

### Requirement 3: requirements-checker サブエージェント

**Objective:** 開発者として、要件適合性を専門的に検査するエージェントが欲しい。requirements.mdの各要件が実装に反映されているかを網羅的に検証するため。

#### Acceptance Criteria

3.1. requirements.mdの全要件を抽出し、各要件に対して実装の証拠を検索すること

3.2. Grepを使用して実装ファイル内の要件カバレッジを確認すること

3.3. 各要件に対してPASS/FAIL/PARTIAL判定を行うこと

3.4. 未カバーの要件をCritical severityで報告すること

3.5. 結果をJSON形式（requirements-result.json）で出力すること

### Requirement 4: design-checker サブエージェント

**Objective:** 開発者として、設計適合性とsteering整合性を専門的に検査するエージェントが欲しい。実装がdesign.mdおよびsteering/*.mdに準拠しているかを検証するため。

#### Acceptance Criteria

4.1. design.mdの全コンポーネント/インターフェースが実装に存在することを確認すること

4.2. インターフェースのシグネチャが設計と一致することを検証すること

4.3. steering/*.mdのパターン・規約が遵守されていることを確認すること
  - product.md: プロダクトガイドライン
  - tech.md: 技術スタック・パターン
  - structure.md: ファイル配置規約

4.4. 設計からの逸脱をMajor severityで報告すること

4.5. 結果をJSON形式（design-result.json）で出力すること

### Requirement 5: code-quality-checker サブエージェント

**Objective:** 開発者として、コード品質を専門的に検査するエージェントが欲しい。設計原則の遵守、Dead Code検出、ロギング規約の確認を行うため。

#### Acceptance Criteria

5.1. CLAUDE.mdおよびsteering/design-principles.mdの設計原則（DRY, SSOT, KISS, YAGNI）の遵守を検証すること

5.2. design.mdのIntegration & Deprecation Strategy（またはImpact Analysis）に基づき、以下を検出すること
  - 削除宣言されたファイルの残存
  - プレースホルダーコメントの残存
  - 未使用のexport

5.3. 新規作成されたコンポーネント/サービスが実際に使用されていることを確認すること（Dead Code検出）

5.4. steering/logging.mdの規約に準拠していることを確認すること

5.5. 結果をJSON形式（code-quality-result.json）で出力すること

### Requirement 6: integration-checker サブエージェント（v1: 静的検査）

**Objective:** 開発者として、統合状態を専門的に検査するエージェントが欲しい。コンポーネントが正しく配線され、システムに統合されていることを検証するため。

#### Acceptance Criteria

6.1. tasks.mdの全タスクが完了（`[x]`）していることを確認すること

6.2. 新規コンポーネントがどこかからimportされていることを確認すること

6.3. 新規コンポーネントがJSX/呼び出しで実際に使用されていることを確認すること

6.4. プレースホルダーコメント（"TODO", "実装予定", "Task X.X"）の残存を検出すること

6.5. 配線タスク（import更新）が実際に実行されたことを確認すること

6.6. 結果をJSON形式（integration-result.json）で出力すること

### Requirement 7: 結果統合とGO/NOGO判定

**Objective:** 開発者として、全サブエージェントの結果を統合した判定が欲しい。セマンティックな理由付きでGO/NOGOを判断し、actionableなレポートを生成するため。

#### Acceptance Criteria

7.1. 全サブエージェントのJSON結果をマージすること

7.2. 以下の判定ロジックを適用すること
  - Critical 1件以上 → NOGO
  - Major 3件以上 → NOGO
  - それ以外 → GO

7.3. inspection-{n}.mdに以下のセクションを含むこと
  - Summary（Date, Mode, Judgment）
  - Sub-Agent Results（各カテゴリの結果テーブル）
  - Judgment Rationale（GO/NOGO判定理由のセマンティック説明）
  - Statistics（チェック数、Pass/Fail数）
  - Next Steps

7.4. GOの場合、spec.jsonのphaseを"inspection-complete"に更新すること

7.5. NOGOの場合、--fixオプションで修正タスクを生成する既存機能を維持すること

### Requirement 8: Quick Mode対応

**Objective:** 開発者として、高速なフィードバックループを維持したい。開発中の頻繁な確認では静的検査のみを実行し、E2Eは計画のみとするため。

#### Acceptance Criteria

8.1. デフォルトでQuick Modeとして動作すること

8.2. Quick Modeでは以下を実行すること
  - requirements-checker（並列）
  - design-checker（並列）
  - code-quality-checker（並列）
  - integration-checker（静的検査のみ）

8.3. Quick Modeの所要時間が5分以内を目標とすること

8.4. inspection-{n}.mdのModeフィールドに"Quick"と記録すること

### Requirement 9: spec-inspection.md 改修

**Objective:** 開発者として、既存のspec-inspection-agent.mdを新アーキテクチャに完全置き換えたい。サブエージェント呼び出し、コンテキスト階層化、結果統合のロジックを実装するため。

#### Acceptance Criteria

9.1. 既存のspec-inspection-agent.mdを新アーキテクチャで置き換えること

9.2. Task toolを使用してサブエージェントを呼び出すこと

9.3. 並列実行可能なサブエージェントは並列で呼び出すこと

9.4. 既存の--fix, --autofixオプションを維持すること

9.5. 既存のinspection-{n}.mdフォーマットとの後方互換性を維持すること（セクション追加は可）

## Out of Scope

- E2Eテスト実行（Spec 2: e2e-workflow で実装）
- design.mdテンプレート拡張（User Journey, Impact Analysis Contract）（Spec 2で実装）
- spec-design.md, spec-tasks.mdの改修（Spec 2で実装）
- generate-inspection-e2eコマンド（Spec 2で実装）
- Full Mode（E2E実行を含む）（Spec 2で実装）
- 既存specのマイグレーション（旧形式のまま動作可能）

## Open Questions

- context-summary.jsonの具体的なスキーマ（設計フェーズで詳細化）
- サブエージェント結果JSONのスキーマ（設計フェーズで詳細化）
- inspection-context/ディレクトリの配置場所（.kiro/specs/{feature}/ 配下？一時ディレクトリ？）
