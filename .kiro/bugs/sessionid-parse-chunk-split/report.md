# Bug Report: sessionid-parse-chunk-split

## Overview
Claude Codeのstdout出力が複数チャンクに分割されて届く場合、system/initメッセージのJSONが不完全な状態でパースを試み失敗する。結果としてsessionIdが取得されず、AgentInputPanelのテキストフィールドがdisabledのままになる。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-12T11:33:09Z
- Affected Component: specManagerService.ts - parseAndUpdateSessionId()
- Severity: Medium

## Steps to Reproduce
1. Electronアプリからspec-inspectionなど長い出力を生成するエージェントを起動
2. Claude Codeのsystem/initメッセージが大きい場合（ツール一覧、slash_commands一覧を含む）
3. stdoutが複数チャンクに分割されて届く
4. 最初のチャンクに不完全なJSONが含まれ、JSON.parse()に失敗
5. sessionIdがagent recordに保存されない
6. AgentInputPanelのテキストフィールドがdisabledのまま

## Expected Behavior
sessionIdが正しくパースされ、エージェント完了後にテキストフィールドが有効になる

## Actual Behavior
sessionIdが空文字列のままで、テキストフィールドがdisabledのまま

## Error Messages / Logs
```
# agent recordのsessionIdが空
{
  "agentId": "agent-1768040741504-5ec2e51b",
  "sessionId": "",  // 空のまま
  ...
}

# ログファイルの行順が逆転（非同期書き込みの競合）
行1 (10:25:45.204Z): "impl","kiro:spec-..." (後半部分)
行2 (10:25:45.203Z): {"type":"system","subtype":"init","session_id":"37b4d7f9-..." (前半部分、不完全)
```

## Related Files
- electron-sdd-manager/src/main/services/specManagerService.ts:1315-1358 (parseAndUpdateSessionId)
- electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx:35 (canResume判定)

## Additional Context
解決策: 改行で終わっていない不完全な行をバッファに保持し、次のチャンクと結合してから完全な行としてパースする。agentIdごとにバッファを保持するMapを追加する。
