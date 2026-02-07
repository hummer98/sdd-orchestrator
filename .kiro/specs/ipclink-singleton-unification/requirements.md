# Requirements: ipcLink シングルトン統一

## Decision Log

### 根本原因の特定
- **Discussion**: 起動時に `onMenuOpenProject` tRPC subscription が phantom `data=[]` を受信し、`selectProject(undefined)` エラーが発生。`onMenuResetLayout` subscription も同様に phantom data を受信し、毎起動時にレイアウトがリセットされる。EventBus handler は一度も発火しておらず、Main process 側の問題ではないと確認。
- **Conclusion**: `electron-trpc` v0.7.1 の `ipcLink()` が呼ばれるたびに独立した IPC マネージャ（`ne` インスタンス）を生成し、各インスタンスが `ipcRenderer.on('electron-trpc', ...)` にリスナーを登録する。`provider.tsx` と `vanillaClient.ts` の2箇所で `ipcLink()` が呼ばれており、`requestId` カウンタが独立して `1, 2, 3...` と採番されるため ID が衝突し、レスポンスが誤ったクライアントに配信される。
- **Rationale**: electron-trpc GitHub Issue #201 で同一の問題が報告されている（Open、未修正）。EventBus diagnostic ログが一切出力されなかったことから、Main process 側ではなく IPC 層の問題と断定。

### vanillaClient の設計経緯
- **Discussion**: `vanillaClient` は tRPC 一般のベストプラクティス（`createTRPCProxyClient` で React 外からの命令的呼び出し）に従い、`trpc-full-migration` spec (DD-006) で設計された。HTTP/WebSocket ベースの tRPC では2クライアント共存は問題ないが、`electron-trpc` の単一 IPC チャネル設計では ID 衝突が発生する。
- **Conclusion**: `getVanillaClient()` API は維持しつつ、内部実装を React client の underlying TRPCClient を `createTRPCClientProxy` でラップする方式に変更する。これにより `ipcLink()` は1回のみ呼ばれ、単一の IPC マネージャが使用される。
- **Rationale**: 約93ファイルが `getVanillaClient()` を参照しており、API 変更は非現実的。`createTRPCClientProxy` は既存 TRPCClient インスタンスをラップ可能であり、追加の `ipcLink()` 呼び出しなしに proxy API を提供できる。

### Renderer console ログ転送方式の統一
- **Discussion**: 2つの転送メカニズムが併存。(1) `consoleHook.ts`: Renderer 側で `console.*` を monkey-patch し、`getVanillaClient()` 経由の tRPC mutation で Main に送信（dev/E2E のみ、production build では無効）。(2) `webContents.on('console-message')`: Main 側の Electron native API でキャプチャ。consoleHook は vanillaClient に依存しており、production build では無効化されるため E2E では機能せず、前セッションで E2E 限定の `console-message` リスナーを `main/index.ts` に追加した経緯がある（`isE2ETest` ガード付き）。
- **Conclusion**: `console-message` native 方式に統一する。consoleHook を削除し、`console-message` リスナーを全環境で有効化（E2E 限定を解除）。Renderer console レベルを Main logger レベルにマッピングする。
- **Rationale**: SSOT/KISS 原則。native API は全環境で動作し、tRPC 依存がなく、monkey-patch 不要で信頼性が高い。consoleHook の vanillaClient 依存を除去することで修正全体がクリーンになる。

### diagnostic コードの扱い
- **Discussion**: 調査で追加した App.tsx の stack trace ログ（`!data.projectPath` 時）と events.ts の empty data detection。削除するか、E2E 限定にするか、そのまま残すか。
- **Conclusion**: そのまま残す。
- **Rationale**: 両方とも異常時のみ発火するコード（happy path ではコスト0）。根本修正後は発火しないが、将来の回帰検出に有用。E2E の console-message 転送で自動的にログに出るため、追加の条件分岐は不要。

## Introduction

`electron-trpc` v0.7.1 の `ipcLink()` を複数回呼び出すと、独立した IPC マネージャが複数生成され、`requestId` の衝突によりレスポンスが誤ったクライアントに配信される問題を修正する。現在 `provider.tsx`（React hooks 用）と `vanillaClient.ts`（Zustand stores 用）の2箇所で `ipcLink()` が呼ばれており、全 tRPC subscription が起動時に phantom data を受信する。`ipcLink()` 呼び出しを単一化し、併せて Renderer console ログ転送を native `console-message` API に統一する。

## Requirements

### Requirement 1: ipcLink シングルトン化

**Objective:** tRPC クライアントが使用する `ipcLink()` を1回のみ呼び出し、単一の IPC マネージャで全通信を処理する

#### Acceptance Criteria
1. When Electron アプリが起動する, the system shall `ipcLink()` を1回のみ呼び出す
2. When `getVanillaClient()` が呼ばれる, the system shall React client と同じ underlying TRPCClient インスタンスから生成された proxy を返す
3. When `getVanillaClient()` が呼ばれる, the system shall 既存の API シグネチャ（`getVanillaClient().{router}.{procedure}.query/mutate/subscribe()`）を維持する
4. If `ipcLink()` が複数回呼ばれる実装が残っている, then ビルドまたはテストで検出可能であること

### Requirement 2: phantom subscription data の解消

**Objective:** 起動時に tRPC subscription が phantom data を受信しない

#### Acceptance Criteria
1. When アプリが起動する, the system shall `onMenuOpenProject` subscription が phantom `data=[]` を受信しない
2. When アプリが起動する, the system shall `onMenuResetLayout` subscription が意図しないレイアウトリセットを引き起こさない
3. When 全 subscription が確立される, the system shall EventBus でイベントが発火するまで `onData` コールバックが呼ばれない

### Requirement 3: console-message native 方式への統一

**Objective:** Renderer console ログ転送を Electron native `console-message` API に統一し、consoleHook を廃止する

#### Acceptance Criteria
1. When Electron アプリが起動する（全環境）, the system shall `webContents.on('console-message')` リスナーを登録する
2. When Renderer で `console.log/info/warn/error/debug` が呼ばれる, the system shall Main process の logger に適切なレベルで記録する
3. When Renderer console レベルが DEBUG (0) である, the system shall `logger.debug()` で記録する
4. When Renderer console レベルが INFO (1) である, the system shall `logger.info()` で記録する
5. When Renderer console レベルが WARNING (2) である, the system shall `logger.warn()` で記録する
6. When Renderer console レベルが ERROR (3) である, the system shall `logger.error()` で記録する
7. When この仕様が完了した時, the system shall `consoleHook.ts` および `noiseFilter.ts` が削除されている
8. When この仕様が完了した時, the system shall `main.tsx` から `initializeConsoleHook()` 呼び出しが削除されている

### Requirement 4: steering ドキュメント更新

**Objective:** `tech.md` の vanillaClient 記述を実態に合わせる

#### Acceptance Criteria
1. When この仕様が完了した時, the system shall `.kiro/steering/tech.md` の vanillaClient セクションが「React client の proxy ラッパー」として記述されている
2. When この仕様が完了した時, the system shall `ipcLink()` 単一呼び出しの設計方針が記載されている
3. When この仕様が完了した時, the system shall `.kiro/steering/logging.md` の Renderer ロギングアーキテクチャセクションが consoleHook 廃止と console-message native 方式を反映した記述に更新されている（rendererLogger の IPC 経路記述もソースコード実態 `getVanillaClient().misc.logRenderer.mutate()` と一致させること）

### Requirement 5: 既存テストの互換性

**Objective:** 変更により既存テストが壊れない

#### Acceptance Criteria
1. When `npm run build && npm run typecheck` を実行する, the system shall エラーなく完了する
2. When ユニットテストを実行する, the system shall `getVanillaClient()` を使用する既存テストが変更なしで PASS する
3. When `consoleHook.test.ts` および `noiseFilter.test.ts` が削除された後, the system shall テストスイートがエラーなく完了する
4. If `rendererLogger.ts`（notificationStore が使用）が影響を受ける場合, then `rendererLogger` のテストも PASS すること

## Out of Scope

- `rendererLogger.ts` の廃止（notificationStore が依存しており、`getVanillaClient()` 経由で tRPC 通信するため、ipcLink シングルトン化の恩恵を受け正常動作する）
- `misc.logRenderer` tRPC endpoint の廃止（rendererLogger が使用）
- `contextProvider.ts` の廃止（rendererLogger が使用）
- React StrictMode の production build での無効化（production build では二重実行は発生しない）
- `electron-trpc` ライブラリ自体の修正（Issue #201 への PR）
- E2E テストの追加・修正（既存テストの互換性確保のみ）
- Remote UI への影響（Remote UI は `ipcLink` を使用しない）

## Open Questions

- `createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか、型レベルで互換性の確認が必要（設計フェーズで検証）。なお、`createTRPCClientProxy` は `@trpc/client` v10.45.4 で deprecated（`@internal`）API であり、設計フェーズで代替方式の検討も必要
