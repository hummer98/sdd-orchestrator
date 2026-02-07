# Research & Design Decisions: ipcLink シングルトン統一

## Summary

- **Feature**: `ipclink-singleton-unification`
- **Discovery Scope**: Extension（既存 tRPC IPC 層の修正）
- **Key Findings**:
  - `TRPCUntypedClient` の `requestId` カウンタがインスタンスごとに独立しており、`ipcLink()` ではなくクライアント側で ID 衝突が発生する
  - `createTRPCClientProxy()` は既存 `TRPCClient` インスタンスをラップ可能で、`getVanillaClient()` の返り値型を維持できる
  - `console-message` native API は全環境で動作し、tRPC 依存なしで Renderer console を Main に転送可能

## Research Log

### requestId 衝突の根本原因

- **Context**: 起動時に `onMenuOpenProject` subscription が phantom `data=[]` を受信する問題の調査
- **Sources Consulted**:
  - `electron-trpc/src/renderer/ipcLink.ts` - IPCClient 実装
  - `@trpc/client/src/internals/TRPCUntypedClient.ts` - requestId 管理
  - `@trpc/client/src/createTRPCClientProxy.ts` - proxy 生成
  - [electron-trpc GitHub Issue #201](https://github.com/jsonnull/electron-trpc/issues/201) - 同一問題報告

- **Findings**:
  - `TRPCUntypedClient` (line 94-97): `this.requestId = 0` で初期化、`++this.requestId` でインクリメント
  - `ipcLink()` (line 91-93): 呼び出しごとに `new IPCClient()` を生成
  - `IPCClient` (line 39-47): コンストラクタで `electronTRPC.onMessage()` にリスナー登録
  - 2つの `TRPCUntypedClient` が独立に `1, 2, 3...` と ID 採番 -> 同一 IPC チャネルで衝突
  - `IPCClient#handleResponse()` は `response.id` で `#pendingRequests` を検索するため、誤った client のリクエストにレスポンスが配信される

- **Implications**: `ipcLink()` を shared にしても `TRPCUntypedClient` が2つある限り衝突は解消しない。`TRPCUntypedClient` 自体を共有する必要がある

### createTRPCClientProxy の互換性検証

- **Context**: requirements.md の Open Question「`createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか」
- **Sources Consulted**:
  - `@trpc/client/src/createTRPCClientProxy.ts` - 関数シグネチャ
  - `@trpc/client/src/createTRPCClient.ts` - TRPCClient 型定義
  - `@trpc/react-query/src/shared/hooks/createHooksInternal.tsx` - createClient 実装

- **Findings**:
  - `createTRPCClientProxy(client: TRPCClient<TRouter>)` - `TRPCClient` を受け取る
  - `trpc.createClient(opts)` -> `createTRPCClient(opts)` -> `new TRPCUntypedClient(opts) as TRPCClient<TRouter>` を返す
  - `createTRPCProxyClient(opts)` -> `new TRPCUntypedClient(opts)` -> `createTRPCClientProxy(client)` の順で呼ぶ
  - つまり `trpc.createClient()` の返り値を `createTRPCClientProxy()` に渡すことで、追加の `ipcLink()` 呼び出しなしに proxy API を取得可能

- **Implications**: 型レベルの互換性が確認された。`CreateTRPCProxyClient<AppRouter>` 型は現行の `getVanillaClient()` 返り値と同一のため、93ファイルの呼び出し元に変更は不要

### createTRPCClientProxy の @deprecated 状態

- **Context**: `createTRPCClientProxy` は `@deprecated` / `@internal` としてマークされている
- **Sources Consulted**:
  - `@trpc/client/src/createTRPCClientProxy.ts` line 105-107: `@deprecated use 'createTRPCProxyClient' instead` / `@internal`
  - [tRPC v10 to v11 Migration Guide](https://trpc.io/docs/migrate-from-v10-to-v11)
  - [electron-trpc PR #194](https://github.com/jsonnull/electron-trpc/pull/194) - tRPC v11 サポート

- **Findings**:
  - v10 では `createTRPCClientProxy` が既存 `TRPCClient` をラップする唯一の公式手段
  - `createTRPCProxyClient` は内部的に `createTRPCClientProxy` を呼んでおり（line 133）、実質同一コードパス
  - v11 では `createTRPCClient` が直接 proxy を返す設計に変更される
  - electron-trpc の v11 サポート PR は未マージ

- **Implications**: v10 環境では `createTRPCClientProxy` を使用することに技術的リスクなし。v11 移行時にはこのラッパーが不要になるため、移行は容易

### main.tsx の初期化順序

- **Context**: Document Review I1 で指摘された `main.tsx:51` の `getVanillaClient()` が React mount 前に呼ばれる問題
- **Sources Consulted**: `src/renderer/main.tsx` line 49-60

- **Findings**:
  - `getVanillaClient().events.onAgentStartError.subscribe(undefined, { onData: ... })` が `ReactDOM.createRoot().render()` の前に実行される
  - 現行実装では `vanillaClient` が lazy initialization のため、この時点で2つ目の `ipcLink()` が呼ばれる
  - 新設計では `TRPCProvider` マウント前に共有 `TRPCClient` が存在しないため、deferred パターンが必須

- **Implications**: Deferred proxy パターンの実装が必要。subscribe 呼び出しをキューに蓄積し、`setSharedClient()` 後に flush する

### console-message native API の仕様

- **Context**: `webContents.on('console-message')` の level パラメータマッピング
- **Sources Consulted**:
  - `src/main/index.ts` line 226-235 - 既存実装
  - Electron documentation - `console-message` event

- **Findings**:
  - `console-message` event は `(event, level, message, line, sourceId)` を提供
  - `level`: 0 = verbose/debug, 1 = info/log, 2 = warning, 3 = error
  - 既存実装は一律 `logger.info()` で出力、`isE2ETest` ガード付き
  - `sourceId` はファイル URL（例: `http://localhost:5173/src/renderer/App.tsx`）

- **Implications**: `level` パラメータを直接 `logger` メソッドにマッピング可能。`sourceId` から `.pop()` でファイル名を抽出する既存パターンを維持

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **A: createTRPCClientProxy ラッパー** | provider.tsx の TRPCClient を vanillaClient で proxy 化 | ipcLink 1回、API 互換、型安全 | `@deprecated` API 使用、deferred 初期化が必要 | **Selected** |
| B: ipcLink singleton module | ipcLink() を別モジュールで singleton 化 | シンプル | requestId は TRPCUntypedClient 側で管理されるため衝突は解消しない | Rejected |
| C: vanillaClient を React context 経由に変更 | React hooks 内からのみアクセス可能に | 完全に React ライフサイクルと統合 | 93ファイルの API 変更、Zustand store から使用不可に | Rejected |
| D: electron-trpc にパッチ | requestId をグローバルカウンタに変更 | 根本修正 | 外部依存、メンテナンス負担 | Rejected |

## Design Decisions

### Decision: Deferred Proxy 実装方式

- **Context**: `main.tsx` の subscription が React mount 前に `getVanillaClient()` を呼ぶため、共有 TRPCClient が存在しない期間がある
- **Alternatives Considered**:
  1. **Proxy + Queue**: `getVanillaClient()` が Proxy オブジェクトを返し、メソッド呼び出しをキューに蓄積。`setSharedClient()` 後に replay
  2. **Lazy wait**: `getVanillaClient()` が Promise を返す非同期 API に変更
  3. **Init order change**: `main.tsx` の subscription を `useEffect` 内に移動
- **Selected Approach**: Option 1 - Proxy + Queue
- **Rationale**:
  - API シグネチャ（同期的な `getVanillaClient()` 返り値）を維持できる
  - `subscribe()` は非同期的に動作するため、queue + flush で問題なく処理可能
  - Option 2 は 93 ファイルの API 変更が必要、Option 3 は既存の動作保証を壊すリスク
- **Trade-offs**: Proxy ベースの deferred 実装はデバッグが複雑になる可能性があるが、`setSharedClient()` 後は通常の proxy に切り替わるため実行時のオーバーヘッドは初期化時のみ
- **Follow-up**: query/mutate が React mount 前に呼ばれないことの確認。万一呼ばれた場合のエラーハンドリング

### Decision: noiseFilter フィルタリング機能の代替

- **Context**: `consoleHook.ts` 削除に伴い、`noiseFilter.ts` のフィルタリング（HMR, Vite, React DevTools メッセージ除外）も失われる
- **Alternatives Considered**:
  1. `console-message` listener 内で同等のフィルタリングを実装
  2. フィルタリングなしで全メッセージを logger に記録
  3. logger レベルで制御（debug レベルを production で無効化）
- **Selected Approach**: Option 2 - フィルタリングなし
- **Rationale**:
  - HMR/Vite メッセージは dev 環境のみ、production build では発生しない
  - `console-message` の level=0 (verbose) は `logger.debug()` にマッピングされ、production では通常非表示
  - フィルタリング実装は KISS 原則に反する余分な複雑性
- **Trade-offs**: dev 環境のログファイルにノイズが増える可能性があるが、ログレベルフィルタリングで十分に制御可能

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Deferred proxy の queue flush タイミングで subscription が失われる | High | Low | `setSharedClient()` 内で即座に flush。テストで検証 |
| `createTRPCClientProxy` が将来の @trpc/client アップデートで削除される | Medium | Low | v10 内では削除されない（semver）。v11 移行時に対応 |
| `console-message` が一部の console 出力をキャプチャしない | Low | Very Low | Electron 公式 API であり、全 `console.*` をカバー |
| `rendererLogger` の `getVanillaClient()` 依存が deferred proxy で問題を起こす | Medium | Low | `rendererLogger` は通常 React mount 後に使用される。fire-and-forget パターンのため queue flush で自然に処理される |

## References

- [electron-trpc GitHub Issue #201](https://github.com/jsonnull/electron-trpc/issues/201) - 同一問題報告（Open、未修正）
- [electron-trpc PR #194](https://github.com/jsonnull/electron-trpc/pull/194) - tRPC v11 サポート（未マージ）
- [tRPC v10 to v11 Migration Guide](https://trpc.io/docs/migrate-from-v10-to-v11) - createTRPCClientProxy の移行パス
- [@trpc/client createTRPCClientProxy.ts](https://github.com/trpc/trpc/blob/main/packages/client/src/createTRPCClientProxy.ts) - ソースコード
- [tRPC Discussion #2926](https://github.com/trpc/trpc/discussions/2926) - TRPCClient 型の互換性に関する議論
