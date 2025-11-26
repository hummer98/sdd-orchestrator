# WebdriverIO + Electron E2Eテスト調査レポート

## 調査日: 2024-11-25

---

## 1. WebdriverIO wdio-electron-serviceの概要

### 基本情報

| 項目 | 内容 |
|------|------|
| パッケージ名 | wdio-electron-service |
| 最新バージョン | v7.3.1 |
| リポジトリ | [webdriverio-community/wdio-electron-service](https://github.com/webdriverio-community/wdio-electron-service) |
| ドキュメント | [WebdriverIO Electron Service](https://webdriver.io/docs/wdio-electron-service/) |

### 主な特徴

- **自動Chromedriverセットアップ**: Electron v26以上で自動対応
- **アプリパス自動検出**: Electron Forge、Electron Builderをサポート
- **Electron API アクセス**: テスト内からElectron APIにアクセス可能
- **APIモッキング**: Vitest風のモッキングAPI

---

## 2. Playwrightとの比較：アーキテクチャの違い

### Playwright

```
Playwright → --remote-debugging-port=0 → Electron (CDP)
```

- PlaywrightはChrome DevTools Protocol (CDP)を使用
- `--remote-debugging-port=0`オプションをElectronに渡す
- **問題点**: Electron 28以降でこのオプションが拒否されるケースがある

### WebdriverIO

```
WebdriverIO → Chromedriver → Electron
```

- WebDriverプロトコル経由でChromedriverを使用
- ChromedriverがElectronとの通信を担当
- **利点**: `--remote-debugging-port`オプションを直接使用しない

---

## 3. Electronバージョン互換性

### 自動Chromedriver対応

| Electronバージョン | 対応状況 | 備考 |
|-------------------|---------|------|
| v26以上 | ✅ 自動対応 | Chrome for Testingからダウンロード |
| v26未満 | ⚠️ 手動設定必要 | Chromedriver v115以上のみ対応のため |

### デフォルトカタログ

- デフォルト: Electron ^32.0.1
- 開発ドキュメントではElectron 33のテストも確認

---

## 4. 報告されている問題

### オープンIssue（6件）

| Issue | 内容 | 関連度 |
|-------|------|--------|
| #1205 | macOS + Turborepo >= 2.5.7でタイムアウト | 高（macOS関連） |
| #1221 | arm64等のアーキテクチャサポート拡張 | 高（arm64関連） |
| #1127 | Windowsでのディープリンク問題 | 低 |
| #1081 | electron-builderカスタム設定サポート | 低 |
| #802 | Electronクラス（Tray等）のモッキング | 低 |
| #752 | Turborepo使用の改善 | 低 |

### 重要な過去のIssue

1. **Issue #508** (2024年4月): "Electron APIs can not be invoked outside of WDIO"
   - Electron Forge + Vite + TypeScriptでの設定問題

2. **Issue #13414** (2024年8月): WebdriverIO 8.40.3→9.0.4アップグレードでウィンドウが即座に閉じる
   - バージョンアップグレード時の互換性問題

---

## 5. Playwrightとの問題比較

### 共通の問題

| 問題 | Playwright | WebdriverIO |
|------|-----------|-------------|
| remote-debugging-port拒否 | ✅ 発生 | ❌ 発生しない（Chromedriver経由） |
| macOS arm64対応 | ⚠️ 未確認 | ⚠️ Issue #1205あり |
| Electron 35対応 | ❌ 確認済み問題あり | ⚠️ 未確認だが理論上OK |

### WebdriverIOの優位点

1. **Chromedriver経由**: `--remote-debugging-port`問題を回避
2. **自動Chromedriver管理**: Electronバージョンに合わせて自動ダウンロード
3. **積極的なメンテナンス**: 定期的なリリースとバグ修正

### WebdriverIOの懸念点

1. **macOS + Turborepoでのタイムアウト** (Issue #1205)
2. **設定の複雑さ**: Playwrightより設定が多い
3. **WebdriverIOエコシステムへの依存**: wdio.conf.jsの学習コスト

---

## 6. 結論と推奨

### 推奨度評価

| 評価項目 | スコア | 理由 |
|---------|--------|------|
| remote-debugging-port問題回避 | ⭐⭐⭐⭐⭐ | Chromedriver経由で回避 |
| Electron 35対応 | ⭐⭐⭐⭐ | 理論上OK、デフォルトでv32サポート |
| macOS arm64対応 | ⭐⭐⭐ | 一部Issue報告あり |
| 設定の容易さ | ⭐⭐⭐ | Playwrightより複雑 |
| ドキュメント充実度 | ⭐⭐⭐⭐ | 公式ドキュメント充実 |

### 総合判断

**WebdriverIO + wdio-electron-serviceは試す価値あり**

理由:
1. `--remote-debugging-port`問題を構造的に回避できる
2. Electron 26以上で自動Chromedriver対応
3. 現在のPlaywrightの問題が解決するまでの代替手段として有効

### 懸念事項

- macOS + Turborepoでのタイムアウト問題（Issue #1205）があるが、Turborepo未使用なら影響なし
- arm64サポート拡張のIssue（#1221）は改善中

---

## 7. 導入手順（参考）

### インストール

```bash
npm install --save-dev @wdio/cli wdio-electron-service
```

### 設定ファイル作成

```javascript
// wdio.conf.js
export const config = {
  runner: ['local'],
  specs: ['./e2e/**/*.spec.ts'],
  capabilities: [{
    browserName: 'electron',
    'wdio:electronServiceOptions': {
      appBinaryPath: './dist/main/index.js',
      // または appEntryPoint: './dist/main/index.js'
    },
  }],
  services: ['electron'],
  framework: '@wdio/mocha-framework',
  reporters: ['spec'],
};
```

---

## 参考リンク

- [WebdriverIO Electron Service Documentation](https://webdriver.io/docs/wdio-electron-service/)
- [WebdriverIO Electron Desktop Testing](https://webdriver.io/docs/desktop-testing/electron/)
- [wdio-electron-service GitHub](https://github.com/webdriverio-community/wdio-electron-service)
- [wdio-electron-service-example](https://github.com/goosewobbler/wdio-electron-service-example)
- [Chromedriver Configuration](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/configuration/chromedriver-configuration.md)

### 関連Issue

- [Electron #41325](https://github.com/electron-userland/spectron) - remote-debugging-port websocket disconnected
- [wdio-electron-service #508](https://github.com/webdriverio-community/wdio-electron-service/issues/508) - Electron APIs invocation issue
- [wdio-electron-service #1205](https://github.com/webdriverio-community/wdio-electron-service/issues/1205) - macOS Turborepo timeout

---

## 8. 実装試行結果（2025-11-25追加）

### 実装環境

| 項目 | バージョン |
|------|-----------|
| Electron | 35.5.1 |
| Chromedriver | 134.0.6998.205 |
| wdio-electron-service | 9.2.1 |
| WebdriverIO | 9.20.1 |
| macOS | darwin 23.5.0 (arm64) |

### 発生した問題

#### 持続的なセッション作成エラー

```
WebDriverError: session not created: probably user data directory is already in use,
please specify a unique value for --user-data-dir argument, or don't use --user-data-dir
```

このエラーは、公式ドキュメントによると「Electronがクラッシュした場合にも発生する」誤解を招くメッセージです。

### 試した解決策（すべて失敗）

| 解決策 | 結果 |
|--------|------|
| `--user-data-dir`をユニークなタイムスタンプで設定 | ❌ 失敗 |
| `maxInstances: 1`で並列実行防止 | ❌ 失敗 |
| テストファイルを1つに統合 | ❌ 失敗 |
| `.wdio-electron-data`ディレクトリ削除 | ❌ 失敗 |
| `--no-sandbox`引数追加 | ❌ 失敗 |
| `beforeSession`フックで動的設定 | ❌ 失敗 |
| `goog:chromeOptions`で直接引数設定 | ❌ 失敗 |
| `--e2e-test`フラグで本番ビルド使用 | ❌ 失敗 |
| `sandbox: false`設定 | ❌ 失敗 |
| パッケージ済みアプリ（.app）の使用 | ❌ 失敗 |
| `--disable-gpu`、`--disable-dev-shm-usage`追加 | ❌ 失敗 |

### 根本的な問題の分析

1. **wdio-electron-serviceが自動追加する`--inspect`引数**
   - 毎回異なるポートで`--inspect=localhost:XXXX`が追加される
   - この引数がElectronの起動に影響している可能性

2. **Electron 35 + Chromedriver 134の組み合わせ**
   - 最新の組み合わせでの互換性問題の可能性
   - Chrome 134自体にSeleniumテストでの問題報告あり（[capybara/issues/2800](https://github.com/teamcapybara/capybara/issues/2800)）

3. **macOS arm64固有の問題**
   - Issue #1205でmacOSでのタイムアウト問題が報告されている

### 結論

**WebdriverIO + wdio-electron-service v9.2.1 は、Electron 35.5.1 + Chromedriver 134 + macOS arm64 環境では動作しない**

推奨対応:
1. wdio-electron-serviceのissueに報告
2. Electronのバージョンダウングレード検討
3. 別のE2Eテストソリューションの検討
   - [Spectron](https://github.com/electron-userland/spectron)（非推奨だが動作報告あり）
   - 手動でのChromedriver設定
   - ユニットテストとインテグレーションテストへの注力

---

## 9. 再検証結果 (2025-11-26)

### 9.1 検証概要
本レポートの「Electron 35が動作しない」という結論を再検証しました。

### 9.2 検証結果
**Electron 35.5.1 は、適切な設定下で正常に動作することを確認しました。**

- **環境**: macOS arm64, Electron 35.5.1, wdio-electron-service 9.2.1
- **結果**: テスト成功 (Exit Code 0)

### 9.3 成功の要因
以前の失敗は、`--user-data-dir` の設定不備（競合）が主因であったと考えられます。
現在は `wdio.conf.ts` にて以下のようにユニークなディレクトリを動的に生成・指定することで、この問題を回避しています。

```typescript
const uniqueUserDataDir = path.join(os.tmpdir(), `wdio-electron-${Date.now()}-${Math.random().toString(36).substring(7)}`);
```

### 9.4 結論の修正
- **WebdriverIO + Electron 35 は動作します。**
- 以前の「動作しない」という結論は、設定上の問題に起因するものであり、技術的な非互換性ではありませんでした。

---

## 参考リンク（追加）

- [Chrome 134 breaks Selenium tests (capybara)](https://github.com/teamcapybara/capybara/issues/2800)
- [WebdriverIO Issue #14501 - user data directory error on Linux](https://github.com/webdriverio/webdriverio/issues/14501)
- [wdio-electron-service common issues](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/common-issues-debugging.md)

---

## 更新履歴

- 2025-11-26: 再検証結果（Electron 35動作確認）を追記
- 2025-11-25: 実装試行結果を追加
- 2024-11-25: 初版作成
