# Bug Fix: remote-ui-agent-list-unfiltered

## Summary
Remote-UIのAgent一覧を、選択中のSpec/BugのIDでフィルタリングするように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/remote-ui/app.js` | エージェントフィルタリングロジックを追加 |

### Code Changes

**1. フィルタリングヘルパーメソッドを追加 (line 855-881)**

```diff
+  /**
+   * Get the current spec ID based on selected spec or bug
+   * Bug fix: remote-ui-agent-list-unfiltered
+   * @returns {string|null} The current spec ID or null if none selected
+   */
+  getCurrentSpecId() {
+    if (this.selectedSpec) {
+      return this.selectedSpec.feature_name;
+    }
+    if (this.selectedBug) {
+      return `bug:${this.selectedBug.name}`;
+    }
+    return null;
+  }
+
+  /**
+   * Filter agents by the current spec/bug selection
+   * Bug fix: remote-ui-agent-list-unfiltered
+   * @returns {Array} Filtered agents for the current spec/bug
+   */
+  getFilteredAgents() {
+    const currentSpecId = this.getCurrentSpecId();
+    if (!currentSpecId) {
+      return [];
+    }
+    return this.agents.filter(agent => agent.specId === currentSpecId);
+  }
```

**2. handleInit()でフィルタリングを適用 (line 465-470)**

```diff
     // Update agents
+    // Bug fix: remote-ui-agent-list-unfiltered - filter by current spec/bug
     if (agents) {
       this.agents = agents;
-      this.specDetail.updateAgentList(this.agents);
+      this.specDetail.updateAgentList(this.getFilteredAgents());
     }
```

**3. handleAgentStatus()でフィルタリングを適用 (line 581-582)**

```diff
     }
-    this.specDetail.updateAgentList(this.agents);
+    // Bug fix: remote-ui-agent-list-unfiltered - filter by current spec/bug
+    this.specDetail.updateAgentList(this.getFilteredAgents());
```

**4. handleAgentList()でフィルタリングを適用 (line 599-608)**

```diff
   /**
    * Handle AGENT_LIST message
+   * Bug fix: remote-ui-agent-list-unfiltered - filter by current spec/bug
    * @param {Object} payload
    */
   handleAgentList(payload) {
     const { agents } = payload || {};
     this.agents = agents || [];
-    this.specDetail.updateAgentList(this.agents);
+    this.specDetail.updateAgentList(this.getFilteredAgents());
   }
```

## Implementation Notes
- Electron版の`AgentListPanel.tsx`で使用されている`getAgentsForSpec(specId)`と同様のフィルタリングロジックを実装
- Bug選択時は `bug:${bugName}` 形式のspecIdを使用（既存のBugエージェント命名規則に準拠）
- Spec/Bug未選択時は空配列を返すことで、一覧画面ではエージェントが表示されない

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `app.js`の変更を元に戻す
2. `getCurrentSpecId()`と`getFilteredAgents()`メソッドを削除
3. 各ハンドラで`this.agents`を直接`updateAgentList()`に渡すように戻す

## Related Commits
- *To be filled after commit*
