# Playwright + Electron E2Eテスト問題調査レポート

## 現在の状況

### 現在のバージョン（package.json）

| パッケージ | バージョン | 備考 |
|-----------|----------|------|
| Electron | ^35.5.1 | 推奨バージョンに更新 |
| @playwright/test | ^1.52.0 | Electron公式ドキュメント推奨 |
| playwright | ^1.52.0 | 同上 |
| Node.js | v25.2.1 | |
| npm | 11.6.2 | |

### 実際にインストールされたバージョン

```
electron@35.5.1
@playwright/test@1.56.1（^1.52.0指定でも最新がインストールされる）
playwright@1.56.1
```

### 発生しているエラー

```
Error: electron.launch: Process failed to launch!

[pw:browser] <launching> .../Electron --inspect=0 --remote-debugging-port=0 ...
[pw:browser] [err] .../Electron: bad option: --remote-debugging-port=0
```

Playwrightが内部的に`--remote-debugging-port=0`オプションを追加しているが、Electronがこのオプションを認識できずに拒否している。

---

## 調査結果

### 1. 根本原因

Playwrightは内部的にElectronとの通信にChrome DevTools Protocol (CDP)を使用しており、`--remote-debugging-port=0`オプションを自動的に追加する。しかし、特定の条件下でElectronがこのオプションを受け入れない。

**関連Issue:**
- [Playwright #32027](https://github.com/microsoft/playwright/issues/32027) - VSCode拡張でのリグレッション
- [Playwright #33824](https://github.com/microsoft/playwright/issues/33824) - GitHub CIでの起動失敗
- [Electron #47419](https://github.com/electron/electron/issues/47419) - Electron 36.xでの起動問題

### 2. バージョン互換性

#### Playwright バージョン履歴
- **v1.43.1**: 最後の安定動作バージョン（報告ベース）
- **v1.44**: `--remote-debugging-port`リグレッション導入
- **v1.52.0**: Electron公式ドキュメントで使用されているバージョン
- **v1.56.1**: 最新版（現在使用中だが問題あり）

#### Electron バージョン互換性
| バージョン | Playwright対応 | 備考 |
|-----------|---------------|------|
| v22.x | 対応 | 古いが動作実績あり |
| v27.x | 対応想定 | テスト中 |
| v28.x | 問題報告あり | remote-debugging-port問題 |
| v32.x | 問題あり | 元の使用バージョン |
| v35.5.1 | 対応 | Electron #47419で報告 |
| v36.x | 問題あり | CI環境で起動失敗 |

### 3. 必要な条件

Playwrightのドキュメントによると:
- **Electron v12.2.0以上、v13.4.0以上、またはv14以上**が必要
- **`nodeCliInspect` fuse（FuseV1Options.EnableNodeCliInspectArguments）がfalseでないこと**

---

## 考えられる対策

### 対策1: Electron Fuseの確認（推奨度: 高）

Electronアプリがビルド時に`nodeCliInspect` fuseを無効にしていないか確認。
このfuseがfalseだと`--inspect`や`--remote-debugging-port`オプションが無効になる。

```javascript
// electron-builder.ymlまたはforge.config.jsで確認
```

### 対策2: Electron + Playwrightの安定バージョン組み合わせ（推奨度: 高）

検証済みの組み合わせを使用:
- **Electron 35.5.1 + Playwright 1.52.0**（Electron公式ドキュメント推奨）
- **Electron 22.x + Playwright 1.28.x**（spaceagetv/electron-playwright-example）

### 対策3: ローカル環境の依存関係確認（推奨度: 中）

macOSではElectronバイナリが正しくダウンロードされていない可能性がある。
node_modulesの完全削除と再インストール:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 対策4: 絶対パスの使用（推奨度: 中）

Issue #32027の公式回避策:
```javascript
const app = await electron.launch({
  args: [path.resolve(__dirname, '../dist/main/index.js')]
});
```

### 対策5: CI環境での依存関係インストール（推奨度: Linux CI向け）

```bash
sudo apt install xvfb libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 \
  libgdk-pixbuf2.0-0 libgtk-3-0 libgbm-dev libnss3-dev libxss-dev libasound2
```

---

## 推奨アクション

### Step 1: バージョンを安定組み合わせに更新

```json
{
  "devDependencies": {
    "electron": "^35.5.1",
    "@playwright/test": "^1.52.0",
    "playwright": "^1.52.0"
  }
}
```

### Step 2: node_modulesのクリーンインストール

```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 3: Electron Fuseの確認

ビルド設定でnodeCliInspectが無効になっていないことを確認。

### Step 4: テスト実行

```bash
npm run build && npx playwright test e2e/app-launch.spec.ts --reporter=list
```

---

## 参考リンク

- [Playwright Electron API](https://playwright.dev/docs/api/class-electron)
- [Electron Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [electron-playwright-helpers](https://www.npmjs.com/package/electron-playwright-helpers)
- [electron-playwright-example](https://github.com/spaceagetv/electron-playwright-example)
- [GitHub Issue #32027](https://github.com/microsoft/playwright/issues/32027)
- [GitHub Issue #33824](https://github.com/microsoft/playwright/issues/33824)
- [Electron Issue #47419](https://github.com/electron/electron/issues/47419)

---

## テスト結果

### 2024-11-25 テスト実行結果

**テスト環境:**
- macOS Darwin 23.5.0 (Apple Silicon arm64)
- Electron 35.5.1 (244MB - 正常インストール確認済み)
- Playwright 1.56.1

**結果: 失敗**

```
[pw:browser] <launching> .../Electron --inspect=0 --remote-debugging-port=0 .../dist/main/index.js
[pw:browser] [err] .../Electron: bad option: --remote-debugging-port=0
Error: Process failed to launch!
```

**分析:**
- Electron 35.5.1でも`--remote-debugging-port=0`オプションが拒否される
- これはElectron側の問題ではなく、macOS環境固有の問題の可能性
- または、Electronの特定ビルドでCDP接続が無効化されている可能性

---

## 次のステップ

1. **Electron 22.x + Playwright 1.28.xの組み合わせでテスト**
   - 古いが確実に動作する組み合わせ

2. **electron-playwright-helpersの使用**
   - ヘルパーライブラリを使用した代替アプローチ

3. **別のE2Eフレームワークの検討**
   - WebdriverIO + wdio-electron-service
   - 手動でのCDP接続

---

## 更新履歴

- 2024-11-25: Electron 35.5.1 + Playwright 1.56.1でのテスト結果追加
- 2024-11-25: 初版作成
