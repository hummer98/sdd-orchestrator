# Bug Analysis: remote-web-ui-issues

## Summary
RemoteWebサーバーのUIに4つの問題が発見された。Agent一覧タイトルの不正表示、Agentログのフォーマット不足、ヘッダーとコンテンツの重なり、ワークフロー状態とボタン表記の不整合。

## Root Cause

### Issue 1: Agent一覧のタイトルが "unknown" になる
- **Location**: [components.js:852](electron-sdd-manager/src/main/remote-ui/components.js#L852)
- **Component**: SpecDetail.updateAgentList()
- **Trigger**: AGENT_LIST/AGENT_STATUS メッセージでのagent.phase表示

**Technical Details**:
`components.js:856-857`でAgent一覧を表示する際、`agent.phase || 'Unknown'`を使用している。サーバーから送信されるAGENT_STATUS/AGENT_LISTメッセージのペイロードに`phase`情報が正しく含まれていないか、Electron側でagent情報にphaseを設定していない可能性がある。

### Issue 2: Agentログが見づらい（TextArea形式）
- **Location**: [components.js:1430-1475](electron-sdd-manager/src/main/remote-ui/components.js#L1430)
- **Component**: LogViewer.renderEntry()
- **Trigger**: ログ表示時のパース・整形処理が欠如

**Technical Details**:
Electron版の`AgentLogPanel.tsx`では`logFormatter.ts`を使用してClaude CLIのstream-json出力をパース・整形表示している。Remote UIの`LogViewer`クラスは生ログをそのまま表示しており、`formatLogData()`相当の処理がない。

**Electron版との差異**:
- Electron版: `formatLogData()` → `parseClaudeEvent()` → アイコン・色分け・ツール別表示
- Remote UI: 生テキストをそのまま表示

### Issue 3: ヘッダーの裏にコンテンツが隠れる
- **Location**: [index.html:125-140](electron-sdd-manager/src/main/remote-ui/index.html#L125), [styles.css](electron-sdd-manager/src/main/remote-ui/styles.css)
- **Component**: spec-detail-section, bug-detail-section
- **Trigger**: 固定ヘッダーとコンテンツのz-index/位置関係

**Technical Details**:
`index.html:127`で`spec-detail-section`内のヘッダーは`sticky top-0 z-50`を使用。しかし、同ファイル38行目のメインヘッダーも同じ`sticky top-0 z-50`を使用している。

問題点:
1. Detail sectionが`fixed inset-0 z-40`で全画面オーバーレイとして表示される
2. Detail section内のヘッダー（`z-50`）は正しく配置されるが、コンテンツ領域にpadding-topがない
3. 結果として「戻る」ボタンやSpecタイトルがメインヘッダーの裏に隠れる

### Issue 4: ワークフロー状態とボタン表記の不整合
- **Location**: [components.js:745-828](electron-sdd-manager/src/main/remote-ui/components.js#L745)
- **Component**: SpecDetail.getNextPhase(), updatePhaseTag(), updateNextActionButton()
- **Trigger**: spec.phase と spec.approvals の不整合な処理

**Technical Details**:
`getPhaseStatusFromSpec()`はspec.approvalsが存在する場合はそれを使用し、なければphase文字列からステータスを推論する。しかし:
1. サーバーから送信されるspecデータに`approvals`オブジェクトが含まれない場合がある
2. `phase`文字列の解析ロジック（929-956行）が、サーバー側で実際に使用されているphase値と一致していない可能性
3. `getNextPhase()`と`updatePhaseTag()`で異なるステータス判定ロジックを使用

## Impact Assessment
- **Severity**: Medium
- **Scope**: RemoteWebサーバー経由でアプリを操作する全ユーザーに影響
- **Risk**: UI上での誤操作やワークフロー進行状況の把握困難

## Related Code

### Issue 1: Agent phase表示
```javascript
// components.js:852-858
this.agentListEl.innerHTML = this.agents.map(agent => {
  return `
    <div class="...">
      <div class="text-sm font-medium truncate">${agent.phase || 'Unknown'}</div>
```

### Issue 2: ログパース不足
```javascript
// components.js:1445-1463 - 現在の実装
renderEntry(entry) {
  const { data, stream, type, timestamp } = entry;
  // 生データをそのまま表示
  const escapedData = this.escapeHtml(data || '');
  return `<div class="${className}">${timePrefix}${escapedData}</div>`;
}
```

Electron版の参照コード:
```typescript
// logFormatter.ts - parseClaudeEvent()
// stream-json形式のパースとアイコン/色分け表示
```

### Issue 3: z-index問題
```html
<!-- index.html:125-127 -->
<section id="spec-detail-section" class="hidden fixed inset-0 z-40 ...">
  <header class="sticky top-0 z-50 ...">
```

### Issue 4: Phase判定ロジック
```javascript
// components.js:902-959
getPhaseStatusFromSpec(spec) {
  // approvalsがある場合とない場合で異なる処理
  if (spec.approvals) { ... }
  // fallbackの phase文字列解析
}
```

## Proposed Solution

### Option 1: 最小限の修正（推奨）
1. **Issue 1**: WebSocketHandlerの`broadcastAgentStatus()`/`AGENT_LIST`メッセージにphase情報を含める
2. **Issue 2**: Electron版の`logFormatter.ts`をバニラJS版に移植し、`LogViewer.renderEntry()`で使用
3. **Issue 3**: Detail sectionのコンテンツ領域にpadding-topを追加（ヘッダー高さ分）
4. **Issue 4**: サーバー側のspec情報に常に`approvals`オブジェクトを含めるか、Remote UI側のphase判定ロジックを統一

### Recommended Approach
Option 1を採用。各問題を個別に修正し、既存のElectron版実装を参考に一貫性を確保する。

## Dependencies
- [logFormatter.ts](electron-sdd-manager/src/renderer/utils/logFormatter.ts) - ログパースロジック
- [AgentLogPanel.tsx](electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx) - 参照実装
- [webSocketHandler.ts](electron-sdd-manager/src/main/services/webSocketHandler.ts) - Agent情報送信

## Testing Strategy
1. RemoteWebサーバーを起動し、モバイルブラウザまたはデスクトップブラウザでアクセス
2. Spec詳細画面を開き、ヘッダーとコンテンツの重なりがないことを確認
3. Agentを実行し、ログが整形表示されることを確認
4. Agent一覧でphase名が正しく表示されることを確認
5. ワークフロー状態とボタン表記が一致することを確認
