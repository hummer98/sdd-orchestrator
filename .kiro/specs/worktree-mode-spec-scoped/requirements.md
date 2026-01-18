# Requirements: Worktree Mode Spec-Scoped

## Decision Log

### データソースの選択
- **Discussion**: worktreeモードのチェックボックス状態をどこで管理するか。現状はグローバルな`workflowStore`で揮発性管理されており、Spec切り替え時に状態が共有されてしまう問題がある。
- **Conclusion**: `spec.json`をSSOT（Single Source of Truth）とする
- **Rationale**: Spec単位の設定は`spec.json`に保存する設計原則に従う。永続化され、Spec切り替え時に正しく読み込まれる。

### フィールド設計
- **Discussion**: `WorktreeConfig`にどのようなフィールドを追加するか。
- **Conclusion**: `enabled?: boolean`をoptionalフィールドとして追加
- **Rationale**: 後方互換性を維持。既存の`spec.json`は変更不要で、`undefined`は`false`として扱う。

### 既存Specの移行
- **Discussion**: 既存の`spec.json`に`worktree.enabled`がない場合の挙動。
- **Conclusion**: 未定義 = `false`扱い
- **Rationale**: 既に`hasWorktreePath`がtrueなら強制的にworktreeモードになるロジックがあるため、明示的にOnにするまでOffで問題ない。

### テンプレート変更
- **Discussion**: `init.json`テンプレートに`worktree`フィールドを追加すべきか。
- **Conclusion**: 追加しない
- **Rationale**: `worktree`フィールドはoptional設計。ユーザーが選択した時点で初めて追加される。

### hasWorktreePathの使い分け
- **Discussion**: `enabled`と`hasWorktreePath`のどちらを参照すべきか。
- **Conclusion**: UI表示（チェックボックス状態）には`enabled`、実際のworktreeディレクトリ操作には`hasWorktreePath`
- **Rationale**: 目的が異なる。`enabled`はユーザーの意図、`hasWorktreePath`は実際のファイルシステム状態。

## Introduction

worktreeモードのチェックボックス状態がグローバルストアで管理されているため、あるSpecでOnにすると他のSpecでもOnに見える問題を修正する。`spec.json`をSSOTとし、Spec単位で状態を永続化する。

## Requirements

### Requirement 1: 型定義の拡張

**Objective:** 開発者として、`WorktreeConfig`にworktreeモード選択状態を保存できるようにしたい。これにより、Spec単位でworktreeモードの設定を永続化できる。

#### Acceptance Criteria
1. `WorktreeConfig`インターフェースに`enabled?: boolean`フィールドが追加されている
2. `enabled`フィールドはoptionalであり、既存の`spec.json`との後方互換性が維持される
3. `isWorktreeConfig`型ガードは`enabled`フィールドの有無に関わらず正しく動作する

### Requirement 2: チェックボックス状態の永続化

**Objective:** ユーザーとして、worktreeモードのチェックボックスをOnにしたとき、その設定がSpec単位で保存されるようにしたい。これにより、Specを切り替えても正しい状態が表示される。

#### Acceptance Criteria
1. チェックボックスをOn/Offに変更したとき、`spec.json`の`worktree.enabled`フィールドが更新される
2. `spec.json`の更新は`window.electronAPI.updateSpecJson`を使用する
3. 更新後、UIが即座に反映される（ファイルウォッチャー経由）

### Requirement 3: チェックボックス状態の読み込み

**Objective:** ユーザーとして、Specを選択したとき、そのSpecのworktreeモード設定が正しく表示されるようにしたい。

#### Acceptance Criteria
1. `isWorktreeModeSelected`の判定ロジックが`spec.json.worktree.enabled`を参照する
2. `hasWorktreePath`がtrueの場合は`enabled`に関わらず強制的にworktreeモードとなる
3. `worktree.enabled`が`undefined`または`false`の場合、チェックボックスはOffで表示される

### Requirement 4: グローバルストアのクリーンアップ

**Objective:** 開発者として、不要になったグローバルストアの状態とアクションを削除したい。これにより、コードの保守性が向上する。

#### Acceptance Criteria
1. `workflowStore.worktreeModeSelection`状態が削除される
2. `workflowStore.setWorktreeModeSelection`アクションが削除される
3. `workflowStore.resetWorktreeModeSelection`アクションが削除される
4. `WorktreeModeSelection`型が削除される
5. 関連するテストコードが削除または更新される

### Requirement 5: worktreeフィールド初期化

**Objective:** ユーザーとして、worktreeモードを初めて選択したとき、適切に`worktree`オブジェクトが初期化されるようにしたい。

#### Acceptance Criteria
1. `spec.json`に`worktree`フィールドが存在しない状態でチェックボックスをOnにした場合、`{ enabled: true }`が設定される
2. 既存の`worktree`オブジェクトがある場合、`enabled`フィールドのみが更新され、他のフィールド（`path`, `branch`, `created_at`）は保持される

## Out of Scope

- `init.json`テンプレートの変更
- `hasWorktreePath`を使用している既存コードの変更
- Bug/Spec以外のworktreeモード管理（Bugは別の`BugWorktreeConfig`を使用）

## Open Questions

- なし（設計フェーズで詳細を決定）
