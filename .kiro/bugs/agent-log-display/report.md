# Bug Report: agent-log-display

## Overview
Agentログパーサーの表示に複数の問題がある:
1. Read/Edit/Bashツールのアイコンが全て同じ (🔧) で区別しにくい
2. ファイルパスが40文字で切り詰められ、どのファイルか分かりにくい
3. tool_result行がJSONパース失敗時に「📄 データ: {"type":"user","message":...」と表示され、何のツール結果か分からない

## Status
**Pending**

## Environment
- Date Reported: 2025-12-20T08:42:00Z
- Affected Component: electron-sdd-manager/src/renderer/utils/logFormatter.ts
- Severity: Low (表示の改善)

## Steps to Reproduce
1. SDD ManagerでAgentを実行
2. ログパネルを確認
3. Read/Edit/Bashツールの使用を含むログを観察

## Expected Behavior
- Read: 📖 アイコンとファイルパス（省略なし）
- Edit: ✏️ アイコンとファイルパス（省略なし）
- Bash: 💻 アイコンとコマンド概要
- tool_result: 対応するツール名と結果概要

## Actual Behavior
- 全ツールが 🔧 アイコン
- ファイルパスが40文字で切り詰め
- tool_resultが「データ:」と表示され内容不明

## Error Messages / Logs
```
🔧 Read: file_path="/Users/yamamoto/git/sdd-manager/.kiro/sp..."
📄 データ: {"type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01EtRAk2JehJE2GneFmRcvYu...
```

## Related Files
- electron-sdd-manager/src/renderer/utils/logFormatter.ts

## Additional Context
二重JSON構造（wrapper.data内にJSON）のパース時に、外側は成功するが内側が巨大すぎて「データ:」フォールバックになる。tool_use_idを追跡して対応するツール名を表示する必要がある。
