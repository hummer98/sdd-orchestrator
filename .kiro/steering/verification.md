# Verification Commands

spec-inspection 実行時に自動実行される検証コマンドを定義します。

## Commands

| Type | Command | Workdir | Description |
|------|---------|---------|-------------|
| build | npm run build | . | プロダクションビルド |
| typecheck | npm run typecheck | . | TypeScript 型チェック |
| test | npm run test | . | テスト実行 |
| lint | npm run lint | . | Lint 検証 |

## Notes

カスタマイズが必要な場合は、プロジェクトの設定に合わせてコマンドを変更してください。
