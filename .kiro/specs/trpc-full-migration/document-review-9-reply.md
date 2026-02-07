# Response to Document Review #9

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 1            | 1             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Critical Issues

### C1: design.mdにvanillaClient（Zustand Store用命令的tRPCクライアント）の設計決定が未記載

**Issue**: design.mdの「Renderer / Migration Layer」セクション（DD-005）ではStore内の移行を「tRPC mutation/queryの結果で置換」と抽象的に記載しているが、実装では`shared/trpc/vanillaClient.ts`（`createTRPCProxyClient<AppRouter>`）を使用する具体的なパターンが確立されている。この技術的決定がdesign.mdに反映されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `shared/trpc/vanillaClient.ts`（行14-35）: `createTRPCProxyClient<AppRouter>`を使用したシングルトンクライアントが実装済み。`ipcLink()`をdynamic requireで遅延ロードし、Remote UIバンドルへの混入を回避している。
- design.md 行483-488: 「Store内の`window.electronAPI.*`呼び出し → tRPC mutation/queryの結果で置換」とのみ記載。vanillaClientの存在、Reactフックがコンポーネント外で使用不可であることへの対処方法が未記載。
- 今後のTask 4以降（projectStore, specStore等）でも同パターンが必要であり、設計文書への反映は重要。

**Action Items**:
- design.md「Renderer / Migration Layer」セクションにvanillaClientパターンを追記する
  - `shared/trpc/vanillaClient.ts`のコンポーネント定義
  - Reactフック vs vanillaClientの使い分けルール（コンポーネント内 → `trpc.*.useQuery/useMutation`、Store内 → `getVanillaClient()`）
  - シングルトンパターンの理由（ipcLinkの再利用）
  - Electron専用（Remote UI非対応）である旨の明記
  - DD-005の移行手順を更新しvanillaClientパターンを明記

---

### C2: Task 3.3（configHandlers.ts削除と統合テスト）がtasks.mdで未完了`[ ]`だが、実装は完了済み

**Issue**: レビューでは tasks.md の Task 3.3 が `[ ]`（未完了）のままだが git status では configHandlers.ts が削除済み、config-router.test.ts が作成済みでステータスが乖離していると指摘。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- tasks.md 行61: `- [x] 3.3 configHandlers.tsの削除と統合テスト` — 実際には既に `[x]`（完了済み）としてマークされている。
- `configHandlers.ts` は git status で削除済み（`D electron-sdd-manager/src/main/ipc/configHandlers.ts`）。
- `config-router.test.ts` は新規作成済み（`?? electron-sdd-manager/src/main/trpc/__tests__/config-router.test.ts`）。
- **レビュー#9はtasks.mdの内容を誤認している**。Task 3.3は正しく完了マーク済みであり、実装状況と一致している。

---

## Response to Warnings

### W1: design.md Components and InterfacesにReactフック層（useConfigTrpc, useSystemInfo）が未記載

**Issue**: `shared/hooks/useConfigTrpc.ts`（useRecentProjects, useLayoutConfig, useRemoteUiAutoStart）および`shared/hooks/useSystemInfo.ts`がTask 2.2, 3.2で新規作成されたが、design.md Components and Interfacesテーブルに記載がない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `shared/hooks/useConfigTrpc.ts`（138行）: 3つのReactフック（useRecentProjects, useLayoutConfig, useRemoteUiAutoStart）が実装済み。
- `shared/hooks/useSystemInfo.ts`（63行）: useSystemInfoフックが実装済み。
- design.md 行213-232: Components and Interfacesテーブルにはメインプロセス側ルーターのみ列挙されており、Renderer/Shared側のフック層の記載がない。

**Action Items**:
- design.md Components and InterfacesテーブルにRenderer/Shared Hooks Layerとして以下を追加:
  - `vanillaClient` | Shared/Client | Zustand Store用命令的tRPCクライアント | 全要件 | ipcLink (P0) | Service
  - `useSystemInfo` | Shared/Hooks | システム情報取得フック | 1 | trpc.system.* (P0) | Hook
  - `useConfigTrpc` | Shared/Hooks | Config操作フック群 | 2 | trpc.config.* (P0) | Hook
- 命名規則（`use{Domain}Trpc`、`useSystemInfo`等）と配置先（`shared/hooks/`）を記載

---

### W2: vanillaClientのライフサイクル管理（シングルトン、dynamic require、cleanup）が設計文書に未記載

**Issue**: vanillaClientはシングルトンパターンで`ipcLink()`を使用しているが、ライフサイクル管理やRemote UI非対応の制約が設計文書に記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `shared/trpc/vanillaClient.ts` 行19-34: シングルトンパターンでvanillaClientを生成。`resetVanillaClient()`はテスト用に提供。
- 行27-29: `require('electron-trpc/renderer')`をdynamic requireで取得しており、Remote UIバンドルには含まれない設計。
- BrowserWindowクローズ時のcleanup: electron-trpcのipcLink内部でIPC接続が管理されるため、明示的なcleanupは不要と推測されるが、これが設計文書に記載されていない。

**Action Items**:
- C1のvanillaClientセクション追記に含めて、以下を記載:
  - シングルトンパターンの理由（ipcLinkの再利用、接続の効率化）
  - dynamic requireの理由（Remote UIバンドルへの混入回避）
  - Electron専用であり Remote UI からは利用不可
  - BrowserWindowクローズ時はelectron-trpc内部のIPC管理に委譲

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | tech.mdのIPC設計パターンがレガシー記述のまま | No Fix Needed ❌ | Task 13.1で更新予定。移行中間状態での更新は二重管理のリスクがあり、全移行完了後の一括更新が適切 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | (1) Components and InterfacesテーブルにvanillaClient, useSystemInfo, useConfigTrpcを追加 (2) 「Renderer / Migration Layer」セクションにvanillaClientパターンの詳細（シングルトン設計、使い分けルール、Remote UI非対応、ライフサイクル）を追記 (3) DD-005の移行手順を更新しStore→vanillaClient、コンポーネント→Reactフックの2パターンを明記 |

---

## Conclusion

レビュー#9の5件の指摘のうち、3件（C1, W1, W2）がFix Requiredと判断された。C2についてはtasks.mdの内容をレビューが誤認しており、実際にはTask 3.3は`[x]`完了済みであるためNo Fix Neededとした。

修正はすべてdesign.mdへの追記であり、vanillaClientパターンの設計文書化とReactフック層のコンポーネント定義追加が主な内容である。

`--fix`オプションで修正を適用できます。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | (1) Components and InterfacesテーブルにvanillaClient, useSystemInfo, useConfigTrpcを追加 (2) 「Renderer / Migration Layer」にvanillaClientセクション新設（シングルトン設計、使い分けルール、ライフサイクル管理、フック層）(3) DD-005のIpcApiClient段階的廃止手順をvanillaClientパターンに更新 |

### Details

#### design.md

**Issue(s) Addressed**: C1, W1, W2

**Changes**:
- Components and Interfacesテーブルに3行追加: vanillaClient (Shared/Client), useSystemInfo (Shared/Hooks), useConfigTrpc (Shared/Hooks)
- 「Renderer / Migration Layer」セクションに「vanillaClient（Zustand Store用命令的tRPCクライアント）」サブセクションを新設
  - コンポーネント定義（`shared/trpc/vanillaClient.ts`）
  - Reactフック vs vanillaClientの使い分けルール（テーブル形式）
  - シングルトン設計の理由
  - ライフサイクル管理（dynamic require、Electron専用、cleanup委譲）
  - フック層（useSystemInfo, useConfigTrpc）の命名規則と配置先
- IpcApiClient段階的廃止の移行手順を更新（Step 1, 3にvanillaClientパターンを明記）

**Diff Summary**:
```diff
 | miscRouter | Main/Router | その他API（SSH等） | 9 | 各種Service (P0) | Service |
 | Zodスキーマ群 | Main/Schema | 入出力バリデーション | 全要件 | Zod (P0) | - |
+| vanillaClient | Shared/Client | Zustand Store用命令的tRPCクライアント | 全要件 | ipcLink (P0) | Service |
+| useSystemInfo | Shared/Hooks | システム情報取得フック | 1 | trpc.system.* (P0) | Hook |
+| useConfigTrpc | Shared/Hooks | Config操作フック群（useRecentProjects, useLayoutConfig, useRemoteUiAutoStart） | 2 | trpc.config.* (P0) | Hook |
```

```diff
 ### Renderer / Migration Layer

+#### vanillaClient（Zustand Store用命令的tRPCクライアント）
+[新規セクション: コンポーネント定義、使い分けルール、シングルトン設計、ライフサイクル管理、フック層]

 #### IpcApiClient段階的廃止
-1. **Store内の`window.electronAPI.*`呼び出し** → tRPC mutation/queryの結果で置換
+1. **Store内の`window.electronAPI.*`呼び出し** → `getVanillaClient()`経由のtRPC mutation/queryで置換
 2. **コンポーネント内の直接呼び出し** → tRPCフック使用
-3. **IpcApiClient.tsのメソッド** → 呼び出し元をtRPCフックに変更後、メソッド削除
+3. **IpcApiClient.tsのメソッド** → 呼び出し元をtRPCフック or vanillaClientに変更後、メソッド削除
```

---

_Fixes applied by document-review-reply command._
