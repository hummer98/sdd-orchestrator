# Bug Report: bugs-tab-selection-not-updating

## Overview
SpecタブでSpecを一つ選択したあと、Bugsタブに移動してBugを選択してもメインパネルおよび右のペインが書き換わらない

### 期待値
- Bugsタブをクリックした時点で、Bugsタブでのアイテムが選択されていないなら、メインパネルと右ペインは空表示
- BugsタブでBugアイテムが選択されたらメインパネルと右ペインが書き換わる

## Status
**Pending**

## Environment
- Date Reported: 2025-12-27T00:00:00+09:00
- Affected Component: *To be identified during analysis*
- Severity: *To be determined*

## Steps to Reproduce
*To be documented*

1. Specタブで任意のSpecを選択する
2. Bugsタブに移動する
3. Bugアイテムを選択する

## Expected Behavior
- Bugsタブをクリックした時点で、未選択状態ならメインパネルと右ペインは空表示になる
- Bugアイテムを選択したらメインパネルと右ペインがそのBugの内容に書き換わる

## Actual Behavior
- Bugsタブに移動してBugを選択してもメインパネルおよび右ペインが書き換わらない（Specの内容が残ったまま）

## Error Messages / Logs
```
*To be captured*
```

## Related Files
- *To be identified during analysis*

## Additional Context
タブ切り替え時の選択状態管理に問題がある可能性
