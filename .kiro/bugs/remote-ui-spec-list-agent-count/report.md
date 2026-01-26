# Bug Report: remote-ui-spec-list-agent-count

## Overview
Remote UIのSpecsViewでSpecListItemに`runningAgentCount`が渡されていないため、実行中のエージェント数バッジが表示されない。SpecListItemコンポーネントは`runningAgentCount`プロパティをサポートしているが、Remote UI側での実装が漏れている。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-25T18:32:47Z
- Affected Component: `electron-sdd-manager/src/remote-ui/views/SpecsView.tsx`
- Severity: Low (UI表示の欠落、機能への影響なし)

## Steps to Reproduce
1. Electronアプリを起動
2. Specに対してエージェントを実行開始
3. Remote UIでSpecsタブを確認
4. SpecListItemにエージェント数バッジが表示されないことを確認

## Expected Behavior
Electron版と同様に、実行中のエージェントがある場合はSpecListItemにエージェント数バッジが表示される

## Actual Behavior
Remote UIのSpecListItemにはエージェント数バッジが表示されない（`runningAgentCount`プロパティが渡されていない）

## Error Messages / Logs
```
なし（UIの表示問題）
```

## Related Files
- `electron-sdd-manager/src/remote-ui/views/SpecsView.tsx` - 問題箇所
- `electron-sdd-manager/src/shared/components/spec/SpecListItem.tsx` - runningAgentCountを受け取るコンポーネント
- `electron-sdd-manager/src/renderer/components/SpecList.tsx` - Electron版の参照実装

## Additional Context
- SpecListItem.tsxの228-236行目でrunningAgentCountが1以上の場合にバッジを表示するUI実装あり
- agentStoreからspec別のrunning agent数を取得し、SpecListItemに渡す必要がある
