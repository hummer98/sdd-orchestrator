# Research & Design Decisions: tRPC Infrastructure

## Summary
- **Feature**: `trpc-infrastructure`
- **Discovery Scope**: Complex Integration（Electron Main/Preload/Rendererの全レイヤーに跨る新規通信基盤の導入）
- **Key Findings**:
  - electron-trpc v0.7.1はtRPC v10系と互換。v11対応はリライト中で未リリース
  - Electronの`webPreferences.preload`は単一ファイルのみ指定可能。preloadモジュール分離に設計上の制約あり
  - tRPCのcallerパターンにより、Electronプロセスなしで統合テストが実行可能

## Research Log

### electron-trpc vs trpc-electron（tRPCバージョン選択）

- **Context**: tRPCのElectronトランスポートライブラリとして、jsonnull/electron-trpc（v0.7.1、tRPC v10対応）とmat-sz/trpc-electron（tRPC v11対応フォーク）のどちらを採用するか
- **Sources Consulted**:
  - [jsonnull/electron-trpc GitHub](https://github.com/jsonnull/electron-trpc) - 最終リリース 2024-12-07
  - [mat-sz/trpc-electron GitHub](https://github.com/mat-sz/trpc-electron) - tRPC v11対応フォーク
  - [electron-trpc PR #194](https://github.com/jsonnull/electron-trpc/pull/194) - tRPC v11サポートPR
  - [npmjs.com/package/electron-trpc](https://www.npmjs.com/package/electron-trpc) - npm統計
- **Findings**:
  - electron-trpc v0.7.1は安定版で、weekly downloads 3,600+の実績あり
  - electron-trpc本体のtRPC v11対応は「rewrite in progress」で未リリース
  - mat-sz/trpc-electronはtRPC v11対応だが、個人メンテナンスのフォークで長期安定性が不確実
  - tRPC v10→v11の移行はRouter/Procedure定義に大きな影響はなく、主にclient側APIの変更
- **Implications**: tRPC v10系で基盤を構築し、electron-trpc公式のv11対応がリリースされた時点で移行する戦略が最もリスクが低い。Router定義は大部分流用可能

### Electron Preloadの単一ファイル制約

- **Context**: electron-trpcの`exposeElectronTRPC()`を既存preloadにどう統合するか
- **Sources Consulted**:
  - [Electron BrowserWindow docs](https://www.electronjs.org/docs/latest/api/browser-window) - webPreferences.preload仕様
  - [electron-trpc getting-started](https://electron-trpc.dev/getting-started/) - preloadセットアップ例
  - 既存コードベース: `src/main/index.ts` L222（preload指定箇所）
- **Findings**:
  - `webPreferences.preload`は`string`型で単一ファイルパスのみ受け付ける
  - electron-trpcの`exposeElectronTRPC()`は`process.once('loaded', () => { ... })`内で呼び出す
  - Viteのelectron pluginは複数のpreloadエントリーを設定可能だが、それぞれ別ファイルとしてビルドされる
  - BrowserWindow作成時に指定するpreloadは1つのみ
- **Implications**: `preload/trpc.ts`を分離モジュールとして作成し、既存の`preload/index.ts`からimportする方式が最も簡潔。preload/index.tsへの変更は`import './trpc'`の1行のみ

### tRPC React Integration（@trpc/react-query）

- **Context**: RendererプロセスからtRPC APIをReact Hooksで呼び出す設定
- **Sources Consulted**:
  - [tRPC React Query Setup](https://trpc.io/docs/client/react/setup) - 公式ドキュメント
  - [electron-trpc ipcLink](https://electron-trpc.dev/getting-started/) - IPC Link設定
- **Findings**:
  - `createTRPCReact<AppRouter>()`でReact Hooks用インスタンスを生成
  - `trpc.createClient({ links: [ipcLink()] })`でIPC Link経由のクライアントを作成
  - `trpc.Provider`と`QueryClientProvider`の二重ラップが必要
  - `QueryClient`は`useState`で遅延初期化するパターンが推奨
- **Implications**: `shared/trpc/provider.tsx`にProvider統合コンポーネントを作成し、renderer/App.tsxとremote-ui/App.tsxの両方からimportする

### tRPC callerパターン（統合テスト）

- **Context**: Electronプロセスを起動せずにtRPC Router/Procedureをテストする方法
- **Sources Consulted**:
  - [tRPC Server-Side Calls](https://trpc.io/docs/server/server-side-calls) - caller API
- **Findings**:
  - `createCallerFactory(appRouter)`でcaller factoryを生成
  - `const caller = createCaller(ctx)`でContext付きのcallerを取得
  - `await caller.system.healthCheck()`でprocedureを直接呼び出し可能
  - IPCトランスポートを介さないため、Electronプロセスの起動が不要
  - Vitest上で通常の非同期テストとして実行可能
- **Implications**: テストの実行速度が速く、CI環境でもElectron依存なしで実行可能。IPCトランスポート層のテストはelectron-trpcの責務として割り切る

### Remote UIでのtRPC対応（将来検討）

- **Context**: Remote UIは現在WebSocket経由でIPC-like通信を行っている。tRPC統合後の方針
- **Sources Consulted**:
  - 既存コードベース: `shared/api/WebSocketApiClient.ts`、`remote-ui/App.tsx`
  - tRPC WebSocket adapter documentation
- **Findings**:
  - Remote UIのApiClient抽象化層（WebSocketApiClient）は既存IPCチャンネルをWebSocket経由で中継
  - tRPCにはWebSocketトランスポート（`@trpc/client/links/wsLink`）が存在
  - electron-trpcのipcLinkはRenderer（contextBridge経由）専用でWebSocket環境では動作しない
  - Remote UIでtRPCを使用するには、Main ProcessにtRPC WebSocketサーバーを立てるか、WebSocketハンドラ内でtRPC callerを使用する方式が考えられる
- **Implications**: 本Specでは`shared/trpc/provider.tsx`の構造のみ共有し、Remote UIでのtRPC有効化は`trpc-full-migration`完了後の別Specで対応。TRPCProviderをRemote UIにも配置するが、ipcLinkが動作しないため、条件分岐またはフォールバック設計が必要（将来対応）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| electron-trpc v0.7.1 + tRPC v10 | 安定版、広く使われている | 実績あり、ドキュメント豊富 | tRPC v10固定、v11移行時の追加コスト | **採用** |
| trpc-electron (mat-sz) + tRPC v11 | tRPC v11対応フォーク | 最新API利用可能 | 個人メンテナンス、長期安定性不確実 | 見送り |
| 独自IPC Link実装 | tRPC Linkを自前実装 | 完全なカスタマイズ性 | 開発コスト大、テスト負荷大 | 見送り |

## Design Decisions

### Decision: Preload統合方式

- **Context**: electron-trpcの`exposeElectronTRPC()`をどのファイルに配置するか
- **Alternatives Considered**:
  1. 完全分離ファイル（preload/trpc.ts独立） - Electronの単一preload制約に抵触
  2. 既存preload/index.tsに直接記述 - 関心の分離が失われる（2,771行にさらに追加）
  3. 分離モジュール + import - コードは分離しつつ、単一preloadファイル制約を満たす
- **Selected Approach**: 方式3。`preload/trpc.ts`を作成し、`preload/index.ts`から`import './trpc'`
- **Rationale (Why)**:
  - Electronの技術的制約（単一preload）を満たす
  - コードの関心の分離を維持
  - 既存preloadへの変更が1行のimportのみで最小限
- **Trade-offs**: preload/index.tsへの変更が0ではなくなる（Requirements 3.3「既存preloadに影響を与えない」の解釈を拡大）
- **Follow-up**: Requirement 3.3は「機能的影響を与えない」と解釈。import追加は既存APIの動作に一切影響しない

### Decision: tRPCバージョン戦略

- **Context**: tRPC v10系（安定）vs v11系（最新）の選択
- **Alternatives Considered**:
  1. tRPC v10 + electron-trpc v0.7.1 - 安定版の組み合わせ
  2. tRPC v11 + trpc-electron (mat-sz fork) - 最新版だがフォーク依存
- **Selected Approach**: tRPC v10系
- **Rationale (Why)**:
  - electron-trpc公式のv11対応はリライト中で未リリース
  - フォーク版のメンテナンス体制が不確実
  - v10→v11移行時のRouter定義変更は最小限（主にclient API変更）
  - 基盤構築段階ではv10で十分な機能が提供される
- **Trade-offs**: v10系APIに制約される。v11の新機能（procedure type inference improvements等）は利用不可
- **Follow-up**: electron-trpc公式のv11対応リリース時に移行を検討。Router定義は大部分流用可能

### Decision: Remote UI TRPCProvider配置

- **Context**: Remote UIにもTRPCProviderを配置するか（ipcLinkは動作しないにもかかわらず）
- **Alternatives Considered**:
  1. Electron版のみにTRPCProvider配置 - Remote UI変更不要
  2. 両方にTRPCProvider配置 - 将来の統合を容易にする
- **Selected Approach**: 両方にTRPCProviderを配置するが、Remote UIではipcLinkが動作しないことを留意
- **Rationale (Why)**:
  - shared/trpc/配下のコード共有パターンに従う
  - 将来のtRPC over WebSocket対応時にProvider構造が既に整っている
  - Requirements 4.6でRemote UI版のProvider統合が明示されている
- **Trade-offs**: Remote UIでtRPC APIを呼び出すとエラーになる（ipcLinkが動作しない）ため、呼び出し側での条件分岐が必要になる可能性
- **Follow-up**: Remote UIでのtRPC呼び出しは本Specでは行わない。Providerの配置のみ

## Risks & Mitigations

- **Risk 1**: electron-trpc v0.7.1のメンテナンスが停止する可能性
  - Mitigation: tRPCのcoreライブラリ（@trpc/server, @trpc/client）は活発に開発されている。electron-trpc自体はIPC Linkのみの薄いレイヤーであり、必要に応じて自前実装に切り替え可能

- **Risk 2**: tRPC v10→v11移行時のbreaking changes
  - Mitigation: Router/Procedure定義はv10→v11で大きな変更なし。主にclient側のAPI変更。基盤構築段階でv10を採用し、移行コストを最小化

- **Risk 3**: Preload統合時のビルドエラー
  - Mitigation: Viteのelectron pluginでpreloadエントリーが正しくビルドされるか、npm run build実行で早期検証

- **Risk 4**: Remote UIでのipcLink動作不能
  - Mitigation: TRPCProvider配置のみ行い、tRPC API呼び出しは行わない。将来のWebSocketトランスポート対応で解消

## Implementation Guidance

### パッケージインストールコマンド

```bash
cd electron-sdd-manager
npm install @trpc/server@^10 @trpc/client@^10 @trpc/react-query@^10 @tanstack/react-query@^4
npm install -D electron-trpc@^0.7.1
```

### ディレクトリ構成

```
electron-sdd-manager/src/
├── main/
│   └── trpc/                    # NEW: tRPC基盤
│       ├── trpc.ts              # tRPCインスタンス
│       ├── context.ts           # Context型
│       ├── router.ts            # Root Router
│       ├── routers/
│       │   └── system.ts        # System Router (healthCheck)
│       └── __tests__/
│           └── router.test.ts   # 統合テスト
├── preload/
│   ├── index.ts                 # UPDATE: import './trpc' 追加
│   └── trpc.ts                  # NEW: exposeElectronTRPC
└── shared/
    └── trpc/                    # NEW: tRPCクライアント
        ├── client.ts            # createTRPCReact
        └── provider.tsx         # TRPCProvider
```

### Preload統合の実装詳細

`preload/trpc.ts`:
- `process.once('loaded', () => { exposeElectronTRPC(); })`パターンで実装
- `exposeElectronTRPC`はelectron-trpc/mainからimport

`preload/index.ts`への追加:
- ファイル先頭に`import './trpc';`を追加
- 他の変更は不要

### Main Process統合の実装詳細

`createWindow()`関数内で、BrowserWindow作成後に以下を追加:
- `createIPCHandler({ router: appRouter, windows: [mainWindow] })`
- try/catchでエラーハンドリングし、`projectLogger.error()`で出力

### tRPC callerパターン（テスト実装）

```typescript
// テストファイルでのcaller使用パターン
import { appRouter } from '../router';
import { createCallerFactory } from '@trpc/server';

const createCaller = createCallerFactory(appRouter);
const caller = createCaller({});  // 空Context

// テスト実行
const result = await caller.system.healthCheck();
expect(result.status).toBe('ok');
```

## References

- [electron-trpc GitHub](https://github.com/jsonnull/electron-trpc) - v0.7.1、tRPC v10対応
- [trpc-electron (mat-sz fork)](https://github.com/mat-sz/trpc-electron) - tRPC v11対応フォーク
- [tRPC v10 Documentation](https://trpc.io/docs/v10/quickstart) - tRPC v10公式ドキュメント
- [tRPC React Query Setup](https://trpc.io/docs/client/react/setup) - React統合設定
- [tRPC Server-Side Calls](https://trpc.io/docs/server/server-side-calls) - callerパターン
- [tRPC v10→v11 Migration Guide](https://trpc.io/docs/migrate-from-v10-to-v11) - 将来の移行参考
