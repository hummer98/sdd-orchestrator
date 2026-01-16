# Electron IPC契約不整合の解決策とアーキテクチャ提案 (AI実装・テスト容易性重視)

## 1. 再評価の前提
AIエージェントによる自律実装を前提とする場合、評価基準は「人間にとっての書きやすさ」から以下のようにシフトします。

1.  **コンテキスト完結性 (Single Source of Truth)**:
    *   定義が分散していると、AIが一部のファイル修正を忘れるリスクが高まる。定義と実装が物理的に近い、あるいは単一のスキーマから自動導出される構成が望ましい。
2.  **構造的ガードレール**:
    *   「任意の引数を渡せる」柔軟性よりも、「スキーマ通りに書かないと動かない」制約がある方が、AIによる幻覚（Hallucination）や契約違反を防げる。
3.  **テスト容易性 (Testability without Mocking)**:
    *   Electronのモック（`ipcMain`, `ipcRenderer`）は複雑になりがちで、AIが誤ったモックを作成するリスクがある。
    *   Electron依存を排除して、ビジネスロジック単体としてテストできる構造が理想的。

## 2. アプローチの再評価

### A案: Manual Typed Wrappers (手動型定義ラッパー)
*   **AI実装適性**: △
    *   `shared/types.ts`, `main.ts`, `preload.ts` の3ファイルを常に同期させる必要があり、AIのコンテキスト負荷が高い。
    *   型定義と実装の乖離が起きても、実行するまで気づきにくい（`as any` 等で逃げがち）。
*   **テスト容易性**: △
    *   依然として `ipcMain.handle` のモックが必要。
    *   「正しく呼び出せたか」のテストになりがちで、ロジックのテストと通信のテストが混ざる。

### B案: electron-trpc (tRPC Adapter)
*   **AI実装適性**: ◎
    *   **コード＝スキーマ**: ルーター定義そのものがAPI仕様となるため、AIは「ルーターの実装」だけに集中すればよい。
    *   **型推論の自動化**: クライアント側の型定義を生成する必要がないため、ファイル操作の手数が減り、不整合が物理的に起きない。
*   **テスト容易性**: ◎
    *   **Electron不要**: tRPCのプロシージャ（関数）は、Electronがなくても単体テストが可能。
    *   `const caller = appRouter.createCaller({});` で直接ロジックをテストでき、カバレッジを稼ぎやすい。

### C案: Schema-First Architecture (Zod + Custom Bridge)
`electron-trpc` を導入せず、Zodスキーマを正として、そこから型とバリデーションを強制する「自作の軽量tRPC」のような構成。

*   **AI実装適性**: ◯
    *   Zodスキーマさえ定義させれば、あとは型エラーに従って実装するよう指示できる。
    *   バリデーション（`input.parse`）が強制されるため、堅牢なコードをAIに生成させやすい。
*   **テスト容易性**: ◯
    *   ハンドラ関数を `(input) => output` という純粋関数として切り出しやすく、テストしやすい。

---

## 3. 結論：AI時代における推奨構成

**結論: B案「electron-trpc」の採用、またはC案「Schema-First」への移行を推奨します。**

従来の「A案（Manual Wrapper）」は、人間が注意深くメンテするには良いですが、AIに「空気を読んで3ファイルを同期させる」ことを期待するのは不安定です。**「スキーマを書けば、あとは型システムがAIを導く」** 構成にするのがベストです。

### 推奨：electron-trpc の採用
既存プロジェクトへの導入コストはありますが、今後のAIによる保守・拡張を考えると、最もリターンが大きいです。

#### 理由
1.  **テストカバレッジの爆発的向上**:
    *   IPCハンドラの中身を「普通の非同期関数」としてテストできるため、`jest` や `vitest` で簡単にカバレッジを100%に近づけられる。
2.  **AIへの指示が単純化**:
    *   「`bugWorktree` ルーターに `create` プロシージャを追加して」と指示するだけで、型・バリデーション・実装がセットで生成される。
3.  **入力検証の強制**:
    *   Zodの使用が前提となるため、AIが「入力チェックを忘れる」というミスをシステム的に防げる。

---

## 4. 実装ロードマップ (electron-trpc 導入)

AIエージェントに段階的に移行させるためのステップです。

### Step 1: 基盤セットアップ
*   `electron-trpc` と `zod` をインストール。
*   Mainプロセスに `src/main/trpc.ts` (ルーター) を作成。
*   RendererプロセスからtRPCクライアントを使えるようにセットアップ。

### Step 2: 既存IPCの移行 (1つずつ)
AIに対して以下のテンプレートで指示を出します。

> **Prompt Example:**
> 「既存の `BUG_WORKTREE_CREATE` IPCを tRPC の `bugWorktree.create` プロシージャに移行してください。
> 1. 入力は Zod で `{ bugName: z.string() }` と定義すること。
> 2. ロジックは既存の `handleBugWorktreeCreate` を再利用すること。
> 3. 元の `ipcMain.handle` は削除すること。
> 4. `preload.ts` の古い定義も削除すること。」

### Step 3: テストの追加
移行したプロシージャに対して、Electronを起動しない単体テストを追加させます。

```typescript
// src/main/routers/bugWorktree.test.ts
import { appRouter } from './router';

test('create worktree', async () => {
  const caller = appRouter.createCaller({});
  // Electronの起動なしでロジックを検証！
  const result = await caller.bugWorktree.create({ bugName: 'test-bug' });
  expect(result.ok).toBe(true);
});
```

この構成により、「IPC契約不整合」は構造的に発生し得なくなり、かつテストカバレッジも自然と向上します。