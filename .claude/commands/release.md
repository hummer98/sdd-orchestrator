# Release - SDD Orchestrator新バージョンリリース

このコマンドは、SDD Orchestratorの新バージョンをリリースするための一連の手順を自動化します。

## 実行手順

以下の順序で実行してください：

### 1. 前提条件チェック

まず、未コミットの変更があるか確認します：

```bash
git status --porcelain
```

**未コミットの変更がある場合:**
- ユーザーに確認してください
- 必要であれば `/commit` コマンドを実行してコミットを作成
- コミット後、このコマンドを再実行

### 2. バージョン決定

現在のバージョンを確認し、次のバージョンを決定します：

```bash
# 現在のバージョン確認
cat electron-sdd-manager/package.json | grep '"version"'

# 最近のコミットを確認してバージョンタイプを判定
git log --oneline -10
```

**バージョンタイプの判定基準:**
- **patch (0.5.0 → 0.5.1)**: バグ修正のみ（`fix:`, `docs:` など）
- **minor (0.5.0 → 0.6.0)**: 新機能追加（`feat:` など）
- **major (0.5.0 → 1.0.0)**: 破壊的変更（`BREAKING CHANGE`）

ユーザーに次のバージョンを提案し、確認を取ってください。

### 3. package.jsonバージョン更新

決定したバージョンで `electron-sdd-manager/package.json` を更新します。

### 4. CHANGELOG.md更新

最新のコミットログから変更内容を抽出し、CHANGELOG.mdに追記します：

```bash
# 前回のリリースタグから現在までのコミットを取得
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

CHANGELOG.mdのフォーマット:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- 新機能の説明

### Fixed
- バグ修正の説明

### Changed
- 変更内容の説明
```

### 5. ビルド＆パッケージング

```bash
cd electron-sdd-manager
rm -rf release  # 古いパッケージをクリーン
npm run build   # prebuildでdistもクリーンされる
npx electron-builder --mac
```

### 5.1. パッケージング後のスモークテスト

**重要**: パッケージングしたアプリが正常に起動するか確認します。

```bash
# アプリを起動して5秒以内にクラッシュしないか確認
open "release/mac-arm64/SDD Orchestrator.app" &
sleep 5

# プロセスが生きているか確認
if pgrep -f "SDD Orchestrator" > /dev/null; then
  echo "✅ スモークテスト成功: アプリが正常に起動しました"
  pkill -f "SDD Orchestrator"
else
  echo "❌ スモークテスト失敗: アプリが起動時にクラッシュしました"
  # ここでリリースを中止し、エラーを報告
fi
```

**スモークテストが失敗した場合:**
1. エラーダイアログの内容を確認
2. Console.appでクラッシュログを確認
3. 問題を修正してから再ビルド
4. **リリースを続行しないこと**

### 6. 変更のコミット＆プッシュ

```bash
git add electron-sdd-manager/package.json CHANGELOG.md
git commit -m "chore: bump version to vX.Y.Z

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin master
```

### 7. Gitタグの作成＆プッシュ

バージョンタグを作成してリモートにプッシュ：

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

**注意**: タグはコミット後に作成し、GitHubリリース作成前にプッシュする必要があります。

### 8. GitHubリリース作成

リリースノートをCHANGELOGから抽出し、GitHubリリースを作成：

```bash
gh release create vX.Y.Z \
  --title "SDD Orchestrator vX.Y.Z" \
  --notes "[CHANGELOGから抽出したリリースノート]"
```

### 9. バイナリの添付

ビルドしたバイナリをリリースに添付：

```bash
gh release upload vX.Y.Z \
  "release/SDD Orchestrator-X.Y.Z-arm64.dmg" \
  "release/SDD Orchestrator-X.Y.Z-arm64-mac.zip"
```

### 10. Applicationsフォルダへデプロイ

```bash
rm -rf "/Applications/SDD Orchestrator.app"
cp -R "release/mac-arm64/SDD Orchestrator.app" /Applications/
```

### 11. 完了報告

ユーザーに以下を報告：
- リリースバージョン
- リリースページURL
- 主な変更内容のサマリー

## 注意事項

- このコマンドはsdd-orchestratorプロジェクト専用です
- 必ずmasterブランチで実行してください
- リリース作成前にテストが通っていることを確認してください
- バージョン番号は手動で確認・承認を得てから進めてください

## エラー処理

各ステップでエラーが発生した場合:
1. エラー内容をユーザーに報告
2. 修正方法を提案
3. 必要に応じてロールバック手順を案内
