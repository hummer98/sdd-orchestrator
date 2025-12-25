# Bug Report: remove-duplicate-project-selector

## Overview
左ペイン上側の「プロジェクト」セクション（選択ボタンとパス表示）がヘッダーバーにプロジェクト名を追加した際に削除されておらず、UI上で重複表示となっている。

## Status
**Resolved** ✅

## Environment
- Date Reported: 2025-12-26T11:18:00+09:00
- Affected Component: `ProjectSelector` コンポーネント (`electron-sdd-manager/src/renderer/components/ProjectSelector.tsx`)
- Severity: Low (UI冗長性)

## Steps to Reproduce

1. SDD Orchestratorを起動
2. プロジェクトを選択
3. 左ペイン上部を確認

## Expected Behavior
- ヘッダーバーにのみプロジェクト名が表示される
- 左ペインにはバリデーション表示（.kiroチェック、パーミッションチェック等）のみが表示される

## Actual Behavior
- ヘッダーバーにプロジェクト名が表示されている（正しい）
- 左ペイン上部にも「プロジェクト」ヘッダー、選択ボタン、フルパス表示が残っている（冗長）

## Error Messages / Logs
```
N/A - 機能的なエラーではなくUI冗長性の問題
```

## Related Files
- `electron-sdd-manager/src/renderer/components/ProjectSelector.tsx` - 削除対象のUIを含むコンポーネント
- `electron-sdd-manager/src/renderer/App.tsx` - ProjectSelectorを使用している箇所

## Additional Context
- ヘッダーバーへのプロジェクト名追加時に、ProjectSelectorからの対応する削除が漏れていた
- 修正時にはコンポーネント名の変更も検討（例: `ProjectValidator`, `KiroValidationPanel`など）
- バリデーション関連の表示（.kiroディレクトリ確認、spec-managerファイル確認、パーミッション確認）は維持する必要がある
