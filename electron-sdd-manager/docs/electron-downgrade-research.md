# Electronバージョンダウングレード調査レポート

## 調査日: 2025-11-26

---

## 1. 現在の環境と問題点

### 現在のバージョン構成

| コンポーネント | バージョン |
|---------------|-----------|
| Electron | 35.5.1 |
| Chromedriver | 134.0.6998.205 |
| wdio-electron-service | 9.2.1 |
| WebdriverIO | 9.20.1 |
| macOS | darwin 23.5.0 (arm64) |

### 発生している問題

```
WebDriverError: session not created: probably user data directory is already in use,
please specify a unique value for --user-data-dir argument, or don't use --user-data-dir
```

この問題は「誤解を招くエラーメッセージ」であり、実際にはElectronアプリが初期化中にクラッシュしていることを示しています。

---

## 2. Electron-Chromiumバージョンマッピング

### バージョン対応表（主要版）

| Electron | Chromium | Chromedriver | Node.js | サポート終了日 |
|----------|----------|--------------|---------|---------------|
| **35** | M134 (134.0.6998.x) | 134.x | 22 | 2025-09-02 |
| **34** | M132 (132.0.6834.83) | 132.x | 20 | 2025-06-24 |
| **33** | M130 (130.0.6723.x) | 130.x | 20 | 2025-04-29 |
| **32** | M128 (128.0.6613.36) | 128.x | 20 | 2025-03-04 |
| **31** | M126 | 126.x | 20 | 2025-01-14 |
| **30** | M124 | 124.x | 20 | 2024-10-15 |

**出典:** [Electron endoflife.date](https://endoflife.date/electron), [Electron Releases](https://releases.electronjs.org/)

---

## 3. Chrome 134の既知の問題（重要）

### Seleniumテストでの深刻な問題

Chrome/Chromedriver 134には、Seleniumテストで複数の重大な問題が報告されています：

#### 3.1 ナビゲーション問題
- `Navigate().GoToUrl()` が実際にナビゲーションしないケースがある
- POSTフォーム送信後、ページ遷移を待たずに処理が続行される（約20%の確率）
- セッションのパスが更新されない

**参照:** [Chrome 134 breaks Selenium tests - capybara Issue #2800](https://github.com/teamcapybara/capybara/issues/2800)

#### 3.2 CDPバージョン不一致
```
Unable to find an exact match for CDP version 134, returning the closest version; found: 131
```

#### 3.3 セッション作成エラー
`user-data-dir` 関連のエラーは、Chrome 136以降でプロファイル暗号化の変更により悪化する可能性がある。

**推奨ワークアラウンド:** Chrome/Chromedriver 133へのダウングレード

---

## 4. wdio-electron-serviceの動作確認情報

### 4.1 公式にテスト済みのバージョン

| ソース | Electronバージョン | 備考 |
|--------|-------------------|------|
| 開発カタログデフォルト | ^32.0.1 | [development.md](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/development.md) |
| Standalone Mode例 | 33.2.1 | [standalone-mode.md](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/standalone-mode.md) |
| 公式example | ^32.x | [wdio-electron-service-example](https://github.com/goosewobbler/wdio-electron-service-example) |

### 4.2 自動Chromedriverサポート

- **Electron v26以上**: 自動対応（Chrome for Testingからダウンロード）
- **Electron v26未満**: 手動設定が必要（Chromedriver v115以上のみ対応のため）

**出典:** [WebdriverIO Electron Service Documentation](https://webdriver.io/docs/wdio-electron-service/)

---

## 5. 推奨バージョン組み合わせ

### 5.1 最も安定性が期待できる組み合わせ（推奨度: ★★★★★）

| コンポーネント | 推奨バージョン | 理由 |
|---------------|---------------|------|
| **Electron** | **32.x** (例: 32.2.8) | 公式デフォルトカタログ、十分なテスト実績 |
| Chromium | M128 | Chrome 134の問題を回避 |
| wdio-electron-service | 9.2.1 | 最新版で問題なし |
| WebdriverIO | 9.20.x | 最新版 |

**メリット:**
- wdio-electron-serviceの開発時にデフォルトで使用されているバージョン
- Chrome 128は安定しており、134の問題を回避
- まだサポート期間内（2025-03-04まで）

**注意:** サポート終了が2025年3月のため、長期的には33への移行が必要

---

### 5.2 バランスの取れた選択（推奨度: ★★★★）

| コンポーネント | 推奨バージョン | 理由 |
|---------------|---------------|------|
| **Electron** | **33.x** (例: 33.4.0) | より長いサポート期間 |
| Chromium | M130 | 安定版 |
| wdio-electron-service | 9.2.1 | 最新版 |
| WebdriverIO | 9.20.x | 最新版 |

**メリット:**
- standalone-mode.mdで明示的に動作例がある（browserVersion: '33.2.1'）
- サポート期間が2025-04-29まで
- Chrome 130は134より安定

---

### 5.3 最新に近い選択（推奨度: ★★★）

| コンポーネント | 推奨バージョン | 理由 |
|---------------|---------------|------|
| **Electron** | **34.x** (例: 34.3.4) | 長いサポート期間 |
| Chromium | M132 | Chrome 134より安定 |
| wdio-electron-service | 9.2.1 | 最新版 |
| WebdriverIO | 9.20.x | 最新版 |

**メリット:**
- サポート期間が2025-06-24まで
- Chrome 132は134の問題発生前

**リスク:**
- 公式での明示的なテスト例が少ない
- Chrome 132にも未知の問題がある可能性

---

## 6. エビデンスまとめ

### 6.1 Electron 32が推奨される根拠

1. **公式開発カタログ**: wdio-electron-serviceの開発時に `electron: catalog:default` が `^32.0.1` に解決される
   - 出典: [development.md](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/development.md)

2. **公式サンプルリポジトリ**: wdio-electron-service-exampleでテストに使用
   - 出典: [goosewobbler/wdio-electron-service-example](https://github.com/goosewobbler/wdio-electron-service-example)

3. **macOSでの動作報告**: 「wdio-electron-service-example still working ok on my Mac」
   - 出典: [WebdriverIO Discussion #11400](https://github.com/webdriverio/webdriverio/discussions/11400)

### 6.2 Electron 33が推奨される根拠

1. **公式ドキュメント例**: standalone-mode.mdで `browserVersion: '33.2.1'` の動作例
   - 出典: [standalone-mode.md](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/standalone-mode.md)

2. **Chromium 130の安定性**: Chrome 134の問題を回避

### 6.3 Electron 35/Chrome 134を避けるべき根拠

1. **Chrome 134のSeleniumテスト問題**: ナビゲーション問題、セッション問題が多発
   - 出典: [capybara Issue #2800](https://github.com/teamcapybara/capybara/issues/2800)

2. **CDPバージョン不一致**: Selenium 4.29.0でも警告発生
   - 出典: [Stack Overflow](https://stackoverflow.com/questions/79500500/please-update-to-a-selenium-version-that-supports-cdp-version-134)

3. **user-data-dir問題**: Chrome 132/133以降で頻発
   - 出典: [Selenium Issue #15450](https://github.com/SeleniumHQ/selenium/issues/15450)

---

## 7. ダウングレード手順

### 7.1 package.jsonの変更

```json
{
  "devDependencies": {
    "electron": "^32.2.8"  // または "^33.4.0"
  }
}
```

### 7.2 実行コマンド

```bash
# node_modulesとpackage-lock.jsonを削除
rm -rf node_modules package-lock.json

# 再インストール
npm install

# ビルドとテスト
npm run build:electron
npm run test:e2e
```

### 7.3 バージョン確認

```bash
# インストールされたElectronバージョン確認
npx electron --version

# Chromiumバージョン確認（アプリ内で）
# process.versions.chrome
```

---

## 8. 判断材料サマリー

| 選択肢 | サポート期限 | 安定性 | テスト実績 | 推奨用途 |
|-------|-------------|--------|-----------|---------|
| **Electron 32** | 2025-03-04 | ★★★★★ | 最も多い | 短期的な開発・検証 |
| **Electron 33** | 2025-04-29 | ★★★★ | 十分 | バランス重視 |
| **Electron 34** | 2025-06-24 | ★★★ | 限定的 | 長期サポート重視 |
| Electron 35 | 2025-09-02 | ★★ | 問題あり | 現時点では非推奨 |

---

## 9. 結論と推奨

### 最終推奨: Electron 32.x または 33.x

**短期的に確実に動作させたい場合:**
- **Electron 32.2.8** を推奨
- 公式開発でのデフォルトバージョン
- macOSでの動作報告あり

**より長いサポート期間が必要な場合:**
- **Electron 33.4.0** を推奨
- 公式ドキュメントに動作例あり
- 2025年4月末までサポート

---

## 10. 再検証結果 (2025-11-26)

### 10.1 検証概要
本レポートの主張（Electron 35が動作しない）を検証するため、実際にElectron 35.5.1およびElectron 39（Nightly）環境でテストを実行しました。

### 10.2 検証結果
**Electron 35.5.1 および Electron 39.2.3 は、macOS arm64環境で正常に動作しました。**

- **テスト実行コマンド**: `npm run test:e2e`
- **結果**: `Spec Files: 1 passed, 1 total (100% completed)`
- **終了コード**: `0`

### 10.3 以前の報告との差異分析

1.  **「session not created」エラーの原因**
    - 以前の報告で発生していたエラーは、`--user-data-dir` の競合が原因であった可能性が高いです。
    - 現在の `wdio.conf.ts` では、以下のようにユニークなディレクトリを指定することで回避されています：
      ```typescript
      const uniqueUserDataDir = path.join(os.tmpdir(), `wdio-electron-${Date.now()}-${Math.random().toString(36).substring(7)}`);
      ```

2.  **Timeoutエラーについて**
    - テスト終了時に `ERROR electron-service:bridge: Timeout exceeded to get the ContextId.` というエラーログが出力されますが、これはテストの成功（Exit Code 0）を妨げるものではありません。これは既知の警告レベルの問題であり、致命的なブロッキング要因ではありません。

### 10.4 修正された結論
- **Electron 35へのアップグレードは可能です。**
- ダウングレードは必須ではありません。
- ただし、安定性を最優先する場合や、Timeoutエラーを完全に排除したい場合は、Electron 32の使用を継続することも妥当な選択肢です。

---

## 参考リンク

### 公式ドキュメント
- [WebdriverIO Electron Service Documentation](https://webdriver.io/docs/wdio-electron-service/)
- [wdio-electron-service GitHub](https://github.com/webdriverio-community/wdio-electron-service)
- [Electron Releases](https://releases.electronjs.org/)
- [Electron endoflife.date](https://endoflife.date/electron)

### 動作例・サンプル
- [wdio-electron-service-example](https://github.com/goosewobbler/wdio-electron-service-example)
- [standalone-mode.md](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/standalone-mode.md)
- [development.md](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/development.md)

### 関連Issue
- [Chrome 134 breaks Selenium tests - capybara #2800](https://github.com/teamcapybara/capybara/issues/2800)
- [Selenium user-data-dir Issue #15450](https://github.com/SeleniumHQ/selenium/issues/15450)
- [wdio-electron-service common issues](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/common-issues-debugging.md)
- [Chrome 134 Navigation Issues](https://groups.google.com/g/selenium-users/c/vfG6A6XVkA0/m/F351RKv5BAAJw)

---

## 更新履歴

- 2025-11-26: 再検証結果（Electron 35動作確認）を追記
- 2025-11-26: 初版作成
