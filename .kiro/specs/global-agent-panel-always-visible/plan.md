# 実装プラン: グローバルエージェント欄の常時表示とリサイズ位置記憶

## 要件

1. **グローバルエージェント欄を常に表示する**
   - 現状: グローバルエージェントが0件の場合は `return null` で完全に非表示
   - 目標: エージェントがいなくても欄自体は表示する

2. **リサイズ位置を記憶する**
   - 現状: `agentListHeight` はレイアウト設定に含まれており、リサイズ後に保存される仕組みは既存
   - 確認: 既存実装が正しく動作しているか確認し、必要に応じて修正

## 現状分析

### グローバルエージェント欄の表示制御

**ファイル:** `electron-sdd-manager/src/renderer/components/GlobalAgentPanel.tsx`

```typescript
// 行78-81: 現在の実装
const globalAgents = getGlobalAgents()...;
if (globalAgents.length === 0) {
  return null;  // ← これにより0件の場合は非表示
}
```

### リサイズ位置の保存

**既存実装:**
- `layoutConfigService.ts`: `agentListHeight` がスキーマに定義済み
- `App.tsx`: `handleAgentListResize` と `saveLayout` が実装済み
- ResizeHandle: `onResizeEnd={saveLayout}` で保存トリガー

## 実装タスク

### タスク1: グローバルエージェント欄を常に表示する

**ファイル:** `electron-sdd-manager/src/renderer/components/GlobalAgentPanel.tsx`

**変更内容:**
1. `globalAgents.length === 0` の条件で `return null` している部分を削除
2. 代わりに、空の場合のUIを表示（例: 「グローバルエージェントなし」等のメッセージ）

**変更前:**
```typescript
if (globalAgents.length === 0) {
  return null;
}
```

**変更後:**
```typescript
// 条件を削除し、空の場合も表示
// 空の場合は「グローバルエージェントなし」等のメッセージを表示
```

### タスク2: リサイズ位置の記憶を確認・修正

**確認項目:**
1. `App.tsx` でグローバルエージェント欄のリサイズハンドルに `onResizeEnd={saveLayout}` が設定されているか
2. `agentListHeight` が正しく保存・復元されているか

**ファイル:** `electron-sdd-manager/src/renderer/App.tsx`

現状の実装を確認し、必要に応じて修正。

### タスク3: テストの更新

**ファイル:** `electron-sdd-manager/src/renderer/components/GlobalAgentPanel.test.tsx`

テストケースを更新:
- 「グローバルエージェントが0件でも表示される」ことを確認するテスト追加/修正

## リスクと対策

| リスク | 対策 |
|--------|------|
| 空欄表示がUIを圧迫する | 最小高さを控えめに設定（例: 40px程度） |
| 既存のリサイズ機能が壊れる | E2Eテストで動作確認 |

## 成功基準

1. [ ] グローバルエージェントが0件でもパネルが表示される
2. [ ] パネルのリサイズ後、アプリ再起動時にサイズが維持される
3. [ ] 既存のテストがパスする
4. [ ] E2Eテスト（layout-persistence）がパスする
