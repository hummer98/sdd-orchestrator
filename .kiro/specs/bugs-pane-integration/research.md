# Research & Design Decisions

## Summary
- **Feature**: `bugs-pane-integration`
- **Discovery Scope**: Extension（既存システムへの機能拡張）
- **Key Findings**:
  - Specsタブと同一の3ペインレイアウトパターンを踏襲可能
  - bugStoreに選択状態管理機能が既に存在、拡張のみ必要
  - BugWorkflowViewは新規コンポーネントだがWorkflowViewのパターンを参照可能

## Research Log

### Specsタブ実装パターンの調査
- **Context**: BugsタブでSpecsタブと同様のペイン連動を実現する必要がある
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/App.tsx`
  - `/electron-sdd-manager/src/renderer/components/WorkflowView.tsx`
  - `/electron-sdd-manager/src/renderer/components/DocsTabs.tsx`
- **Findings**:
  - App.tsxでは`selectedSpec`の有無でメイン・右ペインの表示を切り替え
  - WorkflowViewはspecDetail, phaseStatuses, runningPhasesを管理
  - DocsTabsはSpecs/Bugsタブ切り替えのみ担当、ペイン連動ロジックは含まない
- **Implications**:
  - App.tsxに`selectedBug`の状態判定を追加する必要がある
  - BugWorkflowViewを新規作成し、WorkflowViewのパターンを踏襲

### Bug状態管理の調査
- **Context**: Bugの選択状態とワークフロー進捗をどう管理するか
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/stores/bugStore.ts`
  - `/electron-sdd-manager/src/renderer/types/bug.ts`
- **Findings**:
  - bugStore: `selectedBug`, `bugDetail`, `selectBug()`, `clearSelectedBug()`が既存
  - BugPhase: `reported`, `analyzed`, `fixed`, `verified`の4フェーズ
  - determineBugPhase(): artifactsからフェーズを自動判定
  - getNextAction(): 現在フェーズから次アクションを取得
- **Implications**:
  - bugStoreの既存機能で選択状態管理は十分
  - Deploy(commit)フェーズはBugワークフローに追加が必要

### BugActionButtonsの調査
- **Context**: 既存のBugアクションボタン実装を確認
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/components/BugActionButtons.tsx`
- **Findings**:
  - Analyze/Fix/Verifyの3アクション対応
  - agentStore.startAgent()でエージェント起動
  - コマンド: `/kiro:bug-analyze`, `/kiro:bug-fix`, `/kiro:bug-verify`
  - 実行中ボタンは無効化、Loaderアイコン表示
- **Implications**:
  - Deployフェーズには`/commit`コマンドを使用（Requirement 4.5）
  - 既存パターンを踏襲してBugWorkflowViewに統合

### Bugドキュメントタブの調査
- **Context**: メインペインでのBugドキュメント表示方法
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/types/bug.ts` (BugDetail, BugArtifactInfo)
- **Findings**:
  - artifacts: report, analysis, fix, verificationの4ファイル
  - Requirement 2.2ではドキュメントタブとしてこれらを表示
  - 各アーティファクトにはexists, path, updatedAt, contentがある
- **Implications**:
  - ArtifactEditorを拡張するかBugArtifactEditorを新規作成
  - タブ切り替えUIはDocsTabsパターンを参照

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Specsタブ並列パターン | Specsと同一構造でBugsを実装 | 一貫性、学習コスト低 | コード重複の可能性 | 選択：Requirement 6に合致 |
| 統合コンポーネント | Spec/Bug両対応の汎用コンポーネント | DRY | 複雑化、型安全性低下 | 不採用：過度な抽象化 |

## Design Decisions

### Decision: Bugsタブ選択時のペイン連動アーキテクチャ

- **Context**: Bugsタブ選択時にSpecsタブと同様のペイン連動を実現する
- **Alternatives Considered**:
  1. App.tsxで`selectedBug`判定を追加し、条件分岐でBug用ペインを表示
  2. 統合WorkflowViewでSpec/Bug両対応
- **Selected Approach**: Option 1 - App.tsxでの条件分岐
- **Rationale**:
  - Specsタブとの一貫性を維持
  - コンポーネントの責務を明確に分離
  - 既存のWorkflowViewに影響を与えない
- **Trade-offs**:
  - 類似コードが増加するが、保守性と理解しやすさを優先
  - 将来的に共通化が必要になる可能性はあるが、現時点では早すぎる抽象化
- **Follow-up**: BugWorkflowViewの実装後、共通化の余地を再評価

### Decision: Bugワークフローフェーズ構成

- **Context**: Requirement 3.2で5フェーズ（Report, Analyze, Fix, Verify, Deploy）を要求
- **Alternatives Considered**:
  1. 既存BugPhase型を拡張してdeployを追加
  2. ワークフロー表示専用の型を新規定義
- **Selected Approach**: Option 2 - BugWorkflowPhase型を新規定義
- **Rationale**:
  - 既存BugPhase型はファイル存在判定と連動しており、変更は影響範囲大
  - Deployはドキュメントファイルではなくコミット操作のため、別概念
- **Trade-offs**: 型が増えるが、ドメイン概念を正確に表現
- **Follow-up**: なし

### Decision: 選択状態の永続化範囲

- **Context**: Requirement 5.3で再起動時はリセット、セッション中は保持を要求
- **Alternatives Considered**:
  1. localStorage/sessionStorageに保存
  2. Zustandのメモリ状態のみ
- **Selected Approach**: Option 2 - メモリ状態のみ
- **Rationale**:
  - 要件通り再起動時リセットが自然に実現
  - 追加の永続化ロジック不要でシンプル
- **Trade-offs**: HMR時にも状態リセットされるが、開発中のみの影響
- **Follow-up**: なし

## Risks & Mitigations

- **Risk 1**: BugWorkflowViewとWorkflowViewのコード重複
  - **Mitigation**: 共通のPhaseItemコンポーネントを再利用、フェーズ定義のみ異なる
- **Risk 2**: Specsタブとの操作感の微妙な差異
  - **Mitigation**: UIデザイン（色、アイコン、間隔）をSpecsタブと完全一致させる
- **Risk 3**: Bug削除時の選択状態不整合
  - **Mitigation**: bugStore.refreshBugs()でselectedBugの存在確認を追加

## References
- [Zustand公式ドキュメント](https://docs.pmnd.rs/zustand/getting-started/introduction) — 状態管理パターン
- 既存実装: `WorkflowView.tsx`, `bugStore.ts`, `BugActionButtons.tsx`
