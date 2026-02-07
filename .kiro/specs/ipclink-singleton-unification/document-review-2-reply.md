# Response to Document Review #2

**Feature**: ipclink-singleton-unification
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 0            | 2             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Warnings

### W1: Open Question の API 名不正確（`createTRPCClientProxy` → `createTRPCProxyClient`）

**Issue**: requirements.md の Open Question と Decision Log で使用されている `createTRPCClientProxy` は `@trpc/client` に存在しない名前であり、正しくは `createTRPCProxyClient` である。また、Decision Log の「既存 TRPCClient をラップ可能」の前提が技術的に正確か未検証。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

レビューの指摘は**誤り**。`createTRPCClientProxy` は `@trpc/client` パッケージに**実際に存在する**。

`node_modules/@trpc/client/dist/createTRPCClientProxy.d.ts` の型定義:

```typescript
/**
 * @deprecated use `createTRPCProxyClient` instead
 * @internal
 */
export declare function createTRPCClientProxy<TRouter extends AnyRouter>(
  client: TRPCClient<TRouter>
): CreateTRPCProxyClient<TRouter>;

export declare function createTRPCProxyClient<TRouter extends AnyRouter>(
  opts: CreateTRPCClientOptions<TRouter>
): CreateTRPCProxyClient<TRouter>;
```

2つの異なる API が存在する:

| API | 引数 | 用途 |
|-----|------|------|
| `createTRPCClientProxy` (deprecated) | `client: TRPCClient<TRouter>` | **既存の TRPCClient インスタンスをラップ**して proxy を返す |
| `createTRPCProxyClient` | `opts: CreateTRPCClientOptions<TRouter>` | `links` 配列を受け取って**新規クライアントを作成** |

requirements.md の Decision Log では「内部実装を React client の underlying TRPCClient を `createTRPCClientProxy` でラップする方式に変更する」と記述しており、これは**技術的に正確**。`trpc.createClient()` が返す内部 `TRPCClient` を `createTRPCClientProxy` に渡すことで、追加の `ipcLink()` 呼び出しなしに proxy API を提供できる。

ただし、`createTRPCClientProxy` は deprecated (@internal) であるため、design フェーズでは代替方式も検討する価値がある。Open Question はその検証のために残されているものであり、現状の記述で適切。

### W2: steering 更新対象に `structure.md` が含まれていない

**Issue**: 要件4 の Acceptance Criteria は `tech.md` と `logging.md` のみを対象としているが、`structure.md` にも vanillaClient パターンの記述（L342-353）があり、更新が必要になる可能性がある。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

`structure.md` L342-353 の記述:
```typescript
// Zustand storeなどReact外からのtRPC呼び出し
import { getVanillaClient } from '@shared/trpc/vanillaClient';
const store = create((set) => ({
  loadData: async () => {
    const data = await getVanillaClient().config.getRecentProjects.query();
    set({ data });
  }
}));
```

この記述は `getVanillaClient()` の**使用パターン**を示すものであり、API は要件1-3「既存の API シグネチャを維持」により変更されない。内部実装が変わっても使用パターンは同一のため、`structure.md` の更新は不要。

レビュー自身も「変更不要の可能性が高い」と述べており、design フェーズで確認する推奨に留まっている。これは design フェーズの通常の設計判断の範囲であり、requirements.md への追記は不要。

---

## Response to Info (Low Priority)

| #    | Issue                               | Judgment      | Reason |
| ---- | ----------------------------------- | ------------- | ------ |
| I1   | Decision Log の「前セッションで native 方式を追加」の記述精度 | Fix Required ✅ | main 取り込み後 `main/index.ts:228-235` に E2E 限定の `console-message` リスナーが存在することを確認。「存在しない」ではなく「E2E 限定で実装済み」が正確。Decision Log の記述を「E2E 限定で console-message リスナーを追加した経緯がある」に修正し、要件3の目的（E2E 限定解除・全環境有効化）をより明確にする |
| I2   | E2E テストのログキャプチャ影響評価  | No Fix Needed ❌ | レビュー#1 から引き継ぎ。tasks フェーズで対応可能 |
| I3   | 要件3-3 の「DEBUG (0)」を「verbose/DEBUG (0)」に修正 | No Fix Needed ❌ | Electron 公式仕様の level 0 は "verbose" だが、現在の実装 `main/index.ts:229` でも `{ 0: 'DEBUG' }` とマッピングしている。実装と要件が一致しており、混乱はない。design フェーズでマッピング定義を確定すればよい |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `requirements.md` | Decision Log「Renderer console ログ転送方式の統一」の Discussion を main 取り込み後の現状に合わせて修正（console-message リスナーの存在を反映） |

---

## Conclusion

WARNING-1 は `createTRPCClientProxy` が `@trpc/client` に実際に存在する deprecated API であることを確認し、No Fix Needed と判定。WARNING-2 は API 互換維持の方針により `structure.md` 更新は不要と判定。

INFO-1 のみ Fix Required とし、Decision Log の記述を main 取り込み後の実態に合わせて修正する。全体として requirements.md の品質に重大な問題はなく、design フェーズへの進行に支障はない。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `requirements.md` | Decision Log「Renderer console ログ転送方式の統一」の Discussion を修正 |

### Details

#### requirements.md

**Issue(s) Addressed**: I1

**Changes**:
- Decision Log の「前セッションで native 方式を追加した経緯がある」を「前セッションで E2E 限定の `console-message` リスナーを `main/index.ts` に追加した経緯がある（`isE2ETest` ガード付き）」に修正
- 「（E2E のみ）」の補足を削除し、現状のコードに即した記述に変更

**Diff Summary**:
```diff
-- **Discussion**: 2つの転送メカニズムが併存。(1) `consoleHook.ts`: Renderer 側で `console.*` を monkey-patch し、`getVanillaClient()` 経由の tRPC mutation で Main に送信（dev/E2E のみ、production build では無効）。(2) `webContents.on('console-message')`: Main 側の Electron native API でキャプチャ（E2E のみ）。consoleHook は vanillaClient に依存しており、production build では無効化されるため E2E では機能せず、前セッションで native 方式を追加した経緯がある。
+- **Discussion**: 2つの転送メカニズムが併存。(1) `consoleHook.ts`: Renderer 側で `console.*` を monkey-patch し、`getVanillaClient()` 経由の tRPC mutation で Main に送信（dev/E2E のみ、production build では無効）。(2) `webContents.on('console-message')`: Main 側の Electron native API でキャプチャ。consoleHook は vanillaClient に依存しており、production build では無効化されるため E2E では機能せず、前セッションで E2E 限定の `console-message` リスナーを `main/index.ts` に追加した経緯がある（`isE2ETest` ガード付き）。
```

---

_Fixes applied by document-review-reply command._
