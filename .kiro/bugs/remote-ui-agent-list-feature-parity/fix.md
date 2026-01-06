# Bug Fix: remote-ui-agent-list-feature-parity

## Summary
Remote-UIのSpec一覧に**実行中Agent件数表示**と**欠落していたPhaseバッジ**を追加し、Electron版とのパリティを改善した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/remote-ui/components.js` | SpecListにagentsデータ管理とAgent件数バッジ、phaseConfigに2つのPhaseを追加 |
| `electron-sdd-manager/src/main/remote-ui/app.js` | SpecListへのagentsデータ更新呼び出しを追加 |

### Code Changes

#### 1. Phaseバッジに欠落していた2つのPhaseを追加

```diff
  renderPhaseBadge(phase) {
    const phaseConfig = {
      'initialized': { label: '初期化', ... },
      'requirements-generated': { label: '要件定義済', ... },
      'design-generated': { label: '設計済', ... },
      'tasks-generated': { label: 'タスク済', ... },
      'implementation-complete': { label: '実装完了', ... },
+     'inspection-complete': { label: '検査完了', colorClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
+     'deploy-complete': { label: 'デプロイ完了', colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
    };
```

#### 2. SpecListにagentsプロパティと更新メソッドを追加

```diff
  class SpecList {
    constructor() {
      this.containerEl = document.getElementById('spec-list');
      this.specs = [];
+     this.agents = [];
      this.selectedSpecId = null;
      this.onSelect = null;
    }

+   updateAgents(agents) {
+     this.agents = agents || [];
+     this.render();
+   }
```

#### 3. renderSpecCardで実行中Agent件数バッジを表示

```diff
  renderSpecCard(spec) {
+   const runningAgentCount = this.getRunningAgentCount(spec.feature_name);
    return `
      <div class="spec-card ...">
        <div class="flex flex-col gap-1">
-         <h3 class="font-medium truncate ...">${spec.feature_name}</h3>
+         <div class="flex items-center gap-2">
+           <h3 class="font-medium truncate ... flex-1">${spec.feature_name}</h3>
+           ${runningAgentCount > 0 ? this.renderRunningAgentBadge(runningAgentCount) : ''}
+         </div>
          <div class="flex items-center gap-2">
            ${this.renderPhaseBadge(phase)}
            ...
          </div>
        </div>
      </div>
    `;
  }

+ getRunningAgentCount(specId) {
+   return this.agents.filter(agent =>
+     agent.specId === specId && agent.status === 'running'
+   ).length;
+ }

+ renderRunningAgentBadge(count) {
+   return `<span class="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 ...">
+     <svg ...>...</svg> ${count}
+   </span>`;
+ }
```

#### 4. app.jsでSpecListにagentsデータを渡すように修正

```diff
  // handleInit, handleAgentList, handleAgentStatus にて
  this.specDetail.updateAgentList(this.getFilteredAgents());
+ this.specList.updateAgents(this.agents);
```

## Implementation Notes

- **Option 1（高優先度のみ）を採用**: 分析で推奨された最小限の変更で運用上重要な機能を提供
- 実行中Agent件数はリアルタイムで更新される（AGENT_STATUS, AGENT_LISTメッセージで反映）
- Phaseバッジのカラーは既存のTailwind CSSクラスを活用（teal, emerald）
- Electron版のSpecList.tsx:217-225のUIを参考にSVGアイコン+バッジ形式で実装

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
`components.js`と`app.js`の変更を元に戻す:
- SpecListクラスからagentsプロパティとupdateAgents/getRunningAgentCount/renderRunningAgentBadgeメソッドを削除
- phaseConfigから`inspection-complete`と`deploy-complete`を削除
- app.jsからspecList.updateAgents()呼び出しを削除

## Related Commits
- *To be added after commit*
