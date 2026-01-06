# Bug Report: remote-ui-agent-list-feature-parity

## Overview
Remote-UIのSpec Agent一覧について、Electron版との表示差異を埋める。

先行調査で判明した差異:
1. **実行中Agent件数** - Spec一覧でBotアイコン+件数バッジが表示されない
2. **削除ボタン** - Agent削除機能がない
3. **Askボタン (Spec Ask)** - MessageSquareアイコンがない
4. **Permission Skip** - チェックボックスがない
5. **コピーボタン** - Spec名/Bug名のコピー機能がない
6. **Phaseバッジ** - inspection-complete, deploy-completeが欠落

## Status
**Pending**

## Environment
- Date Reported: 2026-01-07T12:45:00+09:00
- Affected Component: Remote-UI全般
- Severity: Low (機能差異、動作には影響なし)

## Steps to Reproduce
*To be documented*

1. Remote-UIでプロジェクトに接続
2. Spec一覧およびSpec詳細を確認
3. Electron版と比較

## Expected Behavior
Remote-UIでもElectron版と同等の情報が表示される

## Actual Behavior
上記の機能差異が存在する

## Error Messages / Logs
```
N/A (機能差異であり、エラーではない)
```

## Related Files
- `electron-sdd-manager/src/main/remote-ui/components.js` - Remote-UI UIコンポーネント
- `electron-sdd-manager/src/renderer/components/SpecListItem.tsx` - Electron版Spec一覧
- `electron-sdd-manager/src/renderer/components/AgentListPanel.tsx` - Electron版Agent一覧

## Additional Context
優先度判断:
- **高**: 実行中Agent件数表示（運用上重要な情報）
- **中**: 削除ボタン、Phaseバッジ完備
- **低**: Askボタン、Permission Skip、コピーボタン（モバイルでの使用頻度低）
