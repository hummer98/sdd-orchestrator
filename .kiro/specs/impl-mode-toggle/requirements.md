# Requirements: impl-mode-toggle

## Decision Log

### トグルの表示条件
- **Discussion**: 現在の実装では `(P)` マーカーのあるタスクがある場合のみトグルが表示される。ユーザーは常に表示を希望。
- **Conclusion**: `(P)` タスクの有無に関係なく、トグルを常に表示する
- **Rationale**: 実行コマンド（`spec-impl` vs `spec-auto-impl`）の選択はタスクの `(P)` マーカーとは独立した概念であり、ユーザーが明示的に選択できるべき

### トグルの意味付け
- **Discussion**: 現在は「並列タスクを並列実行するかどうか」というフラグ。ユーザーは「実行コマンドの選択」として使いたい。
- **Conclusion**: トグルは `spec-impl`（Sequential）と `spec-auto-impl`（Parallel）のどちらを使うかのスイッチとする
- **Rationale**: `spec-auto-impl` は並列バッチ実行を行う自律的なコマンドであり、`spec-impl` は順次実行。この選択はユーザーの制御下に置くべき

### 設定の永続化
- **Discussion**: UIの一時状態か、spec.json に保存か
- **Conclusion**: `spec.json` の `impl.mode` フィールドに保存
- **Rationale**: 自動実行時にも設定を参照する必要があり、Spec単位での永続化が必要

### デフォルト値
- **Discussion**: 新規Specや既存Specで設定がない場合のデフォルト
- **Conclusion**: `'sequential'`（OFF）をデフォルトとする
- **Rationale**: 従来の `spec-impl` の動作を維持し、意図的に並列実行を選択する形にする

### 自動実行での設定反映
- **Discussion**: 現在の自動実行は `spec-auto-impl` が固定で使用される
- **Conclusion**: 自動実行時も `impl.mode` 設定を尊重する
- **Rationale**: 手動実行と自動実行で動作が異なるのは一貫性がない

### UIアイコン
- **Discussion**: 現在は並列タスク数を表示。意味が変わるためラベル変更が必要
- **Conclusion**: Single / Parallel がわかるアイコンに変更
- **Rationale**: コマンド選択の意味を直感的に伝える

## Introduction

実装フェーズの実行モード（Sequential / Parallel）を選択するトグルを常に表示し、手動実行・自動実行の両方でこの設定を尊重するようにする機能。`spec.json` の `impl.mode` フィールドで設定を永続化し、UIとバックエンドで一貫した動作を実現する。

## Requirements

### Requirement 1: spec.json スキーマ拡張

**Objective:** Spec開発者として、実装モードの設定をSpec単位で永続化したい。

#### Acceptance Criteria
1. `spec.json` に `impl` オブジェクトを追加できること
2. `impl.mode` フィールドが `'sequential'` または `'parallel'` の値を持てること
3. フィールドが存在しない場合、デフォルト値 `'sequential'` として扱われること

### Requirement 2: UI トグル常時表示

**Objective:** ユーザーとして、`(P)` タスクの有無に関係なく実行モードを選択したい。

#### Acceptance Criteria
1. ImplPhasePanel に実行モードトグルが常に表示されること
2. トグルは Single / Parallel がわかるアイコンで表示されること
3. 現在の設定状態（Sequential / Parallel）が視覚的に明確であること
4. トグルクリックで `spec.json` の `impl.mode` が更新されること

### Requirement 3: 手動実行でのモード反映

**Objective:** ユーザーとして、手動で実装ボタンを押した際にトグル設定に応じたコマンドが実行されてほしい。

#### Acceptance Criteria
1. `impl.mode === 'sequential'` の場合、`/kiro:spec-impl` が実行されること
2. `impl.mode === 'parallel'` の場合、`/kiro:spec-auto-impl` が実行されること
3. 設定が存在しない場合、デフォルト動作として `spec-impl` が実行されること

### Requirement 4: 自動実行でのモード反映

**Objective:** ユーザーとして、自動実行時もトグル設定が尊重されてほしい。

#### Acceptance Criteria
1. AutoExecutionCoordinator の `execute-next-phase` イベントで `impl` フェーズ実行時、`spec.json` の `impl.mode` を読み取ること
2. `impl.mode === 'sequential'` の場合、`type: 'impl'` で実行されること（`spec-impl`）
3. `impl.mode === 'parallel'` の場合、`type: 'auto-impl'` で実行されること（`spec-auto-impl`）
4. 設定が存在しない場合、デフォルト動作として `type: 'impl'` が実行されること

### Requirement 5: 既存 ParallelModeToggle コンポーネントの変更

**Objective:** 開発者として、既存コンポーネントを新しい要件に適合させたい。

#### Acceptance Criteria
1. `hasParallelTasks` による条件付きレンダリングを削除すること
2. アイコンを Single / Parallel を示すものに変更すること
3. コンポーネント名を維持し、props インターフェースを簡素化すること
4. `parallelTaskCount` props を削除（または optional にして非表示）すること

### Requirement 6: Remote UI 対応

**Objective:** モバイルUIからも実行モードを変更できること。

#### Acceptance Criteria
1. Remote UI の ImplPhasePanel でもトグルが表示されること
2. WebSocket 経由で `impl.mode` の変更が同期されること

## Out of Scope

- `spec-impl` / `spec-auto-impl` コマンド自体の変更
- タスクの `(P)` マーカーの解釈や並列グルーピングロジックの変更
- `spec.json` の他のフィールドへの影響

## Open Questions

- アイコンの具体的なデザイン（lucide-react の既存アイコンで適切なものがあるか、カスタムSVGが必要か）
