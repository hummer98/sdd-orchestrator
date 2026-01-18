# Requirements: Impl Start Unification

## Decision Log

### impl実行経路の統一方針

- **Discussion**: 現状、手動実行（Renderer の `handleImplExecute()`）と Auto Execution（Main Process の `execute-next-phase` ハンドラ）で impl 開始ロジックが分散しており、Auto Execution 時に Worktree 作成処理がスキップされる構造的問題が発生していた。Option A（Main Process で Worktree 作成を追加）と Option B（単一経路に統一）を検討。
- **Conclusion**: Option B: 単一経路に統一（Main Process 集約）
- **Rationale**: DRY・SSOT 原則に基づく最善の設計。impl 開始ロジックを Main Process の単一関数に集約し、Renderer は IPC 経由で呼び出すのみとする。

### Worktree 作成の前提条件

- **Discussion**: Worktree モードで impl を開始する際、main ブランチでなければエラーとするか、フォールバックするかを検討。
- **Conclusion**: main ブランチでなければエラーとし、Auto Execution を停止する
- **Rationale**: 現在の手動実行と同じ動作を維持。Worktree モードは main ブランチからの分岐を前提としており、異なるブランチからの Worktree 作成は意図しない動作を引き起こす可能性がある。

### Renderer の設計パターン

- **Discussion**: Renderer に impl 開始ロジックを残すか、IPC 呼び出しのみにするかを検討。
- **Conclusion**: Thin Client パターン（Renderer は IPC 呼び出しのみ）
- **Rationale**: impl 開始ロジックが Main Process の 1 箇所だけに存在することで、混乱を回避。Auto Execution も手動実行も同じ `startImplPhase()` を呼ぶことで一貫性を確保。

### 通常モード（Worktree なし）の扱い

- **Discussion**: `worktree.enabled = false` または未設定の場合の動作を変更するか維持するかを検討。
- **Conclusion**: 既存動作を維持（`normalModeImplStart()` で `branch`、`created_at` を保存）
- **Rationale**: 既存の動作に問題はなく、変更の必要性がない。

## Introduction

impl フェーズ開始処理を Main Process の単一関数に集約し、手動実行と Auto Execution の両方で一貫した動作を保証する。これにより、Auto Execution 時に Worktree 作成がスキップされる構造的問題を解決する。

**Remote UI対応**: 不要（Desktop専用操作）
- 理由: impl 実行は Git worktree 操作やローカルファイルシステム操作を伴うため、Desktop UI からのみ許可される。WebSocket ハンドラへの追加は不要。

## Requirements

### Requirement 1: Main Process への impl 開始ロジック集約

**Objective:** 開発者として、impl 開始ロジックが単一箇所に集約されていることで、保守性が向上し、手動実行と Auto Execution で一貫した動作が保証される。

#### Acceptance Criteria

1.1. Main Process に `startImplPhase()` 関数が存在し、以下の処理を行うこと:
   - When spec.json の `worktree.enabled` が `true` かつ `worktree.path` が未設定の場合、the system shall Worktree 作成処理を実行する
   - When spec.json の `worktree.enabled` が `false` または未設定の場合、the system shall `normalModeImplStart()` 相当の処理を実行する
   - When Worktree 作成または通常モード初期化が完了した後、the system shall `execute({ type: 'impl' })` を呼び出す

1.2. `startImplPhase()` は以下のパラメータを受け取ること:
   - `specPath`: string - spec.json のパス
   - `featureName`: string - 機能名
   - `commandPrefix`: string - コマンドプレフィックス（'kiro' など）

1.3. `startImplPhase()` は `Result<{ agentId: string }, ImplStartError>` を返すこと

### Requirement 2: Worktree 作成の前提条件チェック

**Objective:** 開発者として、Worktree モードで impl を開始する際、main ブランチでない場合はエラーとなり、意図しない Worktree 作成を防止できる。

#### Acceptance Criteria

2.1. When Worktree モードが有効かつ main ブランチでない場合、the system shall エラーを返し impl 実行を中止すること

2.2. When Worktree モードが有効かつ main ブランチの場合、the system shall Worktree を作成し impl を実行すること

2.3. When Worktree モードが無効の場合、the system shall ブランチチェックをスキップし通常モードで impl を実行すること

### Requirement 3: Auto Execution からの呼び出し

**Objective:** 開発者として、Auto Execution で impl フェーズが実行される際、手動実行と同じロジックが適用され、Worktree モードが正しく動作する。

#### Acceptance Criteria

3.1. When `execute-next-phase` イベントで `phase === 'impl'` の場合、the system shall `startImplPhase()` を呼び出すこと

3.2. When `startImplPhase()` がエラーを返した場合、the system shall `coordinator.handleAgentCompleted(specPath, 'failed')` を呼び出し Auto Execution を停止すること

3.3. When `startImplPhase()` が成功した場合、the system shall 返された `agentId` で `coordinator.setCurrentPhase(specPath, 'impl', agentId)` を呼び出すこと

### Requirement 4: 手動実行からの呼び出し（Thin Client）

**Objective:** 開発者として、Renderer の impl 開始処理がシンプルな IPC 呼び出しのみとなり、ロジックの重複がなくなる。

#### Acceptance Criteria

4.1. Renderer の `handleImplExecute()` は、Main Process の `startImpl` IPC を呼び出すのみであること

4.2. `startImpl` IPC は以下のパラメータを受け取ること:
   - `specPath`: string
   - `featureName`: string
   - `commandPrefix`: string

4.3. When IPC 呼び出しがエラーを返した場合、the system shall Renderer 側で `notify.error()` を表示すること

4.4. `preload.ts` に `startImpl` API が追加されること

### Requirement 5: 既存コードの削除

**Objective:** 開発者として、重複コードが削除され、impl 開始ロジックが Main Process のみに存在する状態となる。

#### Acceptance Criteria

5.1. `WorkflowView.tsx` の `handleImplExecute()` から Worktree 作成ロジック（`worktreeCheckMain`、`worktreeImplStart` 呼び出し）が削除されること

5.2. `WorkflowView.tsx` の `handleImplExecute()` から `normalModeImplStart` 呼び出しが削除されること

5.3. 削除後も既存のテストが（修正後に）パスすること

## Out of Scope

- Bug ワークフローの Worktree 対応（`bugs-worktree-support` で管理）
- Worktree 作成パスのカスタマイズ
- 複数 Worktree の同時管理
- deploy フェーズの統一（本仕様は impl のみ）

## Open Questions

- なし（対話で解決済み）
