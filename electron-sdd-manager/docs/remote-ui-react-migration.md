# Remote UI React化検討

## 概要

Remote UI（`src/main/remote-ui/`）をReactに移行し、Electron Rendererとコンポーネントを共有する構想についての技術検討文書。

**作成日**: 2025-01-07
**ステータス**: 検討中
**前提**: AI Agent による開発・E2Eテストでの検証を想定

---

## 現状のアーキテクチャ

### Remote UI（現在）

| 項目 | 内容 |
|------|------|
| フレームワーク | Vanilla JavaScript（フレームワークなし） |
| ビルド | 不要（静的ファイルとして直接配信） |
| スタイリング | Tailwind CSS CDN + カスタムCSS |
| 通信 | WebSocket（リアルタイム双方向） |
| コード量 | 約4,600行（6ファイル） |

```
src/main/remote-ui/
├── index.html        (291行)  - ページ構造、Tailwind設定
├── app.js            (967行)  - メインアプリ、ルーター、状態管理
├── components.js     (2,164行) - UIコンポーネントクラス群
├── websocket.js      (423行)  - WebSocket管理、自動再接続
├── logFormatter.js   (349行)  - ログフォーマッター
└── styles.css        (430行)  - カスタムスタイル
```

### Electron Renderer

| 項目 | 内容 |
|------|------|
| フレームワーク | React + TypeScript |
| ビルド | Vite |
| 状態管理 | Zustandパターン |
| 通信 | IPC（contextBridge経由） |
| コンポーネント数 | 105+ |

---

## ビルドパイプラインの変化

### 現在 vs React化後

```
現在:
  src/main/remote-ui/*.js → HTTP直接配信（ビルド不要）

React化後:
  src/remote-ui/*.tsx → Viteビルド → dist/remote-ui/ → HTTP配信
```

### 具体的な変更点

#### 1. 2つのReactアプリの管理

```
electron-sdd-manager/
├── src/renderer/          # Electron Renderer用React
│   ├── main.tsx
│   └── vite.config.ts
└── src/remote-ui/         # Remote UI用React（新規）
    ├── main.tsx
    └── vite.config.ts     # 別のVite設定が必要
```

**参考**: [Vite Multiple Entry Points](https://opiispanen.com/blog/vite-multiple-entry-points)によると、複数エントリーポイントには以下のアプローチがある：

1. **環境変数による切り替え**: `ENTRY=remote vite build`
2. **複数回のビルド実行**: `npm run build:renderer && npm run build:remote`
3. **rollupOptionsでのマルチエントリー設定**

#### 2. 開発・検証ワークフロー

```bash
# React化後のAI Agentワークフロー
1. コード編集: src/remote-ui/components/SpecCard.tsx
2. ビルド: npm run build:remote  # 数秒
3. 検証: npx playwright test または Playwright MCP で確認
```

#### 3. 本番ビルドの順序

```bash
# ビルド順序
1. Remote UIをビルド → dist/remote-ui/
2. Electronアプリをビルド（Remote UIを含める）
3. パッケージング
```

**参考**: [Building Multiple Entrypoints in React using Vite](https://mikemackintosh.medium.com/building-multiple-entrypoints-in-react-using-vite-eac2cb5a8a72)

#### 4. バンドルサイズの増大

| 項目 | 現在 | React化後（推定） |
|-----|-----|------------------|
| 転送サイズ | ~15KB (gzip) | ~150-300KB |
| 初期ロード | 即座 | React hydration待ち |
| CDN依存 | Tailwindのみ | なし（バンドル込み） |

**注**: ローカル/LAN内では問題なし。Cloudflare Tunnel経由のモバイル接続では影響あり。

---

## AI Agent開発における評価

### ビルドパイプライン問題の影響

| 問題 | 人間開発者 | AI Agent |
|------|-----------|----------|
| HMRがない | 開発体験悪化 | **無関係**（待てばよい） |
| 2サーバー管理 | 混乱する | **手順化すれば問題なし** |
| ビルド待ち数秒 | ストレス | **許容可能** |
| 設定の複雑化 | 理解コスト | **一度作れば再利用** |

### AI Agentの検証ワークフロー

```bash
# 1. コード変更
Edit src/remote-ui/components/SpecCard.tsx

# 2. ビルド（数秒待つだけ）
npm run build:remote

# 3. E2Eテストで確認
npx playwright test remote-ui.spec.ts

# 4. または Playwright MCP で直接確認
mcp__playwright__browser_navigate → localhost:8765
mcp__playwright__browser_snapshot → 状態確認
```

**AI Agentにとって「ビルド待ち時間」は問題にならない。**

### 残る考慮事項

| 項目 | 対応 |
|------|------|
| 初期セットアップの複雑さ | 一度構築すれば再利用可能 |
| バンドルサイズ増大 | LAN内は問題なし、Tunnel経由は影響あり |
| デバッグ時のソースマップ | source-map設定で解決可能 |

---

## 通信層の抽象化

### 現在の通信方式の違い

```typescript
// Electron Renderer - IPC経由
const specs = await window.electronAPI.getSpecs()
await window.electronAPI.executePhase(specName, phase)

// Remote UI - WebSocket経由
websocket.send({ type: 'GET_SPECS' })
websocket.on('SPECS_UPDATED', (specs) => { ... })
```

### 共通化のためのアプローチ

#### Option A: サービス層の抽象化

```typescript
// 共通インターフェース
interface SpecService {
  getSpecs(): Promise<Spec[]>
  executePhase(specName: string, phase: string): Promise<void>
  onSpecsUpdated(callback: (specs: Spec[]) => void): () => void
}

// 環境別実装
class ElectronSpecService implements SpecService { ... }
class WebSocketSpecService implements SpecService { ... }
```

**課題**:
- 全IPC/WebSocketメッセージを抽象化する必要
- リアルタイム性のセマンティクスが異なる（push vs pull）
- エラーハンドリング・再接続ロジックの違い

#### Option B: Presentational/Container分離（推奨）

```typescript
// 共有可能（propsのみ受け取る）
function SpecCard({ spec, onExecute }: Props) {
  return <div>...</div>
}

// 環境別（データ取得を担当）
function ElectronSpecList() {
  const specs = useElectronSpecs()  // IPC
  return specs.map(s => <SpecCard spec={s} />)
}

function RemoteSpecList() {
  const specs = useWebSocketSpecs()  // WebSocket
  return specs.map(s => <SpecCard spec={s} />)
}
```

**利点**: 純粋なUIコンポーネント（Presentational）を共有し、データ取得層は環境別に実装。

---

## Hono採用の検討

現在のHTTPサーバー実装（`remoteAccessServer.ts`）はNode.js標準の`http.createServer`を使用。Honoへの移行を検討。

### 現在の実装

```typescript
// remoteAccessServer.ts
import { createServer, Server } from 'http';

this.httpServer = createServer((req, res) => {
  // 手動でリクエストハンドリング
});
```

### Honoとは

[Hono](https://hono.dev/)はWeb Standards APIベースの軽量Webフレームワーク。Node.js、Deno、Bun、Cloudflare Workersなど複数のランタイムで動作。

### パフォーマンス比較

**参考**: [Hono.js vs Express.js Benchmark](https://github.com/thejaAshwin62/Hono-Express-Benchmark)

| フレームワーク | リクエスト/秒 | 平均レイテンシ |
|--------------|-------------|---------------|
| Express | ~16,438 | 7.60ms |
| Hono | ~58,296 | 2.14ms |

Honoは**約3.5倍高速**。

### Honoのメリット

#### 1. モダンなAPI設計

```typescript
// Hono版
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './remote-ui' }))
app.get('/api/specs', (c) => c.json(specs))
app.post('/api/phase', async (c) => {
  const body = await c.req.json()
  return c.json({ success: true })
})

// Node.js で起動
import { serve } from '@hono/node-server'
serve({ fetch: app.fetch, port: 8765 })
```

**参考**: [Hono Node.js Getting Started](https://hono.dev/docs/getting-started/nodejs)

#### 2. TypeScriptネイティブ

```typescript
// 型安全なルーティング
app.get('/api/specs/:name', (c) => {
  const name = c.req.param('name')  // 型推論される
  return c.json({ name })
})
```

#### 3. 静的ファイル配信の簡素化

```typescript
// 現在（手動実装の StaticFileServer クラス）
// → Honoのミドルウェアで置き換え可能

import { serveStatic } from '@hono/node-server/serve-static'

app.use('/*', serveStatic({
  root: './remote-ui',
  rewriteRequestPath: (path) => path.replace(/^\//, '')
}))
```

**参考**: [Hono Static File Serving](https://deepwiki.com/honojs/node-server/2.4-static-file-serving)

#### 4. ミドルウェアエコシステム

- CORS
- 認証（Bearer Token）
- ロギング
- 圧縮（gzip/brotli）

### Honoのデメリット

#### 1. WebSocket統合の手間

HonoはHTTPフレームワークであり、WebSocketは別途`ws`ライブラリを使用する必要がある（現状と同じ）。

```typescript
// WebSocketは現状のまま ws ライブラリを使用
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ server: httpServer })
```

ただし、Honoは`@hono/node-server`経由でNode.jsのHTTPサーバーを取得できるため、WebSocketServerとの統合は可能。

#### 2. 依存関係の追加

```json
// 追加パッケージ
"hono": "^4.x",
"@hono/node-server": "^1.x"
```

現在の`http`モジュール（Node.js標準）から外部依存に変更。

#### 3. エコシステムの成熟度

**参考**: [Hono vs Express](https://medium.com/@ananyavhegde2001/hono-vs-express-why-im-reconsidering-my-go-to-framework-4163f1d1be5b)

> Express's ecosystem took 13+ years to build. Hono's ecosystem is growing fast, but it's younger.

ただし、Remote UIサーバーで必要な機能（静的ファイル配信、CORS、認証）は十分サポートされている。

### Hono採用の影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `remoteAccessServer.ts` | HTTPサーバー作成部分をHonoに置き換え |
| `staticFileServer.ts` | 削除可能（HonoのserveStaticで代替） |
| `webSocketHandler.ts` | 変更なし（wsライブラリ継続使用） |

### 重要: HonoとReact化は独立した問題

```
┌─────────────────────────────────────────────────────┐
│  Remote UI アーキテクチャ                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [ブラウザ]                    [Node.js]            │
│                                                     │
│  ┌─────────────┐              ┌─────────────┐      │
│  │ Remote UI   │ ←── HTTP ──→ │ HTTPサーバー │      │
│  │ (HTML/JS)   │              │             │      │
│  └─────────────┘              └─────────────┘      │
│        ↑                            ↑              │
│        │                            │              │
│   React化の影響              Hono化の影響          │
│   (フロントエンド)           (バックエンド)        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Hono化はサーバー側の改善であり、React化（クライアント側）とは独立して実施可能。

---

## 推奨アプローチ

### AI Agent開発前提での段階的改善

#### Phase 1: 型・ユーティリティの共有

```
src/shared/
├── types/          # 型定義を共有
│   ├── spec.ts
│   ├── bug.ts
│   └── agent.ts
├── utils/          # ユーティリティ共有
│   ├── logFormatter.ts
│   ├── dateFormat.ts
│   └── phaseWorkflow.ts
└── constants/      # 定数共有
    └── phases.ts
```

#### Phase 2: Remote UI React化 + ビルド設定整備

- Vite設定の追加（remote-ui用エントリーポイント）
- ビルドスクリプトの整備
- Presentationalコンポーネントの共有
- E2Eテストの整備

#### Phase 3: Hono化（オプション）

- `remoteAccessServer.ts`をHonoベースにリファクタリング
- `staticFileServer.ts`を削除
- パフォーマンス改善・コード簡素化

---

## 結論

### AI Agent開発前提での評価

| 観点 | React化 | Hono化 | 型共有のみ |
|-----|--------|-------|-----------|
| 実装コスト | 中 | 中 | 低 |
| コンポーネント共有 | ◎ | - | - |
| 型安全性向上 | ◎ | ◎ | ◎ |
| ビルド複雑化 | △（AI Agentには軽微） | - | - |
| パフォーマンス | △ | ◎ | - |
| E2E検証との相性 | ◎ | - | - |

### 推奨

**AI Agent + E2Eテスト前提であれば、React化のデメリット（ビルドパイプラインの複雑化）は大幅に軽減される。**

1. **Phase 1**: 型共有から始める（低コスト・即効性あり）
2. **Phase 2**: React化を実施（コンポーネント共有のメリットを享受）
3. **Phase 3**: 必要に応じてHono化（パフォーマンス改善）

---

## 参考リンク

### ビルドパイプライン
- [Build an Electron app with electron-vite](https://blog.logrocket.com/build-electron-app-electron-vite/)
- [Vite Multiple Entry Points](https://opiispanen.com/blog/vite-multiple-entry-points)
- [Building Multiple Entrypoints in React using Vite](https://mikemackintosh.medium.com/building-multiple-entrypoints-in-react-using-vite-eac2cb5a8a72)

### Hono
- [Hono公式ドキュメント](https://hono.dev/)
- [Hono Node.js Getting Started](https://hono.dev/docs/getting-started/nodejs)
- [Hono.js vs Express.js Benchmark](https://github.com/thejaAshwin62/Hono-Express-Benchmark)
- [Hono Static File Serving](https://deepwiki.com/honojs/node-server/2.4-static-file-serving)
- [Hono vs Express: Why I'm Reconsidering](https://medium.com/@ananyavhegde2001/hono-vs-express-why-im-reconsidering-my-go-to-framework-4163f1d1be5b)

### Electron + React
- [Supercharge Desktop App Development with Vite and Electron](https://www.somethingsblog.com/2025/05/26/supercharge-your-desktop-app-development-with-vite-and-electron/)
- [Building Electron desktop apps with React](https://blog.codemagic.io/building-electron-desktop-apps-with-react/)
