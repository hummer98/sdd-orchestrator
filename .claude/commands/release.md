# Release - SDD Orchestrator新バージョンリリース

このコマンドは、SDD Orchestratorの新バージョンをリリースするための一連の手順を自動化します。

## --auto オプション

`/release --auto` で実行すると、対話なしの完全自動リリースが実行されます。

### 動作の違い

| 項目 | 通常モード (`/release`) | 自動モード (`/release --auto`) |
|------|-------------------------|-------------------------------|
| 未コミット変更 | ユーザーに確認を求める | ドキュメント変更のみスキップ、ソースコードはエラー |
| バージョン番号 | ユーザーに提案して確認 | コミットログから自動判定 |
| 確認プロンプト | 各ステップで確認 | 全てスキップ |

### 自動判定ルール

**バージョン番号の自動判定（Semantic Versioning）:**
- `BREAKING CHANGE:` を含むコミット → **major** インクリメント (0.5.0 → 1.0.0)
- `feat:` プレフィックスのコミット → **minor** インクリメント (0.5.0 → 0.6.0)
- `fix:`, `docs:`, `chore:` のみ → **patch** インクリメント (0.5.0 → 0.5.1)

**未コミット変更の扱い:**
- `.md`, `.json` ファイルのみ → 警告してスキップ
- `.ts`, `.tsx`, `.js` 等のソースコード → エラー終了

## 実行手順

以下の順序で実行してください：

### 1. 前提条件チェック

まず、未コミットの変更があるか確認します：

```bash
UNCOMMITTED=$(git status --porcelain)

if [ -n "$UNCOMMITTED" ]; then
  # --auto モードの場合はファイル種別を判定
  if [[ "$1" == "--auto" ]]; then
    # ソースコード変更があるかチェック
    SOURCE_CHANGES=$(echo "$UNCOMMITTED" | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$')

    if [ -n "$SOURCE_CHANGES" ]; then
      echo "❌ エラー: ソースコードに未コミット変更があります。--autoモードではリリースできません。"
      echo "$SOURCE_CHANGES"
      exit 1
    fi

    # ドキュメント変更のみの場合はスキップ
    DOC_CHANGES=$(echo "$UNCOMMITTED" | grep -E '\.(md|json)$')
    if [ -n "$DOC_CHANGES" ]; then
      echo "⚠️  以下のドキュメント変更をスキップします:"
      echo "$DOC_CHANGES"
    fi
  else
    # 通常モード: ユーザーに確認
    echo "⚠️  未コミットの変更があります:"
    echo "$UNCOMMITTED"
    echo ""
    echo "必要であれば /commit コマンドを実行してコミットを作成してください。"
    exit 1
  fi
fi
```

### 2. バージョン決定

現在のバージョンを確認し、次のバージョンを決定します：

```bash
# 現在のバージョン確認
CURRENT_VERSION=$(cat electron-sdd-manager/package.json | grep '"version"' | sed 's/.*"version": "\(.*\)".*/\1/')
echo "現在のバージョン: $CURRENT_VERSION"

# 前回のリリースタグを取得
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
echo "前回のリリースタグ: $LATEST_TAG"

# --auto モードの場合は自動判定
if [[ "$1" == "--auto" ]]; then
  # コミットメッセージを解析
  COMMITS=$(git log ${LATEST_TAG}..HEAD --oneline)

  # バージョンタイプを判定
  if echo "$COMMITS" | grep -qi "BREAKING CHANGE:"; then
    VERSION_TYPE="major"
  elif echo "$COMMITS" | grep -qE "^[a-f0-9]+ feat:"; then
    VERSION_TYPE="minor"
  else
    VERSION_TYPE="patch"
  fi

  echo "📦 自動判定されたバージョンタイプ: $VERSION_TYPE"

  # バージョン番号を計算
  IFS='.' read -r -a VERSION_PARTS <<< "${CURRENT_VERSION}"
  MAJOR="${VERSION_PARTS[0]}"
  MINOR="${VERSION_PARTS[1]}"
  PATCH="${VERSION_PARTS[2]}"

  case "$VERSION_TYPE" in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
  esac

  NEXT_VERSION="$MAJOR.$MINOR.$PATCH"
  echo "✅ 次のバージョン: $NEXT_VERSION"
else
  # 通常モード: 最近のコミットを表示してユーザーに提案
  echo ""
  echo "最近のコミット:"
  git log --oneline -10

  echo ""
  echo "**バージョンタイプの判定基準:**"
  echo "- **patch**: バグ修正のみ（fix:, docs: など）"
  echo "- **minor**: 新機能追加（feat: など）"
  echo "- **major**: 破壊的変更（BREAKING CHANGE）"
  echo ""
  echo "次のバージョンを決定してください（例: 0.52.0）"
  exit 1  # ユーザーに確認を促すため一旦終了
fi
```

### 3. package.jsonバージョン更新

決定したバージョンで `electron-sdd-manager/package.json` を更新します。

```bash
# --auto モードの場合は $NEXT_VERSION を使用、通常モードの場合はユーザーに確認
if [[ "$1" != "--auto" ]]; then
  echo "package.jsonのバージョンを更新するバージョンを入力してください（例: 0.52.0）:"
  exit 1  # ユーザー入力待ち
fi

# バージョンを更新
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEXT_VERSION\"/" electron-sdd-manager/package.json
echo "✅ package.jsonを $NEXT_VERSION に更新しました"
```

### 4. CHANGELOG.md更新

最新のコミットログから変更内容を抽出し、CHANGELOG.mdに追記します：

```bash
# 前回のリリースタグから現在までのコミットを取得
COMMITS=$(git log ${LATEST_TAG}..HEAD --oneline)

# 現在の日付を取得
RELEASE_DATE=$(date +"%Y-%m-%d")

# CHANGELOGエントリを生成
echo "## [$NEXT_VERSION] - $RELEASE_DATE" > /tmp/changelog_entry.md
echo "" >> /tmp/changelog_entry.md

# featコミットを抽出
FEAT_COMMITS=$(echo "$COMMITS" | grep -E "^[a-f0-9]+ feat:" || true)
if [ -n "$FEAT_COMMITS" ]; then
  echo "### Added" >> /tmp/changelog_entry.md
  echo "$FEAT_COMMITS" | sed 's/^[a-f0-9]* feat: /- /' >> /tmp/changelog_entry.md
  echo "" >> /tmp/changelog_entry.md
fi

# fixコミットを抽出
FIX_COMMITS=$(echo "$COMMITS" | grep -E "^[a-f0-9]+ fix:" || true)
if [ -n "$FIX_COMMITS" ]; then
  echo "### Fixed" >> /tmp/changelog_entry.md
  echo "$FIX_COMMITS" | sed 's/^[a-f0-9]* fix: /- /' >> /tmp/changelog_entry.md
  echo "" >> /tmp/changelog_entry.md
fi

# その他の変更を抽出
OTHER_COMMITS=$(echo "$COMMITS" | grep -vE "^[a-f0-9]+ (feat|fix):" || true)
if [ -n "$OTHER_COMMITS" ]; then
  echo "### Changed" >> /tmp/changelog_entry.md
  echo "$OTHER_COMMITS" | sed 's/^[a-f0-9]* /- /' >> /tmp/changelog_entry.md
  echo "" >> /tmp/changelog_entry.md
fi

# CHANGELOG.mdの先頭に追加（既存の # CHANGELOG の後に挿入）
if [ -f CHANGELOG.md ]; then
  # 一時ファイルを作成
  echo "# CHANGELOG" > /tmp/new_changelog.md
  echo "" >> /tmp/new_changelog.md
  cat /tmp/changelog_entry.md >> /tmp/new_changelog.md
  # 既存のCHANGELOGから # CHANGELOG を除いた部分を追加
  tail -n +2 CHANGELOG.md >> /tmp/new_changelog.md
  mv /tmp/new_changelog.md CHANGELOG.md
else
  # CHANGELOG.mdが存在しない場合は新規作成
  echo "# CHANGELOG" > CHANGELOG.md
  echo "" >> CHANGELOG.md
  cat /tmp/changelog_entry.md >> CHANGELOG.md
fi

rm /tmp/changelog_entry.md
echo "✅ CHANGELOG.mdを更新しました"
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
# ログファイルの現在位置を記録
LOG_FILE=~/Library/Logs/sdd-orchestrator/main.log
LOG_LINES_BEFORE=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)

# 起動前のPIDを記録（既存プロセスを除外するため）
PIDS_BEFORE=$(pgrep -f "SDD Orchestrator" 2>/dev/null | tr '\n' ' ')

# アプリを起動
open "release/mac-arm64/SDD Orchestrator.app"
sleep 5

# 新しく起動したプロセスのPIDを特定
PIDS_AFTER=$(pgrep -f "SDD Orchestrator" 2>/dev/null | tr '\n' ' ')
NEW_PID=""
for pid in $PIDS_AFTER; do
  if ! echo "$PIDS_BEFORE" | grep -qw "$pid"; then
    NEW_PID="$pid"
    break
  fi
done

# 1. プロセス確認
if [ -z "$NEW_PID" ]; then
  echo "❌ スモークテスト失敗: アプリが起動時にクラッシュしました"
  exit 1
fi

# 2. ログファイルのエラーチェック
# Unhandled promise rejection, uncaught exception, fatal errors を検出
NEW_LOGS=$(tail -n +$((LOG_LINES_BEFORE + 1)) "$LOG_FILE" 2>/dev/null)
if echo "$NEW_LOGS" | grep -qi "Unhandled promise rejection\|uncaught\|exception\|fatal"; then
  echo "❌ スモークテスト失敗: 起動時にエラーが発生しました"
  echo "$NEW_LOGS" | grep -i "Unhandled promise rejection\|uncaught\|exception\|fatal"
  kill "$NEW_PID" 2>/dev/null
  exit 1
fi

echo "✅ スモークテスト成功: アプリが正常に起動しました"
kill "$NEW_PID" 2>/dev/null
```

**スモークテストが失敗した場合:**
1. 上記スクリプトの出力でエラー内容を確認
2. `tail -100 ~/Library/Logs/sdd-orchestrator/main.log` で詳細ログを確認
3. 問題を修正してから再ビルド
4. **リリースを続行しないこと**

### 6. 変更のコミット＆プッシュ

```bash
git add electron-sdd-manager/package.json CHANGELOG.md
git commit -m "chore: bump version to v$NEXT_VERSION

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin master
echo "✅ 変更をコミット＆プッシュしました"
```

### 7. Gitタグの作成＆プッシュ

バージョンタグを作成してリモートにプッシュ：

```bash
git tag v$NEXT_VERSION
git push origin v$NEXT_VERSION
echo "✅ タグ v$NEXT_VERSION を作成＆プッシュしました"
```

**注意**: タグはコミット後に作成し、GitHubリリース作成前にプッシュする必要があります。

### 8. GitHubリリース作成

リリースノートをCHANGELOGから抽出し、GitHubリリースを作成：

```bash
# /tmp/changelog_entry.md から再生成（すでに削除済みのため、CHANGELOGから抽出）
RELEASE_NOTES=$(sed -n "/## \[$NEXT_VERSION\]/,/## \[/p" CHANGELOG.md | sed '$ d' | tail -n +2)

gh release create v$NEXT_VERSION \
  --title "SDD Orchestrator v$NEXT_VERSION" \
  --notes "$RELEASE_NOTES"

echo "✅ GitHubリリースを作成しました"
```

### 9. バイナリの添付

ビルドしたバイナリをリリースに添付：

```bash
gh release upload v$NEXT_VERSION \
  "release/SDD Orchestrator-$NEXT_VERSION-arm64.dmg" \
  "release/SDD Orchestrator-$NEXT_VERSION-arm64-mac.zip"

echo "✅ バイナリをリリースに添付しました"
```

### 10. Applicationsフォルダへデプロイ

```bash
rm -rf "/Applications/SDD Orchestrator.app"
cp -R "release/mac-arm64/SDD Orchestrator.app" /Applications/
```

### 11. 完了報告

```bash
echo ""
echo "✅ リリース完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 バージョン: v$NEXT_VERSION"
echo "🔗 リリースページ: https://github.com/USER/REPO/releases/tag/v$NEXT_VERSION"
echo ""
echo "📝 主な変更内容:"
echo "$RELEASE_NOTES" | head -20
echo ""
```

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
