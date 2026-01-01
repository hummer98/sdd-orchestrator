# Bug Analysis: cc-sdd-spec-inspection-outdated

## Summary
cc-sddプロファイルの`spec-inspection.md`が直接実行型で旧形式spec.jsonを書き込むため、最新UIと互換性がない。cc-sdd-agentとspec-managerプロファイルはSubagent委譲型に移行済み。

## Root Cause
cc-sddプロファイルのみがアーキテクチャ変更に追従していない。

### Technical Details
- **Location**: `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md:129-140`
- **Component**: cc-sddプロファイルのspec-inspectionコマンド
- **Trigger**: cc-sddプロファイルでコマンドセットをインストール後、`/kiro:spec-inspection`を実行

**問題のコード** (cc-sdd/spec-inspection.md:129-140):
```markdown
### 6. Update spec.json

If GO judgment, update spec.json with inspection status:
```json
{
  "inspection": {
    "status": "passed",
    "date": "YYYY-MM-DD",
    "report": "inspection-{n}.md"
  }
}
```
```

**期待される形式** (agents/kiro/spec-inspection.md):
```json
{
  "inspection": {
    "status": "completed",
    "rounds": 1,
    "currentRound": null,
    "roundDetails": [
      {
        "roundNumber": 1,
        "passed": true,
        "completedAt": "2025-12-25T12:00:00Z"
      }
    ]
  }
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: cc-sddプロファイルを使用するプロジェクトのInspection機能
- **Risk**: UIがInspection状態を正しく表示できない、Deployボタンが有効にならない可能性

## Related Code

### 3つのプロファイルの比較

| プロファイル | 実行方式 | allowed-tools | spec.json形式 |
|-------------|---------|---------------|---------------|
| cc-sdd | 直接実行 | Bash, Glob, Grep, Read, LS, Write | 旧形式 ❌ |
| cc-sdd-agent | Subagent委譲 | Read, Task | 新形式 ✓ |
| spec-manager | Subagent委譲 | Read, Task | 新形式 ✓ |

## Proposed Solution

### Option 1: Subagent委譲型に変更（推奨）
- Description: cc-sdd/spec-inspection.mdをcc-sdd-agent/spec-inspection.mdと同じSubagent委譲型に変更
- Pros:
  - コードの一貫性が保たれる
  - agents/kiro/spec-inspection.mdの変更が自動的に反映される
  - 保守が容易
- Cons:
  - `allowed-tools`が変更される（Task toolが必要）

### Option 2: 直接実行のまま新形式に対応
- Description: cc-sdd/spec-inspection.md内のspec.json更新ロジックをMultiRoundInspectionState形式に変更
- Pros:
  - 既存の直接実行アーキテクチャを維持
- Cons:
  - 二重メンテナンスが必要
  - 今後の変更で再び乖離するリスク

### Recommended Approach
**Option 1: Subagent委譲型に変更**

理由：
1. DRY原則 - 同じロジックを2箇所で管理しない
2. 他のプロファイル（cc-sdd-agent, spec-manager）と一貫性がある
3. 将来のspec-inspection-agentの改善が自動的に適用される

## Dependencies
- `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md` - Subagent定義（既に最新形式）
- cc-sddプロファイルを使用中のプロジェクトは再インストールが必要

## Testing Strategy
1. cc-sdd/spec-inspection.mdを更新
2. テストプロジェクトにcc-sddプロファイルをインストール
3. `/kiro:spec-inspection`を実行
4. spec.jsonが`MultiRoundInspectionState`形式で更新されることを確認
5. UIでInspection状態が正しく表示されることを確認
