# Bug Fix: cc-sdd-spec-inspection-outdated

## Summary
cc-sddプロファイルのspec-inspection.mdを直接実行型からSubagent委譲型に変更し、他のプロファイル（cc-sdd-agent, spec-manager）と一貫性を持たせた。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md` | 直接実行型（188行）からSubagent委譲型（83行）に完全書き換え |

### Code Changes

**Before (直接実行型・旧形式):**
```markdown
---
description: Comprehensive inspection of implementation against specifications
allowed-tools: Bash, Glob, Grep, Read, LS, Write
argument-hint: <feature-name> [--fix | --autofix]
---

# Spec Inspection

<background_information>
...
</background_information>

<instructions>
## Execution Steps
### 1. Load Context
### 2. Execute Inspection Categories (7 categories)
### 3. Render GO/NOGO Judgment
### 4. Generate Report
### 5. Handle Options
### 6. Update spec.json  <-- 旧形式: {status, date, report}
</instructions>
```

**After (Subagent委譲型・新形式):**
```markdown
---
description: Comprehensive inspection of implementation against specifications
allowed-tools: Read, Task
argument-hint: <feature-name> [--fix | --autofix]
---

# Spec Inspection

## Validate Spec Files Exist
## Invoke Subagent  <-- spec-inspection-agentに委譲
## Display Result
```

### Key Differences

| 項目 | Before | After |
|------|--------|-------|
| allowed-tools | Bash, Glob, Grep, Read, LS, Write | Read, Task |
| 実行方式 | 直接実行（自身で全ロジック） | Subagent委譲（spec-inspection-agent） |
| spec.json形式 | 旧形式 `{status, date, report}` | 新形式 `MultiRoundInspectionState` |
| 行数 | 188行 | 83行 |

## Implementation Notes
- cc-sdd-agent/spec-inspection.mdの内容をそのまま採用
- 実際のInspectionロジックはagents/kiro/spec-inspection.mdが担当
- DRY原則に従い、ロジックの重複を排除

## Breaking Changes
- [x] Breaking changes (documented below)

**Breaking Change**: `allowed-tools`が変更されるため、Task toolの許可が必要。
- 既存のcc-sddプロファイル使用プロジェクトは、コマンドセットの再インストールが必要
- settings.local.jsonにTask toolの許可が追加されていることを確認

## Rollback Plan
1. Gitで変更を戻す: `git checkout -- electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`
2. 旧形式のファイルを復元

## Related Commits
- *未コミット - `/kiro:bug-verify`後にコミット予定*

## Test Results
```
Test Files  1 passed (1)
     Tests  25 passed (25)
  Duration  1.54s
```
