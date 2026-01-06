# Bug Analysis: remote-ui-bug-agent-list-missing

## Summary
Remote-UIのBug詳細ページにBug Agent一覧が表示されない。Spec詳細には実装済みだが、Bug詳細には未実装。

## Root Cause
Bug詳細セクションにAgent一覧のHTML要素が存在せず、BugDetailクラスにもAgent管理機能が実装されていない。

### Technical Details
- **Location**:
  - HTML: `electron-sdd-manager/src/main/remote-ui/index.html:94-128`
  - JS: `electron-sdd-manager/src/main/remote-ui/components.js:478-630`
- **Component**: Remote-UI BugDetail
- **Trigger**: 機能未実装

## 比較: Spec詳細 vs Bug詳細

### Spec詳細（実装済み）

**HTML** ([index.html:180-187](electron-sdd-manager/src/main/remote-ui/index.html#L180)):
```html
<div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
  <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Agents</h3>
  <span id="agent-count" class="text-xs text-gray-400">0 agents</span>
</div>
<div id="agent-list" class="max-h-48 overflow-y-auto">
  <div class="p-4 text-center text-sm text-gray-400">No agents</div>
</div>
```

**JS** ([components.js:932-998](electron-sdd-manager/src/main/remote-ui/components.js#L932)):
- `SpecDetail.updateAgentList(agents)` メソッド
- Agent一覧のレンダリング、ソート、クリックハンドラー

### Bug詳細（未実装）

**HTML** ([index.html:111-127](electron-sdd-manager/src/main/remote-ui/index.html#L111)):
```html
<div class="p-4 space-y-4">
  <!-- Action Button のみ - Agent一覧なし -->
  <div class="bg-white dark:bg-gray-800 rounded-lg p-4 ...">
    <button id="btn-bug-action">Analyze Bug</button>
    <div id="bug-loading-indicator">...</div>
  </div>
</div>
```

**JS** ([components.js:478-630](electron-sdd-manager/src/main/remote-ui/components.js#L478)):
- Agent一覧関連のプロパティ・メソッドなし
- `updateAgentList()` メソッドなし

## Impact Assessment
- **Severity**: Medium
- **Scope**: Remote-UIでBugワークフローを使用するユーザー
- **Risk**: Bug実行時のエージェント状態が確認できない

## Proposed Solution

### 修正ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `index.html` | Bug詳細セクションにAgent一覧HTMLを追加 |
| `components.js` | BugDetailクラスにAgent管理機能を追加 |
| `app.js` | Bug選択時にAgent一覧を更新するロジック追加 |

### Step 1: index.html - Agent一覧HTML追加

Bug詳細のContent Area（L111-127）にAgent一覧セクションを追加:

```html
<!-- Bug Agent List Section -->
<div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Agents</h3>
    <span id="bug-agent-count" class="text-xs text-gray-400">0 agents</span>
  </div>
  <div id="bug-agent-list" class="max-h-48 overflow-y-auto">
    <div class="p-4 text-center text-sm text-gray-400">No agents</div>
  </div>
</div>
```

### Step 2: components.js - BugDetailクラス拡張

SpecDetailの`updateAgentList()`を参考に、BugDetailに同様の機能を追加:

```javascript
// constructor内
this.agentListEl = document.getElementById('bug-agent-list');
this.agentCountEl = document.getElementById('bug-agent-count');
this.agents = [];

// メソッド追加
updateAgentList(agents) {
  // SpecDetail.updateAgentList() と同様の実装
}
```

### Step 3: app.js - Bug選択時のAgent更新

Bug選択時（`/bug/:name`ルート）にAgent一覧を更新:

```javascript
// router.on('/bug/:name', ...) 内
this.bugDetail.show(bug);
this.bugDetail.updateAgentList(this.getFilteredAgentsForBug(bug.name));

// 新メソッド追加
getFilteredAgentsForBug(bugName) {
  const bugSpecId = `bug:${bugName}`;
  return this.agents.filter(a => a.specId === bugSpecId);
}
```

### Recommended Approach
SpecDetailの実装をコピー＆調整するのが最も効率的。

**フィルタリング重要**: `specId === \`bug:${bugName}\`` でフィルタリングすること。

## Dependencies
- `remote-ui-agent-list-unfiltered` バグ修正（getFilteredAgents）が前提
- Spec詳細のAgent一覧実装（参照用）

## Testing Strategy
1. Remote-UIでBugsタブを選択
2. 任意のBugを選択
3. Bug詳細にAgent一覧セクションが表示されることを確認
4. Bugフェーズを実行してエージェントが一覧に表示されることを確認
5. 他のSpec/Bugのエージェントが混在しないことを確認
