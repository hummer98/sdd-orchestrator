# Response to Document Review #1

**Feature**: spec-store-decomposition
**Review Date**: 2026-01-03
**Reply Date**: 2026-01-03

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 5      | 0            | 5             | 0                |

---

## Response to Warnings

### W-1: Facade初期化フローの明確化

**Issue**: useSpecStore Facadeの初期化時、子store/serviceの初期化順序と依存関係の接続タイミングが明示されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
design.mdの「State Composition Pattern」セクション（536-543行）では、Zustandの`subscribeWithSelector`を使用した状態結合パターンが示されている。また「useSpecStore (Composed Facade)」セクション（490-512行）のコード例では、以下の初期化順序が暗黙的に示されている：

```typescript
const useSpecStore = create<SpecStore>((set, get) => {
  // 1. Services initialization
  const syncService = createSpecSyncService();
  const watcherService = createSpecWatcherService();

  // 2. State composition from child stores
  return { /* state and actions */ };
});
```

この記載は実装者にとって十分なガイダンスを提供している。初期化フローの詳細は実装時の判断事項であり、設計ドキュメントで過度に規定すると実装の柔軟性が失われる。

**Action Items**: なし（実装時に必要に応じて判断）

---

### W-2: projectStore変更の確認

**Issue**: 循環依存解消のパターンとしてprojectStoreからSpecListStoreを呼び出すと記載されているが、projectStoreの変更要否がタスクに含まれていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存コード（`projectStore.ts:176`）を確認したところ、すでにprojectStoreは`useSpecStore.getState().setSpecs()`を呼び出している：

```typescript
// projectStore.ts:175-177
if (result.specs) {
  useSpecStore.getState().setSpecs(result.specs);
}
```

設計ドキュメント（design.md:654-668）の記載はこの既存パターンを維持する方針であり、projectStore側の**追加変更は不要**。リファクタリング後も同じAPIが維持されるため、projectStoreからは引き続きFacade（useSpecStore）経由でsetSpecsを呼び出す形になる。

これはReq 7（既存インターフェース互換性）の目的と整合しており、projectStoreへの変更は設計意図として含まれていない。

**Action Items**: なし（既存コードがすでに設計意図を満たしている）

---

### W-3: subscribeWithSelector設定の確認

**Issue**: `subscribeWithSelector`ミドルウェアの使用が明示されているが、各子storeへの適用タイミングと設定が未詳細。React StrictModeでの二重実行対応の言及なし。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdのState Composition Patternセクションでは`subscribeWithSelector`の使用が言及されているが、以下の点が不明確：
1. Zustand 5.xでのmiddlewareセットアップ方法
2. cleanup/unsubscribeのタイミング
3. React 19 StrictModeでの二重実行対応

これらは実装時のトラブルを避けるため、設計ドキュメントに明記すべき。

**Action Items**:
- design.mdの「Data Contracts & Integration」セクションに、subscribeWithSelectorのセットアップとcleanup方法を追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-1 | Error Handling の粒度 | No Fix Needed | 既存パターン維持が明記されており、各store/serviceが独自のerror stateを持つ設計と整合 |
| I-2 | File Change Event のDebouncing | No Fix Needed | 既存specStoreの実装を引き継ぐ前提であり、必要であれば実装時に対応可能 |
| I-3 | ロールバック手順の詳細 | No Fix Needed | Phase単位コミットは実装時のgit運用であり、設計ドキュメントの範囲外 |
| I-4 | 監視・ログ出力の詳細 | No Fix Needed | 既存パターン維持の範囲であり、必要に応じて実装時に追加可能 |
| I-5 | subscribeWithSelector詳細 | Merged to W-3 | W-3として対応 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | subscribeWithSelectorのセットアップとcleanupパターンを追記（W-3対応） |

---

## Conclusion

**Summary**:
- Warning 3件のうち、実際に修正が必要なのは1件（W-3）のみ
- W-1、W-2は既存コードの確認により問題なしと判断
- Info 5件はすべて現状で許容範囲内

**Next Steps**:
- `/kiro:spec-impl spec-store-decomposition`で実装開始可能

---

## Applied Fixes

**Applied Date**: 2026-01-03
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | subscribeWithSelectorのセットアップとcleanupパターンを追記 |

### Details

#### design.md

**Issue(s) Addressed**: W-3

**Changes**:
- 「Data Contracts & Integration」セクションにZustand 5.xでのsubscribeWithSelectorセットアップ方法を追加
- Subscription Setup & Cleanupパターンの詳細コード例を追加
- React StrictMode対応の考慮事項を追加

**Diff Summary**:
```diff
 ### Data Contracts & Integration

 **State Composition Pattern**:
 Facade storeは子storeの状態をsubscribeして結合。Zustandの`subscribeWithSelector`を使用して必要な部分のみ再レンダリング。

+**subscribeWithSelector Setup (Zustand 5.x)**:
+Zustand 5.xでは`subscribeWithSelector`はデフォルトで利用可能。store作成時にmiddlewareを明示的に適用する必要はない。
+
+```typescript
+import { subscribeWithSelector } from 'zustand/middleware';
+
+// 子storeの作成時（必要に応じてmiddleware適用）
+const useSpecListStore = create<SpecListStore>()(
+  subscribeWithSelector((set, get) => ({
+    // ... state and actions
+  }))
+);
+```
+
+**Subscription Setup & Cleanup**:
+Facadeストアの初期化時にsubscriptionを設定し、React StrictModeでの二重実行に対応。
+
+```typescript
+// Facade store内でsubscription設定
+let subscriptions: (() => void)[] = [];
+
+const setupSubscriptions = () => {
+  // 既存subscriptionをcleanup
+  subscriptions.forEach(unsub => unsub());
+  subscriptions = [];
+
+  // 子storeの状態変更を監視
+  subscriptions.push(
+    useSpecListStore.subscribe(
+      (state) => state.specs,
+      (specs) => useSpecStore.setState({ specs })
+    )
+  );
+  // 他の子storeも同様に設定...
+};
+
+// React StrictMode対応: アプリ初期化時に一度だけ呼び出し
+// または useEffect cleanup で unsub を呼び出し
+```
+
+**React StrictMode Considerations**:
+- `subscribe`の戻り値（unsubscribe関数）を保持し、再設定前にcleanup
+- コンポーネントレベルでsubscriptionを管理する場合は`useEffect`のcleanup関数で解除
+- Facadeレベルのsubscriptionはアプリライフサイクルで一度だけ設定（モジュールスコープ）
```

---

_Fixes applied by document-review-reply command._
