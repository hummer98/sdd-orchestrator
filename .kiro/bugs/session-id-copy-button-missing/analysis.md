# Bug Analysis: session-id-copy-button-missing

## Summary
AgentLogPanelのヘッダーにセッションID（agent.sessionId）が表示されているが、クリップボードにコピーするためのボタンが実装されていない。ログ全体のコピーボタンは存在するが、セッションID単体をコピーする機能がない。

## Root Cause
セッションID表示の実装時に、クリップボードコピーボタンの追加が漏れていた。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx:135-137`
- **Component**: AgentLogPanel - ヘッダーセクション
- **Trigger**: ユーザーがセッションIDをコピーしたい場合に手動で選択・コピーが必要

**該当コード**:
```tsx
<span className="text-sm text-gray-500 font-mono">
  {agent.agentId} - {agent.sessionId}
</span>
```

## Impact Assessment
- **Severity**: Low（機能的な障害ではなく利便性の問題）
- **Scope**: Agent操作中にセッションIDを共有・ログ記録する必要があるユーザー
- **Risk**: 修正による副作用なし

## Related Code
既存のコピーボタン実装パターン（同ファイル内）:
```tsx
// 179-190行目: ログコピーボタンの既存実装
<button
  onClick={handleCopy}
  disabled={logs.length === 0}
  className={clsx(
    'p-1.5 rounded hover:bg-gray-700',
    'text-gray-400 hover:text-gray-200',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )}
  title="ログをコピー"
>
  <Copy className="w-4 h-4" />
</button>
```

## Proposed Solution

### Option 1: セッションID横にコピーアイコンを追加
- Description: セッションID表示の横に小さなCopyアイコンを追加し、クリックでセッションIDのみをコピー
- Pros: 既存UIパターンと一致、直感的
- Cons: ヘッダーが少し混雑する可能性

### Recommended Approach
Option 1を採用。セッションID表示部分を以下のように変更:

```tsx
<span className="text-sm text-gray-500 font-mono flex items-center gap-1">
  {agent.agentId} - {agent.sessionId}
  <button
    onClick={() => navigator.clipboard.writeText(agent.sessionId)}
    className="p-0.5 rounded hover:bg-gray-600 text-gray-500 hover:text-gray-300"
    title="セッションIDをコピー"
  >
    <Copy className="w-3 h-3" />
  </button>
</span>
```

## Dependencies
- なし（既存のlucide-react Copyアイコンを使用）

## Testing Strategy
- 手動テスト: Agentを起動し、セッションIDのコピーボタンをクリックして、クリップボードに正しくコピーされることを確認
- 単体テスト: AgentLogPanel.test.tsxにセッションIDコピー機能のテストを追加
