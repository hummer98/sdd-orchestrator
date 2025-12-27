# Research & Design Decisions

## Summary
- **Feature**: `auto-execution-parallel-spec`
- **Discovery Scope**: Extension（既存AutoExecutionServiceの拡張）
- **Key Findings**:
  - 現在のAutoExecutionServiceはシングルトンで単一の`currentExecutingSpecId`のみ管理
  - specStoreに`AutoExecutionRuntimeMap`が既に存在し、Spec毎の状態管理の土台がある
  - AgentIdからSpecIdへのマッピング機構（`trackedAgentIds`）は既存だが、単一Spec用

## Research Log

### 現在のAutoExecutionServiceアーキテクチャ分析
- **Context**: 並行実行を阻害している設計上の制約を特定
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts`
  - `electron-sdd-manager/src/renderer/stores/specStore.ts`
  - `electron-sdd-manager/src/renderer/stores/workflowStore.ts`
- **Findings**:
  - シングルトン設計で`currentExecutingSpecId`が1つのみ
  - `trackedAgentIds: Set<string>`がSpec横断で共有されている
  - `pendingEvents: Map<string, string>`も同様に共有
  - `executedPhases`, `errors`, `executionStartTime`がクラス変数として存在
  - IPC listenerは1つのみ（`setupDirectIPCListener`）
  - specStoreには既に`AutoExecutionRuntimeMap`があり、Spec毎のruntime状態を管理可能
- **Implications**:
  - ExecutionContext構造体を導入してSpec毎の状態を分離する必要がある
  - AgentIdからSpecIdへのマッピングを`Map<agentId, specId>`として一元管理
  - 既存のspecStore.AutoExecutionRuntimeMapを活用して、UI表示用のruntime状態を管理

### specStore.AutoExecutionRuntimeMap分析
- **Context**: 既存のSpec毎の状態管理機構の活用可能性を評価
- **Findings**:
  - `AutoExecutionRuntimeState`型が定義済み: `isAutoExecuting`, `currentAutoPhase`, `autoExecutionStatus`
  - `autoExecutionRuntimeMap: Map<string, AutoExecutionRuntimeState>`がspecStoreに存在
  - `startAutoExecution(specId)`, `stopAutoExecution(specId)`等のアクションが既に実装
- **Implications**:
  - UI表示用のruntime状態管理は既存機構を活用
  - AutoExecutionService側に追加のExecutionContext（実行詳細）を保持

### IPC Agent Status Change Handler分析
- **Context**: 複数Spec並行実行時のイベントルーティング設計
- **Findings**:
  - `onAgentStatusChange`コールバックは`agentId`と`status`のみ受信
  - 現在は`currentExecutingSpecId`を参照して対象Specを特定
  - `trackedAgentIds.has(agentId)`でトラッキング対象か判定
- **Implications**:
  - AgentIdからSpecIdへのマッピング（`agentToSpecMap`）を追加
  - IPC handlerは`agentToSpecMap`からSpecIdを解決して適切なExecutionContextを更新

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ExecutionContext per Spec | Spec毎に独立した実行コンテキストを`Map<specId, ExecutionContext>`で管理 | 完全な状態分離、並行実行が自然 | メモリ使用量増加、クリーンアップ必須 | **Selected** - 要件1に最適 |
| Worker Thread per Spec | Web Workerで各Specの実行を分離 | 完全な並列実行 | 複雑性が高い、Electron環境での制約 | 過剰な設計 |
| Queue-based Serial | キュー方式で順次実行 | シンプル、リソース効率 | 並行実行不可 | 要件を満たさない |

## Design Decisions

### Decision: ExecutionContext構造体の導入
- **Context**: Spec毎の実行状態を分離して並行実行を可能にする
- **Alternatives Considered**:
  1. クラス変数をSpec毎にネストしたオブジェクトに変更
  2. 新しいクラス`SpecExecutionContext`を作成して各Specに割り当て
  3. 既存のクラス変数を`Map<specId, T>`形式に変換
- **Selected Approach**: Option 3 - 既存のクラス変数を`Map`形式に変換し、`ExecutionContext`型でグループ化
- **Rationale**:
  - 既存コードへの影響を最小化
  - specStoreのAutoExecutionRuntimeMapと一貫性のある設計
  - シングルトンパターンを維持しつつ内部状態のみ変更
- **Trade-offs**:
  - Benefits: 後方互換性を維持、既存のテストへの影響最小
  - Compromises: 状態管理が2箇所（AutoExecutionService内とspecStore）に分散

### Decision: AgentIdからSpecIdへのマッピング管理
- **Context**: Agent完了イベントから正確にSpecを特定する必要がある
- **Alternatives Considered**:
  1. AgentId形式に規約を設けてSpecIdを埋め込む
  2. 独立したMap<agentId, specId>を管理
  3. AgentStoreにspecId情報を追加
- **Selected Approach**: Option 2 - AutoExecutionService内で`agentToSpecMap: Map<string, string>`を管理
- **Rationale**:
  - AutoExecutionService内で完結する設計
  - AgentStoreの変更が不要
  - `trackedAgentIds`を置き換える形で導入可能
- **Trade-offs**:
  - Benefits: 変更範囲が限定的、AgentStoreとの依存を増やさない
  - Compromises: マッピング情報がAutoExecutionServiceにのみ存在

### Decision: 並行実行上限の設定
- **Context**: リソース保護と安定性確保のため上限が必要
- **Alternatives Considered**:
  1. 上限なし（システムリソースに依存）
  2. 固定上限（5）
  3. 設定可能な上限
- **Selected Approach**: Option 2 - 固定上限5
- **Rationale**:
  - 要件3.4で5が指定されている
  - 設定UIの複雑さを回避
  - 5は実用的な上限（同時に5つのSpecを並行開発するケースは稀）
- **Trade-offs**:
  - Benefits: シンプル、予測可能なリソース使用
  - Compromises: 柔軟性は低い

### Decision: specStore.specDetail依存の排除方法
- **Context**: 自動実行中にユーザーが別Specを選択しても影響を受けないようにする
- **Alternatives Considered**:
  1. ExecutionContext作成時にspecDetailをディープコピー
  2. specIdとspecPathのみ保持し、必要時にIPC経由で最新を取得
  3. specJsonのみスナップショット
- **Selected Approach**: Option 1と2のハイブリッド - 初期スナップショット + 必要時にIPC取得
- **Rationale**:
  - 初期状態はスナップショットで保持（高速）
  - 承認処理等で最新状態が必要な場合はIPC経由で取得
  - 要件4.3の「handleAgentCompleted時にfresh spec.json取得」を満たす
- **Trade-offs**:
  - Benefits: パフォーマンスと正確性のバランス
  - Compromises: スナップショットと最新の使い分けロジックが必要

## Risks & Mitigations
- **リスク1**: メモリリークの可能性 - ExecutionContextが適切にクリーンアップされない場合
  - **Mitigation**: `disposeContext(specId)`メソッドで明示的なクリーンアップ、完了後2秒遅延でのクリーンアップ（要件6.1）
- **リスク2**: レースコンディション - 複数のAgent完了イベントが同時に到着
  - **Mitigation**: 既存の`pendingEvents`バッファリング機構を`Map<agentId, {specId, status}>`に拡張
- **リスク3**: UI表示の不整合 - 選択中Specと実行中Specの表示が混乱
  - **Mitigation**: WorkflowViewは常に選択中Specのruntime状態のみ表示（要件5.5）
- **リスク4**: Timeout管理の複雑化 - Spec毎に独立したtimeoutが必要
  - **Mitigation**: ExecutionContext内にtimeoutIdを保持、contextクリーンアップ時に自動クリア

## References
- [Zustand ドキュメント](https://github.com/pmndrs/zustand) - 状態管理パターン
- 既存実装: `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts`
- 既存実装: `electron-sdd-manager/src/renderer/stores/specStore.ts`
