# Research & Design Decisions: Inspection Distributed Architecture

## Summary

- **Feature**: `inspection-distributed`
- **Discovery Scope**: Extension（既存spec-inspectionシステムの拡張）
- **Key Findings**:
  - Claude CodeのTask toolによるサブエージェント呼び出しパターンが既に存在（spec-inspection → spec-tdd-impl-agent）
  - サブエージェント間のデータ共有はファイルベースが最も安定
  - 既存のspec-inspection-agent.mdは8カテゴリを単一エージェントで処理しており、分散化の余地が大きい

## Research Log

### Task Tool によるサブエージェント呼び出しパターン

- **Context**: 既存のサブエージェント呼び出し実装を調査
- **Sources Consulted**: `.claude/agents/kiro/spec-inspection.md`, `.claude/agents/kiro/spec-impl.md`
- **Findings**:
  - Task toolは `subagent_type` パラメータでエージェントを指定
  - プロンプトはテンプレート形式で変数を埋め込み可能
  - 呼び出し例:
    ```
    Task(
      subagent_type="spec-tdd-impl-agent",
      description="Execute inspection fix tasks",
      prompt="""..."""
    )
    ```
- **Implications**: 同じパターンで新規サブエージェントを呼び出し可能。既存パターンを踏襲することで学習コスト削減。

### 並列実行の実現可能性

- **Context**: サブエージェントの並列実行が可能かどうかを調査
- **Sources Consulted**: Claude Code Task tool動作仕様
- **Findings**:
  - Task tool呼び出しは非同期ではなく、呼び出しごとにブロックする
  - ただし、複数のTask呼び出しを同一ターン内で記述することで「実質的な並列」が可能
  - 厳密な並列ではないが、オーケストレーターが複数のサブエージェントを「同時に」指示することは可能
- **Implications**: 設計上は「並列呼び出し」と表現するが、実装上は順次実行の可能性あり。並列性の保証より、各サブエージェントの独立性を重視。

### コンテキストサイズの見積もり

- **Context**: トークン使用量を抑えるためのコンテキスト階層化戦略
- **Sources Consulted**: 既存Spec（requirements.md, design.md, tasks.md, steering/*.md）のファイルサイズ
- **Findings**:
  - 典型的なSpec: requirements.md（500行）、design.md（1000行）、tasks.md（300行）
  - steering/*.md: 合計1500行程度
  - 全ファイルを読むと3000-4000行 → トークン数で10-15k
  - 5エージェントが全て読むと50-75kトークン → 非効率
- **Implications**: context-summary.jsonでサマリー化することで、サブエージェントあたり2-3kトークンに抑制可能。

### 既存inspection-{n}.mdフォーマット

- **Context**: 後方互換性のため既存フォーマットを調査
- **Sources Consulted**: 既存Specのinspection-{n}.mdファイル
- **Findings**:
  - 主要セクション: Summary, Findings by Category, Statistics, Recommended Actions, Next Steps
  - カテゴリ: Requirements Compliance, Design Alignment, Task Completion, Steering Consistency, Design Principles, Dead Code Detection, Integration Verification, Logging Compliance
  - 表形式: `| Requirement | Status | Severity | Details |`
- **Implications**: 既存セクション構造を維持しつつ、「Sub-Agent Results」セクションを追加。各カテゴリの詳細は既存フォーマットを踏襲。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Orchestrator-Worker | spec-inspectionがオーケストレーター、4サブエージェントがワーカー | 責務分離明確、並列実行可能、各ワーカーの独立性高い | オーケストレーター障害でサブエージェント無駄になる | **採用** |
| Pipeline | 各検査を順次実行、前の結果を次に渡す | 依存関係の表現が自然 | 並列実行不可、一箇所の遅延が全体に影響 | 不採用 |
| Peer-to-Peer | 各エージェントが直接通信 | 柔軟な連携 | 複雑性増大、障害時の挙動が予測困難 | 不採用 |

## Design Decisions

### Decision: サブエージェント粒度の決定

- **Context**: 8カテゴリをどのように4サブエージェントに分割するか
- **Alternatives Considered**:
  1. 1カテゴリ = 1サブエージェント（8エージェント）— 粒度が細かすぎ、オーバーヘッド大
  2. 関連カテゴリをグループ化（4エージェント）— バランス良好
  3. 2エージェント（静的/動的）— 粒度が粗すぎ、分散の効果薄い
- **Selected Approach**: 4サブエージェントにグループ化
  - requirements-checker: Requirements Compliance
  - design-checker: Design Alignment + Steering Consistency
  - code-quality-checker: Design Principles + Dead Code Detection + Logging Compliance
  - integration-checker: Task Completion + Integration Verification
- **Rationale (Why)**:
  - 関連性の高いカテゴリをグループ化することで、コンテキスト共有効率が向上
  - 4エージェントは並列実行時の管理複雑性とのバランスが良い
  - 将来のE2E追加はintegration-checkerの拡張として自然に統合可能
- **Trade-offs**: カテゴリ間の依存（例: Task Completionの結果がDead Code検出に影響）は考慮されない
- **Follow-up**: 実運用でカテゴリ間依存の問題が発覚した場合、情報共有メカニズムを追加

### Decision: ファイルベースのデータ共有

- **Context**: サブエージェント間でどのようにデータを共有するか
- **Alternatives Considered**:
  1. 標準出力での返却 — 並列実行時の取り扱い複雑、パース困難
  2. 共有メモリ — Claude Codeに存在しない機能
  3. ファイルベース（JSON）— 安定性高い、デバッグ容易
- **Selected Approach**: ファイルベース（JSON形式）
- **Rationale (Why)**:
  - サブエージェントの実行順序に依存しない
  - JSONはパースが容易で型チェックも可能
  - inspection-context/に永続化されるためデバッグに有用
- **Trade-offs**: ファイルI/Oオーバーヘッド、ディスク容量使用
- **Follow-up**: 大量Specでのディスク使用量をモニタリング

### Decision: Quick Modeデフォルト戦略

- **Context**: 開発フィードバックループの速度とE2E検証の深度のトレードオフ
- **Alternatives Considered**:
  1. Full Modeデフォルト — 検証深度は高いが時間がかかる
  2. Quick Modeデフォルト + オプション — 開発効率優先
  3. 自動判定（Spec複雑度に応じて切り替え）— 実装複雑
- **Selected Approach**: Quick Modeデフォルト（本Specスコープ）
- **Rationale (Why)**:
  - 開発中は頻繁にinspectionを実行するため、5分以内の目標達成が重要
  - E2E実行はSpec 2で--fullオプションとして追加予定
  - 段階的なリリースでリスク軽減
- **Trade-offs**: Quick Modeのみでは統合バグの一部を検出できない可能性
- **Follow-up**: Spec 2でFull Mode実装後、デフォルトをQuick Modeのまま維持するか再評価

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| サブエージェント実行失敗 | 中 | 中 | 失敗したカテゴリをスキップし、残りで判定。Warningとして記録 |
| context-summary.json品質不足 | 中 | 高 | サマリー生成ロジックの明確化、テンプレート化 |
| 並列実行の実際の並列性不足 | 高 | 低 | 各サブエージェントの独立性を確保し、順次実行でも正しく動作するよう設計 |
| 後方互換性の問題 | 低 | 高 | 既存inspection-{n}.mdフォーマットを維持、セクション追加のみ |
| 実行時間5分超過 | 中 | 中 | 各サブエージェントのスコープを絞り、Quick Modeでは静的検査のみに限定 |

## References

- [Claude Code Task Tool Documentation](https://docs.anthropic.com/claude/docs/claude-code) — サブエージェント呼び出しパターン
- `docs/bootstrap/e2e-workflow-integrated-plan.md` — 本機能の元となる統合計画
- `.claude/agents/kiro/spec-inspection.md` — 既存実装（置き換え対象）
- `.claude/agents/kiro/spec-impl.md` — サブエージェント呼び出しパターンの参考
