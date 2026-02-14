# Research & Design Decisions: Zustand Selector Optimization

## Summary

- **Feature**: `zustand-selector-optimization`
- **Discovery Scope**: Extension（既存システムの内部最適化）
- **Key Findings**:
  - Zustand v5では`useShallow`が`zustand/shallow`および`zustand/react/shallow`の両パスから利用可能。React専用フックのため`zustand/react/shallow`が意味的に正確
  - プロジェクト内で既にセレクターパターンを使用している箇所（`useSharedAgentStore((state) => state.agents)`等）が存在し、統一パターンの基盤がある
  - `React.memo`は現在プロジェクト内で一切使用されていない。リストアイテム5コンポーネントへの初導入となる

## Research Log

### Zustand v5における`useShallow`のインポートパス

- **Context**: requirements.mdでは`zustand/react/shallow`を指定しているが、v5の公式ドキュメントでは`zustand/shallow`が案内されている。どちらが正しいか調査
- **Sources Consulted**:
  - [Zustand v5 Migration Guide](https://zustand.docs.pmnd.rs/migrations/migrating-to-v5)
  - [Announcing Zustand v5](https://pmnd.rs/blog/announcing-zustand-v5)
  - `node_modules/zustand/shallow.d.ts`（実ファイル確認）
- **Findings**:
  - `zustand/shallow`は`zustand/react/shallow`から`useShallow`を、`zustand/vanilla/shallow`から`shallow`ユーティリティを再エクスポートするバレルモジュール
  - `zustand/react/shallow`はReactの`useRef`を使用するフック実装。`zustand/vanilla/shallow`はpure shallow比較関数
  - 両パスとも正常に動作する。`zustand/react/shallow`はReact依存を明示するセマンティック上の利点がある
- **Implications**: requirements.mdの指定通り`zustand/react/shallow`を採用。プロジェクト内での統一が重要

### 既存コードベースにおけるセレクター使用状況

- **Context**: どの程度のコンポーネントが既にセレクターパターンを使用しているか把握
- **Sources Consulted**: `electron-sdd-manager/src/`配下のgrep調査
- **Findings**:
  - **セレクターなし全購読**: 24+箇所（`useStore()`パターン）
  - **セレクター使用済み**: `useSharedAgentStore((state) => state.agents)`が3箇所（SpecsView, BugsView, BugList）- zustand-agent-selector-hooks specで導入済み
  - `useShallow`の使用: 0箇所（未導入）
  - `React.memo`の使用: 0箇所（未導入）
  - `subscribeWithSelector`ミドルウェア: agentStore, specStoreFacadeで使用中（ストア定義側。コンポーネント側のセレクターとは独立）
- **Implications**: セレクターパターンの部分的な先行導入があり、残りのコンポーネントに同じパターンを統一適用する作業。完全な新規導入ではない

### Zustand v5でのアクション関数の参照安定性

- **Context**: アクション関数をセレクター化対象外としてよいか
- **Sources Consulted**:
  - [Best practices on using selectors in v5 (Discussion #2867)](https://github.com/pmndrs/zustand/discussions/2867)
  - Zustandソースコード
- **Findings**:
  - Zustandの`create`で定義されたアクション関数は、`set`クロージャに束縛された関数参照であり、ストアの生存期間中は変更されない
  - `useStore()`で全stateを購読しても、stateの変更時にアクション関数の参照は変わらない
  - ただし`const { stateField, action } = useStore()`のように混在取得すると、`stateField`の変更で再レンダリングが発生する（全購読のため）
  - アクション*のみ*を取得する場合（`const { action1, action2 } = useStore()`）でも、`useStore()`はセレクターなし全購読であるため、stateの変更で**コンポーネント関数の再実行がトリガーされる**（`useSyncExternalStore`の`getSnapshot`がstateオブジェクト全体の参照変更を検知するため）。ただし、React 19のbailoutにより仮想DOMの差分が空であれば実DOMの更新はスキップされるため、パフォーマンス影響は限定的
- **Implications**: アクションのみ使用するコンポーネントは既存の分割代入を維持可能。ただし、stateフィールドとアクションを混在取得するパターンではセレクターが必要

### React.memoとZustand immutable updateの相互作用

- **Context**: React.memoのshallow比較がZustandのデータオブジェクトで正しく機能するか
- **Sources Consulted**: React公式ドキュメント、Zustandの状態更新パターン
- **Findings**:
  - ZustandのimmutableUpdate（`set({ bugs: [...state.bugs, newBug] })`）は新しい配列参照を生成するため、React.memoは変更を正しく検知する
  - 個別のbugオブジェクトは、内容が変更されていなければ同一参照を維持する（新しい配列でも要素の参照は同じ）
  - `BugListItem`に渡される`bug`propは個別オブジェクトであり、そのbugが更新されない限り参照は安定
  - `isSelected`はboolean primitiveであり、shallow比較で正確
- **Implications**: Zustandの標準的な状態更新パターンを使用している限り、React.memoのshallow比較は正しく機能する。カスタム比較関数は不要

### インラインコールバック排除の実装戦略

- **Context**: `onSelect={() => handler(item)}`パターンの排除方法
- **Sources Consulted**: 既存コードの分析（BugListContainer, SpecListContainer）
- **Findings**:
  - **BugListItem**: 既に`onSelect: () => void`シグネチャ。親コンテナが`onSelectBug={() => handleSelect(bug)}`で渡している
  - **SpecListItem**: 同様に`onSelect: () => void`シグネチャ
  - **排除方法1**: `onSelect: (id: string) => void`に変更し、アイテム内部で`onClick={() => onSelect(bug.name)}`。親は単一の`handleSelect`を`useCallback`で渡す
  - **排除方法2**: 親で`useCallback`を使い、各アイテム用にメモ化されたコールバックを生成（ただしアイテム数分のuseCallbackは非実用的）
  - **排除方法3**: 現行の`onSelect: () => void`を維持しつつ、親コンテナの`.map()`内で生成されるクロージャの安定化は困難。`React.memo`のカスタム比較関数で`onSelect`を除外する方法もあるが複雑
  - **推奨**: `onSelect: (id: string) => void`パターンへの変更が最もクリーン。propsインターフェースの小変更だが、内部呼び出しで吸収可能
- **Implications**: ListItemのpropsに`onSelect: (id: string) => void`パターンを採用する場合、BugListContainer/SpecListContainer等のコールバック渡し方も更新が必要。ただし外部のpublicインターフェースには影響なし（Container内部のマッピングロジック変更のみ）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 全て個別セレクター | 各フィールドを`useStore(s => s.field)`で取得 | 最も粒度が細かい、不要な再レンダリングを完全排除 | フィールド数が多い場合にコード冗長化 | 1-2フィールド向け |
| 全てuseShallow | `useShallow(s => ({...}))`で複数フィールドをまとめて取得 | コード簡潔、shallow比較で十分な精度 | 1フィールドではオーバーヘッド | 3+フィールド向け |
| 併用（採用） | フィールド数に応じて使い分け | バランス良好、可読性と精度の両立 | 基準の教育コスト | requirements.mdのDecision Logで合意 |

## Design Decisions

### Decision: セレクター適用の段階的戦略

- **Context**: 24+コンポーネントを一括で修正するか、段階的に進めるか
- **Alternatives Considered**:
  1. 一括修正: 全コンポーネントを一度に変更
  2. ストアごとに段階的: useProjectStore → useSpecStore → ... の順に修正
  3. 影響度順: App.tsx（最も購読が多い）を最初に修正
- **Selected Approach**: ストアごとの段階的修正
- **Rationale (Why)**:
  - 各ストアに対する変更を独立してテスト可能
  - 一つのストアの修正で問題が発生しても他に波及しない
  - タスク分割が自然で並列作業に適する
- **Trade-offs**: 一括修正より完了まで時間がかかるが、リスクが低い
- **Follow-up**: 各ストアの修正完了後にE2Eテストを実行し、リグレッションを早期検知

### Decision: テストモック更新戦略

- **Context**: セレクター付き`useStore(selector)`への変更で、既存テストのモックが壊れる可能性
- **Alternatives Considered**:
  1. 各テストファイルで個別にモック更新
  2. 共通のモックユーティリティを作成
  3. Zustandの実モックパターン（`create`のモック）を使用
- **Selected Approach**: Zustandの標準的なモックパターンを適用。セレクター対応のモック実装
- **Rationale (Why)**:
  - `vi.mock`でモジュールをモックし、セレクター関数をstateに適用して返すパターンが最も堅牢
  - 既存テストの多くは`renderHook`や`vi.mock`ベースであり、互換性が高い
- **Trade-offs**: 一部のテストファイルでモックのリファクタリングが必要
- **Follow-up**: モック更新が必要なテストファイルの特定と修正

## Risks & Mitigations

- **Risk 1**: テストモックの大量更新が必要 - **Mitigation**: セレクター対応のモックユーティリティを共通化し、パターンを統一
- **Risk 2**: useShallowの浅い比較で不十分なケース - **Mitigation**: Zustandのstateオブジェクトは全てプリミティブまたはimmutableな参照のため、shallow比較で充足。ネストされたオブジェクトの部分更新パターンは存在しない
- **Risk 3**: React.memoが期待通りに機能しない（unstable props） - **Mitigation**: インラインコールバック排除を徹底し、親コンポーネントのprops安定性を保証

## References

- [Zustand v5 Migration Guide](https://zustand.docs.pmnd.rs/migrations/migrating-to-v5) - useShallow import path, v5 breaking changes
- [Best practices on using selectors in v5 (GitHub Discussion)](https://github.com/pmndrs/zustand/discussions/2867) - selector patterns, action stability
- [Announcing Zustand v5](https://pmnd.rs/blog/announcing-zustand-v5) - v5 design philosophy, Object.is comparison default
