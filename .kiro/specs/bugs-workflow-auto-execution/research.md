# Research & Design Decisions

## Summary
- **Feature**: `bugs-workflow-auto-execution`
- **Discovery Scope**: Extension（既存のSpec自動実行機能をBugワークフローに拡張）
- **Key Findings**:
  - 既存のAutoExecutionServiceはSpec専用設計だが、アーキテクチャパターンはBugにも適用可能
  - BugワークフローはSpecと異なり、bug.jsonが存在せずファイル存在ベースでステータス管理
  - 既存のAutoExecutionStatusDisplayはProps駆動設計のため再利用可能

## Research Log

### 既存AutoExecutionServiceの分析
- **Context**: Bugワークフローへの自動実行機能拡張に向けた既存実装の調査
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts`
  - `electron-sdd-manager/src/renderer/stores/workflowStore.ts`
  - `electron-sdd-manager/src/renderer/types/index.ts`
- **Findings**:
  - AutoExecutionServiceはシングルトンパターンで実装
  - IPC経由でAgentステータス変更を監視（`onAgentStatusChange`）
  - フェーズ完了時に自動的に次フェーズへ遷移
  - タイムアウト、リトライ、エラーハンドリングが実装済み
  - spec.jsonに自動実行状態を永続化（SpecAutoExecutionState）
- **Implications**:
  - Bugワークフロー用に新サービス（BugAutoExecutionService）を作成するのが望ましい
  - 共通ロジック（IPC監視、タイムアウト管理など）は抽出して共有可能

### BugワークフローとSpecワークフローの差異
- **Context**: 2つのワークフローの構造的差異を特定
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/types/bug.ts`
  - `electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx`
  - `electron-sdd-manager/src/renderer/stores/bugStore.ts`
- **Findings**:
  - Bugワークフロー: report → analyze → fix → verify → deploy (5フェーズ)
  - Specワークフロー: requirements → design → tasks → impl → inspection → deploy (6フェーズ)
  - Bug: ファイル存在ベースでステータス判定（bug.jsonなし）
  - Spec: spec.jsonで状態管理とautoExecution状態永続化
  - Bug: deployフェーズ自動実行はデフォルト無効が妥当
- **Implications**:
  - フェーズ許可設定をBugワークフロー向けにカスタマイズが必要
  - 永続化先はlocalStorage（プロジェクト単位で保存）

### 既存UIコンポーネントの再利用性
- **Context**: UI一貫性を保ちながら既存コンポーネントを再利用する方法を調査
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/components/AutoExecutionStatusDisplay.tsx`
  - `electron-sdd-manager/src/renderer/components/BugPhaseItem.tsx`
- **Findings**:
  - AutoExecutionStatusDisplay: Props駆動設計で、ワークフロー非依存
  - BugPhaseItem: 現在の実装は手動実行のみ対応、自動実行中の状態表示は未対応
  - 既存のPhaseItemは自動実行中のハイライト機能あり
- **Implications**:
  - AutoExecutionStatusDisplayはBug用に新コンポーネント（BugAutoExecutionStatusDisplay）を作成
  - BugPhaseItemに自動実行中のハイライト機能を追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存サービス拡張 | AutoExecutionServiceにBugワークフロー対応を追加 | 実装量が少ない | 責務肥大化、Bug/Spec混在でテスト複雑化 | 不採用 |
| 新サービス作成 | BugAutoExecutionServiceを新規作成、共通ロジック抽出 | 責務分離、テスト容易 | 若干の重複コード | 採用 |
| 抽象化層導入 | BaseAutoExecutionServiceを抽出し継承 | 最大限のコード再利用 | 過度な抽象化、既存コード変更大 | 不採用（YAGNI） |

## Design Decisions

### Decision: BugAutoExecutionService新規作成
- **Context**: Bugワークフローに自動実行機能を追加する際の実装アプローチ選択
- **Alternatives Considered**:
  1. 既存AutoExecutionServiceにBug対応を追加 — 単一クラスで両ワークフロー対応
  2. BugAutoExecutionService新規作成 — Bugワークフロー専用サービス
  3. 共通基底クラス抽出 — AbstractAutoExecutionServiceを継承
- **Selected Approach**: BugAutoExecutionService新規作成
- **Rationale**:
  - 責務の分離が明確になる
  - 既存のAutoExecutionService（Spec用）への影響を最小化
  - Bugワークフロー固有のロジック（ファイル存在ベースのステータス判定など）を独立管理
  - テストが容易
- **Trade-offs**:
  - IPC監視ロジックなど一部のコード重複が発生
  - ただし、ユーティリティ関数として共通化可能
- **Follow-up**: 将来的にコード重複が問題になった場合、共通ユーティリティ抽出を検討

### Decision: フェーズ許可設定のデフォルト値
- **Context**: Bugワークフロー自動実行時のデフォルト許可フェーズ設定
- **Alternatives Considered**:
  1. analyze, fix, verify, deployすべて許可
  2. analyze, fix, verify許可、deploy無効
  3. analyzeのみ許可
- **Selected Approach**: analyze, fix, verify許可、deploy無効
- **Rationale**:
  - Requirementsにて「デフォルトでanalyze, fix, verifyフェーズを自動実行の対象とする」と明記
  - deployフェーズは本番環境への影響があるため明示的許可を要求
- **Trade-offs**: ユーザーがdeployまで自動実行したい場合は設定変更が必要
- **Follow-up**: UI上でdeploy許可のリスクを警告表示することを検討

### Decision: 永続化先をlocalStorage（プロジェクト単位）
- **Context**: フェーズ許可設定の永続化方法
- **Alternatives Considered**:
  1. グローバルlocalStorage（全プロジェクト共通）
  2. プロジェクト単位のlocalStorage
  3. プロジェクト内ファイル（.kiro/bugs/auto-execution.json）
- **Selected Approach**: プロジェクト単位のlocalStorage
- **Rationale**:
  - 要件7.3「フェーズ許可設定 shall プロジェクトごとに保存される」に準拠
  - Specワークフローと同じ永続化パターン（localStorage + partialize）を採用
  - 追加ファイル生成を避けることでシンプルな実装を維持
- **Trade-offs**: プロジェクトパスをキーに含めるため、パス変更時に設定がリセットされる
- **Follow-up**: パス変更時の設定マイグレーションは将来課題として記録

## Risks & Mitigations
- **Risk 1: 既存AutoExecutionServiceとの競合** — Spec自動実行中にBug自動実行を開始した場合の動作
  - Mitigation: 全体的なisAutoExecutingフラグで排他制御
- **Risk 2: deployフェーズの意図しない実行** — 自動実行でcommitが実行される可能性
  - Mitigation: デフォルト無効、UI上で警告表示
- **Risk 3: IPC監視のメモリリーク** — サービスのdispose忘れ
  - Mitigation: 既存パターンと同様のdisposeメソッド実装、テストで検証

## References
- [AutoExecutionService.ts](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts) — 既存Spec自動実行サービス実装
- [workflowStore.ts](electron-sdd-manager/src/renderer/stores/workflowStore.ts) — 自動実行設定管理ストア
- [e2e-testing.md](.kiro/steering/e2e-testing.md) — E2Eテスト標準とMock Claude CLI仕様
