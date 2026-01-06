# Bug Analysis: remote-ui-agent-list-feature-parity

## Summary
Remote-UIのSpec一覧およびAgent一覧について、Electron版との表示・機能差異を埋める。主に6項目の差異がある。

## Root Cause
Remote-UIはモバイル向けの軽量実装として設計されており、Electron版の一部機能が意図的に省略されている。ただし、運用上重要な情報（実行中Agent件数）も欠落している。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/remote-ui/components.js`
- **Component**: SpecList, SpecDetail（Agent一覧）
- **Trigger**: 機能未実装

## Impact Assessment
- **Severity**: Low（機能差異であり、クリティカルなバグではない）
- **Scope**: Remote-UIユーザー全般
- **Risk**: 実行中Agent件数が見えないと、どのSpecでAgentが動いているか把握困難

## 差異の詳細分析

### 1. 実行中Agent件数表示（優先度：高）

**Electron版** ([SpecList.tsx:217-225](electron-sdd-manager/src/renderer/components/SpecList.tsx#L217-L225)):
```tsx
{runningAgentCount > 0 && (
  <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
    <Bot className="w-3 h-3" />
    {runningAgentCount}
  </span>
)}
```

**Remote-UI** ([components.js:213-231](electron-sdd-manager/src/main/remote-ui/components.js#L213-L231)):
- `renderSpecCard()`にAgent件数表示なし
- `this.agents`へのアクセスがSpecListクラスにない

**修正方針**: SpecListにagentsデータを渡し、specIdでフィルタリングして件数表示

### 2. Phaseバッジの完備（優先度：中）

**Electron版** ([SpecList.tsx:19-27](electron-sdd-manager/src/renderer/components/SpecList.tsx#L19-L27)):
```typescript
const PHASE_LABELS: Record<SpecPhase, string> = {
  // ... 5 phases ...
  'inspection-complete': '検査完了',
  'deploy-complete': 'デプロイ完了',
};
```

**Remote-UI** ([components.js:258-274](electron-sdd-manager/src/main/remote-ui/components.js#L258-L274)):
```javascript
const phaseConfig = {
  // ... 5 phases only ...
  // 'inspection-complete' と 'deploy-complete' が欠落
};
```

**修正方針**: `phaseConfig`に2つのPhaseを追加

### 3. 削除ボタン（優先度：中）

**Electron版** ([AgentListPanel.tsx:144-154](electron-sdd-manager/src/renderer/components/AgentListPanel.tsx#L144-L154)):
- `handleRemoveClick()` でエージェント削除
- 確認ダイアログ付き

**Remote-UI**:
- Agent一覧にゴミ箱アイコンなし
- `renderAgentActions()`に削除ボタン未実装

**修正方針**: WebSocket経由でREMOVE_AGENTメッセージを送信

### 4. Askボタン（優先度：低）

**Electron版** ([AgentListPanel.tsx:211-225](electron-sdd-manager/src/renderer/components/AgentListPanel.tsx#L211-L225)):
- Spec Askダイアログを開くMessageSquareアイコン
- `executeAskSpec` IPC呼び出し

**Remote-UI**:
- 未実装

**修正方針**: モバイルでのテキスト入力は煩雑なため、優先度低

### 5. Permission Skip（優先度：低）

**Electron版** ([AgentListPanel.tsx:198-210](electron-sdd-manager/src/renderer/components/AgentListPanel.tsx#L198-L210)):
- チェックボックスで`--dangerously-skip-permissions`を制御

**Remote-UI**:
- 未実装

**修正方針**: セキュリティ上、Remote-UIからの制御は意図的に省略可

### 6. コピーボタン（優先度：低）

**Electron版** ([SpecList.tsx:185-204](electron-sdd-manager/src/renderer/components/SpecList.tsx#L185-L204)):
- Spec名をクリップボードにコピー

**Remote-UI**:
- 未実装

**修正方針**: モバイルではロングプレスでコピー可能なため、優先度低

## Proposed Solution

### Option 1: 高優先度のみ対応（推奨）
実行中Agent件数表示とPhaseバッジ完備のみ対応。

- Pros: 最小限の変更で運用上重要な情報を提供
- Cons: 完全なパリティではない

### Option 2: 中優先度まで対応
上記に加えて削除ボタンを実装。

- Pros: Agent管理機能がRemote-UIでも使える
- Cons: WebSocketメッセージ追加が必要

### Option 3: 全対応
全6項目を実装。

- Pros: 完全なパリティ
- Cons: 工数大、モバイルでの使用頻度が低い機能も含む

### Recommended Approach
**Option 1（高優先度のみ対応）** を推奨。

理由:
1. 実行中Agent件数は運用上重要（どのSpecで処理中か一目でわかる）
2. Phaseバッジは既存コードへの追加のみで済む
3. 削除・Ask等はモバイルでの使用頻度が低い

## Dependencies
- `remote-ui-agent-list-unfiltered` バグ修正（フィルタリング機能）が先行して必要
- SpecListクラスがagentsデータにアクセスできるようにする必要あり

## Testing Strategy
1. Remote-UIでプロジェクトに接続
2. Agentを実行してSpec一覧に件数バッジが表示されることを確認
3. 各Phase（inspection-complete, deploy-complete含む）のバッジ色を確認
