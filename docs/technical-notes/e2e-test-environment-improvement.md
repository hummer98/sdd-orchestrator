# E2Eテスト環境の改善提案

Electronアプリ（SDD Manager）のE2Eテストを、閉じた冪等性のある環境で実行するための調査・検討結果。

## 現状分析

| 項目 | 現状 |
|------|------|
| **テストフレームワーク** | WebdriverIO + wdio-electron-service (Mocha) |
| **実行環境** | ホストマシン上で直接実行 |
| **ユーザーデータ** | `--user-data-dir={tmpdir}` で一時ディレクトリ使用 |
| **サンプルプロジェクト** | なし（テスト時に外部パス `PROJECT=` で指定） |
| **CI/CD** | GitHub Actions設定なし |
| **テストファイル** | `e2e-wdio/*.spec.ts`（3ファイル、60テスト） |

### 現在の課題

1. **ホストマシン依存**: テスト結果が実行環境に左右される
2. **テストデータの不安定性**: 外部プロジェクトに依存
3. **CI未対応**: 手動実行のみ
4. **ヘッドレス未対応**: GUI表示が必要

---

## 改善アプローチ

### アプローチ1: Xvfb + Docker コンテナ化（推奨）

最も冪等性が高く、CI/CD環境との相性も良いアプローチ。

#### Dockerfile

```dockerfile
# Dockerfile.e2e
FROM node:20-slim

# Electron依存パッケージ + Xvfb
RUN apt-get update && apt-get install -y \
    xvfb \
    libgbm1 libxss1 libnss3 libgtk-3-0 libasound2 \
    libdrm2 libxcomposite1 libxdamage1 libxrandr2 \
    fonts-noto-cjk \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# サンプルプロジェクトをコンテナ内に配置
COPY e2e-fixtures/sample-project /app/sample-project

WORKDIR /app/electron-sdd-manager
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Xvfb起動スクリプト
COPY scripts/run-e2e.sh /run-e2e.sh
RUN chmod +x /run-e2e.sh
ENTRYPOINT ["/run-e2e.sh"]
```

#### 起動スクリプト

```bash
#!/bin/bash
# scripts/run-e2e.sh
set -e

export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &
XVFB_PID=$!
sleep 2

# テスト実行（サンプルプロジェクト使用）
npm run test:e2e -- --project=/app/sample-project

kill $XVFB_PID 2>/dev/null || true
```

#### 実行コマンド

```bash
# ビルド
docker build -f Dockerfile.e2e -t sdd-manager-e2e .

# テスト実行
docker run --rm --ipc=host sdd-manager-e2e
```

**メリット:**
- 完全に隔離された環境でテスト実行
- どのマシンでも同じ結果
- GitHub Actions等のCIで即座に動作

**デメリット:**
- Dockerセットアップが必要
- ローカル開発時に若干のオーバーヘッド

---

### アプローチ2: WebdriverIO autoXvfb（軽量ヘッドレス）

WebdriverIO 9.19.1+ では `autoXvfb` が自動的にXvfbを管理。

#### wdio.conf.ts への追加設定

```typescript
export const config: WebdriverIO.Config = {
  // 既存設定...

  // ヘッドレス設定（Linux CI用）
  autoXvfb: true,
  xvfbAutoInstall: true,

  capabilities: [{
    browserName: 'electron',
    'wdio:electronServiceOptions': {
      appBinaryPath: './dist',
      appArgs: ['--no-sandbox', '--e2e-test', '--user-data-dir={tmpdir}'],
    },
    'goog:chromeOptions': {
      args: ['--headless=new', '--disable-gpu', '--no-sandbox'],
    },
  }],
};
```

**メリット:**
- 設定変更のみで対応可能
- Docker不要
- CI環境で自動的にXvfbを起動

**デメリット:**
- Electronのヘッドレスモードには制限あり
- 一部のUIテストで問題が発生する可能性

---

### アプローチ3: サンプルプロジェクト + テストフィクスチャ

テストの冪等性を確保するために、固定されたサンプルプロジェクトを用意。

#### ディレクトリ構成

```
electron-sdd-manager/
├── e2e-fixtures/
│   └── sample-project/           # 固定サンプルプロジェクト
│       ├── .kiro/
│       │   ├── steering/
│       │   │   ├── product.md
│       │   │   ├── tech.md
│       │   │   └── structure.md
│       │   ├── specs/
│       │   │   └── test-feature/
│       │   │       ├── spec.json
│       │   │       ├── requirements.md
│       │   │       ├── design.md
│       │   │       └── tasks.md
│       │   └── bugs/
│       │       └── sample-bug/
│       │           └── report.md
│       └── package.json
```

#### テストでの使用

```typescript
// e2e-wdio/fixtures.ts
import { tmpdir } from 'os';
import { mkdtempSync, cpSync, rmSync } from 'fs';
import { join } from 'path';

const FIXTURES_DIR = join(__dirname, '../e2e-fixtures/sample-project');

export function createTestProject(): string {
  // フィクスチャをtmpにコピーして独立環境を作成
  const tempDir = mkdtempSync(join(tmpdir(), 'e2e-project-'));
  cpSync(FIXTURES_DIR, tempDir, { recursive: true });
  return tempDir;
}

export function cleanupTestProject(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
```

```typescript
// e2e-wdio/example.spec.ts
import { createTestProject, cleanupTestProject } from './fixtures';

describe('Spec管理機能', () => {
  let projectPath: string;

  before(async () => {
    projectPath = createTestProject();
    // アプリをプロジェクトで起動
  });

  after(() => {
    cleanupTestProject(projectPath);
  });

  it('spec一覧が表示される', async () => {
    // テスト...
  });
});
```

**メリット:**
- 既知の状態でテスト実行可能
- テストデータの管理が容易
- 他のアプローチと組み合わせ可能

---

## GitHub Actions CI設定

```yaml
# .github/workflows/e2e-test.yml
name: E2E Tests

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: electron-sdd-manager/package-lock.json

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            xvfb \
            libgbm1 libxss1 libnss3 libgtk-3-0 libasound2 \
            libdrm2 libxcomposite1 libxdamage1 libxrandr2

      - name: Install dependencies
        run: |
          cd electron-sdd-manager
          npm ci

      - name: Build Electron app
        run: |
          cd electron-sdd-manager
          npm run build

      - name: Run E2E tests
        run: |
          cd electron-sdd-manager
          xvfb-run --auto-servernum npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: |
            electron-sdd-manager/e2e-report/
            electron-sdd-manager/e2e-results/
```

---

## Claude API連携テストの冪等性確保

### Record/Replay パターン

API呼び出しを記録し、テスト時に再生する。

```typescript
// nock または polly.js を使用
import nock from 'nock';

describe('Claude API連携', () => {
  beforeAll(() => {
    // 記録したレスポンスを再生
    nock('https://api.anthropic.com')
      .post('/v1/messages')
      .reply(200, require('./fixtures/claude-response.json'));
  });

  afterAll(() => {
    nock.cleanAll();
  });
});
```

### 環境分離

| 方法 | 説明 | 用途 |
|------|------|------|
| **Mockモード** | APIコールをモック | 高速なユニットテスト |
| **Record/Replay** | 一度の実行結果を記録・再生 | 統合テスト |
| **Sandbox API Key** | テスト専用APIキー | 実環境テスト |

---

## 比較表

| 観点 | Docker化 | autoXvfb | サンプルPJ |
|------|----------|----------|-----------|
| **冪等性** | ◎ 完全隔離 | ○ ヘッドレス | ◎ 固定データ |
| **セットアップ難易度** | 中 | 低 | 低 |
| **CI/CD互換性** | ◎ | ◎ | ◎ |
| **ローカル開発** | △ 要Docker | ○ | ◎ |
| **実際のUI確認** | △ | △ | ○ |
| **Claude API連携** | ◎ mock可能 | ○ | ○ |

---

## 推奨実装順序

1. **Phase 1: サンプルプロジェクト作成**（即効性高）
   - `e2e-fixtures/sample-project/` を作成
   - 既知の状態でテスト実行可能に

2. **Phase 2: GitHub Actions追加**（CI/CD）
   - xvfb-run でヘッドレス実行
   - PRごとに自動テスト

3. **Phase 3: autoXvfb有効化**（オプション）
   - wdio.conf.tsに設定追加
   - ローカルでもヘッドレス可能に

4. **Phase 4: Docker化**（完全隔離・オプション）
   - 必要に応じてコンテナ化
   - 最も厳密な冪等性が必要な場合

---

## 参考リンク

### Electron テスト

- [Electron: Testing on Headless CI Systems](https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci)
- [Electron: Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Electron React Boilerplate: E2E Tests](https://electron-react-boilerplate.js.org/docs/e2e-tests)

### WebdriverIO

- [wdio-electron-service (GitHub)](https://github.com/webdriverio-community/wdio-electron-service)
- [WebdriverIO: Headless & Xvfb](https://webdriver.io/docs/headless-and-xvfb/)
- [WebdriverIO: Docker Service](https://webdriver.io/docs/wdio-docker-service/)
- [WebdriverIO Electron Boilerplate](https://github.com/webdriverio/electron-boilerplate)

### Docker / CI

- [Running Electron E2E in Docker with Playwright (Dangl.Blog)](https://blog.dangl.me/archive/running-fully-automated-e2e-tests-in-electron-in-a-docker-container-with-playwright/)
- [blueimp/wdio - Docker setup for WebdriverIO](https://github.com/blueimp/wdio)
- [CircleCI: Automated testing for Electron](https://circleci.com/blog/electron-testing/)

### Playwright (代替案)

- [Playwright: Electron Support](https://playwright.dev/docs/api/class-electron)
- [Playwright GitHub Issue: Headless Electron](https://github.com/microsoft/playwright/issues/13288)

### ベストプラクティス

- [Best Practices for End-to-End Testing in 2025 (Bunnyshell)](https://www.bunnyshell.com/blog/best-practices-for-end-to-end-testing-in-2025/)
- [How to Ensure Data Consistency In E2E Tests](https://elvanco.com/blog/how-to-ensure-data-consistency-in-e2e-tests)

---

## 関連ファイル

- [wdio.conf.ts](../../electron-sdd-manager/wdio.conf.ts) - WebdriverIO設定
- [e2e-wdio/](../../electron-sdd-manager/e2e-wdio/) - E2Eテストファイル
- [src/test/setup.ts](../../electron-sdd-manager/src/test/setup.ts) - テストセットアップ（モック定義）
