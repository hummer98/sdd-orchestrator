# Response to Document Review #5

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Reply Date**: 2026-02-13

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 1      | 1            | 0             | 0                |
| Info     | 1      | 1            | 0             | 0                |

---

## Response to Warnings

### W-011: App.tsxの「アクション専用」セレクターなし全購読が技術的に再レンダリングをトリガーする

**Issue**: design.md DD-004で「アクションのみの場合はセレクター化不要」と決定済みだが、research.mdの「React側のbailoutが機能する」という根拠は技術的に不正確。`useStore()`（セレクターなし）はstateの変更で必ず再レンダリングがトリガーされる。

**Judgment**: **Fix Required** ✅

**Evidence**:
Zustand v5のソースコード（`node_modules/zustand/react.js`）を直接確認した:

```javascript
const identity = (arg) => arg;
function useStore(api, selector = identity) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  return slice;
}
```

- セレクターなし呼び出し時、`selector = identity`（pass-through）
- `getSnapshot`は`() => identity(api.getState())`= **stateオブジェクト全体**を返す
- `setState`時に`Object.assign({}, state, nextState)`で**新しいオブジェクト参照が生成**される（`vanilla.js` line 8）
- `useSyncExternalStore`は戻り値を`Object.is`で比較 → 新しい参照なので`false` → **コンポーネント関数が再実行される**

research.md 49行目の「再レンダリングは起きない（アクション参照は不変のため、React側のbailoutが機能する）」は技術的に不正確。正確には:
- `useStore()`はstateの変更で**コンポーネント関数の再実行がトリガーされる**
- React 19のbailoutにより仮想DOMの差分が空であれば実DOMの更新はスキップされるが、関数コンポーネント自体は実行される

ただし、DD-004の設計判断自体は妥当:
- App.tsxの他の9+ストアのセレクター化により再レンダリング頻度が大幅に低下する
- 3つのアクション専用ストア（workflowStore, toolPathStore, projectEditorStore）のstate更新頻度は限定的
- 実装時にTask 1.1内で`const action = useStore(s => s.action)`に変更することは容易

**Action Items**:

- research.md 49行目の技術的不正確な記述を修正する
- DD-004の設計判断は維持（アクション専用箇所のセレクター化は実装時判断に委ねる）

---

## Response to Info (Low Priority)

| #     | Issue                                    | Judgment         | Reason                                               |
| ----- | ---------------------------------------- | ---------------- | ---------------------------------------------------- |
| S-007 | research.md 49行目の技術的不正確な記述   | Fix Required ✅  | W-011と同一箇所。Zustandソースコード検証済みで不正確性を確認 |

---

## Files to Modify

| File         | Changes                                                        |
| ------------ | -------------------------------------------------------------- |
| research.md  | 49行目: 「再レンダリングは起きない」を技術的に正確な記述に修正 |

---

## Conclusion

Review #5ではCritical Issueが0件となり、ドキュメント間の整合性・ソースコード照合は全て問題なし。唯一のWarning（W-011）とInfo（S-007）は同一箇所（research.md 49行目）の技術的不正確な記述に関するもの。

Zustand v5のソースコードを直接検証した結果、research.mdの記述が不正確であることを確認。修正を適用する。DD-004の設計判断（アクション専用箇所のセレクター化不要）は、パフォーマンス影響が限定的であるため維持する。

---

## Applied Fixes

**Applied Date**: 2026-02-13
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| research.md | 49行目: アクション専用全購読の再レンダリング動作に関する技術的不正確な記述を修正 |

### Details

#### research.md

**Issue(s) Addressed**: W-011, S-007

**Changes**:
- 49行目の「再レンダリングは起きない（アクション参照は不変のため、React側のbailoutが機能する）」を、Zustand v5の`useSyncExternalStore`実装に基づく正確な記述に修正

**Diff Summary**:
```diff
-  - アクション*のみ*を取得する場合（`const { action1, action2 } = useStore()`）は、実質的にstateの変更で再レンダリングは起きない（アクション参照は不変のため、React側のbailoutが機能する）
+  - アクション*のみ*を取得する場合（`const { action1, action2 } = useStore()`）でも、`useStore()`はセレクターなし全購読であるため、stateの変更で**コンポーネント関数の再実行がトリガーされる**（`useSyncExternalStore`の`getSnapshot`がstateオブジェクト全体の参照変更を検知するため）。ただし、React 19のbailoutにより仮想DOMの差分が空であれば実DOMの更新はスキップされるため、パフォーマンス影響は限定的
```

---

_Fixes applied by document-review-reply command._
