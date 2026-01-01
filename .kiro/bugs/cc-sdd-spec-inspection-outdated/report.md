# Bug Report: cc-sdd-spec-inspection-outdated

## Overview
cc-sddプロファイルのspec-inspection.mdが旧形式のspec.json構造（`{status, date, report}`）を使用しており、最新のUI（`MultiRoundInspectionState`を期待）と互換性がない。cc-sdd-agentプロファイルはSubagent委譲型で最新形式を使用しているが、cc-sddプロファイルは直接実行型で旧形式のままになっている。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-02T18:45:00+09:00
- Affected Component: `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`
- Severity: Medium

## Steps to Reproduce

1. cc-sddプロファイルでコマンドセットをインストール
2. `/kiro:spec-inspection {feature}` を実行
3. spec.jsonに旧形式の`inspection`構造が書き込まれる
4. UIでInspection状態が正しく表示されない

## Expected Behavior
cc-sddプロファイルでも`MultiRoundInspectionState`形式でspec.jsonを更新し、UIと互換性を持つ

## Actual Behavior
旧形式 `{status: "passed", date: "...", report: "..."}` が書き込まれ、UIが正しく動作しない

## Error Messages / Logs
```
N/A - 機能的な問題であり、エラーは発生しない
```

## Related Files
- `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md` - 旧形式
- `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-inspection.md` - Subagent委譲型
- `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md` - 最新形式

## Additional Context
cc-sdd-agentプロファイルとcc-sddプロファイルの主な違い：
- cc-sdd: 直接実行型、旧形式spec.json
- cc-sdd-agent: Subagent委譲型、新形式（MultiRoundInspectionState）

解決策の選択肢：
1. cc-sddプロファイルもSubagent委譲型に変更
2. cc-sddプロファイルの直接実行ロジックを新形式に更新
