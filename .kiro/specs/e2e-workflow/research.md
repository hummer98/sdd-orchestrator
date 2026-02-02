# Research & Design Decisions: E2E Workflow Integration

## Summary

- **Feature**: e2e-workflow
- **Discovery Scope**: Complex Integration (inspection-distributed拡張)
- **Key Findings**:
  - inspection-distributedで4サブエージェント分散アーキテクチャが確立済み
  - 既存E2Eインフラ（WebdriverIO + Mock Claude CLI）が整備済み
  - design.mdテンプレート拡張パターンが確立済み

## Research Log

### Existing Inspection Architecture

- **Context**: e2e-workflowがinspection-distributedに依存するため、既存アーキテクチャの理解が必要
- **Sources Consulted**:
  - `.kiro/specs/inspection-distributed/design.md`
  - `.claude/agents/kiro/spec-inspection.md`
  - `.claude/agents/kiro/integration-checker.md`
- **Findings**:
  - Orchestrator-Worker Pattern: spec-inspectionが4つのサブエージェントを並列呼び出し
  - Context Hierarchy: context-summary.jsonでトークン効率化
  - JSON Contract: SubAgentResult型で結果標準化
  - Quick Mode: デフォルトで静的検査のみ、5分以内目標
- **Implications**:
  - E2Eパイプラインは5つ目の検査カテゴリとして追加
  - 既存のContext HierarchyとJSON Contractを踏襲
  - Quick Mode維持のため、E2EはFull Modeオプションとして分離

### E2E Testing Infrastructure

- **Context**: 既存のE2Eテストパターンを把握し、新規サブエージェントの設計に活用
- **Sources Consulted**:
  - `.kiro/steering/e2e-testing.md`
  - `electron-sdd-manager/e2e-wdio/helpers/auto-execution.helpers.ts`
  - `electron-sdd-manager/scripts/e2e-mock/mock-claude.sh`
- **Findings**:
  - WebdriverIO 9.20+ + wdio-electron-service 9.2+
  - Mock Claude CLI (mock-claude.sh) でCI/CD対応
  - 共通ヘルパー関数（selectProjectViaStore, waitForCondition等）
  - Fixture構造: e2e-wdio/fixtures/test-project/
  - data-testidパターン標準化済み
- **Implications**:
  - e2e-creatorはWebdriverIOテスト形式で生成
  - 既存ヘルパー関数を最大限活用
  - Mock Claude CLIの拡張でE2Eパイプラインをモック可能

### Design Template Patterns

- **Context**: design.mdテンプレート拡張の既存パターンを把握
- **Sources Consulted**:
  - `.kiro/settings/templates/specs/design.md`
  - `.kiro/settings/rules/design-principles.md`
  - `.claude/agents/kiro/spec-design.md`
- **Findings**:
  - テンプレートはセクション追加で拡張可能
  - 既存セクション: Overview, Architecture, Requirements Traceability, Components, Data Models, etc.
  - Integration & Deprecation Strategyセクションが既に存在
- **Implications**:
  - Verification Contractは新規セクションとして追加
  - 既存のIntegration & Deprecation StrategyをImpact Analysis Contractとして統合
  - spec-design-agentのStep 3に生成ロジック追加

### Task Generation Patterns

- **Context**: spec-tasks-agentの拡張パターンを把握
- **Sources Consulted**:
  - `.claude/agents/kiro/spec-tasks.md`
  - `.kiro/settings/rules/tasks-generation.md`
- **Findings**:
  - タスクカテゴリ: Implementation, Wiring/Integration, Cleanup/Deprecation
  - (P)マーカーで並列実行可能タスクを識別
  - _Requirements: N.N_ 形式で要件紐付け
  - _Method:, _Verify:_ フィールドで実装方法を明示
- **Implications**:
  - E2Eタスクはテストカテゴリに追加
  - _Requirements: UJ-NNN_ 形式でUser Journey紐付け
  - (P)マーカーは並列実行可能な場合のみ付与

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 単一E2Eエージェント | 1つのエージェントでE2E全処理 | シンプル | 責務肥大化、デバッグ困難 | 却下 |
| 2エージェント分離 | 計画+生成、検証+実行 | 中程度の分離 | 検証フェーズが不明確 | 却下 |
| 4エージェント分離 | planner, creator, validator, runner | 責務明確、デバッグ容易 | 順次実行による時間増 | **採用** |

**選択理由**: 各フェーズの責務を明確化し、特にフレイキー検出（validator）を独立化することで品質を担保。inspection-distributedの分散パターンとも整合性がある。

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| E2E常時実行 | 全inspection実行時にE2E | 完全な検証 | 時間がかかりすぎる | 却下 |
| E2E Only Mode | E2Eのみ実行 | 高速E2E検証 | 静的検査スキップは危険 | 将来検討 |
| Quick/Full Mode分離 | デフォルトQuick、--fullでE2E追加 | 用途に応じた使い分け | オプション管理 | **採用** |

**選択理由**: 開発中の頻繁な確認（Quick Mode）とマージ前の最終確認（Full Mode）を用途に応じて使い分け可能。inspection-distributedのQuick Modeデフォルト方針とも整合。

## Design Decisions

### Decision: E2E Pipeline順次実行

- **Context**: E2Eサブエージェント間に依存関係がある（planner→creator→validator→runner）
- **Alternatives Considered**:
  1. 並列実行（依存関係により不可能）
  2. 部分並列（creator/validatorを並列化 - 結果が必要なため不可）
- **Selected Approach**: 完全順次実行
- **Rationale (Why)**:
  - plannerの出力（e2e-plan.json）がcreatorの入力
  - creatorの出力（生成テスト）がvalidatorの入力
  - validatorの出力（安定性判定）がrunnerの入力
- **Trade-offs**: 実行時間は増加するが、各フェーズの品質が保証される
- **Follow-up**: 将来的に部分的な並列化（複数テストの同時実行）を検討

### Decision: User Journey Fail→Critical、無関係Fail→Warning

- **Context**: E2Eテスト失敗時の判定スコープをどう限定するか
- **Alternatives Considered**:
  1. 全FailをCritical（無関係な失敗でNOGO）
  2. 全FailをWarning（本当の問題を見逃す）
  3. Journey紐付けで分類
- **Selected Approach**: design.mdで宣言されたUser JourneyのテストFailはCritical、それ以外はWarning
- **Rationale (Why)**:
  - 変更に関連するテストのみを厳格に評価
  - 無関係な既存テストの不安定さでNOGOになることを防止
  - セマンティックな判定理由を提供可能
- **Trade-offs**: Journey紐付けの精度に依存
- **Follow-up**: e2e-runnerでJourney ID抽出ロジック実装

### Decision: 生成テストの配置先

- **Context**: e2e-creatorが生成するテストの配置場所
- **Alternatives Considered**:
  1. e2e-wdio/本体に直接配置
  2. e2e-wdio/generated/に分離
  3. inspection-context/に配置
- **Selected Approach**: `e2e-wdio/generated/`に配置、.gitignoreに追加
- **Rationale (Why)**:
  - 既存テストと混在させない
  - レビュー後に正式採用する場合は手動で移動
  - inspection-context/はinspection終了後に削除される可能性
- **Trade-offs**: 手動移動が必要だが、品質管理上は望ましい
- **Follow-up**: レビューワークフローの整備

## Execution Model Decision

### Considered Approaches

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| CLI Invocation | Task tool経由でE2Eサブエージェント呼び出し | 既存パターン準拠、デバッグ容易 | オーバーヘッド |
| MCP Direct Call | MCP tool経由で直接呼び出し | 低オーバーヘッド | 設定複雑、既存パターンと異なる |

### Selected Approach

**Choice**: CLI Invocation (Task tool)

**Rationale**:
- inspection-distributedで確立されたパターンに準拠
- 各サブエージェントが独立したプロンプトファイルとして定義可能
- デバッグ時にサブエージェントを個別実行可能

**Implications for design.md**:
- 全シーケンス図でTask tool呼び出しを使用
- allowed-toolsにTask toolを含める

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| E2E Pipeline実行時間が長い | Quick Mode分離により開発中は影響なし。Full Modeは並列静的検査と同時実行 |
| 生成テストがフレイキー | e2e-validatorで3回検証、FLAKYは除外 |
| User Journey抽出精度 | design.mdテンプレートで形式を標準化、e2e-plannerで正規表現パース |
| 環境依存で失敗 | e2e-runnerで環境チェック必須化、警告表示 |
| Mock CLI拡張の複雑化 | 既存mock-claude.shのケース追加パターンに準拠 |

## References

- [inspection-distributed design.md](../.kiro/specs/inspection-distributed/design.md) - 分散アーキテクチャの参照設計
- [e2e-testing.md](../.kiro/steering/e2e-testing.md) - E2Eテスト標準
- [WebdriverIO Documentation](https://webdriver.io/docs/api) - E2Eフレームワーク公式ドキュメント
- [wdio-electron-service](https://webdriver.io/docs/wdio-electron-service/) - Electron E2Eサービス

## Implementation Guidance

### Mock Claude CLI拡張

`scripts/e2e-mock/mock-claude.sh`に以下のフェーズを追加:

```bash
# E2E Pipeline phases for --full mode
case "$PHASE" in
  e2e-planner)
    # Generate e2e-plan.json mock
    ;;
  e2e-creator)
    # Generate mock test files
    ;;
  e2e-validator)
    # Update e2e-plan.json with validation results
    ;;
  e2e-runner)
    # Generate e2e-result.json and e2e-report-{n}.md
    ;;
esac
```

### E2Eテスト生成テンプレート

```typescript
// e2e-wdio/generated/uj-{NNN}-{feature}.spec.ts
import { selectProjectViaStore, waitForCondition } from '../helpers/auto-execution.helpers';

describe('UJ-{NNN}: {journey flow}', () => {
  const FIXTURE_PROJECT_PATH = '...';

  beforeEach(async () => {
    await selectProjectViaStore(FIXTURE_PROJECT_PATH);
  });

  it('should {expected result}', async () => {
    // Test implementation
  });
});
```

### steering/inspection-e2e.md 生成形式

```markdown
# E2E Testing Configuration

## Framework
- **Type**: WebdriverIO
- **Config**: wdio.conf.ts
- **Version**: 9.20.1

## Test Structure
- **Test Directory**: e2e-wdio/
- **Generated Directory**: e2e-wdio/generated/
- **Fixtures**: e2e-wdio/fixtures/

## Helpers
| Helper | Purpose |
|--------|---------|
| selectProjectViaStore | Zustand store経由でプロジェクト選択 |
| waitForCondition | 条件待機 |
| ...

## Coverage Summary
| Test File | Coverage |
|-----------|----------|
| spec-workflow.e2e.spec.ts | ワークフローUI |
| auto-execution-flow.e2e.spec.ts | 自動実行フロー |
| ...

## Reference
See [e2e-testing.md](./e2e-testing.md) for detailed guidelines.
```
