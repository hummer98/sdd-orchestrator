# Bug Report: gitview-eisdir-on-untracked-directory

## Overview
GitViewのプロジェクトファイルツリーで、未追跡ディレクトリが空のファイルとして表示され、クリックすると「Failed to read untracked file: EISDIR: illegal operation on a directory, read」エラーが発生する。`git status --porcelain` が未追跡ディレクトリを末尾スラッシュ付き（例: `path/to/dir/`）で返すが、`parsePorcelain()` がこれをファイルとして扱うことが原因。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-29T17:48:53Z
- Affected Component: *To be identified during analysis*
- Severity: *To be determined*

## Steps to Reproduce
*To be documented*

1.
2.
3.

## Expected Behavior
*To be documented*

## Actual Behavior
*To be documented*

## Error Messages / Logs
```
Failed to read untracked file: EISDIR: illegal operation on a directory, read
```

## Related Files
- *To be identified during analysis*

## Additional Context
*Any additional information*
