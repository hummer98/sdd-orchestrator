# Bug Analysis: agent-log-height-restriction

## Summary
Agentログパネル（下部ペイン）の高さが`BOTTOM_PANE_MAX = 400`でハードコードされており、画面の大きさに関わらず最大400pxまでしか拡大できない。

## Root Cause
App.tsxにおいて、下部ペインの高さ制限が固定値で設定されている。

### Technical Details
- **Location**: [App.tsx:48-49](electron-sdd-manager/src/renderer/App.tsx#L48-L49)
- **Component**: App.tsx (メインレイアウト)
- **Trigger**: ユーザーがAgentログパネルをリサイズしようとした際に、400pxで制限される

**問題のコード:**
```tsx
const BOTTOM_PANE_MIN = 100;
const BOTTOM_PANE_MAX = 400;
```

**リサイズハンドラー (App.tsx:120-122):**
```tsx
const handleBottomResize = useCallback((delta: number) => {
  setBottomPaneHeight((prev) => Math.min(BOTTOM_PANE_MAX, Math.max(BOTTOM_PANE_MIN, prev - delta)));
}, []);
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: すべてのユーザーに影響。大きなモニターを使用している場合に特に問題となる
- **Risk**: 修正は単純で副作用のリスクは低い

## Related Code
- [App.tsx:48-49](electron-sdd-manager/src/renderer/App.tsx#L48-L49) - 定数定義
- [App.tsx:120-122](electron-sdd-manager/src/renderer/App.tsx#L120-L122) - リサイズハンドラー
- [App.tsx:657-661](electron-sdd-manager/src/renderer/App.tsx#L657-L661) - 下部ペインのレンダリング

## Proposed Solution

### Option 1: 最大値制限を完全に削除
- Description: `BOTTOM_PANE_MAX`の制限を削除し、画面の高さに応じて自由にリサイズ可能にする
- Pros: 最も柔軟、ユーザーの要望に完全対応
- Cons: 極端な値に設定可能になる（ただしMinは維持）

### Option 2: ビューポート高さの割合で制限
- Description: `BOTTOM_PANE_MAX`を固定値ではなくビューポート高さの割合（例: 70vh）に変更
- Pros: 様々な画面サイズに対応
- Cons: 実装がやや複雑になる

### Recommended Approach
**Option 1** を採用。ユーザーの要望「制限は不要」に直接対応し、シンプルな修正で済む。

最小値（`BOTTOM_PANE_MIN = 100`）は維持することで、パネルが見えなくなることを防ぐ。

## Dependencies
- なし（単独の修正）

## Testing Strategy
1. Agentログパネルを画面の上部まで拡大できることを確認
2. 最小値（100px）未満にはリサイズできないことを確認
3. リサイズ後の値がレイアウト設定に正しく保存されることを確認
