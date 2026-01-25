# Verification Commands

spec-inspection 実行時に自動実行される検証コマンドを定義します。

## Commands

| Type | Command | Workdir | Description |
|------|---------|---------|-------------|
| build | npm run build | . | プロダクションビルド |
| typecheck | npm run typecheck | . | TypeScript 型チェック |
| test | npm run test:run | . | ユニットテスト |
| lint | npm run lint | . | ESLint 検証 |

## Notes

- **Type**: コマンドの種類（build, typecheck, test, lint 等）
- **Command**: シェルで実行可能なコマンド
- **Workdir**: プロジェクトルートからの相対パス（`.` はルート）
- **Description**: コマンドの説明（人間向け）

### エスケープ規則

Markdown テーブル内で特殊文字を使用する場合:

| 文字 | エスケープ方法 |
|------|---------------|
| `\|` (パイプ) | `\|` |

複雑なコマンド（複数パイプ、ネストしたクォート等）は、シェルスクリプトとして分離し、そのスクリプトを呼び出すことを推奨します。

---
_このファイルは `/kiro:steering-verification` コマンドで生成されました_
