# テストコードの重複・冗長化に関する調査メモ

## 概要
`electron-sdd-manager` プロジェクト内のテストコードを調査し、重複または冗長と思われる箇所を特定しました。主に `renderer` ディレクトリと `shared` ディレクトリの間で、移行過渡期と思われるコンポーネントやストアの実装重複に伴い、テストコードも重複しています。

## 特定された重複・冗長箇所

### 1. BugListItem コンポーネント
コンポーネント自体が `renderer` と `shared` の両方に存在し、それぞれにほぼ同様のテストが存在します。

*   **Renderer版**: `src/renderer/components/BugListItem.test.tsx`
*   **Shared版**: `src/shared/components/bug/BugListItem.test.tsx`

**詳細**:
`BugListItem.tsx` が両方のディレクトリに存在します。`shared` 版の方が `worktree` 関連のテストケースを含んでおり、より新しい実装と思われますが、`renderer` 版も依然として詳細なテスト（日付フォーマットなど）を保持しています。

### 2. AgentStore (状態管理)
`renderer` 用のストアと `shared` 用のストアが別々に実装されており、テストもそれぞれに存在しますが、テストしているロジック（アクション、ステータス更新など）は重複しています。

*   **Renderer版**: `src/renderer/stores/agentStore.test.ts`
*   **Shared版**: `src/shared/stores/agentStore.test.ts`

**詳細**:
`renderer` 版は `window.electronAPI` を直接使用し、`shared` 版は `ApiClient` 抽象化を使用しています。アーキテクチャ上の移行期間中と思われますが、ロジックのテストとしては機能が重複しています。

### 3. SpecStore (状態管理)
AgentStoreと同様に、`renderer` と `shared` で実装とテストが重複しています。

*   **Renderer版**: `src/renderer/stores/specStore.test.ts`
*   **Shared版**: `src/shared/stores/specStore.test.ts`

**詳細**:
Specリストの取得、選択、フィルタリングなどの基本機能のテストが重複しています。

### 4. AgentList 表示ロジック
`AgentListPanel` (Renderer) 内でリストアイテムのレンダリングロジックが実装されており、そのテストが `AgentListItem` (Shared) のテストと機能的に重複しています。

*   **Panelテスト**: `src/renderer/components/AgentListPanel.test.tsx`
*   **Itemテスト**: `src/shared/components/agent/AgentListItem.test.tsx`

**詳細**:
Rendererの `AgentListPanel` は `shared` の `AgentListItem` コンポーネントを使用せず、独自にリストアイテムを描画しているため、表示やボタン動作（停止・削除）のテストが重複しています。

## 推奨アクション

1.  **Sharedコンポーネントへの統一**: `renderer` 内の重複コンポーネント（`BugListItem`など）を `shared` のものに置き換え、Renderer側の独自実装とテストを削除する。
2.  **Storeの統合**: `renderer` ストアが `shared` ストアを利用するか、完全に移行することで、ロジックとテストの二重管理を解消する。
3.  **UIコンポーネントの利用**: `AgentListPanel` 内のリストアイテム実装を `AgentListItem` (Shared) に置き換える。

これにより、テストコードのメンテナンスコストを削減し、一貫性を向上させることができます。
