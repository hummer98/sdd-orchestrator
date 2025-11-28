# Research & Design Decisions

## Summary
- **Feature**: `sdd-hybrid-workflow`
- **Discovery Scope**: Extension（既存Electronアプリの右ペインUI刷新）
- **Key Findings**:
  - 既存のZustandストア（specStore, executionStore, agentStore）を活用・拡張できる
  - 新しいワークフロー状態管理ストア（workflowStore）が必要
  - Electron IPC基盤は既存の`START_AGENT`/`STOP_AGENT`を再利用し、バリデーション・検査・デプロイ用の拡張が必要

## Research Log

### 既存コンポーネント構造の分析
- **Context**: 新しいWorkflowViewを設計するにあたり、既存のUIコンポーネントとストアのパターンを把握
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/components/SpecDetail.tsx`
  - `electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx`
  - `electron-sdd-manager/src/renderer/stores/specStore.ts`
  - `electron-sdd-manager/src/renderer/stores/agentStore.ts`
  - `electron-sdd-manager/src/renderer/stores/executionStore.ts`
- **Findings**:
  - SpecDetailは現在、メタデータ表示・承認状態表示・成果物一覧を担当
  - PhaseExecutionPanelは4フェーズ（requirements, design, tasks, impl）のボタンを提供
  - agentStoreはAgent起動・停止・ログ管理を担当（Map<string, AgentInfo[]>構造）
  - executionStoreはコマンド実行状態を管理
- **Implications**:
  - SpecDetailの役割を分割し、WorkflowViewに統合
  - 6フェーズ（要件定義・設計・タスク・実装・検査・デプロイ）へ拡張が必要
  - 自動実行許可のトグル状態は新規でworkflowStoreに追加

### 既存IPC通信パターンの分析
- **Context**: 新しいフェーズ（検査・デプロイ）とバリデーションコマンドのIPC追加要否を確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/ipc/handlers.ts`
  - `electron-sdd-manager/src/main/ipc/channels.ts`
  - `electron-sdd-manager/src/renderer/types/electron.d.ts`
- **Findings**:
  - `startAgent`ハンドラは汎用的で、任意のコマンドと引数を受け付ける
  - phaseパラメータは文字列型で拡張可能
  - groupパラメータ（'doc' | 'validate' | 'impl'）は検査・デプロイに対応可能
- **Implications**:
  - IPC層の変更は最小限で済む（既存の`startAgent`を活用）
  - 新しいフェーズ名（'inspection', 'deploy'）をphaseパラメータに追加
  - バリデーションコマンド（validate-gap, validate-design, validate-impl）もstartAgentで実行可能

### 型定義の分析
- **Context**: 新しいフェーズとワークフロー状態の型を設計
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/types/index.ts`
- **Findings**:
  - 現在の`Phase`型は `'requirements' | 'design' | 'tasks'` の3種類
  - `SpecPhase`型はspec.jsonのphaseフィールド用（init, requirements-generated等）
  - `ApprovalStatus`は3フェーズ分のみ
- **Implications**:
  - 新しい`WorkflowPhase`型を定義（6フェーズ対応）
  - 検査・デプロイ状態はspec.jsonへの拡張フィールドとして設計
  - ワークフローの状態は別途workflowStore内で管理

### LocalStorage永続化パターンの調査
- **Context**: 自動実行許可のトグル状態をローカルストレージに保存する方法
- **Sources Consulted**: Zustand persist middleware documentation
- **Findings**:
  - Zustandにはpersistミドルウェアがある
  - 既存ストアはpersistを使用していない（状態は揮発性）
- **Implications**:
  - workflowStoreにZustand persistミドルウェアを適用
  - キー名: `sdd-manager-workflow-settings`

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 単一WorkflowViewコンポーネント | 全てのフェーズ表示・制御を1コンポーネントに集約 | シンプルな構造、状態管理が容易 | コンポーネント肥大化のリスク | 初期実装に適する |
| フェーズごとの分割コンポーネント | PhaseCard, ValidateOption等の細分化 | 再利用性、テスト容易性 | コンポーネント間の状態同期が複雑 | 複雑性が増す場合に段階的移行 |

**選択**: 単一WorkflowViewコンポーネントをベースに、内部でPhaseItemとValidateOptionを分離する中間的アプローチ

## Design Decisions

### Decision: ワークフロー状態管理の分離

- **Context**: 既存のspecStore/executionStoreに追加するか、新規ストアを作成するか
- **Alternatives Considered**:
  1. specStoreを拡張 - 自動実行許可・自動実行状態を追加
  2. 新規workflowStoreを作成 - ワークフロー専用の状態管理
- **Selected Approach**: 新規workflowStoreを作成
- **Rationale**:
  - specStoreはSpec単位の情報管理に特化すべき
  - ワークフロー状態（自動実行許可、現在の自動実行位置）はUI固有の関心事
  - Zustand persistミドルウェアを適用しやすい
- **Trade-offs**:
  - ストア数が増加（4つ目のストア）
  - specStoreとworkflowStoreの連携が必要
- **Follow-up**: specDetail読み込み時にworkflowStoreの状態を同期

### Decision: 6フェーズ統合設計

- **Context**: 現在の3フェーズ（requirements/design/tasks）+ impl を 6フェーズ（+検査+デプロイ）に拡張
- **Alternatives Considered**:
  1. spec.json拡張 - inspection_completed, deploy_completed フィールド追加
  2. 別ファイル管理 - workflow.json として分離
- **Selected Approach**: spec.json拡張
- **Rationale**:
  - 既存のspec.json構造に自然に統合
  - ファイル数を増やさない
  - 既存のfileServiceでの読み書きが可能
- **Trade-offs**:
  - spec.jsonスキーマの後方互換性を維持する必要
- **Follow-up**: inspection_completed, deploy_completed はオプショナルフィールドとして追加

### Decision: バリデーションオプションの位置

- **Context**: validate-gap, validate-design, validate-impl をUIにどう配置するか
- **Alternatives Considered**:
  1. フェーズ間にインライン表示
  2. 別セクションとしてまとめて表示
  3. フェーズカードの展開メニュー内
- **Selected Approach**: フェーズ間にインライン表示
- **Rationale**:
  - ワークフローの流れが視覚的に明確
  - 自動実行時のチェックポイントとして自然な位置
  - 要件1.2（矢印で接続）と整合
- **Trade-offs**:
  - UIが縦長になる
  - 各バリデーションオプションごとにチェックボックスと実行ボタンが必要

## Risks & Mitigations

- **UI複雑化** - 6フェーズ + 3バリデーションオプションで縦長UI
  - 緩和策: コンパクトなデザイン、折りたたみ可能なセクション

- **自動実行の停止タイミング** - ユーザーが意図しないところで停止
  - 緩和策: デフォルトで「要件定義」のみ許可、明示的なトグル操作

- **検査・デプロイコマンドの未実装** - validate-impl, deploymentコマンドがまだ存在しない可能性
  - 緩和策: UIは先行実装し、コマンドはプレースホルダーとして設計

- **spec.json拡張の後方互換性** - 既存specでinspection_completed等がない場合
  - 緩和策: フィールドはオプショナル、undefinedの場合はfalse扱い

## References

- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data) - LocalStorage永続化
- [Lucide Icons](https://lucide.dev/icons/) - UIアイコン
- 既存実装: `electron-sdd-manager/src/renderer/stores/agentStore.ts` - Agent状態管理パターン
